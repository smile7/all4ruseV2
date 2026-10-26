import { NextResponse } from "next/server";

import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "~/lib/supabase/server";

/**
 * Admin writes (articles, hosts) go through the service-role client, so this
 * check is the only thing standing between a logged-in user and those tables.
 */
export async function requireAdmin(): Promise<
  { user: User } | { response: NextResponse }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const adminUserId = process.env.ADMIN_USER_ID;
  if (!adminUserId || user.id !== adminUserId) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user };
}
