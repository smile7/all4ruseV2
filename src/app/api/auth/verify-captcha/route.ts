import { NextRequest, NextResponse } from "next/server";

const SCORE_THRESHOLDS = {
  default: 0.5,
  signup: 0.3,
} as const;

type SiteverifyResponse = {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    token?: unknown;
    action?: unknown;
  };
  const token = typeof body.token === "string" ? body.token : null;
  const action = typeof body.action === "string" ? body.action : null;

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;

  // If the secret key is not configured (local dev without reCAPTCHA), allow through.
  if (!secret) {
    return NextResponse.json({ success: true });
  }

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });

  const data = (await res.json()) as SiteverifyResponse;
  const threshold = action
    ? (SCORE_THRESHOLDS[action as keyof typeof SCORE_THRESHOLDS] ??
      SCORE_THRESHOLDS.default)
    : SCORE_THRESHOLDS.default;

  const actionMismatch = Boolean(
    action && data.action && data.action !== action,
  );
  const score = data.score ?? 0;

  if (!data.success || actionMismatch || score < threshold) {
    console.warn("[verify-captcha] verification failed", {
      action,
      returnedAction: data.action,
      actionMismatch,
      hostname: data.hostname,
      score,
      threshold,
      errorCodes: data["error-codes"] ?? [],
    });

    return NextResponse.json(
      {
        error: "Captcha check failed",
        score,
        actionMismatch,
        errorCodes: data["error-codes"] ?? [],
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
