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
    <article className="group border-border/60 bg-card relative flex h-full flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-md">
      <Link
        href={href}
        aria-label={article.title}
        className="focus-visible:ring-ring absolute inset-0 z-10 rounded-xl focus-visible:ring-2 focus-visible:outline-none"
      />
      <div className="relative aspect-16/9 overflow-hidden">
        <Image
          src={article.hero_image ?? FALLBACK_IMAGE}
          alt=""
          fill
          sizes={sizes}
          aria-hidden
          tabIndex={-1}
          className="scale-110 object-cover blur-2xl brightness-75 saturate-150"
        />
        <Image
          src={article.hero_image ?? FALLBACK_IMAGE}
          alt={article.hero_image_alt ?? ""}
          fill
          sizes={sizes}
          priority={priority}
          className="object-contain"
        />
      </div>

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

        <Heading className="text-foreground group-hover:text-primary line-clamp-3 min-h-[4.65rem] text-lg leading-snug font-semibold">
          {article.title}
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
