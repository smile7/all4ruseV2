import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
  ArrowDown,
  Building2,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

import { EventCard } from "~/components/EventCard/EventCard";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { ObfuscatedEmail } from "~/components/ui/obfuscated-email";
import { DEFAULT_PROFILE_COLOR } from "~/constants";
import { profilesApi } from "~/lib/api";
import { parseProfileGallery } from "~/lib/profile-gallery";
import { createSupabaseServerClient } from "~/lib/supabase/server";
import type { Profile } from "~/types";

import { ProfileGallery } from "./ProfileGallery";
import { ProfileHeroHeaderImage } from "./ProfileHeroHeaderImage";
import { ProfilePastEvents } from "./ProfilePastEvents";
import { ProfileSectionHeader } from "./ProfileSectionHeader";
import { ProfileSocialLinks } from "./ProfileSocialLinks";
import { RevealOnScroll } from "./RevealOnScroll";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeColor(color: string | null | undefined): string {
  if (!color) return DEFAULT_PROFILE_COLOR;
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  return DEFAULT_PROFILE_COLOR;
}

function hexRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function displayName(profile: Profile): string {
  return profile.name_to_show || profile.full_name || profile.username || "—";
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; locale: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: rawProfile } = await profilesApi.getPublicProfile(
    supabase,
    username,
  );
  const profile = rawProfile as Profile | null;

  if (!profile) return {};

  const name = displayName(profile);
  const description =
    profile.bio?.slice(0, 160) ?? `${name} — профил в All4Ruse`;
  const ogImage = profile.header_url ?? profile.avatar_url ?? undefined;

  return {
    title: `${name} | All4Ruse`,
    description,
    openGraph: {
      title: `${name} | All4Ruse`,
      description,
      ...(ogImage && { images: [{ url: ogImage }] }),
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} | All4Ruse`,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string; locale: string }>;
}) {
  const { username } = await params;
  const t = await getTranslations("PublicProfile");

  const supabase = await createSupabaseServerClient();
  const { data: rawProfile } = await profilesApi.getPublicProfile(
    supabase,
    username,
  );
  // Cast to include header_url (added via Profile type extension until DB column is migrated)
  const profile = rawProfile as Profile | null;

  if (!profile) notFound();

  const showSavedEvents =
    (profile as Profile & { show_saved_events?: boolean | null })
      .show_saved_events ?? false;

  const [{ upcoming, total }, savedEvents] = await Promise.all([
    profilesApi.getPublicProfileUpcomingEvents(supabase, profile.id),
    showSavedEvents
      ? profilesApi.getPublicProfileSavedEvents(supabase, profile.id)
      : Promise.resolve([]),
  ]);

  const isHost = total > 0;
  const color = safeColor(profile.color);
  const rgb = hexRgb(color);
  const headerUrl = profile.header_url ?? null;
  const name = displayName(profile);
  const galleryImages = parseProfileGallery(profile.profile_gallery);

  const socialLinks = [
    profile.fb && {
      href: profile.fb,
      label: "Facebook",
      type: "facebook" as const,
    },
    profile.instagram && {
      href: profile.instagram,
      label: "Instagram",
      type: "instagram" as const,
    },
    profile.tiktok && {
      href: profile.tiktok,
      label: "TikTok",
      type: "tiktok" as const,
    },
  ].filter(Boolean) as {
    href: string;
    label: string;
    type: "facebook" | "instagram" | "tiktok";
  }[];

  // JSON-LD for hosts
  const jsonLd = isHost
    ? {
        "@context": "https://schema.org",
        "@type": "Organization",
        name,
        url: profile.website ?? undefined,
        logo: profile.avatar_url ?? undefined,
        image: headerUrl ?? profile.avatar_url ?? undefined,
        sameAs: [profile.fb, profile.instagram, profile.tiktok].filter(Boolean),
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section className="relative left-1/2 flex min-h-[80svh] w-screen max-w-[100vw] -translate-x-1/2 flex-col items-center justify-start overflow-hidden pt-10 pb-12 sm:pt-14">
        {/* Shared newspapers background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/newspapers.jpg"
            alt=""
            fill
            priority
            className="object-cover"
            aria-hidden
          />
          <div className="absolute inset-0 bg-black/85" />
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background: `linear-gradient(135deg, rgba(${rgb},0.25) 0%, transparent 50%, rgba(0,0,0,0.35) 100%)`,
            }}
          />
          <div className="from-background absolute inset-x-0 bottom-0 h-32 bg-linear-to-t to-transparent" />
        </div>

        {/* Centered identity */}
        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 text-center sm:px-8">
          <Avatar
            className="bg-background size-28 rounded-2xl p-2 shadow-2xl ring-4 ring-white/25 transition-transform duration-500 hover:scale-105 sm:size-36"
            style={{ boxShadow: `0 0 0 4px ${color}50` }}
          >
            <AvatarImage
              src={profile.avatar_url ?? undefined}
              alt={name}
              className="rounded-xl object-contain"
            />
            <AvatarFallback
              className="rounded-xl text-4xl font-bold text-white sm:text-5xl"
              style={{ backgroundColor: color }}
            >
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:mt-8 sm:text-6xl md:text-7xl">
            {name}
          </h1>

          {(profile.address_physical || profile.place) && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-base font-medium text-white/80 sm:mt-4 sm:text-xl">
              {profile.address_physical && (
                <div className="flex items-center justify-center gap-2">
                  <MapPin className="size-5 shrink-0" />
                  {profile.address_physical}
                </div>
              )}
              {profile.address_physical && profile.place && (
                <span className="hidden text-white/40 sm:inline" aria-hidden>
                  ·
                </span>
              )}
              {profile.place && (
                <div className="flex items-center justify-center gap-2">
                  <Building2 className="size-5 shrink-0" />
                  {profile.place}
                </div>
              )}
            </div>
          )}

          {(profile.website || socialLinks.length > 0) && (
            <div className="mt-8 flex flex-col items-center gap-4 sm:mt-10">
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:px-8 sm:py-3.5 sm:text-base"
                  style={{ backgroundColor: color }}
                >
                  {t("visitWebsite")}
                  <ExternalLink className="size-4 sm:size-5" />
                </a>
              )}
              {socialLinks.length > 0 && (
                <ProfileSocialLinks
                  links={socialLinks}
                  color={color}
                  className="flex justify-center gap-2 sm:gap-3 [&_a]:size-11 [&_a]:border-white/30 [&_a]:bg-white/10 [&_a]:text-white sm:[&_a]:size-12 [&_svg]:size-4 sm:[&_svg]:size-5"
                />
              )}
            </div>
          )}
        </div>

        {/* Scroll hint */}
        <div
          className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 animate-bounce text-white/60"
          aria-hidden
        >
          <ArrowDown className="size-7 sm:size-8" />
        </div>
      </section>

      {/* ── PERSPECTIVE HEADER IMAGE (SCROLL ANIMATION) ───────────────────────── */}
      <section className="relative z-20 w-full overflow-visible pb-10">
        <div className="mt-2 sm:-mt-4">
          <ProfileHeroHeaderImage
            src={headerUrl ?? "/newspapers.jpg"}
            alt={name}
            color={color}
          />
        </div>
      </section>

      {/* ── ABOUT ─────────────────────────────────────────────────────────────── */}
      {profile.bio && (
        <section id="about" className="group/section py-16 sm:py-24">
          <div className="mx-auto flex max-w-4xl flex-col items-center px-4 sm:px-8">
            <RevealOnScroll>
              <ProfileSectionHeader title={t("about")} color={color} />
            </RevealOnScroll>
            <RevealOnScroll delay={80} className="w-full">
              <div
                className="bg-background/90 relative w-full overflow-hidden rounded-4xl border p-8 shadow-lg backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl sm:p-12"
                style={{ boxShadow: `0 20px 60px -30px rgba(${rgb},0.45)` }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                <p className="text-muted-foreground text-lg leading-relaxed sm:text-xl">
                  {profile.bio}
                </p>
              </div>
            </RevealOnScroll>
          </div>
        </section>
      )}

      {/* ── CONTACT & INFO BAND ────────────────────────────────────────────────── */}
      {(profile.email_to_show || profile.phone || profile.address_physical) && (
        <section className="group/section relative overflow-hidden py-16 sm:py-24">
          <div
            className="absolute inset-0 opacity-60"
            style={{
              background: `radial-gradient(circle at top, rgba(${rgb},0.12) 0%, transparent 55%)`,
            }}
            aria-hidden
          />
          <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 sm:px-8">
            <RevealOnScroll>
              <ProfileSectionHeader title={t("contactInfo")} color={color} />
            </RevealOnScroll>
            <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-2 sm:gap-8 md:grid-cols-3">
              {profile.email_to_show && (
                <RevealOnScroll delay={0} from="scale">
                  <a
                    href={`mailto:${profile.email_to_show}`}
                    className="group/card bg-background/95 flex flex-col items-center gap-4 rounded-3xl border p-8 text-center shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
                  >
                    <div
                      className="flex size-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover/card:scale-110"
                      style={{ backgroundColor: `rgba(${rgb},0.12)`, color }}
                    >
                      <Mail className="size-6" />
                    </div>
                    <div>
                      <div className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                        {t("contactEmail")}
                      </div>
                      <div className="mt-1 text-lg font-medium break-all">
                        <ObfuscatedEmail email={profile.email_to_show} />
                      </div>
                    </div>
                  </a>
                </RevealOnScroll>
              )}
              {profile.phone && (
                <RevealOnScroll delay={100} from="scale">
                  <a
                    href={`tel:${profile.phone}`}
                    className="group/card bg-background/95 flex flex-col items-center gap-4 rounded-3xl border p-8 text-center shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
                  >
                    <div
                      className="flex size-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover/card:scale-110"
                      style={{ backgroundColor: `rgba(${rgb},0.12)`, color }}
                    >
                      <Phone className="size-6" />
                    </div>
                    <div>
                      <div className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                        {t("contactPhone")}
                      </div>
                      <div className="mt-1 text-lg font-medium">
                        {profile.phone}
                      </div>
                    </div>
                  </a>
                </RevealOnScroll>
              )}
              {profile.address_physical && (
                <RevealOnScroll
                  delay={200}
                  from="scale"
                  className="sm:col-span-2 md:col-span-1"
                >
                  <div className="group/card bg-background/95 flex flex-col items-center gap-4 rounded-3xl border p-8 text-center shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
                    <div
                      className="flex size-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover/card:scale-110"
                      style={{ backgroundColor: `rgba(${rgb},0.12)`, color }}
                    >
                      <MapPin className="size-6" />
                    </div>
                    <div>
                      <div className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                        {t("contactLocation")}
                      </div>
                      <div className="mt-1 text-lg font-medium">
                        {profile.address_physical}
                      </div>
                    </div>
                  </div>
                </RevealOnScroll>
              )}
            </div>
          </div>
        </section>
      )}

      {galleryImages.length > 0 && (
        <section className="group/section py-10 sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <RevealOnScroll>
              <ProfileSectionHeader title={t("galleryTitle")} color={color} />
            </RevealOnScroll>
            <RevealOnScroll delay={60}>
              <div className="bg-background/80 rounded-4xl border p-4 shadow-lg backdrop-blur-sm transition-shadow duration-500 hover:shadow-xl sm:p-6">
                <ProfileGallery
                  images={galleryImages}
                  title={t("galleryTitle")}
                />
              </div>
            </RevealOnScroll>
          </div>
        </section>
      )}

      {/* ── EVENTS SECTION ─────────────────────────────────────────────────────── */}
      {isHost && (
        <div className="pt-24 pb-32">
          {/* Upcoming Events */}
          <section className="group/section mx-auto mb-32 max-w-7xl px-4 sm:px-8">
            <RevealOnScroll>
              <ProfileSectionHeader title={t("upcomingEvents")} color={color} />
            </RevealOnScroll>

            {upcoming.length === 0 ? (
              <RevealOnScroll delay={60}>
                <div className="border-border bg-secondary/10 hover:border-primary/30 hover:bg-secondary/20 flex min-h-[300px] flex-col items-center justify-center rounded-4xl border-2 border-dashed p-12 text-center transition-colors duration-300">
                  <p className="text-muted-foreground text-2xl font-medium">
                    {t("noUpcomingEvents")}
                  </p>
                </div>
              </RevealOnScroll>
            ) : (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {upcoming.map((event, i) => (
                  <RevealOnScroll key={event.id} delay={i * 80} from="scale">
                    <EventCard event={event} />
                  </RevealOnScroll>
                ))}
              </div>
            )}
          </section>

          {/* Past Events */}
          <section className="group/section mx-auto max-w-7xl px-4 sm:px-8">
            <RevealOnScroll>
              <ProfileSectionHeader
                title={t("pastEvents")}
                color={color}
                align="start"
                muted
              />
            </RevealOnScroll>
            <RevealOnScroll delay={60}>
              <ProfilePastEvents userId={profile.id} />
            </RevealOnScroll>
          </section>

          {/* Saved Events (optional, shown when enabled) */}
          {showSavedEvents && savedEvents.length > 0 && (
            <section className="group/section mx-auto mt-32 max-w-7xl px-4 sm:px-8">
              <RevealOnScroll>
                <ProfileSectionHeader
                  title={t("savedEventsSection")}
                  color={color}
                  align="start"
                  muted
                />
              </RevealOnScroll>
              <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {savedEvents.map((event, i) => (
                  <RevealOnScroll key={event.id} delay={i * 80} from="scale">
                    <EventCard event={event} />
                  </RevealOnScroll>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Non-host: show saved events if enabled */}
      {!isHost && showSavedEvents && savedEvents.length > 0 && (
        <div className="pt-24 pb-32">
          <section className="group/section mx-auto max-w-7xl px-4 sm:px-8">
            <RevealOnScroll>
              <ProfileSectionHeader
                title={t("savedEventsSection")}
                color={color}
              />
            </RevealOnScroll>
            <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {savedEvents.map((event, i) => (
                <RevealOnScroll key={event.id} delay={i * 80} from="scale">
                  <EventCard event={event} />
                </RevealOnScroll>
              ))}
            </div>
          </section>
        </div>
      )}

      {!isHost && (!showSavedEvents || savedEvents.length === 0) && (
        <div className="pb-32" />
      )}
    </>
  );
}
