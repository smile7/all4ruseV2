import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { z } from "zod";

import { LOCALES } from "~/constants";
import { eventIndexUrl, submitIndexNow } from "~/lib/indexnow";
import { createSupabaseServerClient } from "~/lib/supabase/server";

const bodySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i),
});

/**
 * Public surfaces now sit behind long ISR windows, so every surface an event
 * can appear on has to be busted here rather than waiting for a timer.
 */
function revalidateEventSurfaces(slug: string) {
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}/${slug}`);
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/free`);
    revalidatePath(`/${locale}/map`);
    // Retired: revalidatePath(`/${locale}/current`) and `/past`.
  }
  // Period and tag listings are a bounded set (a handful of periods, the tag
  // vocabulary), so busting the whole route is cheaper than resolving which
  // ones this event belongs to.
  revalidatePath("/[locale]/events/[period]", "page");
  revalidatePath("/[locale]/tag/[tagSlug]", "page");
  revalidatePath("/sitemap.xml");
  revalidatePath("/feed.xml");
  revalidatePath("/events.ics");
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { slug } = parsed.data;
  const url = eventIndexUrl(slug);
  revalidateEventSurfaces(slug);

  try {
    const submitted = await submitIndexNow([url]);
    return NextResponse.json({ ok: true, submitted });
  } catch {
    // Cache was still busted; IndexNow is best-effort.
    return NextResponse.json({ ok: true, submitted: 0 });
  }
}
