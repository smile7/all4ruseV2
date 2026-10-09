import { eventsApi } from "~/lib/api";
import { buildEventsIcs, EVENTS_FEED_LIMIT } from "~/lib/event-feeds";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";

export const revalidate = 3600;

export async function GET() {
  const events = await eventsApi.getActiveEvents(
    createSupabasePublicServerClient(),
  );
  const ics = buildEventsIcs(events.slice(0, EVENTS_FEED_LIMIT));

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
