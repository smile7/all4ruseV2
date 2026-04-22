import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { createServerClient } from "@supabase/ssr";

import { routing } from "~/i18n/routing";
import type { Database } from "~/types/database";

const intlMiddleware = createIntlMiddleware(routing);

// Routes that require the user to be authenticated
const AUTH_REQUIRED = ["/create-event", "/my-events", "/profile"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip the locale prefix to check against protected route patterns.
  // e.g. /bg/create-event → /create-event
  const pathnameWithoutLocale = pathname.replace(/^\/[a-z]{2}/, "");
  const needsAuth = AUTH_REQUIRED.some((p) => pathnameWithoutLocale.startsWith(p));

  if (needsAuth) {
    const supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const locale = pathname.split("/")[1] ?? routing.defaultLocale;
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
