import { getTranslations } from "next-intl/server";

import { EventsList } from "~/components/EventsList";
import { eventsApi } from "~/lib/api";
import { createSupabaseServerClient } from "~/lib/supabase/server";
import type { Event } from "~/types";

export async function generateMetadata() {
  const t = await getTranslations("PastEvents");
  return { title: t("pageTitle") };
}

export default async function PastEventsPage() {
  const t = await getTranslations("PastEvents");

  let initialData: Event[] = [];
  try {
    const client = await createSupabaseServerClient();
    initialData = await eventsApi.getPastEvents(client, {});
  } catch (err) {
    console.error("[PastEventsPage] Failed to fetch past events:", err);
  }

  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-xl font-semibold">{t("pageTitle")}</h1>
      <EventsList initialData={initialData} variant="past" />
    </div>
  );
}
