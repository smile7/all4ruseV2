import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "~/types/database";

// Singleton — safe to call multiple times in Client Components and hooks.
export function getSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
