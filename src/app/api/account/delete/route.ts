import { NextResponse } from "next/server";

import { z } from "zod";

import { eventsApi } from "~/lib/api";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";
import { createSupabaseServerClient } from "~/lib/supabase/server";

const bodySchema = z.object({
  confirmation: z.literal("DELETE"),
});

export async function POST(request: Request) {
  const json: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_confirmation" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const myEvents = await eventsApi.getMyEvents(supabase, user.id);
    for (const e of myEvents) {
      await eventsApi.deleteEvent(supabase, e.id);
    }

    const admin = createSupabaseAdminClient();
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteAuthError) {
      return NextResponse.json({ error: "auth_delete_failed" }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
