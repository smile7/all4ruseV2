"use client";

import type { MouseEvent } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { Heart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  useEventLikeCount,
  useLikedEventIds,
  useToggleEventLike,
} from "~/hooks/query";
import { trackClick } from "~/lib/analytics/track-click";
import { cn } from "~/lib/utils";

type Props = {
  eventId: number;
  /**
   * `overlay` sits on the card image; `inline` sits next to the event title;
   * `floating` is pinned to the bottom-right of the viewport.
   */
  variant?: "overlay" | "inline" | "floating";
  className?: string;
};

export function EventLikeButton({
  eventId,
  variant = "overlay",
  className,
}: Props) {
  const t = useTranslations("EventLikes");
  const format = useFormatter();
  const { data: likedIds } = useLikedEventIds();
  const { data: count = 0 } = useEventLikeCount(eventId);
  const toggleLike = useToggleEventLike();

  const isLiked = likedIds?.includes(eventId) ?? false;
  const label = [
    isLiked ? t("unlikeAria") : t("likeAria"),
    count > 0 ? t("countAria", { count }) : null,
  ]
    .filter(Boolean)
    .join(", ");

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const nextLiked = !isLiked;
    trackClick(nextLiked ? "event.like" : "event.unlike");
    toggleLike.mutate(
      { eventId, liked: nextLiked },
      { onError: () => toast.error(t("mutationError")) },
    );
  }

  const content = (
    <>
      <Heart
        className={cn(
          "shrink-0",
          variant === "floating" ? "size-5" : "size-4",
          isLiked && "text-primary fill-current",
        )}
        strokeWidth={isLiked ? 2.5 : 2}
      />
      {count > 0 && (
        <span className="text-sm leading-none font-semibold tabular-nums">
          {format.number(count, { notation: "compact" })}
        </span>
      )}
    </>
  );

  if (variant === "floating") {
    return (
      <Button
        type="button"
        variant="outline"
        className={cn(
          "bg-secondary/70 hover:bg-secondary fixed right-4 bottom-20 z-50 h-11 min-w-11 gap-1.5 rounded-full px-0 shadow-lg",
          count > 0 && "px-3.5",
          className,
        )}
        aria-pressed={isLiked}
        aria-label={label}
        disabled={toggleLike.isPending}
        onClick={handleClick}
      >
        {content}
      </Button>
    );
  }

  if (variant === "inline") {
    return (
      <Button
        type="button"
        variant="outline"
        className={cn("h-10 shrink-0 gap-1.5 rounded-full px-3", className)}
        aria-pressed={isLiked}
        aria-label={label}
        disabled={toggleLike.isPending}
        onClick={handleClick}
      >
        {content}
      </Button>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "bg-background/92 text-foreground hover:bg-background focus-visible:ring-ring absolute right-2.5 bottom-2.5 z-30 flex h-10 min-w-10 cursor-pointer items-center justify-center gap-1.5 rounded-full shadow backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        count > 0 && "px-3",
        className,
      )}
      aria-pressed={isLiked}
      aria-label={label}
      disabled={toggleLike.isPending}
      onClick={handleClick}
    >
      {content}
    </button>
  );
}
