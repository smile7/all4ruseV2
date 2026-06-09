"use client";

import { ViewTransition } from "react";
import Image from "next/image";
import { useLocale, useMessages, useTranslations } from "next-intl";

import { CopyPlus, Pencil, User } from "lucide-react";

import { EventTag } from "~/components/EventTag";
import { localizedEventTagTitle } from "~/i18n/event-tag-label";
import { Link, useRouter } from "~/i18n/navigation";
import {
  formatDateBadge,
  formatEventTitle,
  getEventImageUrl,
  getFirstHostName,
  isLiveNow,
} from "~/lib/event-utils";
import type { Event } from "~/types";

import { EventSaveButton } from "./EventSaveButton";

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  event: Event;
  /** When true, shows organizer actions (edit / duplicate) and approval status. */
  showManageActions?: boolean;
  initialSaved?: boolean;
  onUnsaveSuccess?: (eventId: number) => void;
};

export function EventCard({
  event,
  showManageActions = false,
  initialSaved = false,
  onUnsaveSuccess,
}: Props) {
  const messages = useMessages() as { EventTags?: Record<string, string> };
  const eventTagLabels = messages.EventTags;
  const t = useTranslations("SingleEvent");
  const tHome = useTranslations("HomePage");
  const locale = useLocale();
  const router = useRouter();

  const dateBadge = formatDateBadge(event.startDate, locale, {
    today: tHome("today"),
    tomorrow: tHome("tomorrow"),
  });
  const live = isLiveNow(event);
  const imageUrl = getEventImageUrl(event.image);
  const formattedTitle = formatEventTitle(event.title);
  const host = getFirstHostName(event.organizers);
  const detailHref =
    event.isEventActive &&
    typeof event.slug === "string" &&
    event.slug.trim() !== ""
      ? `/${event.slug.trim()}`
      : null;
  const manageFallbackHref =
    showManageActions && !detailHref
      ? `/create-event?editId=${event.id}`
      : null;
  const href = detailHref ?? manageFallbackHref;

  function handleEdit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/create-event?editId=${event.id}`);
  }

  function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/create-event?duplicateId=${event.id}`);
  }

  const article = (
    <article className="bg-card text-card-foreground group-focus-visible:ring-ring flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg group-focus-visible:ring-2">
      {/* ── Image ──────────────────────────────────────────────────────── */}
      <ViewTransition name={`event-image-${event.id}`}>
        <div className="relative aspect-video overflow-hidden">
          {/* Blurred background — fills letterbox gaps on portrait images */}
          <Image
            src={imageUrl}
            alt=""
            fill
            aria-hidden
            tabIndex={-1}
            className="scale-110 object-cover blur-2xl brightness-75 saturate-150"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />

          {/* Full image — contained, never cropped */}
          <Image
            src={imageUrl}
            alt={formattedTitle}
            fill
            className="z-10 object-contain"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />

          {/* Date + time badge — top left */}
          <div className="bg-background/50 absolute top-2.5 left-2.5 z-20 min-w-14 rounded-xl px-2.5 py-2 text-center shadow backdrop-blur-sm">
            <p
              className={
                dateBadge.secondary
                  ? "text-xl leading-none font-bold"
                  : "text-sm leading-none font-bold tracking-wide capitalize"
              }
            >
              {dateBadge.primary}
            </p>
            {dateBadge.secondary && (
              <p className="text-muted-foreground mt-1 text-xs leading-none tracking-widest uppercase">
                {dateBadge.secondary}
              </p>
            )}
            <p className="mt-1.5 text-sm leading-none font-semibold tabular-nums">
              {event.startTime.slice(0, 5)}
            </p>
          </div>

          {/* Live now — top right */}
          {live ? (
            <div className="bg-background/92 absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow backdrop-blur-sm">
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-green-500" />
              </span>
              {t("liveNow")}
            </div>
          ) : showManageActions && !event.isEventActive ? (
            <div className="bg-background/92 text-muted-foreground absolute top-2.5 right-2.5 z-20 rounded-full px-3 py-1.5 text-xs font-semibold shadow backdrop-blur-sm">
              {tHome("waitingForApproval")}
            </div>
          ) : null}

          {/* Cancelled overlay */}
          {event.isEventCancelled && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
              <span className="bg-destructive text-destructive-foreground rounded-full px-3 py-1 text-xs font-semibold">
                {t("cancelled")}
              </span>
            </div>
          )}

          {showManageActions && (
            <>
              <div
                className="pointer-events-none absolute inset-0 z-15 bg-black/55 backdrop-blur-[1px]"
                aria-hidden
              />
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 p-4">
                <button
                  type="button"
                  onClick={handleEdit}
                  aria-label={tHome("edit")}
                  className="flex w-full max-w-52 cursor-pointer items-center justify-center gap-2 rounded-xl bg-background/95 px-4 py-2.5 text-sm font-semibold text-foreground shadow-lg ring-1 ring-black/10 backdrop-blur-sm transition-colors hover:bg-background dark:ring-white/15"
                >
                  <Pencil className="size-4 shrink-0" />
                  {tHome("edit")}
                </button>
                <button
                  type="button"
                  onClick={handleDuplicate}
                  aria-label={tHome("duplicate")}
                  className="flex w-full max-w-52 cursor-pointer items-center justify-center gap-2 rounded-xl bg-background/95 px-4 py-2.5 text-sm font-semibold text-foreground shadow-lg ring-1 ring-black/10 backdrop-blur-sm transition-colors hover:bg-background dark:ring-white/15"
                >
                  <CopyPlus className="size-4 shrink-0" />
                  {tHome("duplicate")}
                </button>
              </div>
            </>
          )}

          <EventSaveButton
            eventId={event.id}
            initialSaved={initialSaved}
            onUnsaveSuccess={onUnsaveSuccess}
          />
        </div>
      </ViewTransition>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-3 px-3 py-6">
        <h3 className="line-clamp-2 min-h-11 text-left leading-snug wrap-anywhere">
          {formattedTitle}
        </h3>

        <div className="flex flex-col gap-4">
          {host && (
            <div className="text-muted-foreground flex items-center gap-1.5 truncate">
              <User className="size-3 shrink-0" />
              <span className="truncate text-xs">{host}</span>
            </div>
          )}

          {(event.tags?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {event.tags!.slice(0, 3).map((tag) => (
                <EventTag
                  key={tag.id}
                  title={tag.title}
                  label={localizedEventTagTitle(tag.title, eventTagLabels)}
                  size="sm"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );

  if (!href)
    return <div className="group h-full cursor-default">{article}</div>;

  return (
    <Link
      href={href}
      scroll
      className="group block h-full focus-visible:outline-none"
    >
      {article}
    </Link>
  );
}
