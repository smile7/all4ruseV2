"use client";

import { useTranslations } from "next-intl";

import {
  CalendarClock,
  CalendarDays,
  ChevronUp,
  Cookie,
  History,
  Info,
  Megaphone,
  Scale,
  ScrollText,
  Settings2,
  ShieldCheck,
} from "lucide-react";

import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
} from "~/components/icons/SocialIcons";
import { useCookieSettings } from "~/components/layout/CookieConsent";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Separator } from "~/components/ui/separator";
import {
  FACEBOOK_BRAND_COLOR,
  FACEBOOK_URL,
  INSTAGRAM_BRAND_COLOR,
  INSTAGRAM_URL,
  TIKTOK_URL,
} from "~/constants";
import { Link } from "~/i18n/navigation";

export function Footer() {
  const t = useTranslations("HomePage");
  const tGeneral = useTranslations("General");
  const { openSettings, canManageCookies } = useCookieSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="border-border/60 bg-background/85 fixed inset-x-0 bottom-0 z-40 hidden border-t backdrop-blur-md md:block">
      <div className="mx-auto flex h-10 max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* Left: dropdown with links */}
        <DropdownMenu>
          <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 text-xs transition-colors outline-none">
            <ChevronUp className="size-3.5" />
            <span>{t("more")}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="min-w-44">
            <DropdownMenuLabel className="text-center text-sm font-semibold">
              {t("more")}
            </DropdownMenuLabel>

            <div className="mb-1 flex items-center justify-center gap-5 py-2">
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener"
                aria-label="Facebook"
                className="flex flex-col items-center gap-1 transition-opacity hover:opacity-80"
                style={{ color: FACEBOOK_BRAND_COLOR }}
              >
                <span className="bg-muted flex size-8 items-center justify-center rounded-full">
                  <FacebookIcon size={14} />
                </span>
                <span className="text-muted-foreground text-[10px]">Facebook</span>
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener"
                aria-label="Instagram"
                className="flex flex-col items-center gap-1 transition-opacity hover:opacity-80"
                style={{ color: INSTAGRAM_BRAND_COLOR }}
              >
                <span className="bg-muted flex size-8 items-center justify-center rounded-full">
                  <InstagramIcon size={14} />
                </span>
                <span className="text-muted-foreground text-[10px]">Instagram</span>
              </a>
              <a
                href={TIKTOK_URL}
                target="_blank"
                rel="noopener"
                aria-label="TikTok"
                className="flex flex-col items-center gap-1 text-black transition-opacity hover:opacity-80 dark:text-white"
              >
                <span className="bg-muted flex size-8 items-center justify-center rounded-full">
                  <TikTokIcon size={14} />
                </span>
                <span className="text-muted-foreground text-[10px]">TikTok</span>
              </a>
            </div>

            <Separator className="mb-1" />

            <DropdownMenuItem asChild>
              <Link
                href="/"
                className="text-foreground/80 hover:text-foreground flex w-full cursor-pointer items-center gap-2"
              >
                <CalendarDays className="text-muted-foreground size-4 shrink-0" />
                {t("menuEvents")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/current"
                className="text-foreground/80 hover:text-foreground flex w-full cursor-pointer items-center gap-2"
              >
                <CalendarClock className="text-muted-foreground size-4 shrink-0" />
                {t("menuCurrentEvents")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/past"
                className="text-foreground/80 hover:text-foreground flex w-full cursor-pointer items-center gap-2"
              >
                <History className="text-muted-foreground size-4 shrink-0" />
                {t("menuPastEvents")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/why-all4ruse"
                className="text-foreground/80 hover:text-foreground flex w-full cursor-pointer items-center gap-2"
              >
                <Info className="text-muted-foreground size-4 shrink-0" />
                {t("menuWhyAll4Ruse")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/advertise"
                className="text-foreground/80 hover:text-foreground flex w-full cursor-pointer items-center gap-2"
              >
                <Megaphone className="text-muted-foreground size-4 shrink-0" />
                {t("menuAdvertise")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              {t("legal")}
            </DropdownMenuLabel>
            {canManageCookies && (
              <DropdownMenuItem
                className="text-foreground/80 hover:text-foreground flex w-full cursor-pointer items-center gap-2"
                onSelect={openSettings}
              >
                <Settings2 className="text-muted-foreground size-4 shrink-0" />
                {tGeneral("cookiePreferences")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link
                href="/legal/terms"
                className="text-foreground/80 hover:text-foreground flex w-full cursor-pointer items-center gap-2"
              >
                <Scale className="text-muted-foreground size-4 shrink-0" />
                {t("termsOfUse")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/legal/privacy"
                className="text-foreground/80 hover:text-foreground flex w-full cursor-pointer items-center gap-2"
              >
                <ShieldCheck className="text-muted-foreground size-4 shrink-0" />
                {t("privacyPolicy")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/legal/cookies"
                className="text-foreground/80 hover:text-foreground flex w-full cursor-pointer items-center gap-2"
              >
                <Cookie className="text-muted-foreground size-4 shrink-0" />
                {t("cookiesPolicy")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/legal/gdpr"
                className="text-foreground/80 hover:text-foreground flex w-full cursor-pointer items-center gap-2"
              >
                <ScrollText className="text-muted-foreground size-4 shrink-0" />
                GDPR
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Center: copyright */}
        <p className="text-muted-foreground text-xs">© All4Ruse {year}</p>

        {/* Right: social icons */}
        <div className="flex items-center gap-3.5">
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener"
            aria-label="Facebook"
            className="transition-opacity hover:opacity-80"
            style={{ color: FACEBOOK_BRAND_COLOR }}
          >
            <FacebookIcon size={15} />
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener"
            aria-label="Instagram"
            className="transition-opacity hover:opacity-80"
            style={{ color: INSTAGRAM_BRAND_COLOR }}
          >
            <InstagramIcon size={15} />
          </a>
          <a
            href={TIKTOK_URL}
            target="_blank"
            rel="noopener"
            aria-label="TikTok"
            className="text-black transition-opacity hover:opacity-80 dark:text-white"
          >
            <TikTokIcon size={15} />
          </a>
        </div>
      </div>
    </footer>
  );
}
