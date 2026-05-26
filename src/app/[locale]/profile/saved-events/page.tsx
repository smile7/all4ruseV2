import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { Typography } from "~/components/layout";
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

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/auth/login`);
  }

  const t = await getTranslations("SavedEvents");
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