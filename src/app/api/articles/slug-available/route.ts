import { NextResponse } from "next/server";

import { articlesApi } from "~/lib/api";
import { requireArticleAdmin } from "~/lib/articles/admin-guard";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";

/** Admin-gated: the draft slugs of unpublished articles are not public data. */
export async function GET(request: Request) {
  const guard = await requireArticleAdmin();
  if ("response" in guard) return guard.response;

  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale");
  const slug = searchParams.get("slug");
  const excludeId = searchParams.get("excludeId") ?? undefined;

  if (!locale || !slug) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const available = await articlesApi.isSlugAvailable(
    createSupabaseAdminClient(),
    locale,
    slug,
    excludeId,
  );

  return NextResponse.json({ available });
}
