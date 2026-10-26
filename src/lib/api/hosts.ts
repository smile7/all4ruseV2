import type { SupabaseClient } from "@supabase/supabase-js";

import { todayInSofia } from "~/lib/event-utils";
import type { EventHost } from "~/types";
import type { Database, TablesInsert, TablesUpdate } from "~/types/database";

type Client = SupabaseClient<Database>;

async function listHosts(client: Client): Promise<EventHost[]> {
  const { data, error } = await client
    .from("hosts")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function getHostBySlug(
  client: Client,
  slug: string,
): Promise<EventHost | null> {
  const { data, error } = await client
    .from("hosts")
    .select("*")
    .eq("slug", slug.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getHostById(
  client: Client,
  id: string,
): Promise<EventHost | null> {
  const { data, error } = await client
    .from("hosts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function isSlugAvailable(client: Client, slug: string): Promise<boolean> {
  const { data, error } = await client
    .from("hosts")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return !data;
}

async function createHost(
  client: Client,
  row: TablesInsert<"hosts">,
): Promise<EventHost> {
  const { data, error } = await client
    .from("hosts")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function updateHost(
  client: Client,
  id: string,
  row: TablesUpdate<"hosts">,
): Promise<EventHost> {
  const { data, error } = await client
    .from("hosts")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function deleteHost(client: Client, id: string): Promise<void> {
  const { error } = await client.from("hosts").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Links (or unlinks, with `hostId: null`) events to a host. Requires the
 * service-role client: a trigger rejects host_id writes from user sessions.
 * Returns the host ids the events were linked to before, so their pages can
 * be revalidated too.
 */
async function assignEventsHost(
  client: Client,
  eventIds: number[],
  hostId: string | null,
): Promise<{ previousHostIds: string[] }> {
  const { data: before, error: readError } = await client
    .from("events")
    .select("host_id")
    .in("id", eventIds);
  if (readError) throw readError;

  const { error } = await client
    .from("events")
    .update({ host_id: hostId })
    .in("id", eventIds);
  if (error) throw error;

  const previousHostIds = [
    ...new Set(
      (before ?? [])
        .map((row) => row.host_id)
        .filter((id): id is string => id !== null && id !== hostId),
    ),
  ];
  return { previousHostIds };
}

/**
 * Hosts whose page currently lists at least one upcoming event. The page only
 * shows upcoming events, so a host without any renders an empty shell that
 * must stay out of the sitemap (and is noindex on the page itself).
 */
async function getHostSitemapEntries(
  client: Client,
): Promise<{ slug: string; lastModified: string }[]> {
  const { data, error } = await client
    .from("hosts")
    .select("slug, updated_at, events!inner(updated_at)")
    .eq("events.isEventActive", true)
    .gte("events.endDate", todayInSofia())
    .order("updated_at", { referencedTable: "events", ascending: false })
    .limit(1, { referencedTable: "events" });

  if (error) {
    console.error("[getHostSitemapEntries]", error);
    return [];
  }
  // The page changes when the host is edited or any listed event is, so
  // lastmod is whichever happened last.
  return (data ?? []).map((row) => {
    const latestEvent = row.events[0]?.updated_at;
    return {
      slug: row.slug,
      lastModified:
        latestEvent && latestEvent > row.updated_at
          ? latestEvent
          : row.updated_at,
    };
  });
}

export const hostsApi = {
  listHosts,
  getHostBySlug,
  getHostById,
  isSlugAvailable,
  createHost,
  updateHost,
  deleteHost,
  assignEventsHost,
  getHostSitemapEntries,
};
