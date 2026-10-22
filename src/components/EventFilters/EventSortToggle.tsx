"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";

import { CalendarDays, Heart } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { useFilters } from "~/hooks/useFilters";
import { trackClick } from "~/lib/analytics/track-click";
import { cn } from "~/lib/utils";

type Props = {
  className?: string;
};

export function EventSortToggle({ className }: Props) {
  const t = useTranslations("HomePage");
  const labelId = useId();
  const { filters, setFilters } = useFilters();

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <span id={labelId} className="text-sm font-medium">
        {t("sortBy")}
      </span>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        aria-labelledby={labelId}
        value={filters.sort}
        onValueChange={(value) => {
          if (value !== "date" && value !== "likes") return;
          setFilters({ sort: value });
          if (value === "likes") trackClick("filter.sort_likes");
        }}
        className="bg-background"
      >
        <ToggleGroupItem value="date" className="cursor-pointer gap-1.5">
          <CalendarDays className="size-3.5" aria-hidden />
          {t("sortByDate")}
        </ToggleGroupItem>
        <ToggleGroupItem value="likes" className="cursor-pointer gap-1.5">
          <Heart className="size-3.5" aria-hidden />
          {t("sortByLikes")}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
