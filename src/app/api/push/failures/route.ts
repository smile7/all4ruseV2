import { NextResponse } from "next/server";

import { z } from "zod";

import { pushSubscriptionsApi } from "~/lib/api/push-subscriptions";
import { PUSH_ENABLE_FAILURE_STAGES } from "~/lib/push-client";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";
import { createSupabaseServerClient } from "~/lib/supabase/server";

export const dynamic = "force-dynamic";

const failureSchema = z.object({
  stage: z.enum(PUSH_ENABLE_FAILURE_STAGES),
  message: z.string().trim().max(500).optional(),
  permission: z
    .enum(["default", "granted", "denied", "unsupported"])
    .optional(),
});

/**
 * Records a failed attempt to enable reminders. Anonymous callers are allowed
 * because "not signed in" is itself a failure mode worth capturing; the payload
 * is a fixed enum plus a bounded message, so rows stay small.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = failureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await pushSubscriptionsApi.logPushEnableFailure(
    createSupabaseAdminClient(),
    user?.id ?? null,
    {
      stage: parsed.data.stage,
      message: parsed.data.message ?? null,
      permission: parsed.data.permission ?? null,
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
  );

  return NextResponse.json({ ok: true });
}
