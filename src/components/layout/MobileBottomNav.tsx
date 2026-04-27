"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Bookmark, Calendar, Cookie, Info, MoreHorizontal, Plus, ShieldCheck } from "lucide-react";

import { FacebookIcon, InstagramIcon, TikTokIcon } from "~/components/icons/SocialIcons";
import { Separator } from "~/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet";
import {
  FACEBOOK_BRAND_COLOR,
  FACEBOOK_URL,
  INSTAGRAM_BRAND_COLOR,
  INSTAGRAM_URL,
  TIKTOK_URL,
} from "~/constants";
import { Link, usePathname } from "~/i18n/navigation";

export function MobileBottomNav() {
  const t = useTranslations("HomePage");
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const tabClass = (active: boolean) =>
    [
      "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
      active ? "text-primary" : "text-muted-foreground",
    ].join(" ");

  return (
    <>
      <nav
        aria-label="Навигация"
        className="border-border/60 bg-muted fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <Link href="/" className={`${tabClass(isActive("/"))} border-border/60 border-r`} aria-current={isActive("/") ? "page" : undefined}>
          <Calendar className="size-5" strokeWidth={isActive("/") ? 2.5 : 2} />
          <span>{t("navEvents")}</span>
        </Link>

        <Link href="/create-event" className={`${tabClass(isActive("/create-event"))} border-border/60 border-r`} aria-current={isActive("/create-event") ? "page" : undefined}>
          <Plus className="size-5" strokeWidth={isActive("/create-event") ? 2.5 : 2} />
          <span>{t("navCreate")}</span>
        </Link>

        <Link href="/profile/saved-events" className={`${tabClass(isActive("/profile/saved-events"))} border-border/60 border-r`} aria-current={isActive("/profile/saved-events") ? "page" : undefined}>
          <Bookmark className="size-5" strokeWidth={isActive("/profile/saved-events") ? 2.5 : 2} />
          <span>{t("favorites")}</span>
        </Link>

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={tabClass(false)}
          aria-label={t("more")}
        >
          <MoreHorizontal className="size-5" strokeWidth={2} />
          <span>{t("more")}</span>
        </button>
      </nav>

      {/* More sheet — slides up from bottom */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-safe px-0 pt-0 md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <SheetHeader className="border-border border-b px-5 py-4">
            <SheetTitle className="text-center text-sm font-semibold">{t("more")}</SheetTitle>
          </SheetHeader>

          <div className="overflow-y-auto px-5 py-3 text-center">
            {/* Social icons row */}
            <div className="mb-4 flex items-center justify-center gap-6">
              <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                className="flex flex-col items-center gap-1 transition-opacity hover:opacity-80"
                style={{ color: FACEBOOK_BRAND_COLOR }}>
                <span className="bg-muted flex size-10 items-center justify-center rounded-full">
                  <FacebookIcon size={18} />
                </span>
                <span className="text-[10px]">Facebook</span>
              </a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="flex flex-col items-center gap-1 transition-opacity hover:opacity-80"
                style={{ color: INSTAGRAM_BRAND_COLOR }}>
                <span className="bg-muted flex size-10 items-center justify-center rounded-full">
                  <InstagramIcon size={18} />
                </span>
                <span className="text-[10px]">Instagram</span>
              </a>
              <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" aria-label="TikTok"
                className="flex flex-col items-center gap-1 text-black transition-opacity hover:opacity-80 dark:text-white">
                <span className="bg-muted flex size-10 items-center justify-center rounded-full">
                  <TikTokIcon size={18} />
                </span>
                <span className="text-[10px]">TikTok</span>
              </a>
            </div>

            <Separator className="mb-3" />

            {/* Navigation link */}
            <Link href="/why-all4ruse" onClick={() => setMoreOpen(false)}
              className="text-foreground/80 hover:text-foreground flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors">
              <Info className="text-muted-foreground size-4 shrink-0" />
              <span>{t("menuWhyAll4Ruse")}</span>
            </Link>

            <Separator className="my-3" />

            {/* Legal links */}
            <p className="text-muted-foreground mb-1.5 px-1 text-xs font-medium uppercase tracking-wider">
              {t("legal")}
            </p>
            <Link href="/legal/privacy" onClick={() => setMoreOpen(false)}
              className="text-foreground/80 hover:text-foreground flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors">
              <ShieldCheck className="text-muted-foreground size-4 shrink-0" />
              <span>{t("privacyPolicy")}</span>
            </Link>
            <Link href="/legal/cookies" onClick={() => setMoreOpen(false)}
              className="text-foreground/80 hover:text-foreground flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors">
              <Cookie className="text-muted-foreground size-4 shrink-0" />
              <span>{t("cookiesPolicy")}</span>
            </Link>
            <Link href="/legal/gdpr" onClick={() => setMoreOpen(false)}
              className="text-foreground/80 hover:text-foreground flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors">
              <ShieldCheck className="text-muted-foreground size-4 shrink-0" />
              <span>GDPR</span>
            </Link>

            <Separator className="my-3" />

            <p className="text-muted-foreground px-1 text-xs">
              © All4Ruse {new Date().getFullYear()}
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
