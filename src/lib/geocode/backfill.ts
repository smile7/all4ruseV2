import type { SupabaseClient } from "@supabase/supabase-js";

import { todayInSofia } from "~/lib/event-utils";
import { geocodeAddress, hasGeocodingApiKey } from "~/lib/geocode/google";
import { buildGeocodeQuery } from "~/lib/geocode/query";
import type { Database } from "~/types/database";

import "server-only";

const GOOGLE_CALL_DELAY_MS = 200;

type Client = SupabaseClient<Database>;

export type UpcomingGeocodeSummary = {
  considered: number;
  skippedEmpty: number;
  updated: number;
  failed: number;
};

export class GeocodingKeyMissingError extends Error {
  constructor() {
    super("GOOGLE_MAPS_GEOCODING_API_KEY is not configured");
    this.name = "GeocodingKeyMissingError";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Geocodes upcoming events that have no coords yet. Sequential, 200 ms
 * between Google calls. Never writes to past rows.
 */
export async function geocodeUpcomingEvents(
  client: Client,
): Promise<UpcomingGeocodeSummary> {
  if (!hasGeocodingApiKey()) {
    throw new GeocodingKeyMissingError();
  }

  const today = todayInSofia();
  const { data, error } = await client
    .from("events")
    .select("id, place, address, town")
    .is("lat", null)
    .gte("endDate", today)
    .order("id", { ascending: true });

  if (error) throw error;

  const rows = data ?? [];
  const summary: UpcomingGeocodeSummary = {
    considered: rows.length,
    skippedEmpty: 0,
    updated: 0,
    failed: 0,
  };

  let googleCalls = 0;

  for (const row of rows) {
    const query = buildGeocodeQuery(row.place, row.address, row.town);
    if (query.length === 0) {
      summary.skippedEmpty += 1;
      continue;
    }

    if (googleCalls > 0) await delay(GOOGLE_CALL_DELAY_MS);
    googleCalls += 1;

    const result = await geocodeAddress(row.place, row.address, row.town);
    if (result.lat == null || result.lng == null) {
      summary.failed += 1;
      continue;
    }

    const { data: updated, error: updateError } = await client
      .from("events")
      .update({
        lat: result.lat,
        lng: result.lng,
        coords_source: "geocode",
      })
      .eq("id", row.id)
      .is("lat", null)
      .gte("endDate", today)
      .select("id")
      .maybeSingle();

    if (updateError || !updated) {
      summary.failed += 1;
      continue;
    }

    summary.updated += 1;
  }

  return summary;
}
