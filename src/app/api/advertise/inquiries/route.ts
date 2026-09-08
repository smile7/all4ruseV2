import { NextResponse } from "next/server";

import {
  advertiseInquiriesApi,
  AdvertiseInquiryRateLimitError,
} from "~/lib/api/advertise-inquiries";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";
import { advertiseInquiryApiSchema } from "~/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const json: unknown = await request.json().catch(() => null);
  const parsed = advertiseInquiryApiSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { website, name, email, businessName, message, locale } = parsed.data;

  // Honeypot: bots fill hidden fields; pretend success so they move on.
  if (website && website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  try {
    await advertiseInquiriesApi.createAdvertiseInquiry(
      createSupabaseAdminClient(),
      { name, email, businessName, message, locale },
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AdvertiseInquiryRateLimitError) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    console.error("[api/advertise/inquiries] insert failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
