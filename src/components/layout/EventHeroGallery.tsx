"use client";

import Image from "next/image";

import lgZoom from "lightgallery/plugins/zoom";
import LightGallery from "lightgallery/react";

import "lightgallery/css/lightgallery.css";
import "lightgallery/css/lg-zoom.css";

type Props = {
  imageUrl: string;
  eventId: string;
  title: string;
  live: boolean;
  cancelled: boolean;
  soldOut: boolean;
  premium: boolean;
  cancelledLabel: string;
  soldOutLabel: string;
  premiumLabel: string;
};

export function EventHeroGallery({
  imageUrl,
  eventId,
  title,
  live,
  cancelled,
  soldOut,
  premium,
  cancelledLabel,
  soldOutLabel,
  premiumLabel,
}: Props) {
  return (
    <div className="mx-auto md:max-w-7xl md:px-6 lg:px-8">
      <LightGallery plugins={[lgZoom]} speed={400}>
        <a
          href={imageUrl}
          className="bg-muted relative block aspect-video w-full cursor-pointer overflow-hidden md:max-h-95 md:rounded-md"
          style={{ viewTransitionName: `event-image-${eventId}` }}
          aria-label={title}
        >
          <Image
            src={imageUrl}
            alt=""
            fill
            aria-hidden
            tabIndex={-1}
            className="scale-110 object-cover blur-2xl brightness-75 saturate-150"
            sizes="(max-width: 768px) 100vw, 1280px"
          />
          <Image
            src={imageUrl}
            alt={title}
            fill
            priority
            className="z-10 object-contain"
            sizes="(max-width: 768px) 100vw, 1280px"
          />
          <div className="absolute inset-0 z-20 bg-linear-to-t from-black/40 via-transparent to-transparent" />

          {/* Status badges */}
          <div className="absolute top-3 right-3 z-30 flex flex-col items-end gap-2">
            {live && !cancelled && (
              <div className="bg-background/92 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow backdrop-blur-sm">
                <span className="relative flex size-2 shrink-0">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                </span>
                Live
              </div>
            )}
            {cancelled && (
              <span className="bg-destructive text-destructive-foreground rounded-full px-3 py-1.5 text-xs font-semibold shadow">
                {cancelledLabel}
              </span>
            )}
            {soldOut && !cancelled && (
              <span className="bg-foreground text-background rounded-full px-3 py-1.5 text-xs font-semibold shadow">
                {soldOutLabel}
              </span>
            )}
            {premium && (
              <span className="bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs font-semibold shadow">
                {premiumLabel}
              </span>
            )}
          </div>
        </a>
      </LightGallery>
    </div>
  );
}
