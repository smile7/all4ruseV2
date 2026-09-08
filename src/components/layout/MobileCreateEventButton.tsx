import { getTranslations } from "next-intl/server";

import { Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Link } from "~/i18n/navigation";

export async function MobileCreateEventButton() {
  const t = await getTranslations("HomePage");

  return (
    <Button asChild variant="outline" size="icon" className="size-9 shrink-0">
      <Link href="/create-event" aria-label={t("createEvent")}>
        <Plus className="size-5" aria-hidden />
      </Link>
    </Button>
  );
}
