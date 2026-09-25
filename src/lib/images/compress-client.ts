/**
 * Long edge cap for stored images. The widest slot the site renders is a
 * full-bleed hero, so 1600px still covers high-DPI screens while cutting a
 * phone photo to a fraction of its original bytes.
 */
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.82;

/** Re-encoding an animated GIF through a canvas would keep only the first frame. */
const PASSTHROUGH_TYPES = new Set(["image/gif"]);

/**
 * Downscales and re-encodes an image before it is uploaded to Supabase Storage.
 * Returns the original file whenever compression is impossible or would not
 * save bytes, so a browser quirk never blocks an upload.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || PASSTHROUGH_TYPES.has(file.type)) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", WEBP_QUALITY);
  });

  // Browsers that cannot encode WebP silently fall back to PNG, which is bigger.
  if (!blob || blob.type !== "image/webp" || blob.size >= file.size)
    return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.webp`, { type: "image/webp" });
}
