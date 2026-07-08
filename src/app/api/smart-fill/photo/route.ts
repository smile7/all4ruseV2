import { NextResponse } from "next/server";

import {
  extractDraftFromImageBytes,
  QuotaExceededError,
} from "~/lib/smart-fill/gemini";
import { preprocessImageForExtraction } from "~/lib/smart-fill/image-preprocess";
import {
  consumeSmartFillImport,
  SmartFillDailyLimitError,
  smartFillDailyLimitResponse,
} from "~/lib/smart-fill/rate-limit";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";
import { createSupabaseServerClient } from "~/lib/supabase/server";
import type { EventDraft } from "~/types";

const EVENTS_BUCKET = "event-images";
const SMART_FILL_PREFIX = "smart-fill";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_TEXT_LENGTH = 3000;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      { error: "Only JPEG, PNG, or WEBP images are supported" },
      { status: 422 },
    );
  }

  const imageBytes = new Uint8Array(await file.arrayBuffer());

  const rawText = formData.get("text");
  const additionalText =
    typeof rawText === "string" && rawText.trim()
      ? rawText.trim().slice(0, MAX_TEXT_LENGTH)
      : undefined;

  try {
    await consumeSmartFillImport(user.id, "image");
  } catch (err) {
    if (err instanceof SmartFillDailyLimitError) {
      return smartFillDailyLimitResponse(err);
    }
    throw err;
  }

  // Upload the image to permanent storage first
  const ext = mimeType.split("/")[1] ?? "jpg";
  const storagePath = `${SMART_FILL_PREFIX}/${crypto.randomUUID()}.${ext}`;

  const adminClient = createSupabaseAdminClient();
  const { error: uploadError } = await adminClient.storage
    .from(EVENTS_BUCKET)
    .upload(storagePath, imageBytes, { contentType: mimeType, upsert: false });

  if (uploadError) {
    console.error("[smart-fill/photo] upload error:", uploadError.message);
    return NextResponse.json({ error: "Image upload failed" }, { status: 502 });
  }

  try {
    const { bytes: extractionBytes, mimeType: extractionMime } =
      await preprocessImageForExtraction(imageBytes, mimeType);

    const draft: EventDraft = await extractDraftFromImageBytes(
      extractionBytes,
      extractionMime,
      additionalText,
    );
    draft.image = storagePath;
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[smart-fill/photo]", message);
    // Image was uploaded — still return a partial draft with the image.
    // For quota errors, signal the client so it can show the right message.
    const partialDraft: EventDraft = { image: storagePath };
    return NextResponse.json(
      {
        draft: partialDraft,
        warning:
          "Image was saved but details could not be extracted automatically.",
        ...(err instanceof QuotaExceededError && {
          errorCode: "quota_exceeded",
        }),
      },
      { status: 200 },
    );
  }
}
