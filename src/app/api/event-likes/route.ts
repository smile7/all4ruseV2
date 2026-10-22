import { NextResponse } from "next/server";

import { z } from "zod";

import { EVENT_LIKE_COUNTS_MAX_IDS } from "~/constants";
import { eventLikesApi } from "~/lib/api";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";

export const dynamic = "force-dynamic";

const idsSchema = z
  .string()
  .transform((value) => value.split(",").map(Number))
  .pipe(
    z.array(z.number().int().positive()).min(1).max(EVENT_LIKE_COUNTS_MAX_IDS),
  );

const bodySchema = z
  .object({
    eventId: z.number().int().positive(),
    liked: z.boolean(),
  })
  .strict();

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = idsSchema.safeParse(searchParams.get("ids") ?? "");
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  try {
    const counts = await eventLikesApi.getLikeCounts(
      createSupabasePublicServerClient(),
      parsed.data,
    );
    return NextResponse.json({ counts });
  } catch (err: unknown) {
    console.error("[api/event-likes] read failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const json: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  if (isRateLimited(clientIp(request))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const count = await eventLikesApi.setLiked(
      createSupabaseAdminClient(),
      parsed.data.eventId,
      parsed.data.liked,
    );
    return NextResponse.json({ count });
  } catch (err: unknown) {
    console.error("[api/event-likes] update failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
