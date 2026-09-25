import sharp from "sharp";

/** Keep in step with the client-side cap in `compress-client.ts`. */
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 82;

export type CompressedImage = {
  bytes: Uint8Array;
  mimeType: string;
  /** File extension matching `mimeType`, for building the storage path. */
  ext: string;
};

/**
 * Server-side counterpart of `compressImageForUpload` for images we upload with
 * the admin client (smart-fill posters, article images). Animated GIFs and
 * anything sharp cannot decode are passed through unchanged.
 */
export async function compressImageForUpload(
  bytes: Uint8Array,
  mimeType: string,
): Promise<CompressedImage> {
  const original: CompressedImage = {
    bytes,
    mimeType,
    ext: extFromMimeType(mimeType),
  };
  if (mimeType === "image/gif") return original;

  try {
    const out = await sharp(Buffer.from(bytes))
      .rotate()
      .resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    if (out.byteLength >= bytes.byteLength) return original;
    return { bytes: new Uint8Array(out), mimeType: "image/webp", ext: "webp" };
  } catch {
    return original;
  }
}

function extFromMimeType(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("avif")) return "avif";
  if (mimeType.includes("gif")) return "gif";
  return "jpg";
}
