import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { ArrowRight } from "lucide-react";

import { TrackedLink } from "~/components/TrackedLink";
import { FALLBACK_IMAGE, type Locale } from "~/constants";
import { ARTICLES_PATH } from "~/lib/seo";
import type { Article } from "~/types";

type Props = {
  article: Article;
  locale: string;
};

export async function TheatreArticlePromo({ article, locale }: Props) {
  const t = await getTranslations({
    locale,
    namespace: "SingleEvent.theatreArticlePromo",
  });

  return (
    <TrackedLink
      eventKey="event.promo.theatre_article"
      href={`${ARTICLES_PATH}/${article.slug}`}
      locale={article.locale as Locale}
      className="group border-primary/35 from-primary/15 to-card hover:border-primary/55 focus-visible:ring-ring flex items-center gap-3 overflow-hidden rounded-xl border bg-linear-to-br p-2 pr-3 shadow-sm transition-all hover:shadow-md focus-visible:ring-2 focus-visible:outline-none lg:flex-col lg:items-stretch lg:gap-0 lg:p-0"
    >
      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg sm:size-16 lg:aspect-16/10 lg:h-auto lg:w-full lg:rounded-none">
        <Image
          src={article.hero_image ?? FALLBACK_IMAGE}
          alt={article.hero_image_alt ?? ""}
          fill
          sizes="(min-width: 1024px) 208px, 64px"
          className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <span className="flex min-w-0 flex-1 items-start gap-2 text-sm leading-snug font-medium text-pretty lg:p-3">
        {t("heading")}
        <ArrowRight
          aria-hidden
          className="text-muted-foreground group-hover:text-primary mt-0.5 size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
        />
      </span>
    </TrackedLink>
  );
}
