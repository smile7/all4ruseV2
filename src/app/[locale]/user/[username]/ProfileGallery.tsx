"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";

import lgZoom from "lightgallery/plugins/zoom";
import LightGallery from "lightgallery/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import "lightgallery/css/lightgallery.css";
import "lightgallery/css/lg-zoom.css";

type Props = {
  images: string[];
  title: string;
};

export function ProfileGallery({ images, title }: Props) {
  // lgWrapRef wraps only the LightGallery element so firstElementChild is always the strip
  const lgWrapRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((direction: "left" | "right") => {
    const strip = lgWrapRef.current?.firstElementChild as HTMLElement | null;
    if (!strip) return;
    const amount = strip.offsetWidth * 0.7;
    strip.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  }, []);

  if (images.length === 0) return null;

  return (
    <div className="relative">
      {/* Arrows */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Scroll gallery left"
            className="bg-background/90 ring-border absolute top-1/2 left-0 z-10 flex size-10 -translate-x-2 -translate-y-1/2 items-center justify-center rounded-full shadow-md ring-1 backdrop-blur-sm transition-all hover:scale-110 hover:shadow-lg sm:-translate-x-4"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Scroll gallery right"
            className="bg-background/90 ring-border absolute top-1/2 right-0 z-10 flex size-10 translate-x-2 -translate-y-1/2 items-center justify-center rounded-full shadow-md ring-1 backdrop-blur-sm transition-all hover:scale-110 hover:shadow-lg sm:translate-x-4"
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}

      {/* Dedicated wrapper so firstElementChild is always the LightGallery scroll strip */}
      <div ref={lgWrapRef}>
        <LightGallery
          plugins={[lgZoom]}
          elementClassNames="flex snap-x gap-4 overflow-x-auto pb-4 scroll-smooth"
        >
          {images.map((url, index) => (
            <a
              key={`${url}-${index}`}
              href={url}
              data-src={url}
              aria-label={`${title} ${index + 1}`}
              className="relative h-48 w-72 shrink-0 cursor-zoom-in snap-center overflow-hidden rounded-2xl shadow-md transition-transform hover:scale-[1.02] sm:h-56 sm:w-96"
            >
              <Image
                src={url}
                alt={`${title} ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 288px, 384px"
              />
            </a>
          ))}
        </LightGallery>
      </div>

      {/* Gradient fade edges hint at overflow */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-10"
        style={{
          background:
            "linear-gradient(to right, var(--background) 0%, transparent 100%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-10"
        style={{
          background:
            "linear-gradient(to left, var(--background) 0%, transparent 100%)",
        }}
        aria-hidden
      />
    </div>
  );
}
