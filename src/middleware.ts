import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { createServerClient } from "@supabase/ssr";

import { routing } from "~/i18n/routing";
import {
  applyRememberPolicyToCookieOptions,
  AUTH_REMEMBER_COOKIE,
  isSupabaseAuthCookie,
  rememberPreferenceFromCookie,
} from "~/lib/supabase/session-persistence";
import type { Database } from "~/types/database";

const intlMiddleware = createIntlMiddleware(routing);

function hasAuthSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => isSupabaseAuthCookie(cookie.name));
}

function loginRedirect(request: NextRequest, pathname: string) {
  const locale = pathname.split("/")[1] ?? routing.defaultLocale;
  const loginUrl = new URL(`/${locale}/auth/login`, request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

// Routes that require the user to be authenticated
const AUTH_REQUIRED = [
  "/create-article",
  "/create-event",
  "/my-events",
  "/profile",
];

// Sub-paths under AUTH_REQUIRED that are publicly accessible
const AUTH_EXCLUDED = ["/profile/saved-events"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip the locale prefix to check against protected route patterns.
  // e.g. /bg/create-event → /create-event
  const pathnameWithoutLocale = pathname.replace(/^\/[a-z]{2}/, "");
  const needsAuth =
    AUTH_REQUIRED.some((p) => pathnameWithoutLocale.startsWith(p)) &&
    !AUTH_EXCLUDED.some((p) => pathnameWithoutLocale.startsWith(p));

  const response = intlMiddleware(request);

  // Googlebot and other anonymous requests have no session. Refreshing one
  // anyway calls Supabase Auth on every public page, so an Auth timeout or
  // outage becomes a 5xx for the URL Google was trying to index.
  if (!hasAuthSessionCookie(request)) {
    return needsAuth ? loginRedirect(request, pathname) : response;
  }

  const remember = rememberPreferenceFromCookie(
    request.cookies.get(AUTH_REMEMBER_COOKIE)?.value,
  );

  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(
                name,
                value,
                applyRememberPolicyToCookieOptions(name, options, remember),
              );
            });
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (needsAuth && !user) {
      return loginRedirect(request, pathname);
    }
  } catch {
    // A failed refresh must not take down a public page. Protected routes
    // fail closed.
    if (needsAuth) return loginRedirect(request, pathname);
  }

  return response;
}

export const config = {
  // Exclude Next.js internals, static files, API routes, the Supabase
  // auth callback, and the partner embed widget (locale-free + framable).
  matcher: ["/((?!_next|_vercel|api|auth|embed|.*\\..*).*)"],
};
