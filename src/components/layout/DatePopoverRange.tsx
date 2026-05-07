"use client";

import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useLocale, useTranslations } from "next-intl";

import { formatISO9075, isValid, parseISO } from "date-fns";
import { bg, enUS, ro, uk } from "date-fns/locale";
import { CalendarIcon, XIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { parseLocalDate } from "~/lib/event-utils";
import { cn } from "~/lib/utils";

const DATE_FNS_LOCALES = {
  bg,
  en: enUS,
  ua: uk,
  ro,
} as const;

type Props = {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  onClear?: () => void;
  id?: string;
};

function formatShort(dateStr: string, locale: string): string {
  const intlLocale =
    { bg: "bg-BG", en: "en-GB", ua: "uk-UA", ro: "ro-RO" }[locale] ?? "bg-BG";
  try {
    return new Intl.DateTimeFormat(intlLocale, {
      day: "2-digit",
      month: "short",
    }).format(parseLocalDate(dateStr));
  } catch {
    return dateStr;
  }
}

export function DatePopoverRange({ from, to, onChange, onClear, id }: Props) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("HomePage");
  const locale = useLocale();
  const calLocale =
    DATE_FNS_LOCALES[locale as keyof typeof DATE_FNS_LOCALES] ?? bg;

  const fromDate = useMemo(() => {
    if (!from) return undefined;
    try {
      const p = parseISO(from);
      return isValid(p) ? p : undefined;
    } catch {
      return undefined;
    }
  }, [from]);

  const toDate = useMemo(() => {
    if (!to) return undefined;
    try {
      const p = parseISO(to);
      return isValid(p) ? p : undefined;
    } catch {
      return undefined;
    }
  }, [to]);

  const range: DateRange | undefined = fromDate
    ? { from: fromDate, to: toDate ?? fromDate }
    : undefined;

  const label =
    from && to
      ? `${formatShort(from, locale)} – ${formatShort(to, locale)}`
      : from
        ? formatShort(from, locale)
        : t("pickDate");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative w-full">
        <PopoverTrigger asChild>
          {/* Styled identically to <Input> so it blends with other filter fields. */}
          <Button
            id={id}
            type="button"
            variant="ghost"
            className={cn(
              "border-input h-9 w-full justify-start gap-2 rounded-md border bg-secondary px-3 text-sm font-normal shadow-sm transition-colors",
              "hover:bg-secondary/60 focus-visible:ring-ring focus-visible:ring-1",
              !from ? "text-muted-foreground" : "text-foreground",
            )}
          >
            <CalendarIcon className="size-4 shrink-0 opacity-50" />
            <span className="truncate">{label}</span>
          </Button>
        </PopoverTrigger>

        {from && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 cursor-pointer [&_svg]:size-3.5 opacity-40 hover:opacity-80"
            aria-label={t("clearFilters")}
            onClick={() => {
              onChange("", "");
              onClear?.();
            }}
          >
            <XIcon />
          </Button>
        )}
      </div>

      <PopoverContent className="w-auto bg-secondary p-0" align="start" side="bottom">
        <Calendar
          className="bg-secondary"
          mode="range"
          selected={range}
          defaultMonth={fromDate}
          locale={calLocale}
          onSelect={(val) => {
            if (val?.from) {
              const f = formatISO9075(val.from, { representation: "date" });
              const t2 = val.to
                ? formatISO9075(val.to, { representation: "date" })
                : f;
              onChange(f, t2);
              if (val.to) setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
