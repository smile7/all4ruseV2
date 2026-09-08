import { NextResponse } from "next/server";

import { ARTICLES_BUCKET } from "~/constants";
import { requireArticleAdmin } from "~/lib/articles/admin-guard";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Unlike EventForm, the browser never writes to storage directly here — the
 * bucket has no client-side insert policy, so uploads run through this route.
 */
export async function POST(request: Request) {
  const guard = await requireArticleAdmin();
  if ("response" in guard) return guard.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image provided" }, { status: 422 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Image must be under 5 MB" },
      { status: 422 },
    );
  }

  const mimeType = file.type || "image/jpeg";
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WEBP or AVIF images are supported" },
      { status: 422 },
    );
  }

  const ext = mimeType.split("/")[1] ?? "jpg";
  const storagePath = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;

  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage
    .from(ARTICLES_BUCKET)
    .upload(storagePath, new Uint8Array(await file.arrayBuffer()), {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error("[api/articles/image] upload failed:", error.message);
    return NextResponse.json({ error: "upload_failed" }, { status: 502 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(ARTICLES_BUCKET).getPublicUrl(storagePath);

  return NextResponse.json({ url: publicUrl });
}
