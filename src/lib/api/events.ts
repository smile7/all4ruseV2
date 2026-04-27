import type { SupabaseClient } from "@supabase/supabase-js";
import { format, subDays } from "date-fns";

import { EVENTS_PAGE_SIZE, PAST_EVENTS_WINDOW_DAYS } from "~/constants";
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
  const { tagId, search, startDate, endDate, page = 1, pageSize = EVENTS_PAGE_SIZE } = params;

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }
  if (startDate) {
    query = query.gte("startDate", startDate);
  }
  if (endDate) {
    query = query.lte("endDate", endDate);
  }
  if (tagId) {
    // Many-to-many: fetch matching event IDs first, then filter.
    const { data: links } = await client
      .from("event_tags")
      .select("event_id")
      .eq("tag_id", tagId);

    const ids = links?.map((l) => l.event_id) ?? [];
    if (ids.length === 0) return null; // No events have this tag
    query = query.in("id", ids);
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

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
  return (data ?? []).map(mapEvent);
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
  return (data ?? []).map(mapEvent);
}

async function getEventBySlug(client: Client, slug: string): Promise<Event | null> {
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

export const eventsApi = {
  getActiveEvents,
  getPastEvents,
  getEventBySlug,
};
