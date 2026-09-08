import { NextResponse } from "next/server";

import { articlesApi } from "~/lib/api";
import { requireArticleAdmin } from "~/lib/articles/admin-guard";
import { buildArticleRow, revalidateArticle } from "~/lib/articles/payload";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";
import { articleSchema } from "~/types";

export async function POST(request: Request) {
  const guard = await requireArticleAdmin();
  if ("response" in guard) return guard.response;

  const parsed = articleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid article", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const values = parsed.data;
  const admin = createSupabaseAdminClient();

  const slugFree = await articlesApi.isSlugAvailable(
    admin,
    values.locale,
    values.slug,
  );
  if (!slugFree) {
    return NextResponse.json({ error: "slug_taken" }, { status: 409 });
  }

  try {
    const article = await articlesApi.createArticle(admin, {
      ...buildArticleRow(values),
      created_by: guard.user.id,
    });

    revalidateArticle(article.locale, [article.slug]);
    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    console.error("[api/articles] create failed:", error);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
}
