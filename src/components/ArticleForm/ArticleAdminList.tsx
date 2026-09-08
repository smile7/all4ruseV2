import { getTranslations } from "next-intl/server";

import { Plus } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Link } from "~/i18n/navigation";
import type { AdminArticleListItem } from "~/lib/api";
import { getIntlLocale } from "~/lib/event-utils";

type Props = {
  articles: AdminArticleListItem[];
  locale: string;
  /** The row currently loaded in the form, highlighted and not re-linked. */
  editingId?: string;
};

export async function ArticleAdminList({ articles, locale, editingId }: Props) {
  const t = await getTranslations({ locale, namespace: "MoreFromRuse.admin" });
  const formatDate = new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "numeric",
    month: "short",
  });

  return (
    <section className="border-border/60 mb-8 rounded-lg border">
      <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{t("existingArticles")}</h2>
        {editingId && (
          <Button asChild variant="outline" size="sm">
            <Link href="/create-article">
              <Plus className="size-4" />
              {t("newArticle")}
            </Link>
          </Button>
        )}
      </div>

      {articles.length === 0 ? (
        <p className="text-muted-foreground px-4 py-6 text-sm">
          {t("noArticles")}
        </p>
      ) : (
        <ul className="divide-border/60 divide-y">
          {articles.map((article) => {
            const isEditing = article.id === editingId;
            const meta = (
              <>
                <Badge variant="outline" className="uppercase">
                  {article.locale}
                </Badge>
                <Badge
                  variant={
                    article.status === "published" ? "secondary" : "outline"
                  }
                >
                  {article.status === "published"
                    ? t("statusPublished")
                    : t("statusDraft")}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  {formatDate.format(new Date(article.updated_at))}
                </span>
              </>
            );

            return (
              <li key={article.id}>
                {isEditing ? (
                  <div className="bg-muted/50 flex flex-wrap items-center gap-2 px-4 py-3">
                    {meta}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {article.title}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {t("editingNow")}
                    </span>
                  </div>
                ) : (
                  <Link
                    href={`/create-article?editId=${article.id}`}
                    className="hover:bg-muted/50 flex flex-wrap items-center gap-2 px-4 py-3 transition-colors"
                  >
                    {meta}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {article.title}
                    </span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
