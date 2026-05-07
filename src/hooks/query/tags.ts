import { useQuery } from "@tanstack/react-query";

import { tagsApi } from "~/lib/api";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";
import type { Tag } from "~/types";

type Options = {
  initialData?: Tag[];
};

export function useTags({ initialData }: Options = {}) {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => tagsApi.getTags(getSupabaseBrowserClient()),
    initialData,
    staleTime: 5 * 60_000, // Tags change rarely — cache for 5 minutes.
  });
}
