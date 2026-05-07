import type { SupabaseClient } from "@supabase/supabase-js";
import { format, subDays } from "date-fns";

import {
  EVENTS_PAGE_SIZE,
  PAST_EVENTS_WINDOW_DAYS,
  RELATED_EVENTS_COUNT,
} from "~/constants";
import type { Event, GetEventsParams, Tag } from "~/types";
import type { Database } from "~/types/database";

type Client = SupabaseClient<Database>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

type QueryResult = {
  data: Event[] | null;
  error: { code?: string; message?: string } | null;
};

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

function daysAgoStr(days: number) {
  return format(subDays(new Date(), days), "yyyy-MM-dd");
}

// Supabase returns event_tags as a nested array — flatten into Tag[].
// Type is unknown because the generated types don't reflect runtime joins.
function mapTags(eventTags: unknown): Tag[] {
  if (!Array.isArray(eventTags)) return [];

  return eventTags
    .map((et: unknown) => {
      if (et && typeof et === "object" && "tags" in et) {
        const tag = (et as { tags: unknown }).tags;
        if (tag && typeof tag === "object" && "id" in tag && "title" in tag) {
          return tag as Tag;
        }
      }
      return null;
    })
    .filter((t): t is Tag => t !== null && typeof t.title === "string");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEvent(row: any): Event {
  const { event_tags, ...rest } = row;
  return { ...rest, tags: mapTags(event_tags) };
}

// fix "await has no effect" in editors.
async function executeQuery(query: unknown): Promise<QueryResult> {
  return query as Promise<QueryResult>;
}

// Filters events by organizer name client-side.
// The organizers column is a JSONB array [{name, link}] and the Supabase JS
// client misinterprets `::text` casts as foreign-table joins, so we apply
// this filter after the DB fetch instead.
function filterByHost(events: Event[], host: string | undefined): Event[] {
  if (!host) return events;
  const needle = host.toLowerCase();
  return events.filter((e) => {
    if (!Array.isArray(e.organizers)) return false;
    return (e.organizers as { name?: string }[]).some((o) =>
      o?.name?.toLowerCase().includes(needle),
    );
  });
}

// Base query shared by all listing functions.
// Selects all event fields plus tags joined through event_tags.
function baseQuery(client: Client) {
  return client
    .from("events")
    .select("*, event_tags(tags(id, title))")
    .eq("isEventActive", true);
}

async function applyFilters(
  client: Client,
  query: ReturnType<typeof baseQuery>,
  params: Partial<GetEventsParams>,
) {
  const {
    tagIds,
    search,
    from,
    to,
    isFree,
    place,
    page = 1,
    pageSize = EVENTS_PAGE_SIZE,
  } = params;

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  // Overlap semantics: event must intersect the [from, to] range.
  // event.endDate >= from ensures the event hasn't ended before the range starts.
  // event.startDate <= to ensures the event hasn't started after the range ends.
  if (from) {
    query = query.gte("endDate", from);
  }
  if (to) {
    query = query.lte("startDate", to);
  }

  if (isFree) {
    query = query.or("price.is.null,price.eq.0,price.eq.0.00");
  }

  // host is filtered in JS post-fetch (see filterByHost below).
  // PostgREST's JS client misinterprets `organizers::text` (the `::` cast
  // syntax) as a foreign-table join reference, causing a runtime error.

  if (place) {
    query = query.ilike("place", `%${place}%`);
  }

  if (tagIds && tagIds.length > 0) {
    // Many-to-many: fetch matching event IDs first, then filter.
    // Deduplicate so an event tagged with multiple selected tags appears once.
    const { data: links } = await client
      .from("event_tags")
      .select("event_id")
      .in("tag_id", tagIds);

    const ids = [...new Set(links?.map((l) => l.event_id) ?? [])];
    if (ids.length === 0) return null;
    query = query.in("id", ids);
  }

  const rangeFrom = (page - 1) * pageSize;
  query = query.range(rangeFrom, rangeFrom + pageSize - 1);

  return query;
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Active events = current (started, not yet ended) + upcoming (not yet started).
// Ordered soonest first so current events surface at the top naturally.
async function getActiveEvents(
  client: Client,
  params: Partial<GetEventsParams> = {},
): Promise<Event[]> {
  const today = todayStr();
  // endDate >= today catches both multi-day events still running and future events.
  const q = baseQuery(client)
    .gte("endDate", today)
    .order("startDate", { ascending: true })
    .order("startTime", { ascending: true });

  const query = await applyFilters(client, q, params);
  if (!query) return [];

  const { data, error } = await executeQuery(query);
  if (error) throw error;
  return filterByHost((data ?? []).map(mapEvent), params.host);
}

// Past events limited to the last PAST_EVENTS_WINDOW_DAYS days only.
// Showing the full history is unnecessary and slows down the query.
// Ordered most-recent first so freshly-ended events appear at the top.
async function getPastEvents(
  client: Client,
  params: Partial<GetEventsParams> = {},
): Promise<Event[]> {
  const today = todayStr();
  const windowStart = daysAgoStr(PAST_EVENTS_WINDOW_DAYS);

  const q = baseQuery(client)
    .lt("endDate", today)
    .gte("endDate", windowStart)
    .order("endDate", { ascending: false })
    .order("startDate", { ascending: false });

  const query = await applyFilters(client, q, params);
  if (!query) return [];

  const { data, error } = await executeQuery(query);
  if (error) throw error;
  return filterByHost((data ?? []).map(mapEvent), params.host);
}

async function getEventBySlug(
  client: Client,
  slug: string,
): Promise<Event | null> {
  const { data, error } = await client
    .from("events")
    .select("*, event_tags(tags(id, title))")
    .eq("slug", slug)
    .eq("isEventActive", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // No rows found
    throw error;
  }
  return data ? mapEvent(data) : null;
}

async function getRelatedEvents(
  client: Client,
  eventId: number,
  tagIds: number[],
  limit = RELATED_EVENTS_COUNT,
): Promise<Event[]> {
  if (tagIds.length === 0) return [];

  const { data: links, error: linksError } = await client
    .from("event_tags")
    .select("event_id, tag_id")
    .in("tag_id", tagIds);

  if (linksError) throw linksError;

  const overlapCounts = new Map<number, number>();

  for (const link of links ?? []) {
    if (link.event_id === eventId) continue;
    overlapCounts.set(
      link.event_id,
      (overlapCounts.get(link.event_id) ?? 0) + 1,
    );
  }

  const relatedIds = Array.from(overlapCounts.keys());
  if (relatedIds.length === 0) return [];

  const q = baseQuery(client)
    .gte("endDate", todayStr())
    .in("id", relatedIds)
    .order("startDate", { ascending: true })
    .order("startTime", { ascending: true });

  const { data, error } = await executeQuery(q);
  if (error) throw error;

  return (data ?? [])
    .map(mapEvent)
    .sort((left, right) => {
      const overlapDiff =
        (overlapCounts.get(right.id) ?? 0) - (overlapCounts.get(left.id) ?? 0);

      if (overlapDiff !== 0) return overlapDiff;

      const startDateDiff = left.startDate.localeCompare(right.startDate);
      if (startDateDiff !== 0) return startDateDiff;

      return left.startTime.localeCompare(right.startTime);
    })
    .slice(0, limit);
}

// Returns all active event slugs — used by generateStaticParams on the detail page.
async function getAllSlugs(client: Client): Promise<string[]> {
  const { data, error } = await client
    .from("events")
    .select("slug")
    .eq("isEventActive", true)
    .not("slug", "is", null);

  if (error) return [];
  return (data ?? [])
    .map((r) => r.slug)
    .filter((s): s is string => typeof s === "string");
}

export const eventsApi = {
  getActiveEvents,
  getPastEvents,
  getEventBySlug,
  getRelatedEvents,
  getAllSlugs,
};
