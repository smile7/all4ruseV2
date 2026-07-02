import { AVATARS_BUCKET } from "~/constants";

export const MAX_PROFILE_GALLERY_IMAGES = 10;
export const MAX_PROFILE_GALLERY_IMAGE_BYTES = 3 * 1024 * 1024;
export const PROFILE_GALLERY_INPUT_ACCEPT = "image/jpeg,image/png,image/webp";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ProfileGalleryFileValidationError = "type" | "size";

export function validateProfileGalleryFile(
  file: File,
): ProfileGalleryFileValidationError | null {
  if (file.size > MAX_PROFILE_GALLERY_IMAGE_BYTES) return "size";
  if (!ALLOWED_MIME.has(file.type)) return "type";
  return null;
}

export function buildProfileGalleryStorageObjectPath(
  userId: string,
  file: File,
): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  return `gallery/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

export function buildProfileGalleryPublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${AVATARS_BUCKET}/${storagePath}`;
}

export function extractProfileGalleryStoragePathFromPublicUrl(
  url: string | null | undefined,
): string | null {
  if (!url?.trim()) return null;
  const marker = `/object/public/${AVATARS_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return url.slice(i + marker.length);
}

export function parseProfileGallery(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && item.trim() !== "",
  );
}
