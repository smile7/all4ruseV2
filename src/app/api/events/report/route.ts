import { NextResponse } from "next/server";

import { z } from "zod";

import { reportsApi } from "~/lib/api/reports";
import { createSupabaseServerClient } from "~/lib/supabase/server";

const bodySchema = z.object({
  eventId: z.number().int().positive(),
  message: z.string().max(1000).nullable().optional(),
});

export async function POST(request: Request) {
  const json: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { eventId, message } = parsed.data;

  try {
    const report = await reportsApi.createEventReport(
      supabase,
      eventId,
      user.id,
      message ?? null,
    );
    return NextResponse.json({ ok: true, report });
  } catch (err: unknown) {
    // 23505 = unique_violation: already reported
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      return NextResponse.json({ error: "already_reported" }, { status: 409 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
