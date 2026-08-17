import type { SupabaseClient } from "@supabase/supabase-js";
import { format, subDays } from "date-fns";

import {
  EVENTS_PAGE_SIZE,
  PAST_EVENTS_WINDOW_DAYS,
  RELATED_EVENTS_COUNT,
  RELATED_EVENTS_MIN_COUNT,
} from "~/constants";
import { buildEventSlugFromTitle } from "~/lib/event-slug";
import { sanitizeEventDescription } from "~/lib/event-description-html";
import {
  isEventEnded,
  isVisibleOnCurrentEventsList,
  isVisibleOnHomeActiveList,
  todayInSofia,
} from "~/lib/event-utils";
import type { CoordsSource } from "~/lib/geocode/types";
import type { Event, GetEventsParams, Tag } from "~/types";
import type { Database, Tables } from "~/types/database";

type Client = SupabaseClient<Database>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Supabase join adds event_tags to the row at runtime — typed as unknown
// since the generated types only reflect the base table columns.
type EventRow = Tables<"events"> & { event_tags: unknown };

type QueryResult = {
  data: EventRow[] | null;
  error: { code?: string; message?: string } | null;
};

/** The timezone all events are anchored to — kept in sync with APP_TIMEZONE in event-utils.ts. */
const APP_TIMEZONE = "Europe/Sofia";

function todayStr() {
  return todayInSofia();
}

function daysAgoStr(days: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(
    subDays(new Date(), days),
  );
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

function mapEvent(row: EventRow): Event {
  const { event_tags, ...rest } = row;
  return { ...rest, tags: mapTags(event_tags) };
}

async function reloadEventWithTags(
  client: Client,
  eventId: number,
): Promise<Event> {
  const { data, error } = await client
    .from("events")
    .select("*, event_tags(tags(id, title))")
    .eq("id", eventId)
    .single();
  if (error) throw error;
  return mapEvent(data);
}

// fix "await has no effect" in editors.
async function executeQuery(query: unknown): Promise<QueryResult> {
  return query as Promise<QueryResult>;
}

async function isCreatorConfirmed(
  client: Client,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("profiles")
    .select("is_confirmed")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.is_confirmed === true;
}

/** Sets `slug` from title + numeric id — unique URL for public detail pages. */
async function assignSlug(
  client: Client,
  eventId: number,
  title: string,
): Promise<void> {
  const slug = buildEventSlugFromTitle(title, eventId);
  const { error } = await client
    .from("events")
    .update({ slug })
    .eq("id", eventId);
  if (error) throw error;
}

// Filters events by host name client-side.
// The hosts column is a JSONB array [{name, link}] and the Supabase JS
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
  const { tagIds, search, from, to, isFree, place, page, pageSize } = params;

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

  if (page !== undefined || pageSize !== undefined) {
    const normalizedPage = page ?? 1;
    const normalizedPageSize = pageSize ?? EVENTS_PAGE_SIZE;
    const rangeFrom = (normalizedPage - 1) * normalizedPageSize;
    query = query.range(rangeFrom, rangeFrom + normalizedPageSize - 1);
  }

  return query;
}

// ─── Public API ───────────────────────────────────────────────────────────────

// we drop rows once the end instant has passed, trim multi-day events to the first
// calendar day on the home grid, then order is unchanged from the query.
async function getActiveEvents(
  client: Client,
  params: Partial<GetEventsParams> = {},
): Promise<Event[]> {
  const today = todayStr();
  // endDate >= today catches both multi-day events still running and future events.
  const q = baseQuery(client)
    .gte("endDate", today)
    .order("isEventPremium", { ascending: false, nullsFirst: false })
    .order("startDate", { ascending: true })
    .order("startTime", { ascending: true });

  const query = await applyFilters(client, q, params);
  if (!query) return [];

  const { data, error } = await executeQuery(query);
  if (error) throw error;
  const now = new Date();
  const visible = (data ?? [])
    .map(mapEvent)
    .filter((e) => isVisibleOnHomeActiveList(e, today, now));
  return filterByHost(visible, params.host);
}

