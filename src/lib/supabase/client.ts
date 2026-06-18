import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "~/types/database";

import { browserCookieMethods } from "./browser-cookies";
import { clearAuthRememberPreference } from "./session-persistence";

let cachedBrowserClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null;
let rememberListenerInitialized = false;

function initRememberListener(
  client: ReturnType<typeof createBrowserClient<Database>>,
) {
  if (rememberListenerInitialized || typeof window === "undefined") return;

  rememberListenerInitialized = true;
  client.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      clearAuthRememberPreference();
    }
  });
}

// Singleton — safe to call multiple times in Client Components and hooks.
export function getSupabaseBrowserClient() {
  if (!cachedBrowserClient) {
    cachedBrowserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
      {
        cookies: browserCookieMethods,
      },
    );
    initRememberListener(cachedBrowserClient);
  }

  return cachedBrowserClient;
}
