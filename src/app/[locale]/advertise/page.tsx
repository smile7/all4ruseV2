import type { ReactNode } from "react";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  ArrowRight,
  BookOpen,
  Clapperboard,
  Crown,
  HelpCircle,
  MapPin,
  Newspaper,
  Send,
  Store,
} from "lucide-react";

import { AdvertiseContactForm } from "~/components/AdvertiseContactForm";
import { Typography } from "~/components/layout";
import { TrackedLink } from "~/components/TrackedLink";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { ADVERTISE_CONTACT_HASH } from "~/constants";
import { routing } from "~/i18n/routing";
import { eventsApi } from "~/lib/api";
import { buildAlternates } from "~/lib/seo";
import { createSupabasePublicServerClient } from "~/lib/supabase/server";
import { cn } from "~/lib/utils";
import { type AdvertiseInterest, parseAdvertiseInterest } from "~/types";

const PARTNERSHIP_EMAIL = "silvena@all4ruse.com";
const CONTACT_HASH = `#${ADVERTISE_CONTACT_HASH}`;

const sectionCardClass = cn("border-border/80 shadow-sm", "why-fade-in");
const navyText = "text-[#1B2333] dark:text-foreground";
const accentNumber = "text-[#E05D39] dark:text-primary";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

export const revalidate = 300;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ interest?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Advertise" });
  const title = t("pageTitle");
  const description = t("pageDescription");
  const alternates = buildAlternates(locale, "/advertise");

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      siteName: "All4Ruse",
      locale: "bg_BG",
      type: "website",
      images: [
        {
          url: "/og-home.png?v=2",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: [`${siteUrl}/og-home.png?v=2`],
    },
  };
}

type AdvertiseSectionProps = {
  id?: string;
  fadeDelay: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  contentClassName?: string;
  className?: string;
  children: ReactNode;
};

function AdvertiseSection({
  id,
  fadeDelay,
  title,
  subtitle,
  contentClassName,
  className,
  children,
}: AdvertiseSectionProps) {
  return (
    <section
      id={id}
      className={cn("w-full scroll-mt-24", className ?? "max-w-3xl")}
    >
      {title != null ? (
        <Card className={cn(sectionCardClass, fadeDelay, "bg-card gap-0")}>
          <CardHeader className="border-b-0 px-5 pt-5 pb-2 sm:px-7">
            <Typography.H2 className={cn("border-0 pb-0", navyText)}>
              {title}
            </Typography.H2>
            {subtitle != null ? (
              <Typography.P className="text-muted-foreground mt-2 text-pretty">
                {subtitle}
              </Typography.P>
            ) : null}
          </CardHeader>
          <CardContent
            className={cn("px-5 pb-5 sm:px-7 sm:pb-7", contentClassName)}
          >
            {children}
          </CardContent>
        </Card>
      ) : (
        <div className={fadeDelay}>{children}</div>
      )}
    </section>
  );
}

function contactHref(interest?: AdvertiseInterest) {
  if (!interest) return CONTACT_HASH;
  return `/advertise?interest=${interest}${CONTACT_HASH}`;
}

function RubricExample({
  kicker,
  title,
  partner,
  caption,
}: {
  kicker: string;
  title: string;
  partner: string;
  caption: string;
}) {
  return (
    <figure className="flex flex-col gap-2">
      <div
        className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm"
        aria-hidden
      >
        <div className="bg-muted/70 flex items-start gap-2 px-4 py-2.5">
          <Newspaper className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <span className="text-muted-foreground text-xs leading-snug font-medium">
            {kicker}
          </span>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <p className={cn("text-lg leading-snug font-semibold text-pretty", navyText)}>
            {title}
          </p>
          <div className="border-primary/30 bg-primary/5 flex items-start gap-3 rounded-lg border px-3 py-2.5">
            <div className="bg-background mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-md border">
              <Store className="text-primary size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-[11px] leading-snug font-medium">
                {kicker}
              </p>
              <p
                className={cn(
                  "text-sm leading-snug font-semibold text-pretty",
                  navyText,
                )}
              >
                {partner}
              </p>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="text-muted-foreground text-xs text-pretty">
        {caption}
      </figcaption>
    </figure>
  );
}

function NearbyExample({
  label,
  title,
  name,
  meta,
  cta,
  caption,
}: {
  label: string;
  title: string;
  name: string;
  meta: string;
  cta: string;
  caption: string;
}) {
  return (
    <figure className="flex flex-col gap-2">
      <div
        className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm"
        aria-hidden
      >
        <div className="relative h-36">
          <Image
            src="/partners/partner-evropa.jpg"
            alt=""
            fill
            className="object-cover object-top"
            sizes="(max-width: 768px) 100vw, 320px"
          />
        </div>
        <div className="flex flex-col gap-3 p-4">
          <Badge
            variant="secondary"
            className="w-fit rounded-md text-[10px] font-semibold tracking-wide uppercase"
          >
            {label}
          </Badge>
          <p className={cn("text-sm font-semibold", navyText)}>{title}</p>
          <div>
            <p className={cn("text-sm font-semibold", navyText)}>{name}</p>
            <p className="text-muted-foreground text-xs">{meta}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="pointer-events-none w-full justify-between"
            tabIndex={-1}
            aria-hidden
          >
            {cta}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
      <figcaption className="text-muted-foreground text-xs text-pretty">
        {caption}
      </figcaption>
    </figure>
  );
}

