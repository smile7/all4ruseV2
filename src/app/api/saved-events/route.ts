import { NextResponse } from "next/server";

import { z } from "zod";

import { savedEventsApi } from "~/lib/api";
import { createSupabaseServerClient } from "~/lib/supabase/server";

const eventIdSchema = z.object({
  eventId: z.number().int().positive(),
});

const timingSchema = z.enum(["upcoming", "past"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "ids";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(type === "events" ? { events: [] } : { ids: [] });
  }

  if (type === "events") {
    const parsedTiming = timingSchema.safeParse(
      searchParams.get("timing") ?? "upcoming",
    );
    if (!parsedTiming.success) {
      return NextResponse.json({ error: "invalid_timing" }, { status: 400 });
    }

    const events = await savedEventsApi.getSavedEvents(
      supabase,
      user.id,
      parsedTiming.data,
    );
    return NextResponse.json({ events });
  }

  const ids = await savedEventsApi.getSavedEventIds(supabase, user.id);
  return NextResponse.json({ ids });
}

export async function POST(request: Request) {
  const json: unknown = await request.json().catch(() => null);
  const parsed = eventIdSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await savedEventsApi.saveEvent(supabase, user.id, parsed.data.eventId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const json: unknown = await request.json().catch(() => null);
  const parsed = eventIdSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await savedEventsApi.unsaveEvent(supabase, user.id, parsed.data.eventId);
  return NextResponse.json({ ok: true });
}
