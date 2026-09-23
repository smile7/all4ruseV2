import { type NextRequest, NextResponse } from "next/server";

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
  // `next` can be an absolute path like /bg/auth/update-password
  const next = searchParams.get("next") ?? `/${DEFAULT_LOCALE}`;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const base = isLocal || !forwardedHost ? origin : `https://${forwardedHost}`;

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

  // Something went wrong — send back to login with an error indicator
  return NextResponse.redirect(
    `${origin}/${DEFAULT_LOCALE}/auth/login?error=auth_callback_failed`,
  );
}
