"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type { User } from "@supabase/supabase-js";
import {
  Bookmark,
  Calendar,
  CalendarClock,
  CalendarDays,
  Cookie,
  ExternalLink,
  History,
  Info,
  LogOut,
  Megaphone,
  MoreHorizontal,
  Plus,
  Scale,
  ScrollText,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";

import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
} from "~/components/icons/SocialIcons";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { Separator } from "~/components/ui/separator";
import {
  FACEBOOK_BRAND_COLOR,
  FACEBOOK_URL,
  INSTAGRAM_BRAND_COLOR,
  INSTAGRAM_URL,
  TIKTOK_URL,
} from "~/constants";
import { Link, usePathname, useRouter } from "~/i18n/navigation";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";

function getAvatarFallback(user: User): string {
  const name =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "?";
  return name.charAt(0).toUpperCase();
}

export function MobileBottomNav() {
  const t = useTranslations("HomePage");
  const tSaved = useTranslations("SavedEvents");
  const tProfile = useTranslations("Profile");
  const pathname = usePathname();
  const router = useRouter();

  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | undefined>(undefined);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        supabase
          .from("profiles")
          .select("username")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            setUsername(profile?.username ?? undefined);
          });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setUsername(undefined);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setProfileOpen(false);
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const tabClass = (active: boolean) =>
    [
      "flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium transition-colors",
      active ? "text-primary" : "text-muted-foreground",
    ].join(" ");

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const isProfileActive =
    (isActive("/profile") && !isActive("/profile/saved-events")) ||
    isActive("/auth");

  return (
    <>
      <nav
        aria-label={t("navAriaLabel")}
        className="border-border/60 bg-muted fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Tab 1 — Events */}
        <Link
          href="/"
          className={`${tabClass(isActive("/"))} border-border/60 border-r`}
          aria-current={isActive("/") ? "page" : undefined}
        >
          <Calendar className="size-5" strokeWidth={isActive("/") ? 2.5 : 2} />
          <span>{t("navEvents")}</span>
        </Link>

        {/* Tab 2 — Saved */}
        <Link
          href="/profile/saved-events"
          className={`${tabClass(isActive("/profile/saved-events"))} border-border/60 border-r`}
          aria-current={isActive("/profile/saved-events") ? "page" : undefined}
        >
          <Bookmark
            className="size-5"
            strokeWidth={isActive("/profile/saved-events") ? 2.5 : 2}
          />
          <span>{t("favorites")}</span>
        </Link>

        {/* Tab 3 — More */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`${tabClass(false)} border-border/60 border-r`}
          aria-label={t("more")}
        >
          <MoreHorizontal className="size-5" strokeWidth={2} />
          <span>{t("more")}</span>
        </button>

        {/* Tab 4 — Profile / Login */}
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className={tabClass(isProfileActive)}
          aria-label={user ? t("account") : t("loginButton")}
        >
          {user ? (
            <Avatar className="size-5">
              <AvatarImage src={avatarUrl} alt={t("account")} />
              <AvatarFallback className="bg-primary text-primary-foreground text-[9px] font-bold">
                {getAvatarFallback(user)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <UserIcon
              className="size-5"
              strokeWidth={isProfileActive ? 2.5 : 2}
            />
          )}
          <span>{user ? t("account") : t("loginButton")}</span>
        </button>
      </nav>

      {/* ── More drawer ────────────────────────────────────────────────── */}
      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent
          className="rounded-t-2xl"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <DrawerHeader className="border-border border-b px-5 pt-2 pb-4">
            <DrawerTitle className="text-center text-sm font-semibold">
              {t("more")}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              {t("more")}
            </DrawerDescription>
          </DrawerHeader>

          <div className="max-h-[70svh] overflow-y-auto px-5 py-3">
            {/* Social icons */}
            <div className="mb-4 flex items-center justify-center gap-6">
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener"
                aria-label="Facebook"
                className="flex flex-col items-center gap-1 transition-opacity hover:opacity-80"
                style={{ color: FACEBOOK_BRAND_COLOR }}
              >
                <span className="bg-muted flex size-10 items-center justify-center rounded-full">
                  <FacebookIcon size={18} />
                </span>
                <span className="text-[10px]">Facebook</span>
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener"
                aria-label="Instagram"
                className="flex flex-col items-center gap-1 transition-opacity hover:opacity-80"
                style={{ color: INSTAGRAM_BRAND_COLOR }}
              >
                <span className="bg-muted flex size-10 items-center justify-center rounded-full">
                  <InstagramIcon size={18} />
                </span>
                <span className="text-[10px]">Instagram</span>
              </a>
              <a
                href={TIKTOK_URL}
                target="_blank"
                rel="noopener"
                aria-label="TikTok"
                className="flex flex-col items-center gap-1 text-black transition-opacity hover:opacity-80 dark:text-white"
              >
                <span className="bg-muted flex size-10 items-center justify-center rounded-full">
                  <TikTokIcon size={18} />
                </span>
                <span className="text-[10px]">TikTok</span>
              </a>
            </div>

            <Separator className="mb-3" />

            <Link
              href="/"
              onClick={() => setMoreOpen(false)}
              className="text-foreground/80 hover:text-foreground flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors"
            >
              <CalendarDays className="text-muted-foreground size-4 shrink-0" />
              <span>{t("menuEvents")}</span>
            </Link>
            <Link
              href="/current"
              onClick={() => setMoreOpen(false)}
              className="text-foreground/80 hover:text-foreground flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors"
            >
              <CalendarClock className="text-muted-foreground size-4 shrink-0" />
              <span>{t("menuCurrentEvents")}</span>
            </Link>
            <Link
              href="/past"
              onClick={() => setMoreOpen(false)}
              className="text-foreground/80 hover:text-foreground flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors"
            >
              <History className="text-muted-foreground size-4 shrink-0" />
              <span>{t("menuPastEvents")}</span>
            </Link>

            <Separator className="my-3" />

            <Link
              href="/why-all4ruse"
              onClick={() => setMoreOpen(false)}
              className="text-foreground/80 hover:text-foreground flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors"
            >
              <Info className="text-muted-foreground size-4 shrink-0" />
              <span>{t("menuWhyAll4Ruse")}</span>
            </Link>
            <Link
              href="/advertise"
              onClick={() => setMoreOpen(false)}
              className="text-foreground/80 hover:text-foreground flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors"
            >
              <Megaphone className="text-muted-foreground size-4 shrink-0" />
              <span>{t("menuAdvertise")}</span>
            </Link>

            <Separator className="my-3" />

            <p className="text-muted-foreground mb-1.5 px-1 text-xs font-medium tracking-wider uppercase">
              {t("legal")}
            </p>
            <Link
              href="/legal/terms"
              onClick={() => setMoreOpen(false)}
              className="text-foreground/80 hover:text-foreground flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors"
            >
              <Scale className="text-muted-foreground size-4 shrink-0" />
              <span>{t("termsOfUse")}</span>
            </Link>
            <Link
              href="/legal/privacy"
              onClick={() => setMoreOpen(false)}
              className="text-foreground/80 hover:text-foreground flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors"
            >
              <ShieldCheck className="text-muted-foreground size-4 shrink-0" />
              <span>{t("privacyPolicy")}</span>
            </Link>
            <Link
              href="/legal/cookies"
              onClick={() => setMoreOpen(false)}
              className="text-foreground/80 hover:text-foreground flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors"
            >
              <Cookie className="text-muted-foreground size-4 shrink-0" />
              <span>{t("cookiesPolicy")}</span>
            </Link>
            <Link
              href="/legal/gdpr"
              onClick={() => setMoreOpen(false)}
              className="text-foreground/80 hover:text-foreground flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors"
            >
              <ScrollText className="text-muted-foreground size-4 shrink-0" />
              <span>GDPR</span>
            </Link>

            <Separator className="my-3" />

            <p className="text-muted-foreground px-1 text-center text-xs">
              © All4Ruse {new Date().getFullYear()}
            </p>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ── Profile / Auth drawer ─────────────────────────────────────── */}
      <Drawer open={profileOpen} onOpenChange={setProfileOpen}>
        <DrawerContent
          className="rounded-t-2xl"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <DrawerHeader className="border-border border-b px-5 pt-2 pb-4">
            <DrawerTitle className="text-center text-sm font-semibold">
              {user ? t("account") : t("loginSignup")}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              {user ? t("account") : t("loginSignup")}
            </DrawerDescription>
          </DrawerHeader>

          <div className="max-h-[60svh] overflow-y-auto px-5 py-3">
            {user ? (
              <>
                {/* User info */}
                <div className="mb-3 flex items-center gap-3 px-1 py-2">
                  <Avatar className="size-10">
                    <AvatarImage src={avatarUrl} alt={t("account")} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {getAvatarFallback(user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    {user.user_metadata?.full_name && (
                      <p className="truncate text-sm font-medium">
                        {user.user_metadata.full_name as string}
                      </p>
                    )}
                    <p className="text-muted-foreground truncate text-xs">
                      {user.email}
                    </p>
                  </div>
                </div>

                <Separator className="my-3" />

                {username && (
                  <>
                    <Link
                      href={`/user/${username}`}
                      className="text-foreground/80 hover:text-foreground flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      <ExternalLink className="text-muted-foreground size-4 shrink-0" />
                      <span>{t("viewPublicProfile")}</span>
                    </Link>
                    <Separator className="my-3" />
                  </>
                )}

                <Link
                  href="/create-event"
                  className="text-foreground/80 hover:text-foreground flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors"
                  onClick={() => setProfileOpen(false)}
                >
                  <Plus className="text-muted-foreground size-4 shrink-0" />
                  <span>{t("createEvent")}</span>
                </Link>

                <Link
                  href="/my-events"
                  onClick={() => setProfileOpen(false)}
                  className="text-foreground/80 hover:text-foreground flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors"
                >
                  <CalendarDays className="text-muted-foreground size-4 shrink-0" />
                  <span>{t("publishedEvents")}</span>
                </Link>

                <Separator className="my-3" />

                <Link
                  href="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="text-foreground/80 hover:text-foreground flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors"
                >
                  <UserIcon className="text-muted-foreground size-4 shrink-0" />
                  <span>{t("account")}</span>
                </Link>

                <Link
                  href="/profile/saved-events"
                  onClick={() => setProfileOpen(false)}
                  className="text-foreground/80 hover:text-foreground flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors"
                >
                  <Bookmark className="text-muted-foreground size-4 shrink-0" />
                  <span>{tSaved("pageTitle")}</span>
                </Link>

                <Separator className="my-3" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-destructive hover:text-destructive/80 flex w-full cursor-pointer items-center gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors"
                >
                  <LogOut className="size-4 shrink-0" />
                  <span>{tProfile("logout")}</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 py-2">
                <Button
                  asChild
                  className="w-full"
                  onClick={() => setProfileOpen(false)}
                >
                  <Link href="/auth/login">{t("loginButton")}</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full"
                  onClick={() => setProfileOpen(false)}
                >
                  <Link href="/auth/signup">{tProfile("signupButton")}</Link>
                </Button>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
