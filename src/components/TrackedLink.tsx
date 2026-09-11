"use client";

import { type ComponentProps, forwardRef, type MouseEventHandler } from "react";

import type { Locale } from "~/constants";
import { Link } from "~/i18n/navigation";
import { trackClick } from "~/lib/analytics/track-click";
import type { TrackedEventKey } from "~/lib/analytics/tracked-events";

type Props = {
  eventKey: TrackedEventKey;
  href: string;
  /** Switch locale on internal navigation (e.g. a BG-only article). */
  locale?: Locale;
} & Omit<ComponentProps<"a">, "href">;

/**
 * Anchor that records a click before navigating. Hash/external hrefs use `<a>`;
 * in-app paths use the locale-aware `Link`. Forwards ref so it works with
 * `Button asChild`.
 */
export const TrackedLink = forwardRef<HTMLAnchorElement, Props>(
  function TrackedLink({ eventKey, href, locale, onClick, ...props }, ref) {
    const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
      trackClick(eventKey);
      onClick?.(event);
    };

    const isInternal = href.startsWith("/") && !href.startsWith("//");

    if (isInternal) {
      return (
        <Link
          ref={ref}
          href={href}
          locale={locale}
          onClick={handleClick}
          {...props}
        />
      );
    }

    return <a ref={ref} href={href} onClick={handleClick} {...props} />;
  },
);
