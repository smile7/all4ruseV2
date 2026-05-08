import type { ReactNode } from "react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import {
  AlertCircle,
  CheckCircle,
  Filter,
  Mail,
  PlusCircle,
  Send,
  Sparkles,
} from "lucide-react";

import { FacebookIcon, InstagramIcon } from "~/components/icons/SocialIcons";
import { Typography } from "~/components/layout";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { FACEBOOK_URL, INSTAGRAM_URL } from "~/constants";
import { cn } from "~/lib/utils";

const sectionCardClass = cn("border-primary/30 shadow-md", "why-fade-in");

const sectionContentPad = "px-6 py-6 sm:px-8 sm:py-8";
const sectionContentPadAfterHeader = "px-6 pb-6 pt-0 sm:px-8 sm:pb-8";

type WhySectionProps = {
  fadeDelay: string;
  bgTint?: string;
  title?: ReactNode;
  contentClassName?: string;
  children: ReactNode;
};

function WhySection({
  fadeDelay,
  bgTint = "bg-background/90",
  title,
  contentClassName,
  children,
}: WhySectionProps) {
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

const spotlightCardClass =
  "flex flex-col items-center rounded-xl border border-border/80 bg-linear-to-br from-primary/15 to-background p-6 text-center shadow-sm";

const helpCardClass =
  "flex flex-col items-center rounded-xl border border-border/80 bg-linear-to-br from-primary/10 to-background p-4 text-center shadow-sm";

const contactCardClass =
  "flex flex-col items-center rounded-xl border border-border/80 bg-linear-to-br from-primary/10 to-background p-6 text-center shadow-sm";

export async function generateMetadata() {
  const t = await getTranslations("WhyUs");
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function WhyAll4RusePage() {
  const t = await getTranslations("WhyUs");

  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col items-center gap-16 rounded-xl bg-linear-to-b from-primary/10 via-background to-background px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <section className="relative w-full max-w-4xl px-4 pb-8 text-center">
        <div
          className="absolute inset-x-0 top-0 -z-10 h-40 bg-linear-to-b from-primary/30 via-primary/10 to-transparent opacity-60 blur-2xl"
          aria-hidden
        />
        <Badge
          variant="default"
          className="why-fade-in why-fade-delay-0 mb-8 h-auto gap-2 rounded-lg px-5 py-2 text-base font-semibold shadow-lg [&>svg]:size-5"
        >
          <Sparkles className="shrink-0" aria-hidden />
          <span className="text-pretty">{t("headerTagline")}</span>
        </Badge>
        <Typography.H1 className="why-fade-in why-fade-delay-100 mb-4 text-pretty drop-shadow-sm">
          {t("mainHeadline")}
        </Typography.H1>
        <Typography.P className="text-muted-foreground why-fade-in why-fade-delay-200 text-lg">
          {t("mainSubheadline")}
        </Typography.P>
      </section>

      {/* About */}
      <WhySection
        fadeDelay="why-fade-delay-300"
        bgTint="bg-background/80"
        contentClassName="flex w-full flex-col items-center gap-8 md:flex-row md:items-start"
      >
        <div className="w-[160px] shrink-0 md:w-[180px]">
          <div className="relative aspect-3/5 w-full overflow-hidden rounded-2xl border-4 border-primary shadow-md">
            <Image
              src="/author2.jpeg"
              alt={t("authorImageAlt")}
              fill
              className="object-cover"
              sizes="(min-width: 768px) 180px, 160px"
              priority
            />
          </div>
        </div>
        <div className="min-w-0 flex-1 text-left">
          <Typography.H2 className="mb-2 border-0 pb-0">{t("aboutMeHeader")}</Typography.H2>
          <Typography.P className="text-pretty text-justify">{t("aboutMe")}</Typography.P>
          <Typography.P className="mt-6 text-pretty text-justify">{t("aboutMe2")}</Typography.P>
        </div>
      </WhySection>

      {/* Why created */}
      <WhySection fadeDelay="why-fade-delay-400" title={t("whyCreatedHeadline")}>
        <div className="flex flex-col gap-4">
          <Typography.P className="text-pretty text-justify">{t("whyCreated")}</Typography.P>
          <Typography.P className="text-pretty text-justify">{t("whyCreated2")}</Typography.P>
          <div className="flex justify-center pt-2">
            <div className="rounded-lg bg-primary px-6 py-3 text-center shadow-md">
              <Typography.Lead className="text-primary-foreground text-pretty">
                {t("whyCreated3")}
              </Typography.Lead>
            </div>
          </div>
        </div>
      </WhySection>

      {/* What makes different */}
      <WhySection fadeDelay="why-fade-delay-500" title={t("whatMakesDifferentHeadline")}>
        <div className="flex flex-col gap-4">
          <Typography.P className="text-pretty">{t("whatMakesDifferent")}</Typography.P>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className={spotlightCardClass}>
              <Filter className="text-primary mb-2 size-8" aria-hidden />
              <Typography.H3 className="mb-1 text-center text-lg">
                {t("searchAndFilters")}
              </Typography.H3>
              <Typography.Small className="text-center leading-snug">
                {t("searchAndFiltersDesc")}
              </Typography.Small>
            </div>
            <div className={spotlightCardClass}>
              <CheckCircle className="text-primary mb-2 size-8" aria-hidden />
              <Typography.H3 className="mb-1 text-center text-lg">
                {t("cleanInterface")}
              </Typography.H3>
              <Typography.Small className="text-center leading-snug">
                {t("cleanInterfaceDesc")}
              </Typography.Small>
            </div>
          </div>
          <Typography.P className="text-primary mt-2 text-center text-lg font-semibold">
            {t("lessScrollingMoreExperiences")}
          </Typography.P>
        </div>
      </WhySection>

      {/* How events are added */}
      <WhySection fadeDelay="why-fade-delay-600" title={t("howEventsAreAddedHeadline")}>
        <div className="flex flex-col gap-4">
          <Typography.P className="text-pretty">{t("howEventsAreAdded")}</Typography.P>
          <Typography.P className="text-pretty">{t("howEventsAreAdded2")}</Typography.P>
          <Typography.P className="text-pretty">{t("howEventsAreAdded3")}</Typography.P>
          <Typography.P className="text-primary mt-2 text-center text-lg font-semibold">
            {t("howEventsAreAdded4")}
          </Typography.P>
        </div>
      </WhySection>

      {/* How you can help */}
      <WhySection fadeDelay="why-fade-delay-700" title={t("howYouCanHelpHeadline")}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className={helpCardClass}>
              <Send className="text-primary mb-2 size-7" aria-hidden />
              <Typography.P className="text-center font-semibold">{t("sendEvent")}</Typography.P>
              <Typography.Small className="text-center leading-snug">
                {t("sendEventDesc")}
              </Typography.Small>
            </div>
            <div className={helpCardClass}>
              <AlertCircle className="text-primary mb-2 size-7" aria-hidden />
              <Typography.P className="text-center font-semibold">{t("reportIssue")}</Typography.P>
              <Typography.Small className="text-center leading-snug">
                {t("reportIssueDesc")}
              </Typography.Small>
            </div>
            <div
              className={cn(
                helpCardClass,
                "bg-linear-to-br from-primary/10 to-secondary/10",
              )}
            >
              <PlusCircle className="text-primary mb-2 size-7" aria-hidden />
              <Typography.P className="text-center font-semibold">{t("newIdeas")}</Typography.P>
              <Typography.Small className="text-center leading-snug">
                {t("newIdeasDesc")}
              </Typography.Small>
            </div>
          </div>
          <Typography.P className="text-primary mt-2 text-center text-lg font-semibold">
            {t("yourFeedbackMatters")}
          </Typography.P>
        </div>
      </WhySection>

      {/* Contact */}
      <WhySection fadeDelay="why-fade-delay-800" title={t("contactHeadline")}>
        <div className="flex flex-col gap-4">
          <Typography.P className="text-pretty text-justify">{t("contactInfo")}</Typography.P>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className={contactCardClass}>
              <Mail className="text-primary mb-2 size-8" aria-hidden />
              <Typography.P className="mb-1 text-lg font-semibold">{t("email")}</Typography.P>
              <Button variant="link" className="h-auto p-0 text-base font-medium" asChild>
                <a href="mailto:silvena@all4ruse.com" aria-label={t("emailAriaLabel")}>
                  silvena@all4ruse.com
                </a>
              </Button>
            </div>
            <div className={contactCardClass}>
              <FacebookIcon size={32} className="text-primary mb-2" />
              <Typography.P className="mb-1 text-lg font-semibold">{t("facebookPage")}</Typography.P>
              <Button variant="link" className="h-auto p-0 text-base font-medium" asChild>
                <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
                  {t("facebookProfileLinkText")}
                </a>
              </Button>
            </div>
            <div className={contactCardClass}>
              <InstagramIcon size={32} className="text-primary mb-2" />
              <Typography.P className="mb-1 text-lg font-semibold">{t("instagramLabel")}</Typography.P>
              <Button variant="link" className="h-auto p-0 text-base font-medium" asChild>
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                  {t("instagramHandle")}
                </a>
              </Button>
            </div>
          </div>
          <Typography.P className="text-primary mt-2 text-center text-lg font-semibold">
            {t("lookingForwardToHearingFromYou")}
          </Typography.P>
        </div>
      </WhySection>
    </div>
  );
}
