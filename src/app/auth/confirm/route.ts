import { type NextRequest, NextResponse } from "next/server";

import type { EmailOtpType } from "@supabase/supabase-js";

import { DEFAULT_LOCALE } from "~/constants";
import { profilesApi } from "~/lib/api";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";
import { createSupabaseServerClient } from "~/lib/supabase/server";
import {
  AUTH_REMEMBER_COOKIE,
  getRememberFlagCookieOptions,
} from "~/lib/supabase/session-persistence";

const EMAIL_OTP_TYPES = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const satisfies readonly EmailOtpType[];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && EMAIL_OTP_TYPES.includes(value as EmailOtpType);
}

/**
 * Supabase email confirmation / recovery callback for token_hash links.
 *
 * This keeps compatibility with Supabase email templates that point to:
 *   /auth/confirm?token_hash=...&type=signup&next=/...
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? `/${DEFAULT_LOCALE}`;

  if (tokenHash && isEmailOtpType(type)) {
    const supabase = await createSupabaseServerClient({ remember: true });
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await profilesApi.ensureProfile(createSupabaseAdminClient(), user);
        }
      } catch {
        // Non-fatal — profile bootstrap failure should not block the redirect.
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      const base =
        isLocal || !forwardedHost ? origin : `https://${forwardedHost}`;
      const response = NextResponse.redirect(`${base}${next}`);

      response.cookies.set(
        AUTH_REMEMBER_COOKIE,
        "1",
        getRememberFlagCookieOptions(true),
      );

      return response;
    }
  }

  return NextResponse.redirect(
    `${origin}/${DEFAULT_LOCALE}/auth/login?error=auth_confirm_failed`,
  );
}
