import { type NextRequest,NextResponse } from "next/server";

import { DEFAULT_LOCALE } from "~/constants";
import { createSupabaseServerClient } from "~/lib/supabase/server";

/**
 * Supabase PKCE auth callback.
 * Handles two flows:
 *   - Email confirmation (signup) → redirects to locale home
 *   - Password reset → emailRedirectTo includes ?next=/[locale]/auth/update-password
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
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Prefer the forwarded host in production (e.g. behind a reverse proxy)
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      const base = isLocal || !forwardedHost ? origin : `https://${forwardedHost}`;
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  // Something went wrong — send back to login with an error indicator
  return NextResponse.redirect(`${origin}/${DEFAULT_LOCALE}/auth/login?error=auth_callback_failed`);
}
