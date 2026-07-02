import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "~/lib/supabase/admin";

export const SMART_FILL_DAILY_LIMIT = 7;

export function isSmartFillAdmin(userId: string): boolean {
  const adminUserId = process.env.ADMIN_USER_ID;
  return Boolean(adminUserId && userId === adminUserId);
}

export class SmartFillDailyLimitError extends Error {
  readonly used: number;
  readonly limit: number;

  constructor(used: number, limit: number) {
    super(`Daily smart fill limit reached (${used}/${limit})`);
    this.name = "SmartFillDailyLimitError";
    this.used = used;
    this.limit = limit;
  }
}

type ConsumeRow = {
  allowed: boolean;
  remaining: number;
  used: number;
};

export function smartFillDailyLimitResponse(err: SmartFillDailyLimitError) {
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
 * Atomically checks and increments today's smart-fill import count for a user.
 * Throws SmartFillDailyLimitError when the daily cap is reached.
 */
export async function consumeSmartFillImport(
  userId: string,
): Promise<ConsumeRow> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("consume_smart_fill_import", {
    p_user_id: userId,
    p_daily_limit: SMART_FILL_DAILY_LIMIT,
  });

  if (error) {
    throw new Error(`Smart fill rate limit check failed: ${error.message}`);
  }

  const row = (Array.isArray(data) ? data[0] : data) as ConsumeRow | undefined;
  if (!row) {
    throw new Error("Smart fill rate limit check returned no data");
  }

  if (!row.allowed) {
    throw new SmartFillDailyLimitError(row.used, SMART_FILL_DAILY_LIMIT);
  }

  return row;
}
