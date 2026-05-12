"use client";

import { startTransition, useEffect, useState } from "react";
import { useMessages, useTranslations } from "next-intl";

import { addDays, format } from "date-fns";
import { Search, X } from "lucide-react";

import { DatePopoverRange } from "~/components/layout/DatePopoverRange";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { DEBOUNCE_MS } from "~/constants";
import { useTags } from "~/hooks/query/tags";
import { useDebounce } from "~/hooks/useDebounce";
import { useFilters } from "~/hooks/useFilters";
import { localizedEventTagTitle } from "~/i18n/event-tag-label";
import { cn } from "~/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Title-case + underscore-to-space so "COMEDY_SHOW" → "Comedy Show". */
function formatTagLabel(label: string): string {
  return label
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Date range helpers ────────────────────────────────────────────────────────

function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

function tomorrowIso() {
  return format(addDays(new Date(), 1), "yyyy-MM-dd");
}

function weekendRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, …, 5=Fri, 6=Sat

  let friday: Date;
  if (day === 5) friday = now;
  else if (day === 6) friday = addDays(now, -1);
  else if (day === 0) friday = addDays(now, -2);
  else friday = addDays(now, 5 - day); // Mon–Thu → next Fri

  return {
    from: format(friday, "yyyy-MM-dd"),
    to: format(addDays(friday, 2), "yyyy-MM-dd"),
  };
}

function thisWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const daysToSunday = day === 0 ? 0 : 7 - day;
  return {
    from: todayIso(),
    to: format(addDays(now, daysToSunday), "yyyy-MM-dd"),
  };
}

// ─── Quick date button ─────────────────────────────────────────────────────────

type QuickDateButtonProps = {
  label: string;
  from: string;
  to: string;
  activeFrom: string;
  activeTo: string;
  onSelect: (from: string, to: string) => void;
};

function QuickDateButton({
  label,
  from,
  to,
  activeFrom,
  activeTo,
  onSelect,
}: QuickDateButtonProps) {
  const isActive = activeFrom === from && activeTo === to;
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={cn(
        "border-input cursor-pointer border bg-secondary text-xs hover:bg-secondary/60",
        // Mobile: fill grid cell; desktop chip uses span for nowrap vs wrap
        "h-auto min-h-9 w-full p-2 text-center",
        // Desktop: single-line chip, natural width
        "md:h-9 md:w-auto md:shrink-0 md:px-3 md:py-0",
        isActive && "border-primary text-primary",
      )}
      onClick={() => onSelect(isActive ? "" : from, isActive ? "" : to)}
    >
      <span className="block w-full text-center text-balance whitespace-normal leading-tight md:inline md:w-auto md:whitespace-nowrap">
        {label}
      </span>
    </Button>
  );
}

// ─── Text input with clear button ─────────────────────────────────────────────

type ClearableInputProps = {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  icon?: React.ReactNode;
};

function ClearableInput({
  placeholder,
  value,
  onChange,
  onClear,
  icon,
}: ClearableInputProps) {
  return (
    <div className="relative w-full">
      {icon && (
        <span className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
          {icon}
        </span>
      )}
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("h-9 w-full bg-secondary", icon ? "pl-8" : "")}
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 cursor-pointer [&_svg]:size-3.5 opacity-40 hover:opacity-80"
          onClick={onClear}
        >
          <X />
        </Button>
      )}
    </div>
  );
}

// ─── FilterContent ─────────────────────────────────────────────────────────────

