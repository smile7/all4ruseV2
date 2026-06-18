import { NextResponse } from "next/server";

import {
  checkFacebookEventVisibility,
  FB_EVENT_URL_RE,
} from "~/lib/smart-fill/facebook-public-check";
import { createSupabaseServerClient } from "~/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url =
    body && typeof body === "object" && "url" in body
      ? String((body as { url: unknown }).url ?? "").trim()
      : "";

  if (!FB_EVENT_URL_RE.test(url)) {
    return NextResponse.json(
      { error: "Please provide a valid facebook.com/events/... URL" },
      { status: 422 },
    );
  }

  try {
    const result = await checkFacebookEventVisibility(url);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[smart-fill/facebook/check]", message);
    return NextResponse.json(
      { error: "Could not check this event right now. Try again in a moment." },
      { status: 502 },
    );
  }
}
