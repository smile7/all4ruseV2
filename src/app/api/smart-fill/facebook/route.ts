import { NextResponse } from "next/server";

import {
  EmptyDatasetError,
  scrapeApifyFacebookEvent,
} from "~/lib/smart-fill/apify";
import { FB_EVENT_URL_RE } from "~/lib/smart-fill/facebook-public-check";

export const maxDuration = 120;
import { reuploadImageFromUrl } from "~/lib/smart-fill/image-reupload";
import {
  SmartFillDailyLimitError,
  smartFillDailyLimitResponse,
  consumeSmartFillImport,
} from "~/lib/smart-fill/rate-limit";
import { createSupabaseServerClient } from "~/lib/supabase/server";
import type { EventDraft } from "~/types";

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
    await consumeSmartFillImport(user.id);
  } catch (err) {
    if (err instanceof SmartFillDailyLimitError) {
      return smartFillDailyLimitResponse(err);
    }
    throw err;
  }

  try {
    let scrapeResult: Awaited<ReturnType<typeof scrapeApifyFacebookEvent>>;

    try {
      scrapeResult = await scrapeApifyFacebookEvent(url);
    } catch (firstErr) {
      // On an empty dataset (likely Facebook rate-limiting), retry once after
      // a short pause before giving up entirely.
      if (firstErr instanceof EmptyDatasetError) {
        console.warn("[smart-fill/facebook] empty dataset on first attempt, retrying once…");
        await new Promise((resolve) => setTimeout(resolve, 4000));
        scrapeResult = await scrapeApifyFacebookEvent(url);
      } else {
        throw firstErr;
      }
    }

    const { draft: baseDraft, rawImageUrl } = scrapeResult;
    const draft: EventDraft = { ...baseDraft };

    if (rawImageUrl) {
      const imageUrl = await reuploadImageFromUrl(rawImageUrl);
      if (imageUrl) draft.image = imageUrl;
    }

    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[smart-fill/facebook]", message);

    if (err instanceof EmptyDatasetError) {
      return NextResponse.json(
        {
          error:
            "Facebook didn't return data for this event. The event may be private, removed, or Facebook is rate-limiting imports right now. Wait a minute and try again.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Could not scrape this event. Try again or fill manually." },
      { status: 502 },
    );
  }
}