export function FilterContent() {
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

  const [localSearch, setLocalSearch] = useState(filters.search);
  const [localHost, setLocalHost] = useState(filters.host);
  const [localPlace, setLocalPlace] = useState(filters.place);

  // Sync local state when the URL changes externally (e.g. browser back).
  // startTransition defers the update so it doesn't count as a synchronous
  // setState-within-effect, avoiding the cascading-render warning.
  useEffect(() => { startTransition(() => setLocalSearch(filters.search)); }, [filters.search]);
  useEffect(() => { startTransition(() => setLocalHost(filters.host)); }, [filters.host]);
  useEffect(() => { startTransition(() => setLocalPlace(filters.place)); }, [filters.place]);

  const debouncedSearch = useDebounce(localSearch, DEBOUNCE_MS);
  const debouncedHost = useDebounce(localHost, DEBOUNCE_MS);
  const debouncedPlace = useDebounce(localPlace, DEBOUNCE_MS);

  // Write to URL only when the debounced value actually differs from current URL.
  // Guard prevents the effect from re-triggering after the URL update syncs back.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (debouncedSearch !== filters.search) setFilters({ search: debouncedSearch }); }, [debouncedSearch]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (debouncedHost !== filters.host) setFilters({ host: debouncedHost }); }, [debouncedHost]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (debouncedPlace !== filters.place) setFilters({ place: debouncedPlace }); }, [debouncedPlace]);

  const todayStr = todayIso();
  const tomorrowStr = tomorrowIso();
  const weekend = weekendRange();
  const thisWeek = thisWeekRange();

  return (
    <div className="flex flex-col gap-4">

      {/* ━━ Row 1 (desktop) / stacked (mobile): Search · Host · Place ━━ */}
      <div className="flex flex-col gap-3 justify-between md:flex-row md:items-center">
        {/* Title search */}
        <div className="flex-1">
          <ClearableInput
            placeholder={t("searchTitle")}
            value={localSearch}
            onChange={setLocalSearch}
            onClear={() => { setLocalSearch(""); setFilters({ search: "" }); }}
            icon={<Search className="size-4" />}
          />
        </div>

        {/* Host */}
        <div className="flex-1">
          <ClearableInput
            placeholder={t("hostFilter")}
            value={localHost}
            onChange={setLocalHost}
            onClear={() => { setLocalHost(""); setFilters({ host: "" }); }}
            icon={<Search className="size-4" />}
          />
        </div>

        {/* Place */}
        <div className="flex-1">
          <ClearableInput
            placeholder={t("placeFilter")}
            value={localPlace}
            onChange={setLocalPlace}
            onClear={() => { setLocalPlace(""); setFilters({ place: "" }); }}
            icon={<Search className="size-4" />}
          />
        </div>

      </div>

      {/* ━━ Row 2 (desktop): Date + quick buttons + free + clear ━━ */}
      {/* ━━ Mobile: date on its own row, quick buttons + free on one row ━━ */}
      <div className="flex flex-col gap-4 justify-between md:flex-row md:items-center">
        <div className="w-full md:max-w-[260px] md:flex-1">
          <DatePopoverRange
            from={filters.from}
            to={filters.to}
            onChange={setDateRange}
            onClear={() => setDateRange("", "")}
          />
        </div>
        <div className="grid w-full grid-cols-4 gap-2 md:flex md:flex-1 md:flex-wrap md:items-center md:justify-start md:overflow-visible md:pb-0">
          <QuickDateButton
            label={t("today")}
            from={todayStr}
            to={todayStr}
            activeFrom={filters.from}
            activeTo={filters.to}
            onSelect={setDateRange}
          />
          <QuickDateButton
            label={t("tomorrow")}
            from={tomorrowStr}
            to={tomorrowStr}
            activeFrom={filters.from}
            activeTo={filters.to}
            onSelect={setDateRange}
          />
          <QuickDateButton
            label={t("thisWeekend")}
            from={weekend.from}
            to={weekend.to}
            activeFrom={filters.from}
            activeTo={filters.to}
            onSelect={setDateRange}
          />
          <QuickDateButton
            label={t("thisWeek")}
            from={thisWeek.from}
            to={thisWeek.to}
            activeFrom={filters.from}
            activeTo={filters.to}
            onSelect={setDateRange}
          />
        </div>
        <div className="flex flex-row items-center gap-2 justify-between w-full md:w-auto">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 shrink-0">
            <Switch
              checked={filters.isFree}
              onCheckedChange={(v) => setFilters({ isFree: v })}
            />
            <span className="text-sm font-medium whitespace-nowrap">{t("freeFilter")}</span>
          </label>
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer gap-1 text-xs"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            <X className="size-3.5" />
            {t("clearFilters")}
          </Button>
        </div>
      </div>

      {/* ━━ Row 3: Tags sorted by usage, primary color, title-cased ━━ */}
      {isLoadingTags ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>
      ) : tags.length > 0 ? (
        <div className="flex flex-wrap gap-3 mt-4">
          {tags.map((tag) => {
            const isActive = filters.tagIds.includes(tag.id);
            const raw = tag.title?.trim() ?? "";
            const resolved = localizedEventTagTitle(tag.title, eventTagLabels);
            const label = resolved !== raw ? resolved : formatTagLabel(raw);
            return (
              <Button
                key={tag.id}
                type="button"
                variant="ghost"
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  "h-auto cursor-pointer rounded-full border px-3 py-1 text-xs font-medium uppercase transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border-primary/30 text-primary hover:border-primary/60 hover:bg-primary/10",
                )}
              >
                #{label}
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
