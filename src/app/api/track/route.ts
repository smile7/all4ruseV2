import { NextResponse } from "next/server";

import { z } from "zod";

import { TRACKED_EVENT_KEYS } from "~/lib/analytics/tracked-events";
import { clickCountsApi } from "~/lib/api/click-counts";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  eventKey: z.enum(TRACKED_EVENT_KEYS),
});

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 40;

const hitsByIp = new Map<string, number[]>();

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hitsByIp.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= RATE_LIMIT_MAX) {
    hitsByIp.set(ip, recent);
    return true;
  }
  recent.push(now);
  hitsByIp.set(ip, recent);
  return false;
}

export async function POST(request: Request) {
  const json: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  if (isRateLimited(clientIp(request))) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    await clickCountsApi.incrementClick(
      createSupabaseAdminClient(),
      parsed.data.eventKey,
    );
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    console.error("[api/track] increment failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
