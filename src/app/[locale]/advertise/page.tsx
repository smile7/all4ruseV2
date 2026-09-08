import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";

import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Coffee,
  Compass,
  Crown,
  Handshake,
  HelpCircle,
  Landmark,
  Mail,
  MapPin,
  MapPinned,
  Megaphone,
  Palette,
  ShoppingBag,
  Sparkles,
  Store,
  Target,
  Users,
} from "lucide-react";

import { Typography } from "~/components/layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Link } from "~/i18n/navigation";
import { eventsApi } from "~/lib/api";
import { buildAlternates } from "~/lib/seo";
import { createSupabaseServerClient } from "~/lib/supabase/server";
import { cn } from "~/lib/utils";

const PARTNERSHIP_EMAIL = "silvena@all4ruse.com";
const partnershipMailto = (subject: string) =>
  `mailto:${PARTNERSHIP_EMAIL}?subject=${encodeURIComponent(subject)}`;

const sectionCardClass = cn("border-primary/30 shadow-md", "why-fade-in");
const sectionContentPad = "px-6 py-6 sm:px-8 sm:py-8";
const sectionContentPadAfterHeader = "px-6 pb-6 pt-0 sm:px-8 sm:pb-8";

// ─── Metadata ───────────────────────────────────────────────────────────────

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

