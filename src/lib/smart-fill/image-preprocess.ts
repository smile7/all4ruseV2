import sharp from "sharp";

/** Long edge cap — Gemini bills image input by tiles; smaller = far fewer tokens. */
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 82;

/**
 * Downscale poster images before sending to Gemini.
 * Full-resolution uploads are still stored in Supabase; this is extraction-only.
 */
export async function preprocessImageForExtraction(
  imageBytes: Uint8Array,
  mimeType: string,
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const pipeline = sharp(Buffer.from(imageBytes))
    .rotate()
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    });

  if (mimeType === "image/png") {
    const out = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    return { bytes: new Uint8Array(out), mimeType: "image/png" };
  }

  if (mimeType === "image/webp") {
    const out = await pipeline.webp({ quality: JPEG_QUALITY }).toBuffer();
    return { bytes: new Uint8Array(out), mimeType: "image/webp" };
  }

  const out = await pipeline.jpeg({ quality: JPEG_QUALITY }).toBuffer();
  return { bytes: new Uint8Array(out), mimeType: "image/jpeg" };
}
