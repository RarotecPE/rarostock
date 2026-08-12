import { Client } from "basic-ftp";
import { randomUUID } from "crypto";
import path from "path";
import { Readable } from "stream";

const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif", "pdf"]);

const normalizeRemotePath = (value: string) => {
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const sanitizeFilename = (filename: string) =>
  filename.replace(/[^a-zA-Z0-9._-]/g, "_");

const storageFolders = {
  product: "notasProdutos",
  equipment: "notasEquipamentos/notas",
  equipmentTerm: "notasEquipamentos/termos",
} as const;

export type InvoiceStorageContext = keyof typeof storageFolders;

const encodeUrlPath = (value: string) =>
  value
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

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

const getFtpConfig = () => {
  const host = process.env.FTP_HOST;
  const user = process.env.FTP_USER;
  const password = process.env.FTP_PASSWORD;
  const baseDir = process.env.FTP_BASE_DIR;
  const publicBaseUrl = process.env.PUBLIC_STORAGE_BASE_URL;

  if (!host || !user || !password || !baseDir || !publicBaseUrl) {
    throw new Error(
      "FTP_HOST, FTP_USER, FTP_PASSWORD, FTP_BASE_DIR and PUBLIC_STORAGE_BASE_URL are required"
    );
  }

  if (!/^https?:\/\//i.test(publicBaseUrl)) {
    throw new Error("PUBLIC_STORAGE_BASE_URL must start with http:// or https://");
  }

  return {
    host,
    port: Number(process.env.FTP_PORT ?? 21),
    user,
    password,
    secure: process.env.FTP_SECURE === "true",
    baseDir: normalizeRemotePath(baseDir),
    publicBaseUrl: publicBaseUrl.replace(/\/+$/, ""),
  };
};

const withFtpClient = async <T>(operation: (client: Client) => Promise<T>) => {
  const config = getFtpConfig();
  const client = new Client(30000);

  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      secure: config.secure,
    });

    return await operation(client);
  } finally {
    client.close();
  }
};

const assertStoragePathInBaseDir = (storagePath: string) => {
  const { baseDir } = getFtpConfig();
  const normalized = normalizeRemotePath(storagePath);

  if (normalized !== baseDir && !normalized.startsWith(`${baseDir}/`)) {
    throw new Error("Invalid storage path");
  }

  return normalized;
};

export const uploadInvoiceToFtp = async (
  file: File,
  context: InvoiceStorageContext = "product",
) => {
  const config = getFtpConfig();
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const extension = getAllowedFileExtension(file);
  const baseName = path.posix
    .basename(file.name, path.posix.extname(file.name))
    .slice(0, 80);
  const safeBaseName =
    sanitizeFilename(baseName) ||
    (context === "equipmentTerm" ? "termo_responsabilidade" : "nota_fiscal");
  const uniqueId = randomUUID().slice(0, 8);
  const storedFilename = `${Date.now()}-${uniqueId}-${safeBaseName}.${extension}`;
  const folder = storageFolders[context];
  const storagePath = path.posix.join(config.baseDir, folder, storedFilename);

  await withFtpClient(async (client) => {
    await client.ensureDir(path.posix.join(config.baseDir, folder));
    await client.uploadFrom(Readable.from(buffer), storedFilename);
  });

  return {
    filename: storedFilename,
    storagePath,
    url: `${config.publicBaseUrl}/${encodeUrlPath(`${folder}/${storedFilename}`)}`,
  };
};

export const deleteInvoiceFromFtp = async (storagePath: string) => {
  const safePath = assertStoragePathInBaseDir(storagePath);

  await withFtpClient(async (client) => {
    await client.remove(safePath);
  });
};
