import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Badge } from "~/components/ui/badge";
import { FALLBACK_IMAGE } from "~/constants";
import { Link } from "~/i18n/navigation";
import { getIntlLocale } from "~/lib/event-utils";
import { ARTICLES_PATH } from "~/lib/seo";
import type { Article, ArticleCategory } from "~/types";

type Props = {
  article: Article;
  locale: string;
  /** Only the first card above the fold should be eager — everything else is lazy. */
  priority?: boolean;
  /** The index page uses h2; the teaser and related rows sit under their own h2. */
  headingLevel?: "h2" | "h3";
  sizes?: string;
};

export async function ArticleCard({
  article,
  locale,
  priority = false,
  headingLevel: Heading = "h2",
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
}: Props) {
  const t = await getTranslations({ locale, namespace: "MoreFromRuse" });

  const href = `${ARTICLES_PATH}/${article.slug}`;
  const publishedAt = article.published_at ?? article.created_at;
  const formattedDate = new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(publishedAt));

  return (
    <article className="group border-border/60 bg-card flex h-full flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-md">
      <Link
        href={href}
        aria-label={article.title}
        className="relative block aspect-16/9 overflow-hidden"
      >
        <Image
          src={article.hero_image ?? FALLBACK_IMAGE}
          alt={article.hero_image_alt ?? ""}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
          <time dateTime={publishedAt}>{formattedDate}</time>
          {article.reading_minutes ? (
            <>
              <span aria-hidden>·</span>
              <span>
                {t("readingTime", { minutes: article.reading_minutes })}
              </span>
            </>
          ) : null}
        </div>

        <Heading className="text-lg leading-snug font-semibold text-balance">
          <Link href={href} className="hover:text-primary transition-colors">
            {article.title}
          </Link>
        </Heading>

        <p className="text-muted-foreground line-clamp-3 text-sm">
          {article.excerpt}
        </p>

        {article.category ? (
          <div className="mt-auto pt-2">
            <Badge variant="secondary">
              {t(`categories.${article.category as ArticleCategory}`)}
            </Badge>
          </div>
        ) : null}
      </div>
    </article>
  );
}
