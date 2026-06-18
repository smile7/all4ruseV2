import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "~/types/database";

import {
  AUTH_REMEMBER_COOKIE,
  applyRememberPolicyToCookieOptions,
  rememberFromCookieValue,
} from "./session-persistence";

export async function createSupabaseServerClient(options?: { remember?: boolean }) {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            const remember =
              options?.remember ??
              rememberFromCookieValue(
                cookieStore.get(AUTH_REMEMBER_COOKIE)?.value,
              );

            cookiesToSet.forEach(({ name, value, options: cookieOptions }) =>
              cookieStore.set(
                name,
                value,
                applyRememberPolicyToCookieOptions(name, cookieOptions, remember),
              ),
            );
          } catch {
            // Supabase may try to refresh the session token during a Server
            // Component render. Next.js only allows cookie writes in Server
            // Actions and Route Handlers, so we swallow the error here.
            // The middleware handles actual session refresh.
          }
        },
      },
    },
  );
}

export function createSupabasePublicServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
