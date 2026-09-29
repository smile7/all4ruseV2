import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { z } from "zod";

import { DEFAULT_LOCALE, LOCALES } from "~/constants";
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

function revalidateEventSurfaces(slug: string) {
  revalidatePath(`/${DEFAULT_LOCALE}/${slug}`);
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}`);
  }
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
