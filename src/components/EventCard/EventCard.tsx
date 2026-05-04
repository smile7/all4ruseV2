"use client";

import { ViewTransition } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";

import { User } from "lucide-react";

import { Link } from "~/i18n/navigation";
import {
  formatDateBadge,
  formatEventTitle,
  getEventImageUrl,
  getFirstHostName,
  getTagLabel,
  isLiveNow,
} from "~/lib/event-utils";
import type { Event } from "~/types";

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  event: Event;
};

export function EventCard({ event }: Props) {
  const locale = useLocale();

  const { day, month } = formatDateBadge(event.startDate);
  const live = isLiveNow(event.startDate, event.endDate);
  const imageUrl = getEventImageUrl(event.image);
  const formattedTitle = formatEventTitle(event.title);
  const host = getFirstHostName(event.organizers);
  const href = event.slug ? `/${event.slug}` : null;

  const article = (
    <article className="bg-card text-card-foreground group-focus-visible:ring-ring flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg group-focus-visible:ring-2">
      {/* ── Image ──────────────────────────────────────────────────────── */}
      <ViewTransition name={`event-image-${event.id}`} share="event-image">
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
          <div className="bg-background/92 absolute top-2.5 left-2.5 z-20 min-w-14 rounded-xl px-2.5 py-2 text-center shadow backdrop-blur-sm">
            <p className="text-xl leading-none font-bold">{day}</p>
            <p className="text-muted-foreground mt-1 text-xs leading-none tracking-widest uppercase">
              {month}
            </p>
            <p className="mt-1.5 text-sm leading-none font-semibold tabular-nums">
              {event.startTime.slice(0, 5)}
            </p>
          </div>

          {/* Live now badge — top right */}
          {live && (
            <div className="bg-background/92 absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow backdrop-blur-sm">
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-green-500" />
              </span>
              Live
            </div>
          )}

          {/* Cancelled overlay */}
          {event.isEventCancelled && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
              <span className="bg-destructive text-destructive-foreground rounded-full px-3 py-1 text-xs font-semibold">
                Отменено
              </span>
            </div>
          )}
        </div>
      </ViewTransition>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-3 px-3 py-6">
        <h3 className="line-clamp-2 min-h-11 text-left leading-snug wrap-anywhere">
          {formattedTitle}
        </h3>

        <div className="flex flex-col gap-4">
          {/* Host */}
          {host && (
            <div className="text-muted-foreground flex items-center gap-1.5 truncate">
              <User className="size-3 shrink-0" />
              <span className="truncate text-xs">{host}</span>
            </div>
          )}

          {/* Tags — single row, max 3, no wrap so card height stays fixed */}
          {(event.tags?.length ?? 0) > 0 && (
            <div className="mt-2 flex gap-1.5 overflow-hidden">
              {event.tags!.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="bg-primary/10 text-primary shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase"
                >
                  #{getTagLabel(tag.title, locale)}
                </span>
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
