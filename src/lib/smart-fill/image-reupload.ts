import { UPLOAD_CACHE_CONTROL } from "~/constants";
import { compressImageForUpload } from "~/lib/images/compress-server";
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

    const sourceType = response.headers.get("content-type") ?? "image/jpeg";
    const source = new Uint8Array(await response.arrayBuffer());
    const { bytes, mimeType, ext } = await compressImageForUpload(
      source,
      sourceType,
    );

    const storagePath = `${SMART_FILL_PREFIX}/${crypto.randomUUID()}.${ext}`;

    const adminClient = createSupabaseAdminClient();
    const { error } = await adminClient.storage
      .from(EVENTS_BUCKET)
      .upload(storagePath, bytes, {
        contentType: mimeType,
        cacheControl: UPLOAD_CACHE_CONTROL,
        upsert: false,
      });

    if (error) {
      console.error("[smart-fill] image reupload failed:", error.message);
      return null;
    }

    // Return the full public URL so both the old and new app can display the
    // image without needing to reconstruct it from a bare path.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error("[smart-fill] NEXT_PUBLIC_SUPABASE_URL is not set");
      return storagePath;
    }
    return `${supabaseUrl}/storage/v1/object/public/${EVENTS_BUCKET}/${storagePath}`;
  } catch (err) {
    console.error("[smart-fill] image reupload error:", err);
    return null;
  }
}