export default async function AdvertisePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Advertise" });
  const { interest: interestParam } = await searchParams;
  const defaultInterest = parseAdvertiseInterest(interestParam);

  const client = createSupabasePublicServerClient();
  const upcomingEvents = await eventsApi.getActiveEvents(client);
  const upcomingEventsCount = upcomingEvents.length;

  const opportunities = [
    {
      interest: "rubric" as const,
      icon: BookOpen,
      title: t("opportunity1Title"),
      text: t("opportunity1Text"),
      fit: t("opportunity1Fit"),
    },
    {
      interest: "nearby" as const,
      icon: MapPin,
      title: t("opportunity2Title"),
      text: t("opportunity2Text"),
      fit: t("opportunity2Fit"),
    },
    {
      interest: "sponsored" as const,
      icon: Clapperboard,
      title: t("opportunity3Title"),
      text: t("opportunity3Text"),
      fit: t("opportunity3Note"),
    },
  ];

  const steps = [
    { title: t("step1Title"), text: t("step1Text") },
    { title: t("step2Title"), text: t("step2Text") },
    { title: t("step3Title"), text: t("step3Text") },
  ];

  const faqs = [
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq7Q"), a: t("faq7A") },
    { q: t("faq6Q"), a: t("faq6A") },
    { q: t("faq8Q"), a: t("faq8A") },
  ];

  const stats = [
    {
      value: t("statVisitorsValue"),
      label: t("statVisitorsLabel"),
      accent: true,
    },
    {
      value: String(upcomingEventsCount),
      label: t("statEventsLabel"),
      accent: true,
    },
    {
      value: t("statAudienceValue"),
      label: t("statAudienceLabel"),
      accent: false,
    },
  ];

  return (
    <div className="xl:-mx-30">
      <div className="mx-auto w-full max-w-7xl px-6 pt-4 sm:pt-6 lg:px-8">
        <div
          className={cn(
            "via-background to-background dark:from-background flex w-full flex-col items-center gap-8 rounded-xl bg-linear-to-b from-white px-4 py-8 sm:gap-10 sm:px-6 sm:py-10",
            navyText,
          )}
        >
          {/* 1. Hero */}
          <section className="relative w-full max-w-3xl pb-1 text-center">
            <div
              className="from-primary/20 via-primary/5 absolute inset-x-0 top-0 -z-10 h-32 bg-linear-to-b to-transparent opacity-70 blur-2xl"
              aria-hidden
            />
            <Typography.H1 className="why-fade-in why-fade-delay-0 mb-4 text-3xl text-pretty sm:text-4xl">
              {t("heroTitle")}
            </Typography.H1>
            <Typography.P className="text-muted-foreground why-fade-in why-fade-delay-100 mx-auto max-w-2xl text-lg text-pretty">
              {t("heroText")}
            </Typography.P>
            <div className="why-fade-in why-fade-delay-200 mt-6 flex flex-col items-center gap-2">
              <Button asChild size="lg">
                <TrackedLink
                  eventKey="advertise.cta.request_proposal"
                  href={CONTACT_HASH}
                >
                  <Send className="size-4" aria-hidden />
                  {t("ctaRequestProposal")}
                </TrackedLink>
              </Button>
              <p className="text-muted-foreground max-w-md text-sm text-pretty">
                {t("heroCtaHint")}
              </p>
            </div>
          </section>

          {/* 2. Proof */}
          <section className="why-fade-in why-fade-delay-200 w-full max-w-4xl">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-card border-border/80 flex flex-col items-center justify-center gap-1 rounded-xl border px-4 py-5 text-center shadow-sm"
                >
                  {stat.accent ? (
                    <p
                      className={cn(
                        "text-2xl font-extrabold tracking-tight sm:text-3xl",
                        accentNumber,
                      )}
                    >
                      {stat.value}
                    </p>
                  ) : (
                    <p className="text-lg font-bold tracking-tight sm:text-xl">
                      {stat.value}
                    </p>
                  )}
                  <p className="text-sm leading-snug text-pretty">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-card border-border/80 mt-3 rounded-xl border px-5 py-4 shadow-sm sm:px-6">
              <p className="text-pretty">
                <span
                  className={cn(
                    "mr-2 text-2xl font-extrabold tracking-tight",
                    accentNumber,
                  )}
                >
                  {t("proofReachValue")}
                </span>
                {t("proofReachText")}
              </p>
              <p className="text-muted-foreground mt-2 text-xs text-pretty">
                {t("proofReachNote")}
              </p>
            </div>
          </section>

          {/* 3. Three options */}
          <AdvertiseSection
            id="opportunities"
            fadeDelay="why-fade-delay-300"
            className="max-w-5xl"
            title={t("opportunitiesTitle")}
            subtitle={t("opportunitiesSubtitle")}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {opportunities.map(
                ({ interest, icon: Icon, title, text, fit }, index) => (
                  <article
                    key={title}
                    className="border-border/80 bg-background flex h-full flex-col rounded-xl border p-5 shadow-sm"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span
                        className={cn(
                          "text-sm font-extrabold tracking-wide",
                          accentNumber,
                        )}
                      >
                        0{index + 1}
                      </span>
                      <Icon
                        className="text-muted-foreground size-5"
                        aria-hidden
                      />
                    </div>
                    <Typography.H3 className="mb-2 text-lg leading-snug">
                      {title}
                    </Typography.H3>
                    <p className="text-sm leading-relaxed text-pretty">
                      {text}
                    </p>
                    <p className="text-muted-foreground mt-3 text-xs leading-relaxed text-pretty">
                      {fit}
                    </p>
                    <TrackedLink
                      eventKey="advertise.cta.discuss_idea"
                      href={contactHref(interest)}
                      className="text-primary mt-auto pt-4 text-sm font-medium hover:underline"
                    >
                      {t("opportunityChoose")}
                    </TrackedLink>
                  </article>
                ),
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <RubricExample
                kicker={t("exampleRubricKicker")}
                title={t("exampleRubricTitle")}
                partner={t("exampleRubricPartner")}
                caption={t("exampleRubricCaption")}
              />
              <NearbyExample
                label={t("exampleNearbyLabel")}
                title={t("exampleNearbyTitle")}
                name={t("exampleNearbyName")}
                meta={t("exampleNearbyMeta")}
                cta={t("exampleNearbyCta")}
                caption={t("exampleNearbyCaption")}
              />
            </div>

            <div className="mt-8 flex flex-col items-center gap-3 text-center">
              <p className="text-pretty">{t("opportunitiesOther")}</p>
              <Button asChild size="lg">
                <TrackedLink
                  eventKey="advertise.cta.discuss_idea"
                  href={CONTACT_HASH}
                >
                  <Send className="size-4" aria-hidden />
                  {t("ctaDiscussIdea")}
                </TrackedLink>
              </Button>
            </div>
          </AdvertiseSection>

          {/* 4. How it works */}
          <AdvertiseSection
            fadeDelay="why-fade-delay-400"
            className="max-w-4xl"
            title={t("stepsTitle")}
          >
            <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className="border-border/80 bg-background flex flex-col rounded-xl border p-5"
                >
                  <span
                    className={cn(
                      "mb-3 flex size-8 items-center justify-center rounded-full text-sm font-extrabold",
                      "dark:bg-primary bg-[#E05D39] text-white",
                    )}
                  >
                    {index + 1}
                  </span>
                  <p className="mb-2 leading-snug font-semibold">
                    {step.title}
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </AdvertiseSection>

          {/* 5. Organizers — clearly separate from business offers */}
          <section className="why-fade-in why-fade-delay-500 w-full max-w-3xl">
            <div className="bg-muted/40 border-border rounded-xl border border-dashed px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="bg-background text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg border">
                  <Crown className="size-5" aria-hidden />
                </div>
                <div className="flex-1">
                  <Typography.H2 className="mb-2 border-0 pb-0 text-xl">
                    {t("organizersTitle")}
                  </Typography.H2>
                  <p className="text-sm leading-relaxed text-pretty">
                    {t("organizersText")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {/* <Button asChild variant="outline">
                      <TrackedLink
                        eventKey="advertise.cta.add_event"
                        href="/create-event"
                      >
                        <CalendarDays className="size-4" aria-hidden />
                        {t("organizersCtaAdd")}
                      </TrackedLink>
                    </Button> */}
                    <Button asChild variant="secondary">
                      <TrackedLink
                        eventKey="advertise.cta.ask_premium"
                        href={contactHref("premium")}
                      >
                        {t("organizersCtaPremium")}
                      </TrackedLink>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 6. Contact form */}
          <AdvertiseSection
            id={ADVERTISE_CONTACT_HASH}
            fadeDelay="why-fade-delay-500"
            title={t("finalTitle")}
            subtitle={t.rich("finalText", {
              email: (chunks) => (
                <a
                  href={`mailto:${PARTNERSHIP_EMAIL}`}
                  className="text-primary font-medium underline"
                >
                  {chunks}
                </a>
              ),
            })}
          >
            <AdvertiseContactForm defaultInterest={defaultInterest} />
          </AdvertiseSection>

          {/* FAQ after the conversation starter */}
          <AdvertiseSection
            fadeDelay="why-fade-delay-600"
            title={
              <span className="flex items-center gap-2">
                <HelpCircle className="size-6 shrink-0" aria-hidden />
                {t("faqTitle")}
              </span>
            }
          >
            <Accordion type="single" collapsible className="w-full">
              {faqs.map(({ q, a }, index) => (
                <AccordionItem key={q} value={`faq-${index}`}>
                  <AccordionTrigger className="text-base">{q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-pretty">
                    {a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </AdvertiseSection>
        </div>
      </div>
    </div>
  );
}