// Ongoing multi-day events after the first calendar day (see `isVisibleOnCurrentEventsList`).
async function getCurrentEvents(
  client: Client,
  params: Partial<GetEventsParams> = {},
): Promise<Event[]> {
  const today = todayStr();
  const q = baseQuery(client)
    .gte("endDate", today)
    .order("isEventPremium", { ascending: false, nullsFirst: false })
    .order("startDate", { ascending: true })
    .order("startTime", { ascending: true });

  const query = await applyFilters(client, q, params);
  if (!query) return [];

  const { data, error } = await executeQuery(query);
  if (error) throw error;
  const now = new Date();
  const visible = (data ?? [])
    .map(mapEvent)
    .filter((e) => isVisibleOnCurrentEventsList(e, today, now));
  return filterByHost(visible, params.host);
}

// Past events: include `endDate === today` only after the event end instant; events
// still running today are excluded by `isEventEnded`.
async function getPastEvents(
  client: Client,
  params: Partial<GetEventsParams> = {},
): Promise<Event[]> {
  const today = todayStr();
  const windowStart = daysAgoStr(PAST_EVENTS_WINDOW_DAYS);

  const q = baseQuery(client)
    .lte("endDate", today)
    .gte("endDate", windowStart)
    .order("isEventPremium", { ascending: false, nullsFirst: false })
    .order("endDate", { ascending: false })
    .order("startDate", { ascending: false });

  const query = await applyFilters(client, q, params);
  if (!query) return [];

  const { data, error } = await executeQuery(query);
  if (error) throw error;
  const now = new Date();
  const ended = (data ?? []).map(mapEvent).filter((e) => isEventEnded(e, now));
  return filterByHost(ended, params.host);
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
  eventTitle: string,
  limit = RELATED_EVENTS_COUNT,
): Promise<Event[]> {
  if (tagIds.length === 0) return [];

  const normalizedTitle = eventTitle.trim().toLocaleLowerCase();

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

  const today = todayStr();
  const q = baseQuery(client)
    .gte("endDate", today)
    .in("id", relatedIds)
    .order("startDate", { ascending: true })
    .order("startTime", { ascending: true });

  const { data, error } = await executeQuery(q);
  if (error) throw error;

  const now = new Date();

  const sorted = (data ?? [])
    .map(mapEvent)
    .filter((e) => isVisibleOnHomeActiveList(e, today, now))
    .filter((e) => e.title.trim().toLocaleLowerCase() !== normalizedTitle)
    .sort((left, right) => {
      const overlapDiff =
        (overlapCounts.get(right.id) ?? 0) - (overlapCounts.get(left.id) ?? 0);

      if (overlapDiff !== 0) return overlapDiff;

      const startDateDiff = left.startDate.localeCompare(right.startDate);
      if (startDateDiff !== 0) return startDateDiff;

      return left.startTime.localeCompare(right.startTime);
    });

  // Recurring events (e.g. daily workshops) share the same title across many
  // dates — keep only the soonest occurrence so suggestions aren't dominated
  // by a single series.
  const seenTitles = new Set<string>();
  const deduped = sorted.filter((e) => {
    const key = e.title.trim().toLocaleLowerCase();
    if (seenTitles.has(key)) return false;
    seenTitles.add(key);
    return true;
  });

  const primary = deduped.slice(0, limit);

  // If we ended up with fewer than the minimum, pad with upcoming events that
  // aren't already in the primary list and aren't the current event.
  if (primary.length >= RELATED_EVENTS_MIN_COUNT) return primary;

  const excludeIds = new Set([eventId, ...primary.map((e) => e.id)]);

  const fallbackQ = baseQuery(client)
    .gte("endDate", today)
    .order("startDate", { ascending: true })
    .order("startTime", { ascending: true })
    .limit(RELATED_EVENTS_MIN_COUNT * 4); // fetch extra to survive dedup + filters

  const { data: fallbackData, error: fallbackError } =
    await executeQuery(fallbackQ);
  if (fallbackError) throw fallbackError;

  const fallbackSeenTitles = new Set(
    primary.map((e) => e.title.trim().toLocaleLowerCase()),
  );
  fallbackSeenTitles.add(normalizedTitle);

  const fallbackEvents = (fallbackData ?? [])
    .map(mapEvent)
    .filter((e) => isVisibleOnHomeActiveList(e, today, now))
    .filter((e) => !excludeIds.has(e.id))
    .filter((e) => {
      const key = e.title.trim().toLocaleLowerCase();
      if (fallbackSeenTitles.has(key)) return false;
      fallbackSeenTitles.add(key);
      return true;
    });

  return [
    ...primary,
    ...fallbackEvents.slice(0, RELATED_EVENTS_MIN_COUNT - primary.length),
  ];
}

