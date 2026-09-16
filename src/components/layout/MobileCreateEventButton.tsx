import { getTranslations } from "next-intl/server";

import { Plus } from "lucide-react";

import { TrackedLink } from "~/components/TrackedLink";
import { Button } from "~/components/ui/button";

export async function MobileCreateEventButton() {
  const t = await getTranslations("HomePage");

  return (
    <Button asChild variant="outline" size="icon" className="size-9 shrink-0">
      <TrackedLink
        eventKey="header.create_event"
        href="/create-event"
        aria-label={t("createEvent")}
      >
        <Plus className="size-5" aria-hidden />
      </TrackedLink>
    </Button>
  );
}
