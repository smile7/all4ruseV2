import { type NextRequest, NextResponse } from "next/server";

import { profilesApi } from "~/lib/api";
import {
  isPasswordResetNext,
  LOGIN_ERROR_CODES,
  type LoginErrorCode,
  loginErrorPath,
  safeAuthNextPath,
} from "~/lib/auth/redirects";
import { getFailureMessage } from "~/lib/failures";
import { recordFailure } from "~/lib/failures-server";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";
import { createSupabaseServerClient } from "~/lib/supabase/server";
import {
  AUTH_REMEMBER_COOKIE,
  getRememberFlagCookieOptions,
} from "~/lib/supabase/session-persistence";

function pickLoginError(
  providerError: string | null,
  method: string,
  next: string,
): LoginErrorCode {
  if (providerError === "access_denied")
    return LOGIN_ERROR_CODES.oauthCancelled;
  if (providerError) return LOGIN_ERROR_CODES.oauthFailed;
  if (method !== "email") return LOGIN_ERROR_CODES.oauthFailed;

  return isPasswordResetNext(next)
    ? LOGIN_ERROR_CODES.resetLinkInvalid
    : LOGIN_ERROR_CODES.emailLinkInvalid;
}

/**
 * Supabase PKCE auth callback.
 * Handles three flows:
 *   - Email confirmation (signup) → redirects to locale home
 *   - Password reset → emailRedirectTo includes ?next=/[locale]/auth/update-password
 *   - OAuth (Google, Facebook) → same code exchange; syncs provider avatar_url
 *     into profiles on first login (only when avatar_url is still null).
 *
 * Supabase dashboard must have this URL in the "Redirect URLs" allowlist:
 *   http://localhost:3000/auth/callback   (dev)
 *   https://yourdomain.com/auth/callback  (prod)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` can be a same-site path like /bg/auth/update-password
  const next = safeAuthNextPath(searchParams.get("next"));
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const base = isLocal || !forwardedHost ? origin : `https://${forwardedHost}`;

  // Email templates built on `{{ .TokenHash }}` work in any browser because
  // verifyOtp needs no PKCE verifier. /auth/confirm owns that flow, so accept
  // those links here too in case a template points at this route.
  if (searchParams.get("token_hash")) {
    const confirmUrl = new URL("/auth/confirm", base);
    confirmUrl.search = searchParams.toString();
    return NextResponse.redirect(confirmUrl);
  }

  // Set by SocialAuthButtons; absent for email confirmation and password reset.
  const method = searchParams.get("provider")?.slice(0, 20) ?? "email";
  const userAgent = request.headers.get("user-agent");
  const providerError = searchParams.get("error");
  const providerErrorCode = searchParams.get("error_code");

  if (providerError) {
    await recordFailure({
      flow: "auth",
      stage:
        providerError === "access_denied"
          ? "provider_cancelled"
          : "provider_error",
      userId: null,
      userAgent,
      message: searchParams.get("error_description"),
      metadata: {
        method,
        next,
        error: providerError.slice(0, 200),
        ...(providerErrorCode && {
          error_code: providerErrorCode.slice(0, 200),
        }),
      },
    });
  } else if (!code) {
    await recordFailure({
      flow: "auth",
      stage: "callback_missing_code",
      userId: null,
      userAgent,
      metadata: { method, next },
    });
  }

  if (code) {
    const response = NextResponse.redirect(`${base}${next}`);
    const supabase = await createSupabaseServerClient({
      remember: true,
      response,
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Bootstrap the profile row for newly confirmed users, then sync the
      // OAuth avatar only when the profile still has no custom avatar.
      let userId: string | null = null;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
          const admin = createSupabaseAdminClient();
          await profilesApi.ensureProfile(admin, user);

          const providerAvatar = user.user_metadata?.avatar_url as
            | string
            | undefined;

          if (providerAvatar) {
            await admin
              .from("profiles")
              .update({ avatar_url: providerAvatar })
              .eq("id", user.id)
              .is("avatar_url", null);
          }
        }
      } catch (err) {
        // Non-fatal — avatar sync failure should not block the redirect
        await recordFailure({
          flow: "auth",
          stage: "profile_bootstrap_failed",
          userId,
          userAgent,
          message: getFailureMessage(err),
          metadata: { method, next },
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
      stage: "code_exchange_failed",
      userId: null,
      userAgent,
      message: error.message,
      metadata: { method, next, ...(error.code && { error_code: error.code }) },
    });
  }

  // Something went wrong — send back to login with an error the page can explain
  return NextResponse.redirect(
    `${base}${loginErrorPath(next, pickLoginError(providerError, method, next))}`,
  );
}
