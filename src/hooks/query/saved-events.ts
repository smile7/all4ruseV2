import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { savedEventsApi } from "~/lib/api";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";
import type { Event } from "~/types";

type SavedEventsTiming = "upcoming" | "past";

export const savedEventsKeys = {
  user: ["auth-user"] as const,
  ids: (userId: string) => ["saved-events", "ids", userId] as const,
  list: (userId: string, timing: SavedEventsTiming) =>
    ["saved-events", "list", userId, timing] as const,
};

export function useCurrentUserId() {
  return useQuery({
    queryKey: savedEventsKeys.user,
    queryFn: async () => {
      const {
        data: { user },
      } = await getSupabaseBrowserClient().auth.getUser();
      return user?.id ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSavedEventIds(userId: string | null | undefined) {
  return useQuery({
    queryKey: userId ? savedEventsKeys.ids(userId) : ["saved-events", "ids", "guest"],
    queryFn: () =>
      savedEventsApi.getSavedEventIds(getSupabaseBrowserClient(), userId ?? ""),
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
    queryFn: () =>
      savedEventsApi.getSavedEvents(getSupabaseBrowserClient(), userId, timing),
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
      const client = getSupabaseBrowserClient();
      if (nextSaved) {
        await savedEventsApi.saveEvent(client, userId, eventId);
      } else {
        await savedEventsApi.unsaveEvent(client, userId, eventId);
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
      queryClient.setQueryData(savedEventsKeys.ids(userId), context?.previousIds ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: savedEventsKeys.ids(userId) });
      void queryClient.invalidateQueries({
        queryKey: ["saved-events", "list", userId],
      });
    },
  });
}
