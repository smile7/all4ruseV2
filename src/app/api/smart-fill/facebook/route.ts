import { NextResponse } from "next/server";

import { scrapeApifyFacebookEvent } from "~/lib/smart-fill/apify";

export const maxDuration = 120;
import { reuploadImageFromUrl } from "~/lib/smart-fill/image-reupload";
import { createSupabaseServerClient } from "~/lib/supabase/server";
import type { EventDraft } from "~/types";

const FB_EVENT_URL_RE = /facebook\.com\/events\/\d+/;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url =
    body && typeof body === "object" && "url" in body
      ? String((body as { url: unknown }).url ?? "").trim()
      : "";

  if (!FB_EVENT_URL_RE.test(url)) {
    return NextResponse.json(
      { error: "Please provide a valid facebook.com/events/... URL" },
      { status: 422 },
    );
  }

  try {
    const { draft: baseDraft, rawImageUrl } =
      await scrapeApifyFacebookEvent(url);

    const draft: EventDraft = { ...baseDraft };

    if (rawImageUrl) {
      const storagePath = await reuploadImageFromUrl(rawImageUrl);
      if (storagePath) draft.image = storagePath;
    }

    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[smart-fill/facebook]", message);
    return NextResponse.json(
      { error: "Could not scrape this event. Try again or fill manually." },
      { status: 502 },
    );
  }
}
