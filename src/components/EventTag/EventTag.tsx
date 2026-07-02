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
  selected?: never;
  onClick?: never;
};

type InteractiveProps = BaseProps & {
  interactive: true;
  selected?: boolean;
  onClick?: () => void;
};

export type EventTagProps = DisplayProps | InteractiveProps;

const sizeClasses: Record<EventTagSize, string> = {
  xs: "rounded-full px-2 py-0.5 text-[11px]",
  sm: "rounded-full px-2.5 py-1 text-xs",
  md: "rounded-full px-3 py-1.5 text-sm",
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
  const selected = interactive ? (rest.selected ?? false) : false;

  const appearance = interactive && selected ? styles.selected : styles.idle;

  const sharedClassName = cn(
    "inline-flex max-w-full shrink-0 items-center gap-1 border font-medium transition-colors duration-200",
    sizeClasses[size],
    appearance,
    interactive &&
      !selected &&
      "cursor-pointer hover:bg-secondary/80 hover:text-foreground",
    className,
  );

  const hashClassName = cn(
    "font-bold",
    interactive && selected ? "text-white/80" : styles.hash,
  );

  const content = (
    <>
      <span className={hashClassName} aria-hidden>
        #
      </span>
      <span className="truncate">{label}</span>
    </>
  );

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
