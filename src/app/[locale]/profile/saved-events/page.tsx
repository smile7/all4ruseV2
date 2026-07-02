import { getTranslations } from "next-intl/server";

import { Bookmark } from "lucide-react";

import { Typography } from "~/components/layout";
import { Button } from "~/components/ui/button";
import { Link } from "~/i18n/navigation";
import { savedEventsApi } from "~/lib/api";
import { createSupabaseServerClient } from "~/lib/supabase/server";

import { SavedEventsSections } from "./SavedEventsSections";

export async function generateMetadata() {
  const t = await getTranslations("SavedEvents");
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function SavedEventsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const t = await getTranslations("SavedEvents");

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2">
          <Typography.H1>{t("pageTitle")}</Typography.H1>
        </div>

        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed px-6 py-2 text-center">
          <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-full">
            <Bookmark className="size-6" />
          </div>
          <div className="flex flex-col gap-4">
            <p className="text-lg font-semibold">{t("authPromptTitle")}</p>
            <p className="text-muted-foreground max-w-sm text-sm">
              {t("pageUnauthLine1")}
            </p>
            <p className="text-muted-foreground max-w-sm text-sm">
              {t("pageUnauthLine2")}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/auth/signup">{t("signupCta")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/login">{t("loginCta")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const [savedCount, upcomingEvents] = await Promise.all([
    savedEventsApi.getSavedEventsCount(supabase, user.id),
    savedEventsApi.getSavedEvents(supabase, user.id, "upcoming"),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <Typography.H1>{t("pageTitle")}</Typography.H1>
        <Typography.P className="text-muted-foreground">
          {t("pageDescription")}
        </Typography.P>
      </div>

      <SavedEventsSections
        userId={user.id}
        initialUpcoming={upcomingEvents}
        savedCount={savedCount}
      />
    </div>
  );
}
