"use client";

import { ViewTransition } from "react";
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
  liveLabel: string;
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
  liveLabel,
  cancelled,
  soldOut,
  premium,
  cancelledLabel,
  soldOutLabel,
  premiumLabel,
}: Props) {
  return (
    <div className="mx-auto mt-3 w-full md:mt-4 md:max-w-7xl md:px-6 lg:px-8">
      <ViewTransition name={`event-image-${eventId}`}>
        <div className="bg-muted relative aspect-video w-full overflow-hidden md:max-h-95 md:rounded-md">
          {/* Blurred background — fills letterbox gaps */}
          <Image
            src={imageUrl}
            alt=""
            fill
            aria-hidden
            tabIndex={-1}
            className="scale-110 object-cover blur-2xl brightness-75 saturate-150"
            sizes="(max-width: 768px) 100vw, 1280px"
          />
          {/* Sharp image */}
          <Image
            src={imageUrl}
            alt={title}
            fill
            priority
            className="z-10 object-contain"
            sizes="(max-width: 768px) 100vw, 1280px"
          />
          <div className="absolute inset-0 z-20 bg-linear-to-t from-black/40 via-transparent to-transparent" />

          {/* Sold out overlay — diagonal banner across the whole image */}
          {soldOut && !cancelled && (
            <div className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden bg-black/50">
              <span className="bg-background text-foreground w-[40%] rotate-[-25deg] py-2.5 text-center text-lg font-bold tracking-widest uppercase shadow-lg sm:text-xl">
                {soldOutLabel}
              </span>
            </div>
          )}

          {/* Status badges */}
          <div className="absolute top-3 right-3 z-30 flex flex-col items-end gap-2">
            {live && !cancelled && (
              <div className="bg-background/92 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow backdrop-blur-sm">
                <span className="relative flex size-2 shrink-0">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                </span>
                {liveLabel}
              </div>
            )}
            {cancelled && (
              <span className="bg-destructive text-destructive-foreground rounded-full px-3 py-1.5 text-xs font-semibold shadow">
                {cancelledLabel}
              </span>
            )}
            {premium && (
              <span className="bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs font-semibold shadow">
                {premiumLabel}
              </span>
            )}
          </div>

          {/* LightGallery — transparent absolute overlay, click opens full zoom */}
          <LightGallery
            plugins={[lgZoom]}
            speed={400}
            elementClassNames="absolute inset-0 z-40"
          >
            <a
              href={imageUrl}
              className="block h-full w-full cursor-zoom-in"
              aria-label={title}
            />
          </LightGallery>
        </div>
      </ViewTransition>
    </div>
  );
}
