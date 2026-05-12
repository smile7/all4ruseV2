import { getTranslations } from "next-intl/server";

import { EventsList } from "~/components/EventsList";
import { Typography } from "~/components/layout";
import { eventsApi } from "~/lib/api";
import { createSupabaseServerClient } from "~/lib/supabase/server";
import type { Event } from "~/types";

export async function generateMetadata() {
  const t = await getTranslations("CurrentEvents");
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function CurrentEventsPage() {
  const t = await getTranslations("CurrentEvents");

  let initialData: Event[] = [];
  try {
    const client = await createSupabaseServerClient();
    initialData = await eventsApi.getCurrentEvents(client, {});
  } catch (err) {
    console.error("[CurrentEventsPage] Failed to fetch current events:", err);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-2 px-4 py-8 text-center sm:px-6 lg:px-8">
      <Typography.H1 className="text-center">{t("pageTitle")}</Typography.H1>
      <EventsList initialData={initialData} variant="current" />
    </div>
  );
}
