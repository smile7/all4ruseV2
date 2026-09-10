"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";

import { ChevronDown, Search } from "lucide-react";

import { Switch } from "~/components/ui/switch";
import { useFilters } from "~/hooks/useFilters";
import { trackClick } from "~/lib/analytics/track-click";
import { cn } from "~/lib/utils";

import { ClearableInput } from "./ClearableInput";
import { thisWeekRange, todayIso, weekendRange } from "./date-ranges";
import { FilterContent } from "./FilterContent";
import { QuickDateButton } from "./QuickDateButton";
import { useDebouncedFilterField } from "./useDebouncedFilterField";

const shortcutChipClass = "bg-background";

/**
 * Tinted homepage filter section. The title toggles the full filter set
 * inline (pushes the events list down). Shortcuts stay visible under the title.
 */
export function EventFiltersBar() {
  const t = useTranslations("HomePage");
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const { filters, setFilters, setDateRange, activeCount } = useFilters();
  const search = useDebouncedFilterField("search");

  const today = todayIso();
  const thisWeek = thisWeekRange();
  const weekend = weekendRange();

  return (
    <section
      className="bg-muted border-border/60 mt-4 rounded-xl border px-3 py-3 text-left sm:px-4"
      aria-label={t("filters")}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
        className="hover:bg-background/60 flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-1 py-1 text-left transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-wide uppercase">
            {t("filters")}
          </span>
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-[10px] leading-none font-bold">
              {activeCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <ClearableInput
          placeholder={t("searchTitle")}
          aria-label={t("searchTitle")}
          value={search.value}
          onChange={search.setValue}
          onClear={search.clear}
          icon={<Search className="size-4" />}
          className="md:flex-1"
        />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:flex md:shrink-0 md:flex-wrap md:items-stretch">
          <QuickDateButton
            label={t("today")}
            from={today}
            to={today}
            activeFrom={filters.from}
            activeTo={filters.to}
            onSelect={setDateRange}
            className={shortcutChipClass}
            trackKey="filter.today"
          />
          <QuickDateButton
            label={t("thisWeekend")}
            from={weekend.from}
            to={weekend.to}
            activeFrom={filters.from}
            activeTo={filters.to}
            onSelect={setDateRange}
            className={shortcutChipClass}
            trackKey="filter.this_weekend"
          />
          <QuickDateButton
            label={t("thisWeek")}
            from={thisWeek.from}
            to={thisWeek.to}
            activeFrom={filters.from}
            activeTo={filters.to}
            onSelect={setDateRange}
            className={shortcutChipClass}
            trackKey="filter.this_week"
          />
          <label
            className={cn(
              "border-input hover:bg-background/60 flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-xs",
              "h-auto min-h-9 w-full",
              "md:h-9 md:w-auto md:shrink-0",
              shortcutChipClass,
              filters.isFree && "border-primary text-primary",
            )}
          >
            <Switch
              checked={filters.isFree}
              onCheckedChange={(v) => {
                setFilters({ isFree: v });
                if (v) trackClick("filter.free");
              }}
              aria-label={t("freeFilter")}
            />
            <span className="font-medium whitespace-nowrap">
              {t("freeFilter")}
            </span>
          </label>
        </div>
      </div>

      <div
        id={panelId}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-border/60 mt-3 border-t pt-4">
            <FilterContent hideQuickFilters />
          </div>
        </div>
      </div>
    </section>
  );
}
