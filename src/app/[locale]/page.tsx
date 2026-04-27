import { getTranslations } from "next-intl/server";

import { EventsList } from "~/components/EventsList";
import { Typography } from "~/components/layout";
import { eventsApi } from "~/lib/api";
import { createSupabaseServerClient } from "~/lib/supabase/server";
import type { Event } from "~/types";

export async function generateMetadata() {
  const t = await getTranslations("HomePage");
  return { title: t("pageTitle") };
}

export default async function HomePage() {
  const t = await getTranslations("HomePage");

  let initialData: Event[] = [];
  try {
    const client = await createSupabaseServerClient();
    initialData = await eventsApi.getActiveEvents(client, {});
  } catch (err) {
    console.error("[HomePage] Failed to fetch active events:", err);
  }

  return (
    <div className="mx-auto w-full flex flex-col gap-2 text-center max-w-[1800px] px-4 py-8 sm:px-6 lg:px-8">
      <Typography.H1 className="text-center">{t("pageTitle")}</Typography.H1>
      <Typography.P className="text-center text-muted-foreground">{t("pageDescription")}</Typography.P>
      <EventsList initialData={initialData} variant="active" />
    </div>
  );
}
