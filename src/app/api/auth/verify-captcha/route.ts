import { NextRequest, NextResponse } from "next/server";

const SCORE_THRESHOLD = 0.5;

type SiteverifyResponse = {
  success: boolean;
  score: number;
  action: string;
  "error-codes"?: string[];
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { token?: unknown };
  const token = typeof body.token === "string" ? body.token : null;

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

  if (!data.success || data.score < SCORE_THRESHOLD) {
    return NextResponse.json(
      { error: "Captcha check failed", score: data.score ?? 0 },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