export async function generateMetadata() {
  const [t, locale] = await Promise.all([
    getTranslations("Advertise"),
    getLocale(),
  ]);
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

// ─── Shared layout building blocks ─────────────────────────────────────────

type AdvertiseSectionProps = {
  id?: string;
  fadeDelay: string;
  bgTint?: string;
  title?: ReactNode;
  contentClassName?: string;
  className?: string;
  children: ReactNode;
};

function AdvertiseSection({
  id,
  fadeDelay,
  bgTint = "bg-background/90",
  title,
  contentClassName,
  className,
  children,
}: AdvertiseSectionProps) {
  return (
    <section id={id} className={cn("w-full max-w-3xl scroll-mt-24", className)}>
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

const highlightCardClass =
  "flex flex-col items-center rounded-xl border border-border/80 bg-linear-to-br from-primary/15 to-background p-6 text-center shadow-sm";

// ─── Event-page ad mockup — the visual centerpiece of the pitch ───────────

function EventPageAdMockup({
  label,
  title,
  businessName,
  description,
  cta,
  compact = false,
}: {
  label: string;
  title: string;
  businessName: string;
  description: string;
  cta: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-border/80 bg-card mx-auto w-full overflow-hidden rounded-2xl border shadow-lg",
        compact ? "max-w-sm" : "max-w-md",
      )}
      aria-hidden
    >
      {/* Fake map strip — neutral placeholder, not a real map */}
      <div
        className={cn(
          "relative overflow-hidden",
          compact ? "h-28" : "h-36 sm:h-40",
        )}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: "var(--muted)",
            backgroundImage:
              "repeating-linear-gradient(0deg, color-mix(in oklch, var(--foreground) 6%, transparent) 0px, color-mix(in oklch, var(--foreground) 6%, transparent) 1px, transparent 1px, transparent 32px), repeating-linear-gradient(90deg, color-mix(in oklch, var(--foreground) 6%, transparent) 0px, color-mix(in oklch, var(--foreground) 6%, transparent) 1px, transparent 1px, transparent 32px)",
          }}
        />
        <div className="from-primary/25 absolute inset-0 bg-linear-to-br via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <MapPin
            className="text-primary size-9 drop-shadow-sm"
            strokeWidth={2.25}
          />
        </div>
      </div>

      {/* Partner card */}
      <div className={cn("flex flex-col gap-3", compact ? "p-4" : "p-5")}>
        <Badge
          variant="secondary"
          className="w-fit gap-1.5 rounded-md text-[10px] font-semibold tracking-wide uppercase"
        >
          <Sparkles className="size-3" aria-hidden />
          {label}
        </Badge>
        <p className={cn("font-semibold", compact ? "text-sm" : "text-base")}>
          {title}
        </p>
        <div className="flex items-center gap-3">
          <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
            <Store className="text-muted-foreground size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{businessName}</p>
            <p className="text-muted-foreground truncate text-xs">
              {description}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between"
          tabIndex={-1}
        >
          {cta}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function AdvertisePage() {
  const t = await getTranslations("Advertise");

  const client = await createSupabaseServerClient();
  const upcomingEvents = await eventsApi.getActiveEvents(client);
  const upcomingEventsCount = upcomingEvents.length;

  const discussPartnershipHref = partnershipMailto(
    "Интерес към партньорство с All4Ruse",
  );
  const featureBusinessHref = partnershipMailto(
    "Представяне на бизнес в All4Ruse",
  );
  const inquiryHref = partnershipMailto("Запитване за реклама в All4Ruse");

  const opportunities = [
    {
      icon: Target,
      title: t("opportunity1Title"),
      text: t("opportunity1Text"),
    },
    {
      icon: MapPinned,
      title: t("opportunity2Title"),
      text: t("opportunity2Text"),
    },
    {
      icon: Sparkles,
      title: t("opportunity3Title"),
      text: t("opportunity3Text"),
    },
  ];

  const profileItems = [
    t("profileList1"),
    t("profileList2"),
    t("profileList3"),
    t("profileList4"),
    t("profileList5"),
    t("profileList6"),
    t("profileList7"),
  ];

  const audienceCategories = [
    { icon: Coffee, text: t("audienceCategory1") },
    { icon: Palette, text: t("audienceCategory2") },
    { icon: BedDouble, text: t("audienceCategory3") },
    { icon: Compass, text: t("audienceCategory4") },
    { icon: ShoppingBag, text: t("audienceCategory5") },
    { icon: Landmark, text: t("audienceCategory6") },
  ];

  // const steps = [
  //   { icon: MessageCircle, title: t("step1Title"), text: t("step1Text") },
  //   { icon: Handshake, title: t("step2Title"), text: t("step2Text") },
  //   { icon: Rocket, title: t("step3Title"), text: t("step3Text") },
  // ];

  const faqs = [
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq3Q"), a: t("faq3A") },
    { q: t("faq4Q"), a: t("faq4A") },
    { q: t("faq6Q"), a: t("faq6A") },
    { q: t("faq7Q"), a: t("faq7A") },
    { q: t("faq8Q"), a: t("faq8A") },
  ];

  return (
    <div className="from-primary/10 via-background to-background mx-auto flex w-full max-w-7xl flex-col items-center gap-16 rounded-xl bg-linear-to-b px-6 py-10 lg:px-8">
      {/* ── 1. Hero — width matches the header's logo/auth-button bounds ── */}
      <section className="relative w-full pb-4">
        <div
          className="from-primary/30 via-primary/10 absolute inset-x-0 top-0 -z-10 h-40 bg-linear-to-b to-transparent opacity-60 blur-2xl"
          aria-hidden
        />
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-14">
          {/* Left — copy */}
          <div className="flex min-w-0 flex-col items-center text-center lg:flex-1 lg:items-start lg:text-left">
            <Badge
              variant="default"
              className="why-fade-in why-fade-delay-0 mb-6 h-auto gap-2 rounded-lg px-5 py-2 text-base font-semibold shadow-lg [&>svg]:size-5"
            >
              <Megaphone className="shrink-0" aria-hidden />
              <span className="text-pretty">{t("heroEyebrow")}</span>
            </Badge>
            <Typography.H1 className="why-fade-in why-fade-delay-100 mb-4 text-pretty drop-shadow-sm">
              {t("heroTitle")}
            </Typography.H1>
            <Typography.P className="text-muted-foreground why-fade-in why-fade-delay-200 max-w-xl text-lg text-pretty">
              {t("heroText")}
            </Typography.P>
            {/* <Typography.P className="text-muted-foreground why-fade-in why-fade-delay-300 mt-3 max-w-xl text-pretty">
              {t("heroSubtext")}
            </Typography.P> */}

            <div className="why-fade-in why-fade-delay-400 mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Button asChild size="lg">
                <a href={discussPartnershipHref}>
                  <Handshake className="size-4" aria-hidden />
                  {t("ctaDiscussPartnership")}
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#opportunities">{t("heroCtaSecondary")}</a>
              </Button>
            </div>

            {/* Stats */}
            <div className="why-fade-in why-fade-delay-500 mt-8 flex flex-col items-center gap-3 lg:items-start">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="bg-primary/10 border-primary/20 flex flex-col items-center gap-1.5 rounded-xl border px-4 py-3 text-center">
                  <Users className="text-primary size-5 shrink-0" aria-hidden />
                  <span className="text-primary text-sm font-semibold">
                    {t("statVisitors")}
                  </span>
                </div>
                <div className="bg-primary/10 border-primary/20 flex flex-col items-center gap-1.5 rounded-xl border px-4 py-3 text-center">
                  <CalendarDays
                    className="text-primary size-5 shrink-0"
                    aria-hidden
                  />
                  <span className="text-primary text-sm font-semibold">
                    {t("statEvents", { count: upcomingEventsCount })}
                  </span>
                </div>
                <div className="bg-primary/10 border-primary/20 flex flex-col items-center gap-1.5 rounded-xl border px-4 py-3 text-center">
                  <MapPin
                    className="text-primary size-5 shrink-0"
                    aria-hidden
                  />
                  <span className="text-primary text-sm font-semibold">
                    {t("statAudience")}
                  </span>
                </div>
              </div>
              {/* <p className="text-muted-foreground text-xs">
                {t("statVisitorsNote")}
              </p> */}
            </div>
          </div>

          {/* Right — visual example of the ad format */}
          <div className="why-fade-in why-fade-delay-500 w-full max-w-sm shrink-0 lg:max-w-xs xl:max-w-sm">
            <EventPageAdMockup
              label={t("mockupLabel")}
              title={t("mockupTitle")}
              businessName={t("mockupBusinessName")}
              description={t("mockupDescription")}
              cta={t("mockupCta")}
            />
          </div>
        </div>
      </section>

      {/* ── 2. Основно предимство ──────────────────────────────────────── */}
      <AdvertiseSection
        id="opportunities"
        fadeDelay="why-fade-delay-300"
        title={t("opportunitiesTitle")}
      >
        <Typography.P className="text-pretty">
          {t("opportunitiesText")}
        </Typography.P>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {opportunities.map(({ icon: Icon, title, text }) => (
            <div key={title} className={highlightCardClass}>
              <Icon className="text-primary mb-2 size-8" aria-hidden />
              <Typography.H3 className="mb-2 text-center text-lg">
                {title}
              </Typography.H3>
              <Typography.Small className="text-center leading-snug">
                {text}
              </Typography.Small>
            </div>
          ))}
        </div>
      </AdvertiseSection>

      {/* ── 3. Основен рекламен формат ─────────────────────────────────── */}
      <AdvertiseSection fadeDelay="why-fade-delay-400" title={t("formatTitle")}>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
          <div className="flex flex-1 flex-col gap-4">
            <Typography.P className="text-pretty">
              {t("formatText")}
            </Typography.P>
            <Typography.P className="text-muted-foreground text-pretty">
              {t("formatSubtext")}
            </Typography.P>
          </div>
          <div className="w-full shrink-0 lg:w-72">
            <EventPageAdMockup
              label={t("mockupLabel")}
              title={t("mockupTitle")}
              businessName={t("mockupBusinessName")}
              description={t("mockupDescription")}
              cta={t("mockupCta")}
              compact
            />
          </div>
        </div>
        {/* <p className="text-muted-foreground mt-6 text-center text-sm text-pretty">
          {t("formatNote")}
        </p> */}
      </AdvertiseSection>

      {/* ── 4. Профилна страница на бизнеса ────────────────────────────── */}
      <AdvertiseSection
        fadeDelay="why-fade-delay-500"
        title={t("profileTitle")}
      >
        <Typography.P className="text-pretty">{t("profileText")}</Typography.P>
        <ul className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {profileItems.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <CheckCircle2
                className="text-primary mt-0.5 size-4 shrink-0"
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Typography.P className="text-muted-foreground mt-6 text-pretty">
          {t("profileNote")}
        </Typography.P>
        {/* <div className="mt-6 flex justify-center">
          <Button asChild size="lg">
            <a href={featureBusinessHref}>
              <Store className="size-4" aria-hidden />
              {t("profileCta")}
            </a>
          </Button>
        </div> */}
      </AdvertiseSection>

      {/* ── 5. Допълнително офлайн присъствие (по-малка секция) ────────── */}
      {/* <AdvertiseSection
        fadeDelay="why-fade-delay-600"
        className="max-w-2xl"
        bgTint="bg-background/70"
      >
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <QrCode className="size-5" aria-hidden />
          </div>
          <div>
            <Typography.H3 className="mb-2 text-lg">
              {t("offlineTitle")}
            </Typography.H3>
            <Typography.Small className="block leading-relaxed text-pretty">
              {t("offlineText")}
            </Typography.Small>
            <Typography.Small className="mt-2 block leading-relaxed text-pretty italic">
              {t("offlineNote")}
            </Typography.Small>
          </div>
        </div>
      </AdvertiseSection> */}

      {/* ── 6. За кого е подходящо ──────────────────────────────────────── */}
      <AdvertiseSection
        fadeDelay="why-fade-delay-700"
        title={t("audienceTitle")}
      >
        <Typography.P className="text-pretty">{t("audienceText")}</Typography.P>
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {audienceCategories.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="border-border/80 bg-background/60 flex items-start gap-3 rounded-lg border p-3"
            >
              <Icon
                className="text-primary mt-0.5 size-5 shrink-0"
                aria-hidden
              />
              <span className="text-sm">{text}</span>
            </li>
          ))}
        </ul>
        <Typography.P className="text-muted-foreground mt-6 text-pretty">
          {t("audienceNote")}
        </Typography.P>
      </AdvertiseSection>

      {/* ── 7. PREMIUM събития (второстепенна секция) ──────────────────── */}
      <AdvertiseSection
        fadeDelay="why-fade-delay-800"
        className="max-w-2xl"
        bgTint="bg-background/70"
      >
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <Crown className="size-5" aria-hidden />
          </div>
          <div className="flex-1">
            <Typography.H3 className="mb-2 text-lg">
              {t("premiumTitle")}
            </Typography.H3>
            <Typography.Small className="block leading-relaxed text-pretty">
              {t("premiumText")}
            </Typography.Small>
            <div className="mt-4 flex justify-center sm:justify-start">
              <Button asChild variant="secondary">
                <Link href="/create-event">
                  <CalendarDays className="size-4" aria-hidden />
                  {t("premiumCta")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </AdvertiseSection>

      {/* ── 8. Как започваме ────────────────────────────────────────────── */}
      {/* <AdvertiseSection fadeDelay="why-fade-delay-800" title={t("stepsTitle")}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <div key={title} className={highlightCardClass}>
              <div className="border-primary/40 text-primary mb-3 flex size-8 items-center justify-center rounded-full border text-sm font-bold">
                {index + 1}
              </div>
              <Icon className="text-primary mb-2 size-7" aria-hidden />
              <Typography.H3 className="mb-2 text-center text-lg">
                {title}
              </Typography.H3>
              <Typography.Small className="text-center leading-snug">
                {text}
              </Typography.Small>
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Button asChild size="lg">
            <a href={inquiryHref}>
              <Send className="size-4" aria-hidden />
              {t("stepsCta")}
            </a>
          </Button>
        </div>
      </AdvertiseSection> */}

      {/* ── 9. Често задавани въпроси ────────────────────────────────────── */}
      <AdvertiseSection
        fadeDelay="why-fade-delay-800"
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

      {/* ── 10. Финален CTA ──────────────────────────────────────────────── */}
      <section className="why-fade-in why-fade-delay-800 w-full max-w-4xl">
        <div className="bg-primary text-primary-foreground relative overflow-hidden rounded-2xl px-6 py-10 text-center shadow-xl sm:px-12 sm:py-14">
          <div
            className="absolute inset-0 -z-10 bg-linear-to-br from-white/10 via-transparent to-black/10"
            aria-hidden
          />
          <Typography.H2 className="mb-4 border-0 pb-0 text-3xl text-pretty text-white">
            {t("finalTitle")}
          </Typography.H2>
          <Typography.P className="mx-auto mb-8 max-w-2xl text-pretty text-white/90">
            {t("finalText")}
          </Typography.P>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="text-primary bg-white hover:bg-white/90"
            >
              <a href={discussPartnershipHref}>
                <Mail className="size-4" aria-hidden />
                {t("ctaDiscussPartnership")}
              </a>
            </Button>
            <Button
              asChild
              variant="link"
              className="h-auto p-0 text-base font-medium text-white"
            >
              <a href={discussPartnershipHref} aria-label={t("emailAriaLabel")}>
                {PARTNERSHIP_EMAIL}
              </a>
            </Button>
          </div>
          <p className="mx-auto mt-8 max-w-xl text-xs text-pretty text-white/70">
            {t("finalMediaNote")}
          </p>
        </div>
      </section>
    </div>
  );
}
