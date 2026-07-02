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
  ShieldCheck,
} from "lucide-react";

import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
} from "~/components/icons/SocialIcons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/why-all4ruse"
                className="text-foreground/80 hover:text-foreground flex w-full cursor-pointer items-center gap-2"
              >
                <Info className="text-muted-foreground size-4 shrink-0" />
                {t("menuWhyAll4Ruse")}
              </Link>
            </DropdownMenuItem>
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
