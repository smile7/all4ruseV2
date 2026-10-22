import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { EVENT_LIKE_COUNTS_MAX_IDS } from "~/constants";

const LIKED_STORAGE_KEY = "a4r-liked-events";

export const eventLikesKeys = {
  liked: ["event-likes", "liked"] as const,
  count: (eventId: number) => ["event-likes", "count", eventId] as const,
};

// ─── Liked ids (this browser) ────────────────────────────────────────────────

function readLikedIds(): number[] {
  try {
    const raw: unknown = JSON.parse(
      localStorage.getItem(LIKED_STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(raw)
      ? raw.filter((id): id is number => Number.isInteger(id))
      : [];
  } catch {
    return [];
  }
}

function writeLikedIds(ids: number[]) {
  try {
    localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Private mode can block storage; the like still counts this session.
  }
}

// ─── Counts (batched) ────────────────────────────────────────────────────────

// Every card asks for its own count. Requests made in the same tick are
// merged into one GET so a list page costs a single round trip.
let pendingIds = new Set<number>();
let pendingBatch: Promise<Record<string, number>> | null = null;

async function fetchLikeCounts(ids: number[]): Promise<Record<string, number>> {
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += EVENT_LIKE_COUNTS_MAX_IDS) {
    chunks.push(ids.slice(i, i + EVENT_LIKE_COUNTS_MAX_IDS));
  }

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const response = await fetch(`/api/event-likes?ids=${chunk.join(",")}`);
      if (!response.ok) throw new Error("Failed to fetch like counts");
      const data = (await response.json()) as {
        counts: Record<string, number>;
      };
      return data.counts;
    }),
  );

  return Object.assign({}, ...results) as Record<string, number>;
}

function loadLikeCount(eventId: number): Promise<number> {
  pendingIds.add(eventId);
  pendingBatch ??= new Promise<void>((resolve) => setTimeout(resolve, 0)).then(
    () => {
      const ids = [...pendingIds];
      pendingIds = new Set();
      pendingBatch = null;
      return fetchLikeCounts(ids);
    },
  );
  return pendingBatch.then((counts) => counts[String(eventId)] ?? 0);
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useLikedEventIds() {
  return useQuery({
    queryKey: eventLikesKeys.liked,
    queryFn: readLikedIds,
    staleTime: Infinity,
  });
}

export function useEventLikeCount(eventId: number) {
  return useQuery({
    queryKey: eventLikesKeys.count(eventId),
    queryFn: () => loadLikeCount(eventId),
    staleTime: 60_000,
  });
}

export function useToggleEventLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      liked,
    }: {
      eventId: number;
      liked: boolean;
    }) => {
      const response = await fetch("/api/event-likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, liked }),
      });
      if (!response.ok) throw new Error("Failed to update like");
      const data = (await response.json()) as { count: number };
      return data.count;
    },
    onMutate: async ({ eventId, liked }) => {
      const countKey = eventLikesKeys.count(eventId);
      await queryClient.cancelQueries({ queryKey: countKey });

      const previousIds = readLikedIds();
      const previousCount = queryClient.getQueryData<number>(countKey) ?? 0;

      const nextIds = liked
        ? [...previousIds.filter((id) => id !== eventId), eventId]
        : previousIds.filter((id) => id !== eventId);
      writeLikedIds(nextIds);
      queryClient.setQueryData(eventLikesKeys.liked, nextIds);
      queryClient.setQueryData(
        countKey,
        Math.max(previousCount + (liked ? 1 : -1), 0),
      );

      return { previousIds, previousCount };
    },
    onError: (_error, { eventId }, context) => {
      if (!context) return;
      writeLikedIds(context.previousIds);
      queryClient.setQueryData(eventLikesKeys.liked, context.previousIds);
      queryClient.setQueryData(
        eventLikesKeys.count(eventId),
        context.previousCount,
      );
    },
    onSuccess: (count, { eventId }) => {
      queryClient.setQueryData(eventLikesKeys.count(eventId), count);
    },
  });
}
