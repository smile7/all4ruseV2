import { AVATARS_BUCKET } from "~/constants";

export const MAX_HEADER_BYTES = 5 * 1024 * 1024; // 5 MB
export const HEADER_INPUT_ACCEPT = "image/jpeg,image/png,image/webp";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export function buildHeaderPublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${AVATARS_BUCKET}/${storagePath}`;
}

export function extractHeaderStoragePathFromPublicUrl(
  url: string | null | undefined,
): string | null {
  if (!url?.trim()) return null;
  const marker = `/object/public/${AVATARS_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return url.slice(i + marker.length);
}

export type HeaderFileValidationError = "type" | "size";

export function validateHeaderFile(
  file: File,
): HeaderFileValidationError | null {
  if (file.size > MAX_HEADER_BYTES) return "size";
  if (!ALLOWED_MIME.has(file.type)) return "type";
  return null;
}

export function buildHeaderStorageObjectPath(
  userId: string,
  file: File,
): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  return `headers/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}