// Returns all events created by a specific user (both active and inactive).
// Requires an authenticated Supabase client — RLS must allow
// `SELECT WHERE "createdBy" = auth.uid()` on the events table.
async function getMyEvents(client: Client, userId: string): Promise<Event[]> {
  const { data, error } = await client
    .from("events")
    .select("*, event_tags(tags(id, title))")
    .eq("createdBy", userId)
    .order("startDate", { ascending: false })
    .order("startTime", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapEvent);
}

async function getEventsByIds(client: Client, ids: number[]): Promise<Event[]> {
  if (ids.length === 0) return [];

  const { data, error } = await client
    .from("events")
    .select("*, event_tags(tags(id, title))")
    .in("id", ids)
    .eq("isEventActive", true);

  if (error) throw error;
  return (data ?? []).map(mapEvent);
}

// Fetches all active events overlapping a given calendar month.
// Used by the calendar view to include past events for the current/previous months.
async function getEventsByMonthRange(
  client: Client,
  year: number,
  month: number,
): Promise<Event[]> {
  const firstDay = format(new Date(year, month, 1), "yyyy-MM-dd");
  const lastDay = format(new Date(year, month + 1, 0), "yyyy-MM-dd");

  const { data, error } = await client
    .from("events")
    .select("*, event_tags(tags(id, title))")
    .eq("isEventActive", true)
    .lte("startDate", lastDay)
    .gte("endDate", firstDay)
    .order("startDate", { ascending: true })
    .order("startTime", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapEvent);
}

// Returns all active event slugs — used by generateStaticParams on the detail page.
// Returns [] on error (rather than throwing) so a DB hiccup at build time does not
// prevent the app from deploying; ISR handles any slugs that weren't pre-rendered.
async function getAllSlugs(client: Client): Promise<string[]> {
  const { data, error } = await client
    .from("events")
    .select("slug")
    .eq("isEventActive", true)
    .not("slug", "is", null);

  if (error) {
    console.error("[getAllSlugs]", error);
    return [];
  }
  return (data ?? [])
    .map((r) => r.slug)
    .filter((s): s is string => typeof s === "string");
}

// Returns slugs with their creation timestamps — used by the sitemap.
// Events has no updated_at column; created_at is the best available proxy.
// Throws on DB error so the sitemap build fails visibly rather than silently
// omitting all event URLs (which would harm SEO).
async function getAllSlugsWithDates(
  client: Client,
): Promise<{ slug: string; createdAt: string }[]> {
  const { data, error } = await client
    .from("events")
    .select("slug, created_at")
    .eq("isEventActive", true)
    .not("slug", "is", null);

  if (error) {
    console.error("[getAllSlugsWithDates]", error);
    throw error;
  }
  return (data ?? [])
    .filter(
      (r): r is { slug: string; created_at: string } =>
        typeof r.slug === "string",
    )
    .map((r) => ({ slug: r.slug, createdAt: r.created_at }));
}

// ─── Write types ──────────────────────────────────────────────────────────────

type EventWriteInput = {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime?: string | null;
  address: string;
  town: string;
  place?: string | null;
  price?: string | null;
  ticketsLink?: string | null;
  fbLink?: string | null;
  youtubeUrl?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  image?: string | null;
  images?: string[] | null;
  organizers?: { name: string; link?: string }[] | null;
  seriesId?: string | null;
  // Map coords — pass all three together. Create/recurring default omitted values to null.
  lat?: number | null;
  lng?: number | null;
  coords_source?: CoordsSource | null;
};

