"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";

import { formatISO9075, isValid, parseISO, startOfDay } from "date-fns";
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
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  clearLabel: string;
  id?: string;
  /** YYYY-MM-DD — calendar days strictly before this are not selectable */
  disableBefore?: string;
  disabled?: boolean;
  required?: boolean;
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

export function DatePopover({
  value,
  onChange,
  onBlur,
  placeholder,
  clearLabel,
  id,
  disableBefore,
  disabled = false,
  required = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const calLocale =
    DATE_FNS_LOCALES[locale as keyof typeof DATE_FNS_LOCALES] ?? bg;

  const selected = useMemo(() => {
    if (!value) return undefined;
    try {
      const p = parseISO(value);
      return isValid(p) ? p : undefined;
    } catch {
      return undefined;
    }
  }, [value]);

  const label = value ? formatShort(value, locale) : placeholder;

  const minDay = disableBefore
    ? startOfDay(parseLocalDate(disableBefore))
    : undefined;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onBlur?.();
      }}
    >
      <div className="relative w-full">
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="ghost"
            disabled={disabled}
            aria-required={required || undefined}
            className={cn(
              "border-input bg-secondary h-9 w-full justify-start gap-2 rounded-md border px-3 text-sm font-normal shadow-sm transition-colors",
              "hover:bg-secondary/60 focus-visible:ring-ring focus-visible:ring-1",
              !value ? "text-muted-foreground" : "text-foreground",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <CalendarIcon className="size-4 shrink-0 opacity-50" />
            <span className="truncate">{label}</span>
          </Button>
        </PopoverTrigger>

        {value && !disabled ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2 cursor-pointer opacity-40 hover:opacity-80 [&_svg]:size-3.5"
            aria-label={clearLabel}
            onClick={() => {
              onChange("");
              onBlur?.();
            }}
          >
            <XIcon />
          </Button>
        ) : null}
      </div>

      <PopoverContent
        className="bg-secondary w-auto p-0"
        align="start"
        side="bottom"
      >
        <Calendar
          className="bg-secondary"
          mode="single"
          selected={selected}
          defaultMonth={selected}
          locale={calLocale}
          disabled={minDay ? (d) => startOfDay(d) < minDay : undefined}
          onSelect={(d) => {
            if (d) {
              onChange(formatISO9075(d, { representation: "date" }));
              setOpen(false);
              onBlur?.();
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
