"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Search } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import type { ArticleEventOption } from "~/lib/api";
import { formatArticleEventDate } from "~/lib/article-event-links";
import { formatEventTitle } from "~/lib/event-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: ArticleEventOption[];
  locale: string;
  onInsert: (events: ArticleEventOption[]) => void;
};

export function ArticleEventPicker({
  open,
  onOpenChange,
  events,
  locale,
  onInsert,
}: Props) {
  const t = useTranslations("MoreFromRuse.admin");
  const [query, setQuery] = useState("");
  // Kept in click order so the cards land in the order the author picked them.
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return events;
    return events.filter((event) =>
      `${event.title} ${event.place ?? ""}`
        .toLocaleLowerCase()
        .includes(needle),
    );
  }, [events, query]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setQuery("");
      setSelectedIds([]);
    }
    onOpenChange(next);
  }

  function toggle(id: number, checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? [...current.filter((value) => value !== id), id]
        : current.filter((value) => value !== id),
    );
  }

  function handleInsert() {
    const byId = new Map(events.map((event) => [event.id, event]));
    const picked = selectedIds
      .map((id) => byId.get(id))
      .filter((event): event is ArticleEventOption => Boolean(event));
    onInsert(picked);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("eventPickerTitle")}</DialogTitle>
          <DialogDescription>{t("eventPickerDescription")}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("eventPickerSearch")}
            aria-label={t("eventPickerSearch")}
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {t("eventPickerEmpty")}
          </p>
        ) : (
          <ul className="-mx-2 max-h-[50vh] overflow-y-auto">
            {filtered.map((event) => {
              const checkboxId = `article-event-${event.id}`;
              const order = selectedIds.indexOf(event.id);
              return (
                <li key={event.id}>
                  <label
                    htmlFor={checkboxId}
                    className="hover:bg-muted/60 flex cursor-pointer items-start gap-3 rounded-md px-2 py-2"
                  >
                    <Checkbox
                      id={checkboxId}
                      checked={order !== -1}
                      onCheckedChange={(checked) =>
                        toggle(event.id, checked === true)
                      }
                      className="mt-0.5"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-primary block text-xs font-semibold">
                        {formatArticleEventDate(
                          event.startDate,
                          event.endDate,
                          locale,
                        )}
                        {event.place ? ` · ${event.place}` : ""}
                      </span>
                      <span className="block text-sm leading-snug">
                        {formatEventTitle(event.title)}
                      </span>
                    </span>
                    {order !== -1 && (
                      <span className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                        {order + 1}
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            {t("eventPickerCancel")}
          </Button>
          <Button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={handleInsert}
          >
            {t("eventPickerInsert", { count: selectedIds.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
