import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "~/types/database";

type Client = SupabaseClient<Database>;

export type EventClaim = Tables<"event_claims">;
export type ClaimStatus = "pending" | "approved" | "declined";

async function createEventClaim(
  client: Client,
  eventId: number,
  claimantId: string,
  message: string | null,
): Promise<EventClaim> {
  const { data, error } = await client
    .from("event_claims")
    .insert({ event_id: eventId, claimant_id: claimantId, message })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getMyClaimForEvent(
  client: Client,
  eventId: number,
  claimantId: string,
): Promise<EventClaim | null> {
  const { data, error } = await client
    .from("event_claims")
    .select()
    .eq("event_id", eventId)
    .eq("claimant_id", claimantId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export const claimsApi = {
  createEventClaim,
  getMyClaimForEvent,
};
