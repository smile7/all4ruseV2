import { createSupabaseAdminClient } from "~/lib/supabase/admin";

const SMART_FILL_PREFIX = "smart-fill";
const EVENTS_BUCKET = "event-images";

/**
 * Fetches an image from any URL and re-uploads it to Supabase Storage,
 * returning the stable storage path (relative to the bucket).
 *
 * Facebook CDN URLs expire within hours. Calling this function in the API
 * route means the client never receives a time-limited URL.
 */
export async function reuploadImageFromUrl(
  sourceUrl: string,
): Promise<string | null> {
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; All4Ruse/2.0; +https://all4ruse.com)",
      },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const ext = contentTypeToExt(contentType);
    const buffer = await response.arrayBuffer();

    const storagePath = `${SMART_FILL_PREFIX}/${crypto.randomUUID()}.${ext}`;

    const adminClient = createSupabaseAdminClient();
    const { error } = await adminClient.storage
      .from(EVENTS_BUCKET)
      .upload(storagePath, buffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error("[smart-fill] image reupload failed:", error.message);
      return null;
    }

    return storagePath;
  } catch (err) {
    console.error("[smart-fill] image reupload error:", err);
    return null;
  }
}

function contentTypeToExt(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}
