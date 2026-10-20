import { NextResponse } from "next/server";

import { z } from "zod";

import {
  PWA_DISPLAY_MODES,
  PWA_EVENT_NAMES,
  PWA_LAUNCH_SOURCES,
  PWA_PLATFORMS,
} from "~/lib/analytics/pwa-events";
import { pwaEventsApi } from "~/lib/api/pwa-events";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    visitorId: z.string().uuid(),
    eventName: z.enum(PWA_EVENT_NAMES),
    platform: z.enum(PWA_PLATFORMS),
    displayMode: z.enum(PWA_DISPLAY_MODES),
    launchSource: z.enum(PWA_LAUNCH_SOURCES).nullable(),
    durationSeconds: z.number().int().min(0).max(86_400).nullable(),
  })
  .strict();

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

function userAgent(request: Request): string | null {
  const header = request.headers.get("user-agent")?.trim();
  if (!header) return null;
  return header.slice(0, 512);
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
    const client = createSupabaseAdminClient();
    await pwaEventsApi.recordPwaEvent(client, {
      ...parsed.data,
      userAgent: userAgent(request),
    });
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    console.error("[api/pwa-events] record failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
