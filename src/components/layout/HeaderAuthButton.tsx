"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { User } from "@supabase/supabase-js";
import {
  Bookmark,
  CalendarDays,
  ExternalLink,
  LogOut,
  Plus,
  User as UserIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Link, useRouter } from "~/i18n/navigation";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";

type Props = {
  user: User | null;
  username?: string;
};

function getAvatarFallback(user: User): string {
  const name =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "?";
  return name.charAt(0).toUpperCase();
}

export function HeaderAuthButton({ user, username }: Props) {
  const t = useTranslations("HomePage");
  const tSaved = useTranslations("SavedEvents");
  const tProfile = useTranslations("Profile");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const refreshedFromBrowser = useRef(false);
  const [currentUser, setCurrentUser] = useState<User | null>(user);
  const [currentUsername, setCurrentUsername] = useState<string | undefined>(
    username,
  );

  useEffect(() => {
    setCurrentUser(user);
    setCurrentUsername(username);
  }, [user, username]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    function refreshIfServerStateIsStale(browserUserId: string | null) {
      if (refreshedFromBrowser.current) return;
      if ((user?.id ?? null) === browserUserId) return;

      refreshedFromBrowser.current = true;
      router.refresh();
    }

    async function loadUsername(userId: string) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .single();

      setCurrentUsername(profile?.username ?? undefined);
    }

    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
      refreshIfServerStateIsStale(data.user?.id ?? null);

      if (data.user) {
        void loadUsername(data.user.id);
      } else {
        setCurrentUsername(undefined);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setCurrentUser(session?.user ?? null);
      refreshIfServerStateIsStale(session?.user?.id ?? null);

      if (session?.user) {
        void loadUsername(session.user.id);
      } else {
        setCurrentUsername(undefined);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, user?.id]);

  async function handleLogout() {
    setOpen(false);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  if (!currentUser) {
    return (
      <Button size="sm" asChild>
        {/* Link from ~/i18n/navigation automatically prepends the active locale */}
        <Link href="/auth/login">{t("loginButton")}</Link>
      </Button>
    );
  }

  const avatarUrl = currentUser.user_metadata?.avatar_url as string | undefined;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="focus-visible:ring-ring cursor-pointer rounded-full focus-visible:ring-2 focus-visible:outline-none"
          aria-label={t("account")}
        >
          <Avatar className="size-8">
            <AvatarImage src={avatarUrl} alt={t("account")} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {getAvatarFallback(currentUser)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-auto max-w-100 px-4 py-2"
        onPointerDownCapture={() => setOpen(false)}
      >
        {currentUsername && (
          <>
            <DropdownMenuItem asChild>
              <Link
                href={`/user/${currentUsername}`}
                className="flex cursor-pointer items-center gap-2"
              >
                <ExternalLink className="size-4" />
                {t("viewPublicProfile")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link
            href="/create-event"
            className="flex cursor-pointer items-center gap-2"
          >
            <Plus className="size-4" />
            {t("createEvent")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/my-events"
            className="flex cursor-pointer items-center gap-2"
          >
            <CalendarDays className="size-4" />
            {t("publishedEvents")}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link
            href="/profile"
            className="flex cursor-pointer items-center gap-2"
          >
            <UserIcon className="size-4" />
            {t("account")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/profile/saved-events"
            className="flex cursor-pointer items-center gap-2"
          >
            <Bookmark className="size-4" />
            {tSaved("pageTitle")}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive flex cursor-pointer items-center gap-2"
        >
          <LogOut className="size-4" />
          {tProfile("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
