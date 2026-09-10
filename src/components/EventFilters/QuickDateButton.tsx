"use client";

import { Button } from "~/components/ui/button";
import { trackClick } from "~/lib/analytics/track-click";
import type { TrackedEventKey } from "~/lib/analytics/tracked-events";
import { cn } from "~/lib/utils";

type Props = {
  label: string;
  from: string;
  to: string;
  activeFrom: string;
  activeTo: string;
  onSelect: (from: string, to: string) => void;
  className?: string;
  /** Counted when the range is applied, not when it is cleared. */
  trackKey?: TrackedEventKey;
};

/** Toggles a preset date range — clicking the active range clears it. */
export function QuickDateButton({
  label,
  from,
  to,
  activeFrom,
  activeTo,
  onSelect,
  className,
  trackKey,
}: Props) {
  const isActive = activeFrom === from && activeTo === to;
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      aria-pressed={isActive}
      className={cn(
        "border-input bg-secondary hover:bg-secondary/60 cursor-pointer border text-xs",
        // Mobile: fill grid cell; desktop chip uses span for nowrap vs wrap
        "h-auto min-h-9 w-full p-2 text-center",
        // Desktop: single-line chip, natural width
        "md:h-9 md:w-auto md:shrink-0 md:px-3 md:py-0",
        isActive && "border-primary text-primary",
        className,
      )}
      onClick={() => {
        if (isActive) {
          onSelect("", "");
          return;
        }
        if (trackKey) trackClick(trackKey);
        onSelect(from, to);
      }}
    >
      <span className="block w-full text-center leading-tight text-balance whitespace-normal md:inline md:w-auto md:whitespace-nowrap">
        {label}
      </span>
    </Button>
  );
}
