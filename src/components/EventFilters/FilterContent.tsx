"use client";

import { useMessages, useTranslations } from "next-intl";

import { Search, X } from "lucide-react";

import { EventTag } from "~/components/EventTag";
import { DatePopoverRange } from "~/components/layout/DatePopoverRange";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { useTags } from "~/hooks/query/tags";
import { useFilters } from "~/hooks/useFilters";
import { localizedEventTagTitle } from "~/i18n/event-tag-label";
import { HIDDEN_TAG_KEYS, normalizeEventTagKey } from "~/lib/event-tag-styles";

import { ClearableInput } from "./ClearableInput";
import { thisWeekRange, todayIso, weekendRange } from "./date-ranges";
import { QuickDateButton } from "./QuickDateButton";
import { useDebouncedFilterField } from "./useDebouncedFilterField";

type Props = {
  /** Hide today / weekend / this-week / free — those stay on the homepage shortcut row. */
  hideQuickFilters?: boolean;
};

function ClearFiltersButton({
  onClear,
  disabled,
  label,
}: {
  onClear: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="cursor-pointer gap-1 text-xs"
      onClick={onClear}
      disabled={disabled}
    >
      <X className="size-3.5" />
      {label}
    </Button>
  );
}

export function FilterContent({ hideQuickFilters = false }: Props) {
  const t = useTranslations("HomePage");
  const messages = useMessages() as { EventTags?: Record<string, string> };
  const eventTagLabels = messages.EventTags;
  const {
    filters,
    setFilters,
    setDateRange,
    toggleTag,
    clearFilters,
    hasActiveFilters,
  } = useFilters();
  const { data: tags = [], isLoading: isLoadingTags } = useTags();

  const search = useDebouncedFilterField("search");
  const host = useDebouncedFilterField("host");
  const place = useDebouncedFilterField("place");

  const todayStr = todayIso();
  const weekend = weekendRange();
  const thisWeek = thisWeekRange();

  return (
    <div className="flex flex-col gap-4">
      {/* Title · Host · Place · Date — one row from lg when there is room */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {!hideQuickFilters && (
          <div className="min-w-0 flex-1">
            <ClearableInput
              placeholder={t("searchTitle")}
              aria-label={t("searchTitle")}
              value={search.value}
              onChange={search.setValue}
              onClear={search.clear}
              icon={<Search className="size-4" />}
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <ClearableInput
            placeholder={t("hostFilter")}
            aria-label={t("hostFilter")}
            value={host.value}
            onChange={host.setValue}
            onClear={host.clear}
            icon={<Search className="size-4" />}
          />
        </div>

        <div className="min-w-0 flex-1">
          <ClearableInput
            placeholder={t("placeFilter")}
            aria-label={t("placeFilter")}
            value={place.value}
            onChange={place.setValue}
            onClear={place.clear}
            icon={<Search className="size-4" />}
          />
        </div>

        <div className="w-full min-w-0 lg:max-w-65 lg:flex-1">
          <DatePopoverRange
            from={filters.from}
            to={filters.to}
            onChange={setDateRange}
            onClear={() => setDateRange("", "")}
          />
        </div>

        {hideQuickFilters && (
          <ClearFiltersButton
            onClear={clearFilters}
            disabled={!hasActiveFilters}
            label={t("clearFilters")}
          />
        )}
      </div>

      {!hideQuickFilters && (
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="grid w-full grid-cols-3 gap-2 md:flex md:flex-1 md:flex-wrap md:items-center md:justify-start">
            <QuickDateButton
              label={t("today")}
              from={todayStr}
              to={todayStr}
              activeFrom={filters.from}
              activeTo={filters.to}
              onSelect={setDateRange}
              className="bg-background"
            />
            <QuickDateButton
              label={t("thisWeekend")}
              from={weekend.from}
              to={weekend.to}
              activeFrom={filters.from}
              activeTo={filters.to}
              onSelect={setDateRange}
              className="bg-background"
            />
            <QuickDateButton
              label={t("thisWeek")}
              from={thisWeek.from}
              to={thisWeek.to}
              activeFrom={filters.from}
              activeTo={filters.to}
              onSelect={setDateRange}
              className="bg-background"
            />
          </div>
          <div className="flex w-full flex-row items-center justify-between gap-2 md:w-auto">
            <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5">
              <Switch
                checked={filters.isFree}
                onCheckedChange={(v) => setFilters({ isFree: v })}
              />
              <span className="text-sm font-medium whitespace-nowrap">
                {t("freeFilter")}
              </span>
            </label>
            <ClearFiltersButton
              onClear={clearFilters}
              disabled={!hasActiveFilters}
              label={t("clearFilters")}
            />
          </div>
        </div>
      )}

      {isLoadingTags ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>
      ) : tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags
            .filter(
              (tag) => !HIDDEN_TAG_KEYS.has(normalizeEventTagKey(tag.title)),
            )
            .map((tag) => {
              const isActive = filters.tagIds.includes(tag.id);
              const raw = tag.title?.trim() ?? "";
              const resolved = localizedEventTagTitle(
                tag.title,
                eventTagLabels,
              );
              const label =
                resolved !== raw ? resolved : raw.replace(/_/g, " ");
              return (
                <EventTag
                  key={tag.id}
                  title={tag.title ?? ""}
                  label={label}
                  size="md"
                  interactive
                  selected={isActive}
                  onClick={() => toggleTag(tag.id)}
                />
              );
            })}
        </div>
      ) : null}
    </div>
  );
}
