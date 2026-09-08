import { NextResponse } from "next/server";

import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "~/lib/supabase/server";

/**
 * Every article write goes through the service-role client, so the admin check
 * is the only thing standing between a logged-in user and the articles table.
 */
export async function requireArticleAdmin(): Promise<
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
