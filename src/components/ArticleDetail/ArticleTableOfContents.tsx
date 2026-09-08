import { getTranslations } from "next-intl/server";

import type { ArticleHeading } from "~/lib/article-html";

type Props = {
  locale: string;
  headings: ArticleHeading[];
};

/**
 * Plain anchors against ids assigned at save time — no client JS, and the
 * anchors double as SERP jump links.
 */
export async function ArticleTableOfContents({ locale, headings }: Props) {
  const t = await getTranslations({ locale, namespace: "MoreFromRuse" });

  return (
    <nav
      aria-label={t("tocTitle")}
      className="border-border/60 bg-muted/40 my-8 rounded-xl border p-4"
    >
      <p className="mb-2 text-sm font-semibold">{t("tocTitle")}</p>
      <ol className="space-y-1.5 text-sm">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? "pl-4" : ""}>
            <a
              href={`#${heading.id}`}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
