import { NextResponse } from "next/server";

import { addDays, format } from "date-fns";

import { eventsApi } from "~/lib/api";
import { parseLocalDate, todayInSofia } from "~/lib/event-utils";
import { eventIndexUrl, submitIndexNow } from "~/lib/indexnow";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Re-submit events whose relative date is about to show in SERPs ("today",
 * "tomorrow", "in 3 days"). WordPress bumps `dateModified` on upcoming events
 * and Rank Math pings IndexNow; this is the same freshness window.
 */
const LOOKAHEAD_DAYS = 3;

async function handle(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const from = todayInSofia();
  const to = format(addDays(parseLocalDate(from), LOOKAHEAD_DAYS), "yyyy-MM-dd");

  const events = await eventsApi.getActiveEvents(
    createSupabasePublicServerClient(),
    { from, to },
  );

  const urls = events
    .map((event) => event.slug)
    .filter((slug): slug is string => typeof slug === "string" && slug.length > 0)
    .map(eventIndexUrl);

  try {
    const submitted = await submitIndexNow(urls);
    return NextResponse.json({ ok: true, submitted, urls: urls.length });
  } catch {
    return NextResponse.json({ ok: false, submitted: 0 }, { status: 502 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
