import {
  geocodeUpcomingEvents,
  GeocodingKeyMissingError,
} from "~/lib/geocode/backfill";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";

/** Preferred first-run path — the HTTP admin route can time out on Vercel Hobby. */
async function main() {
  try {
    const summary = await geocodeUpcomingEvents(createSupabaseAdminClient());
    console.log("Upcoming geocode backfill");
    console.log(`  considered:    ${summary.considered}`);
    console.log(`  skipped empty: ${summary.skippedEmpty}`);
    console.log(`  updated:       ${summary.updated}`);
    console.log(`  failed:        ${summary.failed}`);
  } catch (err) {
    if (err instanceof GeocodingKeyMissingError) {
      console.error(err.message);
      process.exitCode = 1;
      return;
    }
    console.error(err);
    process.exitCode = 1;
  }
}

void main();
