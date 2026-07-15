import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "~/contexts/AuthContext";
import type { Event } from "~/types";

type SavedEventsTiming = "upcoming" | "past";

export const savedEventsKeys = {
  user: ["auth-user"] as const,
  ids: (userId: string) => ["saved-events", "ids", userId] as const,
  list: (userId: string, timing: SavedEventsTiming) =>
    ["saved-events", "list", userId, timing] as const,
};

export function useCurrentUserId() {
  const { userId } = useAuth();
  return { data: userId };
}

export function useSavedEventIds(userId: string | null | undefined) {
  return useQuery({
    queryKey: userId
      ? savedEventsKeys.ids(userId)
      : ["saved-events", "ids", "guest"],
    queryFn: async () => {
      const response = await fetch("/api/saved-events");
      if (!response.ok) throw new Error("Failed to fetch saved events");
      const data = (await response.json()) as { ids: number[] };
      return data.ids;
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useSavedEvents(
  userId: string,
  timing: SavedEventsTiming,
  options: { enabled?: boolean; initialData?: Event[] } = {},
) {
  return useQuery({
    queryKey: savedEventsKeys.list(userId, timing),
    queryFn: async () => {
      const response = await fetch(
        `/api/saved-events?type=events&timing=${timing}`,
      );
      if (!response.ok) throw new Error("Failed to fetch saved events");
      const data = (await response.json()) as { events: Event[] };
      return data.events;
    },
    enabled: options.enabled ?? true,
    initialData: options.initialData,
    staleTime: 60_000,
  });
}

export function useToggleSavedEvent(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      nextSaved,
    }: {
      eventId: number;
      nextSaved: boolean;
    }) => {
      const response = await fetch("/api/saved-events", {
        method: nextSaved ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update saved event");
      }
    },
    onMutate: async ({ eventId, nextSaved }) => {
      const idsKey = savedEventsKeys.ids(userId);
      await queryClient.cancelQueries({ queryKey: idsKey });

      const previousIds = queryClient.getQueryData<number[]>(idsKey) ?? [];
      queryClient.setQueryData<number[]>(idsKey, (current = []) => {
        if (nextSaved) {
          return current.includes(eventId) ? current : [...current, eventId];
        }
        return current.filter((id) => id !== eventId);
      });

      return { previousIds };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(
        savedEventsKeys.ids(userId),
        context?.previousIds ?? [],
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: savedEventsKeys.ids(userId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["saved-events", "list", userId],
      });
    },
  });
}
