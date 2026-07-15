import { NextResponse } from "next/server";

import { z } from "zod";

import { createSupabaseServerClient } from "~/lib/supabase/server";

const schema = z.object({
  reminderTime: z
    .string()
    .regex(/^(0[6-9]|1[0-9]|2[0-2]):00$/, "Invalid reminder time"),
});

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ reminder_time: parsed.data.reminderTime })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
