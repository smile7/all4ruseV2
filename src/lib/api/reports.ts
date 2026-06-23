import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "~/types/database";

type Client = SupabaseClient<Database>;

export type EventReport = Tables<"event_reports">;

async function createEventReport(
  client: Client,
  eventId: number,
  reporterId: string,
  message: string | null,
): Promise<EventReport> {
  const { data, error } = await client
    .from("event_reports")
    .insert({ event_id: eventId, reporter_id: reporterId, message })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getMyReportForEvent(
  client: Client,
  eventId: number,
  reporterId: string,
): Promise<EventReport | null> {
  const { data, error } = await client
    .from("event_reports")
    .select()
    .eq("event_id", eventId)
    .eq("reporter_id", reporterId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export const reportsApi = {
  createEventReport,
  getMyReportForEvent,
};
