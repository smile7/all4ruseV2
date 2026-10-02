import type { SupabaseClient } from "@supabase/supabase-js";

const REFRESH_IF_EXPIRES_WITHIN_MS = 60_000;

/**
 * Makes sure the browser still has a usable auth session before a mutation.
 * iOS Safari often suspends the tab (camera, Photos, another app), so the
 * access token can expire and the next refresh may need to run now.
 */
export async function ensureFreshAuthSession(
  client: SupabaseClient,
): Promise<"ok" | "expired"> {
  const { data: current, error: sessionError } = await client.auth.getSession();
  const expiresAtMs = (current.session?.expires_at ?? 0) * 1000;
  const stillFresh =
    !sessionError &&
    current.session != null &&
    expiresAtMs - Date.now() > REFRESH_IF_EXPIRES_WITHIN_MS;

  if (stillFresh) return "ok";

  const { data, error } = await client.auth.refreshSession();
  if (error || !data.session) return "expired";
  return "ok";
}
