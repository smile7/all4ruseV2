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

/**
 * Fetches all events (including past) that overlap the given calendar month.
 * Only enabled for the current month and past months — not triggered for future months.
 * Each month gets its own query cache key so navigation backwards lazily populates them.
 */
export function useCalendarMonthEvents(year: number, month: number) {
  const now = new Date();
  const isPastOrCurrent =
    year < now.getFullYear() ||
    (year === now.getFullYear() && month <= now.getMonth());

  return useQuery({
    queryKey: ["calendar-month-events", year, month],
    queryFn: () =>
      eventsApi.getEventsByMonthRange(getSupabaseBrowserClient(), year, month),
    enabled: isPastOrCurrent,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
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
