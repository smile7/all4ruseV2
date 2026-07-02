"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { EventCard } from "~/components/EventCard/EventCard";
import { Button } from "~/components/ui/button";
import { profilesApi } from "~/lib/api";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";
import type { Event } from "~/types";

export function ProfilePastEvents({ userId }: { userId: string }) {
  const t = useTranslations("PublicProfile");

  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[] | null>(null);

  async function handleToggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    if (events !== null) {
      setExpanded(true);
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const data = await profilesApi.getPublicProfilePastEvents(
        supabase,
        userId,
      );
      setEvents(data);
      setExpanded(true);
    } catch {
      toast.error("Не успяхме да заредим минали събития.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        variant="outline"
        onClick={handleToggle}
        disabled={loading}
        className="gap-2"
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {expanded ? (
          <>
            <ChevronUp className="size-4" />
            {t("hidePastEvents")}
          </>
        ) : (
          <>
            <ChevronDown className="size-4" />
            {t("showPastEvents")}
          </>
        )}
      </Button>

      {expanded && events !== null && (
        <div className="mt-6">
          {events.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {t("noPastEvents")}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
