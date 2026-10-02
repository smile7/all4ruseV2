import {
  IMAGE_MAX_DIMENSION,
  IMAGE_OUTPUT_MAX_BYTES,
  IMAGE_PICK_MAX_BYTES,
} from "~/lib/images/upload-limits";

const WEBP_QUALITIES = [0.82, 0.7, 0.58, 0.45] as const;
const JPEG_QUALITIES = [0.82, 0.7, 0.58, 0.45] as const;
const DIMENSION_STEPS = [IMAGE_MAX_DIMENSION, 1280, 1024, 800] as const;

const PASSTHROUGH_TYPES = new Set(["image/gif"]);

export class ImageCompressError extends Error {
  readonly code = "image_compress_failed";

  constructor(message = "Could not convert image") {
    super(message);
    this.name = "ImageCompressError";
  }
}

function baseName(file: File): string {
  return file.name.replace(/\.[^.]+$/, "") || "image";
}

function isGif(file: File): boolean {
  return PASSTHROUGH_TYPES.has(file.type) || /\.gif$/i.test(file.name);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: "image/webp" | "image/jpeg",
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function scaleToFit(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function decodeToBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    // Safari often decodes HEIC natively; other browsers need a WASM fallback.
  }

  try {
    const { isHeic, heicTo } = await import("heic-to/next");
    if (await isHeic(file)) {
      return await heicTo({ blob: file, type: "bitmap" });
    }
  } catch {
    // Fall through to a single error the form can translate.
  }

  throw new ImageCompressError("undecodable");
}

async function encodeSmallest(
  bitmap: ImageBitmap,
  type: "image/webp" | "image/jpeg",
  qualities: readonly number[],
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  let best: Blob | null = null;

  for (const maxEdge of DIMENSION_STEPS) {
    const size = scaleToFit(bitmap.width, bitmap.height, maxEdge);
    canvas.width = size.width;
    canvas.height = size.height;
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);

    for (const quality of qualities) {
      const blob = await canvasToBlob(canvas, type, quality);
      if (!blob || blob.type !== type) continue;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= IMAGE_OUTPUT_MAX_BYTES) return blob;
    }
  }

  return best;
}

/**
 * Downscales and re-encodes an image to WebP (JPEG fallback) before upload.
 * HEIC/HEIF is decoded natively when the browser can, otherwise via heic-to.
 * Never returns the original HEIC — that format fails on save in some browsers.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (isGif(file)) {
    if (file.size > IMAGE_OUTPUT_MAX_BYTES) {
      throw new ImageCompressError("gif_too_large");
    }
    return file;
  }

  const bitmap = await decodeToBitmap(file);
  try {
    const webp = await encodeSmallest(bitmap, "image/webp", WEBP_QUALITIES);
    if (webp && webp.size <= IMAGE_PICK_MAX_BYTES) {
      return new File([webp], `${baseName(file)}.webp`, { type: "image/webp" });
    }

    const jpeg = await encodeSmallest(bitmap, "image/jpeg", JPEG_QUALITIES);
    if (jpeg && jpeg.size <= IMAGE_PICK_MAX_BYTES) {
      return new File([jpeg], `${baseName(file)}.jpg`, { type: "image/jpeg" });
    }
  } finally {
    bitmap.close();
  }

  throw new ImageCompressError("still_too_large");
}
