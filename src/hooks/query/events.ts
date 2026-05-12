import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { eventsApi } from "~/lib/api";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";
import type { Event, GetEventsParams } from "~/types";

type Options = {
  initialData?: Event[];
};

export function useActiveEvents(
  params: Partial<GetEventsParams> = {},
  { initialData }: Options = {},
) {
  return useQuery({
    queryKey: ["active-events", params],
    queryFn: () => eventsApi.getActiveEvents(getSupabaseBrowserClient(), params),
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function usePastEvents(
  params: Partial<GetEventsParams> = {},
  { initialData }: Options = {},
) {
  return useQuery({
    queryKey: ["past-events", params],
    queryFn: () => eventsApi.getPastEvents(getSupabaseBrowserClient(), params),
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useCurrentEvents(
  params: Partial<GetEventsParams> = {},
  { initialData }: Options = {},
) {
  return useQuery({
    queryKey: ["current-events", params],
    queryFn: () => eventsApi.getCurrentEvents(getSupabaseBrowserClient(), params),
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
