"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { BadgeCheck } from "lucide-react";

import { ClaimEventButton } from "~/components/ClaimEvent/ClaimEventButton";
import { Button } from "~/components/ui/button";
import { useAuth } from "~/contexts/AuthContext";
import { Link, usePathname } from "~/i18n/navigation";
import { claimsApi, type ClaimStatus } from "~/lib/api";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";

const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "";

type Props = {
  eventId: number;
  createdBy: string | null;
};

/**
 * Claiming only applies to admin-imported events that have no real owner yet.
 * Resolved client-side so the event page can stay statically cached.
 */
export function EventClaimAction({ eventId, createdBy }: Props) {
  const { userId, isLoading } = useAuth();
  const t = useTranslations("SingleEvent");
  const locale = useLocale();
  const pathname = usePathname();
  // null = not looked up yet; the button stays hidden until then so it never
  // flips from "Claim" to "Pending" under the user's cursor.
  const [claim, setClaim] = useState<{ status: ClaimStatus | null } | null>(
    null,
  );

  const isAdminEvent = ADMIN_USER_ID !== "" && createdBy === ADMIN_USER_ID;
  const canClaim = Boolean(userId) && isAdminEvent && userId !== ADMIN_USER_ID;

  useEffect(() => {
    if (!canClaim || !userId) return;

    let cancelled = false;
    claimsApi
      .getMyClaimForEvent(getSupabaseBrowserClient(), eventId, userId)
      .then((existing) => {
        if (cancelled) return;
        setClaim({
          status: (existing?.status as ClaimStatus | undefined) ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setClaim({ status: null });
      });

    return () => {
      cancelled = true;
    };
  }, [canClaim, userId, eventId]);

  if (isLoading || !isAdminEvent) return null;

  if (!userId) {
    return (
      <Button asChild variant="outline" className="w-full justify-start gap-2">
        <Link
          href={{
            pathname: "/auth/login",
            query: { next: `/${locale}${pathname}` },
          }}
        >
          <BadgeCheck className="size-4 shrink-0" />
          {t("claimEvent")}
        </Link>
      </Button>
    );
  }

  if (!canClaim || !claim) return null;

  return (
    <ClaimEventButton eventId={eventId} initialClaimStatus={claim.status} />
  );
}
