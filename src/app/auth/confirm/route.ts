import { type NextRequest, NextResponse } from "next/server";

import type { EmailOtpType } from "@supabase/supabase-js";

import { DEFAULT_LOCALE } from "~/constants";
import { profilesApi } from "~/lib/api";
import { getFailureMessage } from "~/lib/failures";
import { recordFailure } from "~/lib/failures-server";
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
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const base = isLocal || !forwardedHost ? origin : `https://${forwardedHost}`;

  const userAgent = request.headers.get("user-agent");
  const failureMetadata = {
    method: "email",
    type: type?.slice(0, 50) ?? "none",
    next,
  };

  if (!tokenHash || !isEmailOtpType(type)) {
    await recordFailure({
      flow: "auth",
      stage: "confirm_invalid_link",
      userId: null,
      userAgent,
      metadata: failureMetadata,
    });
  }

  if (tokenHash && isEmailOtpType(type)) {
    const response = NextResponse.redirect(`${base}${next}`);
    const supabase = await createSupabaseServerClient({
      remember: true,
      response,
    });
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      let userId: string | null = null;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          userId = user.id;
          await profilesApi.ensureProfile(createSupabaseAdminClient(), user);
        }
      } catch (err) {
        // Non-fatal — profile bootstrap failure should not block the redirect.
        await recordFailure({
          flow: "auth",
          stage: "profile_bootstrap_failed",
          userId,
          userAgent,
          message: getFailureMessage(err),
          metadata: failureMetadata,
        });
      }

      response.cookies.set(
        AUTH_REMEMBER_COOKIE,
        "1",
        getRememberFlagCookieOptions(true),
      );

      return response;
    }

    await recordFailure({
      flow: "auth",
      stage: "confirm_failed",
      userId: null,
      userAgent,
      message: error.message,
      metadata: {
        ...failureMetadata,
        ...(error.code && { error_code: error.code }),
      },
    });
  }

  return NextResponse.redirect(
    `${origin}/${DEFAULT_LOCALE}/auth/login?error=auth_confirm_failed`,
  );
}
