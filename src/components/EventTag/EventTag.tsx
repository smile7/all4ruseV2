import { Link } from "~/i18n/navigation";
import { getEventTagStyles } from "~/lib/event-tag-styles";
import { cn } from "~/lib/utils";

type EventTagSize = "xs" | "sm" | "md";

type BaseProps = {
  title: string;
  label: string;
  size?: EventTagSize;
  className?: string;
};

type DisplayProps = BaseProps & {
  interactive?: false;
  href?: never;
  selected?: never;
  onClick?: never;
};

type InteractiveProps = BaseProps & {
  interactive: true;
  href?: never;
  selected?: boolean;
  onClick?: () => void;
};

/** Locale-prefixed link, used to point chips at the tag hub pages. */
type LinkProps = BaseProps & {
  href: string;
  interactive?: never;
  selected?: never;
  onClick?: never;
};

export type EventTagProps = DisplayProps | InteractiveProps | LinkProps;

const sizeClasses: Record<EventTagSize, string> = {
  xs: "rounded-full px-2 py-0.5 text-[10px]",
  sm: "rounded-full px-2 py-0.5 text-[11px]",
  md: "rounded-full px-2.5 py-1 text-xs",
};

export function EventTag({
  title,
  label,
  size = "sm",
  className,
  ...rest
}: EventTagProps) {
  const styles = getEventTagStyles(title);
  const interactive = rest.interactive === true;
  const href = rest.href;
  const selected = interactive ? (rest.selected ?? false) : false;

  const appearance = interactive && selected ? styles.selected : styles.idle;

  const sharedClassName = cn(
    "inline-flex max-w-full shrink-0 items-center gap-0.5 border font-medium transition-colors duration-200",
    sizeClasses[size],
    appearance,
    ((interactive && !selected) || href) &&
      "cursor-pointer hover:brightness-95",
    className,
  );

  const hashClassName = cn(
    "select-none",
    interactive && selected ? "text-white/70" : styles.hash,
  );

  const content = (
    <>
      <span className={hashClassName} aria-hidden>
        #
      </span>
      <span className="truncate">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={sharedClassName}>
        {content}
      </Link>
    );
  }

  if (interactive) {
    return (
      <button
        type="button"
        onClick={rest.onClick}
        aria-pressed={selected}
        className={sharedClassName}
      >
        {content}
      </button>
    );
  }

  return <span className={sharedClassName}>{content}</span>;
}
