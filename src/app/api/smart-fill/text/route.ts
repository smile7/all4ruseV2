import { NextResponse } from "next/server";

import {
  extractDraftFromText,
  QuotaExceededError,
} from "~/lib/smart-fill/gemini";
import {
  consumeSmartFillImport,
  isSmartFillAdmin,
  refundSmartFillImport,
  type SmartFillConsumption,
  SmartFillDailyLimitError,
  smartFillDailyLimitResponse,
} from "~/lib/smart-fill/rate-limit";
import { recordSmartFillFailure } from "~/lib/smart-fill/record-failure";
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
    await recordSmartFillFailure({
      userId: user.id,
      source: "text",
      stage: "invalid_input",
      error: `Text too short (${text.length} chars)`,
    });
    return NextResponse.json(
      { error: "Please provide at least a short description" },
      { status: 422 },
    );
  }

  const trimmed =
    text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;

  let consumption: SmartFillConsumption | null = null;
  if (!isSmartFillAdmin(user.id)) {
    try {
      consumption = await consumeSmartFillImport(user.id, "text");
    } catch (err) {
      const isLimit = err instanceof SmartFillDailyLimitError;
      await recordSmartFillFailure({
        userId: user.id,
        source: "text",
        stage: isLimit ? "daily_limit" : "rate_limit_check_failed",
        error: err,
      });
      if (isLimit) return smartFillDailyLimitResponse(err);
      throw err;
    }
  }

  try {
    const draft = await extractDraftFromText(trimmed);
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[smart-fill/text]", message);

    await refundSmartFillImport(consumption);
    await recordSmartFillFailure({
      userId: user.id,
      source: "text",
      stage:
        err instanceof QuotaExceededError
          ? "ai_quota_exceeded"
          : "extraction_failed",
      error: err,
    });

    if (err instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: message, errorCode: "quota_exceeded" },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "Could not parse the description. Try again or fill manually." },
      { status: 502 },
    );
  }
}
