import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";

import {
  Crown,
  Handshake,
  Mail,
  Megaphone,
  MessagesSquare,
  Store,
} from "lucide-react";

import { Typography } from "~/components/layout";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { buildAlternates } from "~/lib/seo";
import { cn } from "~/lib/utils";

const sectionCardClass = cn("border-primary/30 shadow-md", "why-fade-in");

const sectionContentPad = "px-6 py-6 sm:px-8 sm:py-8";
const sectionContentPadAfterHeader = "px-6 pb-6 pt-0 sm:px-8 sm:pb-8";

type AdvertiseSectionProps = {
  fadeDelay: string;
  bgTint?: string;
  title?: ReactNode;
  contentClassName?: string;
  children: ReactNode;
};

function AdvertiseSection({
  fadeDelay,
  bgTint = "bg-background/90",
  title,
  contentClassName,
  children,
}: AdvertiseSectionProps) {
  return (
    <section className="w-full max-w-3xl">
      <Card className={cn(sectionCardClass, fadeDelay, bgTint, "gap-0")}>
        {title != null ? (
          <>
            <CardHeader className="border-b-0 px-6 pt-6 pb-3 sm:px-8">
              <Typography.H2 className="border-0 pb-0">{title}</Typography.H2>
            </CardHeader>
            <CardContent
              className={cn(sectionContentPadAfterHeader, contentClassName)}
            >
              {children}
            </CardContent>
          </>
        ) : (
          <CardContent className={cn(sectionContentPad, contentClassName)}>
            {children}
          </CardContent>
        )}
      </Card>
    </section>
  );
}

const optionCardClass =
  "flex flex-col items-center rounded-xl border border-border/80 bg-linear-to-br from-primary/15 to-background p-6 text-center shadow-sm";

const contactCardClass =
  "flex flex-col items-center rounded-xl border border-border/80 bg-linear-to-br from-primary/10 to-background p-6 text-center shadow-sm";

export async function generateMetadata() {
  const [t, locale] = await Promise.all([
    getTranslations("Advertise"),
    getLocale(),
  ]);
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: buildAlternates(locale, "/advertise"),
  };
}

export default async function AdvertisePage() {
  const t = await getTranslations("Advertise");

  return (
    <div className="from-primary/10 via-background to-background mx-auto flex w-full max-w-[1800px] flex-col items-center gap-16 rounded-xl bg-linear-to-b px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <section className="relative w-full max-w-4xl px-4 pb-8 text-center">
        <div
          className="from-primary/30 via-primary/10 absolute inset-x-0 top-0 -z-10 h-40 bg-linear-to-b to-transparent opacity-60 blur-2xl"
          aria-hidden
        />
        <Badge
          variant="default"
          className="why-fade-in why-fade-delay-0 mb-8 h-auto gap-2 rounded-lg px-5 py-2 text-base font-semibold shadow-lg [&>svg]:size-5"
        >
          <Megaphone className="shrink-0" aria-hidden />
          <span className="text-pretty">{t("headerTagline")}</span>
        </Badge>
        <Typography.H1 className="why-fade-in why-fade-delay-100 mb-4 text-pretty drop-shadow-sm">
          {t("mainHeadline")}
        </Typography.H1>
        <Typography.P className="text-muted-foreground why-fade-in why-fade-delay-200 text-lg">
          {t("mainSubheadline")}
        </Typography.P>
      </section>

      {/* Intro */}
      <AdvertiseSection
        fadeDelay="why-fade-delay-300"
        bgTint="bg-background/80"
      >
        <Typography.P className="text-justify text-pretty">
          {t("intro")}
        </Typography.P>
      </AdvertiseSection>

      {/* Options */}
      <AdvertiseSection fadeDelay="why-fade-delay-400">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className={optionCardClass}>
            <Store className="text-primary mb-2 size-8" aria-hidden />
            <Typography.H3 className="mb-2 text-center text-lg">
              {t("card1Title")}
            </Typography.H3>
            <Typography.Small className="text-center leading-snug">
              {t("card1Desc")}
            </Typography.Small>
          </div>
          <div className={optionCardClass}>
            <Crown className="text-primary mb-2 size-8" aria-hidden />
            <Typography.H3 className="mb-2 text-center text-lg">
              {t("card2Title")}
            </Typography.H3>
            <Typography.Small className="text-center leading-snug">
              {t("card2Desc")}
            </Typography.Small>
          </div>
          <div className={optionCardClass}>
            <Handshake className="text-primary mb-2 size-8" aria-hidden />
            <Typography.H3 className="mb-2 text-center text-lg">
              {t("card3Title")}
            </Typography.H3>
            <Typography.Small className="text-center leading-snug">
              {t("card3Desc")}
            </Typography.Small>
          </div>
          <div
            className={cn(
              optionCardClass,
              "from-primary/10 to-secondary/10 bg-linear-to-br",
            )}
          >
            <MessagesSquare className="text-primary mb-2 size-8" aria-hidden />
            <Typography.H3 className="mb-2 text-center text-lg">
              {t("card4Title")}
            </Typography.H3>
            <Typography.Small className="text-center leading-snug">
              {t("card4Desc")}
            </Typography.Small>
          </div>
        </div>
      </AdvertiseSection>

      {/* Contact */}
      <AdvertiseSection
        fadeDelay="why-fade-delay-500"
        title={t("contactHeadline")}
      >
        <div className="flex flex-col gap-6">
          <Typography.P className="text-justify text-pretty">
            {t("contactInfo")}
          </Typography.P>
          <div className="flex justify-center">
            <div className={contactCardClass}>
              <Mail className="text-primary mb-2 size-8" aria-hidden />
              <Typography.P className="mb-1 text-lg font-semibold">
                {t("email")}
              </Typography.P>
              <Button
                variant="link"
                className="h-auto p-0 text-base font-medium"
                asChild
              >
                <a
                  href="mailto:silvena@all4ruse.com"
                  aria-label="silvena@all4ruse.com"
                >
                  silvena@all4ruse.com
                </a>
              </Button>
            </div>
          </div>
        </div>
      </AdvertiseSection>
    </div>
  );
}
