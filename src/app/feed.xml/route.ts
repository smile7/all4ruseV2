import { eventsApi } from "~/lib/api";
import { buildEventsRss, EVENTS_FEED_LIMIT } from "~/lib/event-feeds";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";

export const revalidate = 300;

export async function GET() {
  const events = await eventsApi.getActiveEvents(
    createSupabasePublicServerClient(),
  );
  const xml = buildEventsRss(events.slice(0, EVENTS_FEED_LIMIT));

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
