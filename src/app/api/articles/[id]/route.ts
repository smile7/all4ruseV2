import { NextResponse } from "next/server";

import { ARTICLES_BUCKET } from "~/constants";
import { articlesApi } from "~/lib/api";
import { requireArticleAdmin } from "~/lib/articles/admin-guard";
import {
  buildArticleRow,
  revalidateArticle,
  storagePathFromPublicUrl,
} from "~/lib/articles/payload";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";
import { articleSchema } from "~/types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireArticleAdmin();
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const parsed = articleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid article", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const values = parsed.data;
  const admin = createSupabaseAdminClient();

  const existing = await articlesApi.getArticleById(admin, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Renaming a live URL silently destroys its accumulated ranking, and we have
  // no redirect table — so the slug is immutable once published.
  if (existing.status === "published" && values.slug !== existing.slug) {
    return NextResponse.json({ error: "slug_locked" }, { status: 409 });
  }

  const slugFree = await articlesApi.isSlugAvailable(
    admin,
    values.locale,
    values.slug,
    id,
  );
  if (!slugFree) {
    return NextResponse.json({ error: "slug_taken" }, { status: 409 });
  }

  try {
    const article = await articlesApi.updateArticle(
      admin,
      id,
      buildArticleRow(values, existing),
    );

    revalidateArticle(article.locale, [article.slug, existing.slug]);
    if (existing.locale !== article.locale) {
      revalidateArticle(existing.locale, [existing.slug]);
    }
    return NextResponse.json({ article });
  } catch (error) {
    console.error("[api/articles] update failed:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireArticleAdmin();
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const admin = createSupabaseAdminClient();

  const existing = await articlesApi.getArticleById(admin, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    await articlesApi.deleteArticle(admin, id);

    const storagePath = storagePathFromPublicUrl(existing.hero_image);
    if (storagePath) {
      const { error } = await admin.storage
        .from(ARTICLES_BUCKET)
        .remove([storagePath]);
      // A stale image is not worth failing the delete over — the row is gone.
      if (error) {
        console.error("[api/articles] image cleanup failed:", error.message);
      }
    }

    revalidateArticle(existing.locale, [existing.slug]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/articles] delete failed:", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
