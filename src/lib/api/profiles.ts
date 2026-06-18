import type { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";

import type { Event, Profile, Tag, UpdateProfileInput } from "~/types";
import type { Database } from "~/types/database";

type Client = SupabaseClient<Database>;

export type ProfileUpdatePayload = UpdateProfileInput & {
  avatar_url?: string | null;
  header_url?: string | null;
  profile_gallery?: string[] | null;
};

// ─── Tag / event mappers (mirrors events.ts — kept local to avoid coupling) ──

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

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const profilesApi = {
  async getProfile(client: Client, userId: string) {
    return client.from("profiles").select("*").eq("id", userId).single();
  },

  /** Public — readable without auth. Returns null when username is not found. */
  async getPublicProfile(client: Client, username: string) {
    return client
      .from("profiles")
      .select("*")
      .eq("username", username.toLowerCase())
      .single();
  },

  /** Returns true when no other profile owns this username. */
  async isUsernameAvailable(
    client: Client,
    username: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    const normalized = username.trim().toLowerCase();
    if (!normalized) return true;

    const { data, error } = await client
      .from("profiles")
      .select("id")
      .eq("username", normalized)
      .maybeSingle();

    if (error) throw error;
    if (!data) return true;
    if (excludeUserId && data.id === excludeUserId) return true;
    return false;
  },

  /**
   * Upcoming (endDate >= today) public events for a profile.
   * Also returns the total count of all active events to determine "host mode".
   */
  async getPublicProfileUpcomingEvents(
    client: Client,
    userId: string,
  ): Promise<{ upcoming: Event[]; total: number }> {
    const today = todayStr();

    const [upcomingResult, countResult] = await Promise.all([
      client
        .from("events")
        .select("*, event_tags(tags(id, title))")
        .eq("createdBy", userId)
        .eq("isEventActive", true)
        .gte("endDate", today)
        .order("startDate", { ascending: true })
        .order("startTime", { ascending: true }),

      client
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("createdBy", userId)
        .eq("isEventActive", true),
    ]);

    return {
      upcoming: (upcomingResult.data ?? []).map(mapEvent),
      total: countResult.count ?? 0,
    };
  },

  /** Past (endDate < today) public events — loaded lazily on the profile page. */
  async getPublicProfilePastEvents(
    client: Client,
    userId: string,
  ): Promise<Event[]> {
    const today = todayStr();
    const { data, error } = await client
      .from("events")
      .select("*, event_tags(tags(id, title))")
      .eq("createdBy", userId)
      .eq("isEventActive", true)
      .lt("endDate", today)
      .order("startDate", { ascending: false })
      .order("startTime", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapEvent);
  },

  /** Saved events for a profile — used on the public profile page. */
  async getPublicProfileSavedEvents(
    client: Client,
    userId: string,
  ): Promise<Event[]> {
    const today = todayStr();
    const { data, error } = await client
      .from("saved_events")
      .select("events!inner(*, event_tags(tags(id, title)))")
      .eq("user_id", userId)
      .gte("events.endDate", today)
      .order("events(startDate)", { ascending: true });

    if (error) throw error;
    return (data ?? [])
      .map((row: unknown) => {
        if (row && typeof row === "object" && "events" in row) {
          return mapEvent((row as { events: unknown }).events);
        }
        return null;
      })
      .filter((e): e is Event => e !== null);
  },

  async updateProfile(client: Client, userId: string, values: ProfileUpdatePayload) {
    // header_url is cast via `any` because the DB column may not exist yet.
    // Once the column is added and `npm run db:types` is run, this cast can be removed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = { ...values, updated_at: new Date().toISOString() } as any;
    return client
      .from("profiles")
      .update(payload)
      .eq("id", userId)
      .select()
      .single<Profile>();
  },
};
