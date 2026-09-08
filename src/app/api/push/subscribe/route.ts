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

export const dynamic = "force-dynamic";

/** Tells the client whether this endpoint is stored for the signed-in user, so
 *  the UI can reflect delivery reality rather than local browser state. */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const endpoint = new URL(request.url).searchParams.get("endpoint");
  if (
    !user ||
    !endpoint ||
    !pushNotificationsLib.isAllowedPushEndpoint(endpoint)
  ) {
    return NextResponse.json({ registered: false });
  }

  const registered = await pushSubscriptionsApi.hasPushSubscription(
    supabase,
    user.id,
    endpoint,
  );

  return NextResponse.json({ registered });
}

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
