import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { Plus } from "lucide-react";

import { EventCard } from "~/components/EventCard";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Link } from "~/i18n/navigation";
import { eventsApi } from "~/lib/api";
import { todayInSofia } from "~/lib/event-utils";
import { createSupabaseServerClient } from "~/lib/supabase/server";

export default async function MyEventsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/auth/login`);
  }

  const t = await getTranslations("HomePage");
  const today = todayInSofia();

  const allEvents = await eventsApi.getMyEvents(supabase, user.id);

  const upcoming = allEvents
    .filter((e) => e.endDate >= today)
    .sort(
      (a, b) =>
        a.startDate.localeCompare(b.startDate) ||
        a.startTime.localeCompare(b.startTime),
    );

  const past = allEvents
    .filter((e) => e.endDate < today)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <div className="mx-auto max-w-7xl p-8">
      {/* Header row */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("publishedEvents")}</h1>
        <Button asChild size="sm">
          <Link href="/create-event">
            <Plus className="size-4" />
            {t("createEvent")}
          </Link>
        </Button>
      </div>

      {allEvents.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-muted-foreground">{t("noEventsFound")}</p>
          <Button asChild>
            <Link href="/create-event">
              <Plus className="size-4" />
              {t("createEvent")}
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Upcoming / current */}
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-muted-foreground mb-4 text-sm font-medium tracking-wider uppercase">
                {t("menuEvents")}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((event) => (
                  <EventCard key={event.id} event={event} showManageActions />
                ))}
              </div>
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <>
              {upcoming.length > 0 && <Separator className="my-8" />}
              <section>
                <h2 className="text-muted-foreground mb-4 text-sm font-medium tracking-wider uppercase">
                  {t("menuPastEvents")}
                </h2>
                <div className="grid grid-cols-1 gap-4 opacity-70 sm:grid-cols-2 lg:grid-cols-3">
                  {past.map((event) => (
                    <EventCard key={event.id} event={event} showManageActions />
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Upcoming is empty but past exists */}
          {upcoming.length === 0 && past.length > 0 && (
            <div className="mb-8 flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-muted-foreground text-sm">
                {t("noEventsFound")}
              </p>
              <Button asChild size="sm">
                <Link href="/create-event">
                  <Plus className="size-4" />
                  {t("createEvent")}
                </Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
