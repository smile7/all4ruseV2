import { NextResponse } from "next/server";

import {
  geocodeUpcomingEvents,
  GeocodingKeyMissingError,
} from "~/lib/geocode/backfill";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";
import { createSupabaseServerClient } from "~/lib/supabase/server";

/** Pro plans honor this; Hobby still caps at 10s. Prefer `npm run geocode:upcoming`. */
export const maxDuration = 300;

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const adminUserId = process.env.ADMIN_USER_ID;
  if (!adminUserId || user.id !== adminUserId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data: locked, error: lockError } = await admin.rpc(
    "try_lock_geocode_upcoming",
  );

  if (lockError) {
    console.error("[admin/geocode-upcoming] lock", lockError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (locked !== true) {
    return NextResponse.json({ error: "already_running" }, { status: 409 });
  }

  try {
    const summary = await geocodeUpcomingEvents(admin);
    return NextResponse.json(summary);
  } catch (err) {
    if (err instanceof GeocodingKeyMissingError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("[admin/geocode-upcoming]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    const { error: unlockError } = await admin.rpc("unlock_geocode_upcoming");
    if (unlockError) {
      console.error("[admin/geocode-upcoming] unlock", unlockError);
    }
  }
}
