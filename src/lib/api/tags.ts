import type { SupabaseClient } from "@supabase/supabase-js";

import type { Tag } from "~/types";
import type { Database } from "~/types/database";

type Client = SupabaseClient<Database>;

// Returns all tags that appear in at least one event, sorted by usage
// (most-used first). Two queries + JS sort avoids complex GROUP BY.
async function getTags(client: Client): Promise<Tag[]> {
  const [tagsResult, linksResult] = await Promise.all([
    client.from("tags").select("id, title"),
    client.from("event_tags").select("tag_id"),
  ]);

  if (tagsResult.error) throw tagsResult.error;

  // Count how many events use each tag.
  const counts = new Map<number, number>();
  for (const link of linksResult.data ?? []) {
    counts.set(link.tag_id, (counts.get(link.tag_id) ?? 0) + 1);
  }

  return (tagsResult.data ?? [])
    .filter(
      (tag): tag is Tag =>
        typeof tag.title === "string" && tag.title.length > 0,
    )
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
}

export const tagsApi = { getTags };
