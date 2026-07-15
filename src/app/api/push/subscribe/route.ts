import { NextResponse } from "next/server";

import { z } from "zod";

import { pushSubscriptionsApi } from "~/lib/api/push-subscriptions";
import { pushNotificationsLib } from "~/lib/push-notifications";
import { createSupabaseServerClient } from "~/lib/supabase/server";

const subscribeSchema = z.object({
  endpoint: z
    .string()
    .url()
    .refine(pushNotificationsLib.isAllowedPushEndpoint, {
      message: "Invalid push endpoint",
    }),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

const unsubscribeSchema = z.object({
  endpoint: z
    .string()
    .url()
    .refine(pushNotificationsLib.isAllowedPushEndpoint, {
      message: "Invalid push endpoint",
    }),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  await pushSubscriptionsApi.savePushSubscription(
    supabase,
    user.id,
    parsed.data,
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  await pushSubscriptionsApi.deletePushSubscription(
    supabase,
    user.id,
    parsed.data.endpoint,
  );

  return NextResponse.json({ ok: true });
}
