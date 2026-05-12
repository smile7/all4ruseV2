import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import {
  EventForm,
  type EventFormMode,
  type ProfileDefaults,
} from "~/components/EventForm";
import { Typography } from "~/components/layout/Typography";
import { profilesApi } from "~/lib/api";
import { eventsApi } from "~/lib/api/events";
import { tagsApi } from "~/lib/api/tags";
import { createSupabaseServerClient } from "~/lib/supabase/server";

type SearchParams = Promise<{
  editId?: string;
  duplicateId?: string;
}>;

type Props = {
  searchParams: SearchParams;
};

export default async function CreateEventPage({ searchParams }: Props) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/auth/login`);
  }

  const { editId, duplicateId } = await searchParams;
  const eventId = editId ?? duplicateId;

  const [{ data: profile }, tags, initialData] = await Promise.all([
    profilesApi.getProfile(supabase, user.id),
    tagsApi.getTags(supabase),
    eventId
      ? eventsApi.getEventById(supabase, Number(eventId))
      : Promise.resolve(null),
  ]);

  // Guard: if an ID was provided but the event wasn't found, fall back to create
  const resolvedInitialData = eventId && !initialData ? null : initialData;

  const mode: EventFormMode = editId
    ? "edit"
    : duplicateId
      ? "duplicate"
      : "create";

  const profileDefaults: ProfileDefaults = {
    name: profile?.name_to_show ?? profile?.full_name ?? null,
    phone: profile?.phone ?? null,
    email: profile?.email_to_show ?? null,
    address: profile?.address_physical ?? null,
    place: profile?.place ?? null,
    website: profile?.website ?? null,
  };

  const t = await getTranslations("CreateEvent");

  const pageTitle =
    mode === "edit"
      ? t("editEventTitle")
      : mode === "duplicate"
        ? t("duplicateEventTitle")
        : t("createEventTitle");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <div className="mb-8">
        <Typography.H1 className="tracking-tight">{pageTitle}</Typography.H1>
      </div>
      <EventForm
        mode={mode}
        initialData={resolvedInitialData}
        tags={tags}
        profileDefaults={profileDefaults}
        userId={user.id}
      />
    </div>
  );
}
