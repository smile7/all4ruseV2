import { type NextRequest, NextResponse } from "next/server";

import { DEFAULT_LOCALE } from "~/constants";
import { profilesApi } from "~/lib/api";
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

  if (code) {
    const supabase = await createSupabaseServerClient({ remember: true });
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Bootstrap the profile row for newly confirmed users, then sync the
      // OAuth avatar only when the profile still has no custom avatar.
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
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
      } catch {
        // Non-fatal — avatar sync failure should not block the redirect
      }

      // Prefer the forwarded host in production (e.g. behind a reverse proxy)
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

  // Something went wrong — send back to login with an error indicator
  return NextResponse.redirect(
    `${origin}/${DEFAULT_LOCALE}/auth/login?error=auth_callback_failed`,
  );
}