function eventCoordsFields(
  data: Pick<EventWriteInput, "lat" | "lng" | "coords_source">,
) {
  return {
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    coords_source: data.coords_source ?? null,
  };
}

/** On update, omit the triple to leave stored coords unchanged. */
function eventCoordsUpdateFields(
  data: Pick<EventWriteInput, "lat" | "lng" | "coords_source">,
) {
  if (
    data.lat === undefined &&
    data.lng === undefined &&
    data.coords_source === undefined
  ) {
    return {};
  }
  return eventCoordsFields(data);
}

// ─── Fetch by ID ──────────────────────────────────────────────────────────────

// Fetches a single event by numeric ID, regardless of isEventActive.
// Used by the create-event page in edit/duplicate mode.
async function getEventById(client: Client, id: number): Promise<Event | null> {
  const { data, error } = await client
    .from("events")
    .select("*, event_tags(tags(id, title))")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data ? mapEvent(data) : null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

async function createEvent(
  client: Client,
  userId: string,
  data: EventWriteInput,
  tagIds: number[] = [],
): Promise<Event> {
  const trustedPublisher = await isCreatorConfirmed(client, userId);

  const { data: inserted, error } = await client
    .from("events")
    .insert({
      title: data.title,
      description: sanitizeEventDescription(data.description),
      startDate: data.startDate,
      endDate: data.endDate,
      startTime: data.startTime,
      endTime: data.endTime ?? null,
      address: data.address,
      town: data.town,
      place: data.place ?? null,
      price: data.price ?? null,
      ticketsLink: data.ticketsLink ?? null,
      fbLink: data.fbLink ?? null,
      youtubeUrl: data.youtubeUrl ?? null,
      phoneNumber: data.phoneNumber ?? null,
      email: data.email ?? null,
      image: data.image ?? null,
      images: (data.images ?? null) as import("~/types/database").Json,
      organizers: (data.organizers ?? null) as import("~/types/database").Json,
      seriesId: data.seriesId ?? null,
      ...eventCoordsFields(data),
      isEventActive: trustedPublisher,
      isEventPremium: false,
      isEventCancelled: false,
      isSoldOut: false,
      createdBy: userId,
    })
    .select("id")
    .single();

  if (error) throw error;

  if (tagIds.length > 0) {
    await client
      .from("event_tags")
      .insert(tagIds.map((tag_id) => ({ event_id: inserted.id, tag_id })));
  }

  // Slug is always assigned, even for unconfirmed creators whose events start
  // inactive — this guarantees a valid detail URL is ready the moment the
  // event is later approved (isEventActive flipped to true), regardless of
  // whether that happens through the app or directly in the database.
  await assignSlug(client, inserted.id, data.title);

  return reloadEventWithTags(client, inserted.id);
}

/**
 * Creates multiple occurrences of a recurring event in a single batch.
 * All occurrences share the same seriesId and base data; only startDate/endDate differ.
 * Returns all created events ordered by startDate.
 */
async function createRecurringEvents(
  client: Client,
  userId: string,
  baseData: Omit<EventWriteInput, "startDate" | "endDate" | "seriesId">,
  tagIds: number[],
  occurrenceDates: string[],
  seriesId: string,
): Promise<Event[]> {
  if (occurrenceDates.length === 0) return [];

  const trustedPublisher = await isCreatorConfirmed(client, userId);

  const rows = occurrenceDates.map((date) => ({
    title: baseData.title,
    description: sanitizeEventDescription(baseData.description),
    startDate: date,
    endDate: date,
    startTime: baseData.startTime,
    endTime: baseData.endTime ?? null,
    address: baseData.address,
    town: baseData.town,
    place: baseData.place ?? null,
    price: baseData.price ?? null,
    ticketsLink: baseData.ticketsLink ?? null,
    fbLink: baseData.fbLink ?? null,
    youtubeUrl: baseData.youtubeUrl ?? null,
    phoneNumber: baseData.phoneNumber ?? null,
    email: baseData.email ?? null,
    image: baseData.image ?? null,
    images: (baseData.images ?? null) as import("~/types/database").Json,
    organizers: (baseData.organizers ??
      null) as import("~/types/database").Json,
    seriesId,
    ...eventCoordsFields(baseData),
    isEventActive: trustedPublisher,
    isEventPremium: false,
    isEventCancelled: false,
    isSoldOut: false,
    createdBy: userId,
  }));

  const { data: inserted, error } = await client
    .from("events")
    .insert(rows)
    .select("id");

  if (error) throw error;

  if (tagIds.length > 0) {
    await client
      .from("event_tags")
      .insert(
        inserted.flatMap(({ id }) =>
          tagIds.map((tag_id) => ({ event_id: id, tag_id })),
        ),
      );
  }

  await Promise.all(
    inserted.map(({ id }) => assignSlug(client, id, baseData.title)),
  );

  const { data: all, error: reloadError } = await client
    .from("events")
    .select("*, event_tags(tags(id, title))")
    .in(
      "id",
      inserted.map((r) => r.id),
    )
    .order("startDate", { ascending: true });

  if (reloadError) throw reloadError;
  return (all ?? []).map(mapEvent);
}

async function updateEvent(
  client: Client,
  eventId: number,
  data: EventWriteInput,
  tagIds: number[] = [],
): Promise<Event> {
  const { error } = await client
    .from("events")
    .update({
      title: data.title,
      description: sanitizeEventDescription(data.description),
      startDate: data.startDate,
      endDate: data.endDate,
      startTime: data.startTime,
      endTime: data.endTime ?? null,
      address: data.address,
      town: data.town,
      place: data.place ?? null,
      price: data.price ?? null,
      ticketsLink: data.ticketsLink ?? null,
      fbLink: data.fbLink ?? null,
      youtubeUrl: data.youtubeUrl ?? null,
      phoneNumber: data.phoneNumber ?? null,
      email: data.email ?? null,
      image: data.image ?? null,
      images: (data.images ?? null) as import("~/types/database").Json,
      organizers: (data.organizers ?? null) as import("~/types/database").Json,
      ...eventCoordsUpdateFields(data),
    })
    .eq("id", eventId)
    .select("id")
    .single();

  if (error) throw error;

  // Replace all tag associations
  await client.from("event_tags").delete().eq("event_id", eventId);
  if (tagIds.length > 0) {
    await client
      .from("event_tags")
      .insert(tagIds.map((tag_id) => ({ event_id: eventId, tag_id })));
  }

  let result = await reloadEventWithTags(client, eventId);
  const slugMissing = result.slug == null || String(result.slug).trim() === "";

  // Safety net for events created before slugs were always assigned on
  // creation (or otherwise left without one).
  if (slugMissing) {
    await assignSlug(client, result.id, result.title);
    result = await reloadEventWithTags(client, eventId);
  }

  return result;
}

async function deleteEvent(client: Client, eventId: number): Promise<void> {
  // Remove tag associations before deleting the event (FK constraint)
  await client.from("event_tags").delete().eq("event_id", eventId);
  const { error } = await client.from("events").delete().eq("id", eventId);
  if (error) throw error;
}

async function patchEventCoords(
  client: Client,
  eventId: number,
  coords: Pick<EventWriteInput, "lat" | "lng" | "coords_source">,
): Promise<void> {
  const fields = eventCoordsUpdateFields(coords);
  if (Object.keys(fields).length === 0) return;

  const { error } = await client
    .from("events")
    .update(fields)
    .eq("id", eventId)
    .select("id")
    .single();

  if (error) throw error;
}

export const eventsApi = {
  getActiveEvents,
  getCurrentEvents,
  getPastEvents,
  getEventsByMonthRange,
  getEventBySlug,
  getEventById,
  getRelatedEvents,
  getAllSlugs,
  getAllSlugsWithDates,
  getMyEvents,
  getEventsByIds,
  createEvent,
  createRecurringEvents,
  updateEvent,
  patchEventCoords,
  deleteEvent,
};
