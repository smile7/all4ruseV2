import { NextResponse } from "next/server";

import { reuploadImageFromUrl } from "~/lib/smart-fill/image-reupload";
import {
  isGraboUrl,
  scrapeGrabo,
} from "~/lib/smart-fill/scrape-grabo";
import {
  isRuseDanubeUrl,
  scrapeRuseDanube,
} from "~/lib/smart-fill/scrape-ruse-danube";
import { createSupabaseServerClient } from "~/lib/supabase/server";
import type { EventDraft } from "~/types";

const ALLOWED_DOMAINS = ["grabo.bg", "ruseonthedanube.com"];

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminUserId = process.env.ADMIN_USER_ID;
  if (!adminUserId || user.id !== adminUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Input validation ──────────────────────────────────────────────────────
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

  if (!url || !ALLOWED_DOMAINS.some((d) => url.includes(d))) {
    return NextResponse.json(
      {
        error: `URL must be from one of: ${ALLOWED_DOMAINS.join(", ")}`,
      },
      { status: 422 },
    );
  }

  // ── Scrape ────────────────────────────────────────────────────────────────
  try {
    let scrapeResult: {
      draft: Omit<EventDraft, "image">;
      rawImageUrl: string | null;
    };

    if (isGraboUrl(url)) {
      scrapeResult = await scrapeGrabo(url);
    } else if (isRuseDanubeUrl(url)) {
      scrapeResult = await scrapeRuseDanube(url);
    } else {
      return NextResponse.json(
        { error: "Unsupported source URL" },
        { status: 422 },
      );
    }

    const draft: EventDraft = { ...scrapeResult.draft, clearOrganizerLink: true };

    if (scrapeResult.rawImageUrl) {
      const storagePath = await reuploadImageFromUrl(scrapeResult.rawImageUrl);
      if (storagePath) draft.image = storagePath;
    }

    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[smart-fill/admin-scrape]", url, message);
    return NextResponse.json(
      { error: "Scraping failed. The page structure may have changed." },
      { status: 502 },
    );
  }
}
