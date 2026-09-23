import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "~/lib/supabase/admin";

export const SMART_FILL_DAILY_LIMIT = 7;

export type SmartFillFeature = "facebook" | "text" | "image";

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

export type SmartFillConsumption = ConsumeRow & {
  userId: string;
  feature: SmartFillFeature;
  /** UTC day the import was counted against; refunds must target the same day. */
  usageDate: string;
};

/**
 * Atomically checks and increments today's smart-fill import count for a user.
 * Pass `feature` to also increment the per-feature counter for analytics.
 * Throws SmartFillDailyLimitError when the daily cap is reached.
 */
export async function consumeSmartFillImport(
  userId: string,
  feature: SmartFillFeature,
): Promise<SmartFillConsumption> {
  const usageDate = new Date().toISOString().slice(0, 10);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("consume_smart_fill_import", {
    p_user_id: userId,
    p_daily_limit: SMART_FILL_DAILY_LIMIT,
    p_feature: feature,
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

  return { ...row, userId, feature, usageDate };
}

/**
 * Gives back an import that failed on our side, so users only spend quota on
 * imports that produced a draft. Best-effort: a failed refund is only logged.
 */
export async function refundSmartFillImport(
  consumption: SmartFillConsumption | null,
): Promise<void> {
  if (!consumption) return;

  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("refund_smart_fill_import", {
    p_user_id: consumption.userId,
    p_usage_date: consumption.usageDate,
    p_feature: consumption.feature,
  });

  if (error) {
    console.error("[smart-fill] refund failed:", error.message);
  }
}
