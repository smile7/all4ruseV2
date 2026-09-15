"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Flag } from "lucide-react";

import { ReportEventButton } from "~/components/ReportEvent/ReportEventButton";
import { Button } from "~/components/ui/button";
import { useAuth } from "~/contexts/AuthContext";
import { Link, usePathname } from "~/i18n/navigation";
import { reportsApi } from "~/lib/api";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";

const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "";

type Props = {
  eventId: number;
  createdBy: string | null;
};

/** Reporting is for signed-in users who neither own the event nor are the admin. */
export function EventReportAction({ eventId, createdBy }: Props) {
  const { userId, isLoading } = useAuth();
  const t = useTranslations("SingleEvent");
  const locale = useLocale();
  const pathname = usePathname();
  // null until looked up, so the button never flips to "Reported" after paint.
  const [report, setReport] = useState<{ alreadyReported: boolean } | null>(
    null,
  );

  const canReport =
    Boolean(userId) && userId !== createdBy && userId !== ADMIN_USER_ID;

  useEffect(() => {
    if (!canReport || !userId) return;

    let cancelled = false;
    reportsApi
      .getMyReportForEvent(getSupabaseBrowserClient(), eventId, userId)
      .then((existing) => {
        if (!cancelled) setReport({ alreadyReported: Boolean(existing) });
      })
      .catch(() => {
        if (!cancelled) setReport({ alreadyReported: false });
      });

    return () => {
      cancelled = true;
    };
  }, [canReport, userId, eventId]);

  if (isLoading) return null;

  if (!userId) {
    return (
      <Button
        asChild
        variant="outline"
        className="text-muted-foreground hover:text-destructive w-full justify-start gap-2"
      >
        <Link
          href={{
            pathname: "/auth/login",
            query: { next: `/${locale}${pathname}` },
          }}
        >
          <Flag className="size-4 shrink-0" />
          {t("reportEvent")}
        </Link>
      </Button>
    );
  }

  if (!canReport || !report) return null;

  return (
    <ReportEventButton
      eventId={eventId}
      alreadyReported={report.alreadyReported}
    />
  );
}
