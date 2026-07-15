import { NextResponse } from "next/server";

import {
  getCurrentHourInBulgaria,
  pushSubscriptionsApi,
} from "~/lib/api/push-subscriptions";
import { pushNotificationsLib } from "~/lib/push-notifications";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";

// Vercel Cron calls this endpoint every hour on the hour (HTTP GET).
// It is protected by a shared secret to prevent unauthorized triggering.
export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds — enough for batch push sends

async function handleSendReminders(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentHour = getCurrentHourInBulgaria();

  const supabase = createSupabaseAdminClient();

  const [subscriptions, debug] = await Promise.all([
    pushSubscriptionsApi.getSubscriptionsForTodayReminders(
      supabase,
      currentHour,
    ),
    pushSubscriptionsApi.getReminderDebugCounts(supabase, currentHour),
  ]);

  if (subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, debug });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

  let sent = 0;
  const endpointsToDelete = new Set<string>();

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const payload = pushNotificationsLib.buildReminderPayload(
        sub.eventTitle,
        sub.eventSlug,
        baseUrl,
      );
      const result = await pushNotificationsLib.sendPushNotification(
        sub,
        payload,
      );
      if (result.ok) {
        sent++;
      } else if (result.invalid || result.gone) {
        endpointsToDelete.add(sub.endpoint);
      }
    }),
  );

  // Best-effort cleanup of invalid or expired subscriptions.
  if (endpointsToDelete.size > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", [...endpointsToDelete]);
  }

  return NextResponse.json({
    sent,
    removed: endpointsToDelete.size,
    debug,
  });
}

export async function POST(request: Request) {
  return handleSendReminders(request);
}

export async function GET(request: Request) {
  return handleSendReminders(request);
}
