import type { SupabaseClient } from "@supabase/supabase-js";

import type { Tag } from "~/types";
import type { Database } from "~/types/database";

type Client = SupabaseClient<Database>;

// Returns all tags that have at least one active event — used to populate filter UI.
async function getTags(client: Client): Promise<Tag[]> {
  const { data, error } = await client
    .from("tags")
    .select("id, title")
    .order("title", { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .filter((tag): tag is Tag => typeof tag.title === "string" && tag.title.length > 0);
}

export const tagsApi = { getTags };
