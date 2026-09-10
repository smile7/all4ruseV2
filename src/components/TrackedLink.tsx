"use client";

import { forwardRef, type ComponentProps, type MouseEventHandler } from "react";

import { Link } from "~/i18n/navigation";
import { trackClick } from "~/lib/analytics/track-click";
import type { TrackedEventKey } from "~/lib/analytics/tracked-events";

type Props = {
  eventKey: TrackedEventKey;
  href: string;
} & Omit<ComponentProps<"a">, "href">;

/**
 * Anchor that records a click before navigating. Hash/external hrefs use `<a>`;
 * in-app paths use the locale-aware `Link`. Forwards ref so it works with
 * `Button asChild`.
 */
export const TrackedLink = forwardRef<HTMLAnchorElement, Props>(
  function TrackedLink({ eventKey, href, onClick, ...props }, ref) {
    const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
      trackClick(eventKey);
      onClick?.(event);
    };

    const isInternal = href.startsWith("/") && !href.startsWith("//");

    if (isInternal) {
      return <Link ref={ref} href={href} onClick={handleClick} {...props} />;
    }

    return <a ref={ref} href={href} onClick={handleClick} {...props} />;
  },
);
