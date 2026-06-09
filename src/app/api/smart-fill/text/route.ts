import { NextResponse } from "next/server";

import { extractDraftFromText } from "~/lib/smart-fill/gemini";
import { createSupabaseServerClient } from "~/lib/supabase/server";

const MAX_TEXT_LENGTH = 3000;

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

  const text =
    body && typeof body === "object" && "text" in body
      ? String((body as { text: unknown }).text ?? "").trim()
      : "";

  if (text.length < 10) {
    return NextResponse.json(
      { error: "Please provide at least a short description" },
      { status: 422 },
    );
  }

  const trimmed =
    text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;

  try {
    const draft = await extractDraftFromText(trimmed);
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[smart-fill/text]", message);
    return NextResponse.json(
      { error: "Could not parse the description. Try again or fill manually." },
      { status: 502 },
    );
  }
}
