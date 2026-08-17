import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "~/lib/supabase/admin";
import { createSupabaseServerClient } from "~/lib/supabase/server";

import "server-only";

/** Combined cap for /api/geocode, /suggest, and /place. Admin bypasses. */
export const GEOCODE_DAILY_LIMIT = 80;

export function isGeocodeAdmin(userId: string): boolean {
  const adminUserId = process.env.ADMIN_USER_ID;
  return Boolean(adminUserId && userId === adminUserId);
}

export class GeocodeDailyLimitError extends Error {
  readonly used: number;
  readonly limit: number;

  constructor(used: number, limit: number) {
    super(`Daily geocode limit reached (${used}/${limit})`);
    this.name = "GeocodeDailyLimitError";
    this.used = used;
    this.limit = limit;
  }
}

type ConsumeRow = {
  allowed: boolean;
  remaining: number;
  used: number;
};

export function geocodeDailyLimitResponse(err: GeocodeDailyLimitError) {
  return NextResponse.json(
    {
      error: err.message,
      errorCode: "daily_limit_exceeded",
      used: err.used,
      limit: err.limit,
    },
    { status: 429 },
  );
}

/**
 * Atomically checks and increments today's geocode-proxy count for a user.
 * Throws GeocodeDailyLimitError when the daily cap is reached.
 */
export async function consumeGeocodeCall(userId: string): Promise<ConsumeRow> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("consume_geocode_call", {
    p_user_id: userId,
    p_daily_limit: GEOCODE_DAILY_LIMIT,
  });

  if (error) {
    throw new Error(`Geocode rate limit check failed: ${error.message}`);
  }

  const row = (Array.isArray(data) ? data[0] : data) as ConsumeRow | undefined;
  if (!row) {
    throw new Error("Geocode rate limit check returned no data");
  }

  if (!row.allowed) {
    throw new GeocodeDailyLimitError(row.used, GEOCODE_DAILY_LIMIT);
  }

  return row;
}

export async function requireGeocodeUser(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, userId: user.id };
}

/** Admin bypasses. Returns a 429 response when the caller is over the daily cap. */
export async function enforceGeocodeQuota(
  userId: string,
): Promise<NextResponse | null> {
  if (isGeocodeAdmin(userId)) return null;

  try {
    await consumeGeocodeCall(userId);
  } catch (err) {
    if (err instanceof GeocodeDailyLimitError) {
      return geocodeDailyLimitResponse(err);
    }
    throw err;
  }

  return null;
}
