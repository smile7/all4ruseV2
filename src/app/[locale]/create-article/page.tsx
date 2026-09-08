import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { ArticleAdminList, ArticleForm } from "~/components/ArticleForm";
import { Typography } from "~/components/layout";
import { articlesApi } from "~/lib/api";
import { createSupabaseServerClient } from "~/lib/supabase/server";

type Props = {
  searchParams: Promise<{ editId?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return { robots: { index: false, follow: false } };
}

export default async function CreateArticlePage({ searchParams }: Props) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // notFound() rather than redirect(): a non-admin should not learn the route exists.
  const adminUserId = process.env.ADMIN_USER_ID;
  if (!user || !adminUserId || user.id !== adminUserId) notFound();

  const { editId } = await searchParams;

  const [initialData, groups, adminArticles] = await Promise.all([
    editId
      ? articlesApi.getArticleById(supabase, editId)
      : Promise.resolve(null),
    articlesApi.getArticleGroups(supabase),
    articlesApi.getAdminArticleList(supabase),
  ]);

  const [t, locale] = await Promise.all([
    getTranslations("MoreFromRuse.admin"),
    getLocale(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <Typography.H1 className="mb-8 tracking-tight">
        {initialData ? t("editTitle") : t("createTitle")}
      </Typography.H1>

      <ArticleAdminList
        articles={adminArticles}
        locale={locale}
        editingId={initialData?.id}
      />

      {/* Keyed so switching to another article resets the form — react-hook-form
          reads defaultValues once, so without a remount the previous article's
          text would stay in the fields. */}
      <ArticleForm
        key={initialData?.id ?? "new"}
        initialData={initialData}
        groups={groups}
      />
    </div>
  );
}
