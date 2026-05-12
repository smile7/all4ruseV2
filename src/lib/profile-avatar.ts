import { AVATARS_BUCKET } from "~/constants";

/** App Router and client components can read this at build/runtime. */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export const AVATAR_INPUT_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function buildAvatarPublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${AVATARS_BUCKET}/${storagePath}`;
}

/** Returns storage object path if this URL points at our avatars bucket; otherwise null (e.g. OAuth full URL). */
export function extractAvatarStoragePathFromPublicUrl(
  url: string | null | undefined,
): string | null {
  if (!url?.trim()) return null;
  const marker = `/object/public/${AVATARS_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return url.slice(i + marker.length);
}

export type AvatarFileValidationError = "type" | "size";

export function validateAvatarFile(file: File): AvatarFileValidationError | null {
  if (file.size > MAX_AVATAR_BYTES) return "size";
  if (!ALLOWED_MIME.has(file.type)) return "type";
  return null;
}

/** Unique storage path for a new upload (not pure — call only from event handlers / async work). */
export function buildAvatarStorageObjectPath(userId: string, file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  return `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}
