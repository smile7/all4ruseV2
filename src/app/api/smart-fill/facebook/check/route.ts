import { NextResponse } from "next/server";

import { checkFacebookEventVisibility } from "~/lib/smart-fill/facebook-public-check";
import { resolveFacebookEventUrl } from "~/lib/smart-fill/facebook-url";
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

  const eventUrl = await resolveFacebookEventUrl(url);

  if (!eventUrl) {
    return NextResponse.json(
      {
        error:
          "Please provide a valid facebook.com/events/... or fb.me/e/... URL",
      },
      { status: 422 },
    );
  }

  try {
    const result = await checkFacebookEventVisibility(eventUrl);
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
