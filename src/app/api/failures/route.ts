import { NextResponse } from "next/server";

import { z } from "zod";

import { FAILURE_MESSAGE_MAX_LENGTH, FAILURE_STAGES } from "~/lib/failures";
import { recordFailure } from "~/lib/failures-server";
import { createSupabaseServerClient } from "~/lib/supabase/server";

export const dynamic = "force-dynamic";

const reportFields = {
  message: z.string().trim().max(FAILURE_MESSAGE_MAX_LENGTH).optional(),
  metadata: z
    .record(z.string().max(50), z.string().max(200))
    .refine((value) => Object.keys(value).length <= 10)
    .optional(),
};

/** Smart fill is not accepted here: those failures are recorded server-side. */
const failureSchema = z.discriminatedUnion("flow", [
  z.object({
    flow: z.literal("push_enable"),
    stage: z.enum(FAILURE_STAGES.push_enable),
    ...reportFields,
  }),
  z.object({
    flow: z.literal("auth"),
    stage: z.enum(FAILURE_STAGES.auth),
    ...reportFields,
  }),
]);

/**
 * Records a failure that happened in the browser. Anonymous callers are
 * allowed because sign-up and "not signed in" failures are worth capturing;
 * the payload is a fixed enum plus bounded strings, so rows stay small.
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

  await recordFailure({
    ...parsed.data,
    userId: user?.id ?? null,
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true });
}
