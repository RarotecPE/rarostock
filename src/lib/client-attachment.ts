"use client";

/**
 * Utilitário de preparação e compressão de anexos no cliente (navegador).
 *
 * Resolve o problema de limites de requisição serverless (4.5 MB na Vercel / HTTP 413)
 * redimensionando e comprimindo fotos/imagens de alta resolução diretamente via Canvas
 * antes do upload, além de validar tamanho máximo para PDFs.
 */

const MAX_UPLOAD_BYTES = 4.2 * 1024 * 1024; // 4.2 MB (margem de segurança para o teto de 4.5 MB da Vercel)
const DEFAULT_MAX_DIMENSION = 2048; // Dimensão máxima (largura ou altura) para legibilidade de notas
const DEFAULT_QUALITY = 0.82; // 82% qualidade JPEG

type LoadedImage = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  cleanup?: () => void;
};

async function loadImage(file: File): Promise<LoadedImage> {
  // Tentativa 1: createImageBitmap (rápido, assíncrono, lida com orientação EXIF nativamente)
  if (typeof createImageBitmap === "function") {
    try {
      // Chrome/Edge/Firefox modernos suportam imageOrientation: "from-image"
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image" as ImageOrientation,
      });
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        cleanup: () => bitmap.close(),
      };
    } catch {
      try {
        const bitmap = await createImageBitmap(file);
        return {
          width: bitmap.width,
          height: bitmap.height,
          draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
          cleanup: () => bitmap.close(),
        };
      } catch {
        // Fallback para HTMLImageElement se createImageBitmap falhar
      }
    }
  }

  // Tentativa 2: HTMLImageElement via object URL
  return new Promise<LoadedImage>((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
        cleanup: () => URL.revokeObjectURL(objectUrl),
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível carregar a imagem para compressão."));
    };

    img.src = objectUrl;
  });
}

/**
 * Comprime uma imagem usando Canvas no navegador.
 * Redimensiona mantendo proporção e converte para JPEG com qualidade otimizada.
 * Se o arquivo já for pequeno ou a compressão não reduzir o tamanho, mantém o original.
 */
export async function compressImageOnClient(
  file: File,
  maxDimension = DEFAULT_MAX_DIMENSION,
  quality = DEFAULT_QUALITY
): Promise<File> {
  // Ignora arquivos que não sejam imagens ou GIFs animados
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  // Se a imagem já for leve (< 600 KB), não há risco de 413
  if (file.size <= 600 * 1024) {
    return file;
  }

  let loaded: LoadedImage | null = null;
  try {
    loaded = await loadImage(file);

    let { width, height } = loaded;

    // Se as dimensões já forem menores que o teto e o arquivo for menor que 1.5 MB, não precisa reprocessar
    if (width <= maxDimension && height <= maxDimension && file.size < 1.5 * 1024 * 1024) {
      return file;
    }

    // Calcula proporção preservando aspect ratio
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    // Fundo branco caso haja transparência convertida para JPEG
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    loaded.draw(ctx, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("client_image_compression_fallback", err);
    return file;
  } finally {
    loaded?.cleanup?.();
  }
}

/**
 * Prepara qualquer anexo (foto ou PDF) antes de enviar para /api/upload ou endpoints serverless:
 * 1. Comprime imagens de alta resolução automaticamente no navegador.
 * 2. Valida se o arquivo final está dentro da margem de segurança da Vercel (4.2 MB).
 * 3. Lança erro explicativo caso um PDF ultrapasse o teto permitido.
 */
export async function prepareAttachmentForUpload(file: File): Promise<File> {
  let processedFile = file;

  if (file.type.startsWith("image/") && file.type !== "image/gif") {
    processedFile = await compressImageOnClient(file);
  }

  if (processedFile.size > MAX_UPLOAD_BYTES) {
    const sizeMb = (processedFile.size / (1024 * 1024)).toFixed(1);
    const isPdf =
      processedFile.type === "application/pdf" ||
      processedFile.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      throw new Error(
        `O arquivo PDF possui ${sizeMb} MB e ultrapassa o limite de 4.2 MB para envio na plataforma. Por favor, compacte o PDF ou reduza a resolução do escaneamento antes de anexar.`
      );
    }

    throw new Error(
      `O arquivo "${processedFile.name}" possui ${sizeMb} MB e ultrapassa o limite máximo de 4.2 MB permitido.`
    );
  }

  return processedFile;
}
