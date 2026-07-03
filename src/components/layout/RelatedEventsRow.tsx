"use client";

import { useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { EventCard } from "~/components/EventCard/EventCard";
import type { Event } from "~/types";

type Props = {
  events: Event[];
  heading: string;
};

export function RelatedEventsRow({ events, heading }: Props) {
  const stripRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((direction: "left" | "right") => {
    const strip = stripRef.current;
    if (!strip) return;
    const amount = strip.offsetWidth * 0.7;
    strip.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  }, []);

  if (events.length === 0) return null;

  return (
    <div className="mt-8 flex flex-col gap-4">
      <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {heading}
      </h3>

      <div className="relative -mx-4 sm:-mx-6 lg:mx-0">
        {/* Scroll arrows */}
        <button
          type="button"
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="bg-background/90 ring-border absolute top-1/2 left-0 z-10 flex size-9 -translate-y-1/2 translate-x-1 items-center justify-center rounded-full shadow-md ring-1 backdrop-blur-sm transition-all hover:scale-110 hover:shadow-lg lg:-translate-x-4"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="bg-background/90 ring-border absolute top-1/2 right-0 z-10 flex size-9 -translate-y-1/2 -translate-x-1 items-center justify-center rounded-full shadow-md ring-1 backdrop-blur-sm transition-all hover:scale-110 hover:shadow-lg lg:translate-x-4"
        >
          <ChevronRight className="size-4" />
        </button>

        {/* Scroll strip */}
        <div
          ref={stripRef}
          className="flex gap-4 overflow-x-auto px-4 pb-3 scroll-smooth [scrollbar-width:none] sm:px-6 lg:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {events.map((event) => (
            <div key={event.id} className="w-64 shrink-0 sm:w-72">
              <EventCard event={event} />
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
