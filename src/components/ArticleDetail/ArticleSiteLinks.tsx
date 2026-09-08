import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { ArrowRight, Megaphone } from "lucide-react";

import { Link } from "~/i18n/navigation";

type Props = {
  locale: string;
};

export async function ArticleSiteLinks({ locale }: Props) {
  const t = await getTranslations({
    locale,
    namespace: "MoreFromRuse.siteLinks",
  });

  return (
    <aside className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Link
        href="/why-all4ruse"
        className="group border-border/70 from-primary/12 to-background hover:border-primary/40 focus-visible:ring-ring flex items-center gap-4 rounded-2xl border bg-linear-to-br p-4 shadow-sm transition-all hover:shadow-md focus-visible:ring-2 focus-visible:outline-none"
      >
        <div className="border-primary relative size-16 shrink-0 overflow-hidden rounded-2xl border-2 shadow-sm">
          <Image
            src="/author2.jpeg"
            alt={t("whyImageAlt")}
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t("whyTitle")}</p>
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            {t("whyDescription")}
          </p>
        </div>
        <ArrowRight
          aria-hidden
          className="text-muted-foreground size-5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </Link>

      <Link
        href="/advertise"
        className="group border-primary/35 from-primary/20 to-background hover:border-primary/55 focus-visible:ring-ring flex items-center gap-4 rounded-2xl border bg-linear-to-br p-4 shadow-sm transition-all hover:shadow-md focus-visible:ring-2 focus-visible:outline-none"
      >
        <div className="bg-primary text-primary-foreground flex size-16 shrink-0 items-center justify-center rounded-2xl shadow-sm">
          <Megaphone aria-hidden className="size-7" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t("advertiseTitle")}</p>
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            {t("advertiseDescription")}
          </p>
        </div>
        <ArrowRight
          aria-hidden
          className="text-muted-foreground size-5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </Link>
    </aside>
  );
}
