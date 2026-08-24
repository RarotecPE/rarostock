import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import path from "path";
import sharp from "sharp";
import { deleteInvoiceFromFtp } from "@/lib/ftp-storage";

const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif", "pdf"]);

const storagePrefixes = {
  product: "R2_PRODUCT_INVOICES_PREFIX",
  equipment: "R2_EQUIPMENT_INVOICES_PREFIX",
  equipmentTerm: "R2_EQUIPMENT_RESPONSIBILITY_TERMS_PREFIX",
  equipmentResponsibilityTerm: "R2_EQUIPMENT_RESPONSIBILITY_TERMS_PREFIX",
  equipmentDevolutionTerm: "R2_EQUIPMENT_RETURN_TERMS_PREFIX",
} as const;

export type AttachmentStorageContext = keyof typeof storagePrefixes;

export type StoredAttachment = {
  filename: string;
  storagePath: string;
  url: string;
};

export type StoredAttachmentFile = {
  body: Uint8Array;
  contentType: string;
  filename: string;
};

type PreparedUploadFile = {
  buffer: Buffer;
  extension: string;
  contentType: string;
};

const sanitizeFilename = (filename: string) =>
  filename.replace(/[^a-zA-Z0-9._-]/g, "_");

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");

const normalizeEndpoint = (endpoint: string, bucket: string) => {
  const trimmed = endpoint.replace(/\/+$/, "");
  const bucketSuffix = `/${bucket}`;
  return trimmed.endsWith(bucketSuffix)
    ? trimmed.slice(0, -bucketSuffix.length)
    : trimmed;
};

const getAllowedFileExtension = (file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!extension || !allowedExtensions.has(extension)) {
    throw new Error("Tipo de arquivo nao permitido. Envie imagem ou PDF.");
  }

  const isPdf = extension === "pdf";
  const hasValidMimeType =
    !file.type ||
    (isPdf && file.type === "application/pdf") ||
    (!isPdf && file.type.startsWith("image/"));

  if (!hasValidMimeType) {
    throw new Error("Tipo de arquivo nao permitido. Envie imagem ou PDF.");
  }

  return extension;
};

const optimizeImageForStorage = async (
  buffer: Buffer,
  extension: string,
  contentType: string
): Promise<PreparedUploadFile> => {
  if (extension === "pdf" || extension === "gif" || !contentType.startsWith("image/")) {
    return { buffer, extension, contentType };
  }

  try {
    const optimized = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 90, effort: 4 })
      .toBuffer();

    if (optimized.length >= buffer.length) {
      return { buffer, extension, contentType };
    }

    return {
      buffer: optimized,
      extension: "webp",
      contentType: "image/webp",
    };
  } catch (error) {
    console.warn("r2_image_optimization_failed", error);
    return { buffer, extension, contentType };
  }
};

const getR2Config = () => {
  const endpoint = process.env.R2_ENDPOINT;
  const bucket = process.env.R2_BUCKET;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required"
    );
  }

  return {
    endpoint: normalizeEndpoint(endpoint, bucket),
    bucket,
    accessKeyId,
    secretAccessKey,
  };
};

const getR2Client = () => {
  const config = getR2Config();

  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
};

const getPrefix = (context: AttachmentStorageContext) => {
  const envName = storagePrefixes[context];
  const prefix = process.env[envName];

  if (!prefix) {
    throw new Error(`${envName} is required`);
  }

  return trimSlashes(prefix);
};

const getFallbackBaseName = (context: AttachmentStorageContext) => {
  if (context === "equipmentDevolutionTerm") return "termo_devolucao";
  if (context === "equipmentTerm" || context === "equipmentResponsibilityTerm") {
    return "termo_responsabilidade";
  }
  return "nota_fiscal";
};

const buildProtectedUrl = (context: AttachmentStorageContext, key: string) => {
  const encodedKey = key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/api/files/${context}/${encodedKey}`;
};

const isLegacyFtpPath = (storagePath: string) =>
  storagePath.startsWith("/") || /^\/?notas/i.test(storagePath);

export const isKnownAttachmentContext = (
  value: string
): value is AttachmentStorageContext => value in storagePrefixes;

export const isR2KeyAllowedForContext = (
  context: AttachmentStorageContext,
  key: string
) => {
  const normalizedKey = trimSlashes(key);
  const prefix = getPrefix(context);
  return normalizedKey === prefix || normalizedKey.startsWith(`${prefix}/`);
};

export const uploadAttachmentToR2 = async (
  file: File,
  context: AttachmentStorageContext = "product"
): Promise<StoredAttachment> => {
  const config = getR2Config();
  const extension = getAllowedFileExtension(file);
  const bytes = await file.arrayBuffer();
  const originalBuffer = Buffer.from(bytes);
  const prepared = await optimizeImageForStorage(
    originalBuffer,
    extension,
    file.type || (extension === "pdf" ? "application/pdf" : "application/octet-stream")
  );
  const baseName = path.posix
    .basename(file.name, path.posix.extname(file.name))
    .slice(0, 80);
  const safeBaseName = sanitizeFilename(baseName) || getFallbackBaseName(context);
  const storedFilename = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeBaseName}.${prepared.extension}`;
  const key = `${getPrefix(context)}/${storedFilename}`;

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: prepared.buffer,
      ContentType: prepared.contentType,
    })
  );

  return {
    filename: storedFilename,
    storagePath: key,
    url: buildProtectedUrl(context, key),
  };
};

export const getAttachmentFromR2 = async (
  context: AttachmentStorageContext,
  key: string
): Promise<StoredAttachmentFile> => {
  const normalizedKey = trimSlashes(key);

  if (!isR2KeyAllowedForContext(context, normalizedKey)) {
    throw new Error("Invalid storage path");
  }

  const response = await getR2Client().send(
    new GetObjectCommand({
      Bucket: getR2Config().bucket,
      Key: normalizedKey,
    })
  );

  const body = await response.Body?.transformToByteArray();
  if (!body) throw new Error("Arquivo nao encontrado.");

  return {
    body,
    contentType: response.ContentType ?? "application/octet-stream",
    filename: path.posix.basename(normalizedKey),
  };
};

export const deleteAttachmentFromStorage = async (storagePath: string) => {
  const normalizedPath = storagePath.trim();
  if (!normalizedPath) return;

  if (isLegacyFtpPath(normalizedPath)) {
    await deleteInvoiceFromFtp(normalizedPath);
    return;
  }

  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: getR2Config().bucket,
      Key: trimSlashes(normalizedPath),
    })
  );
};
