import { cn } from "~/lib/utils";

type CancelledStampSize = "sm" | "lg";

type Props = {
  label: string;
  size?: CancelledStampSize;
  className?: string;
};

const sizeClasses: Record<CancelledStampSize, string> = {
  sm: "whitespace-nowrap px-2.5 py-1 text-[1.45rem] leading-none tracking-[0.1em]",
  lg: "whitespace-nowrap px-3.5 py-1 text-3xl leading-none tracking-[0.12em] sm:px-6 sm:py-1.5 sm:text-5xl sm:tracking-[0.14em] md:px-7 md:py-2 md:text-6xl lg:text-7xl",
};

export function CancelledStamp({ label, size = "lg", className }: Props) {
  return (
    <span
      className={cn(
        "pointer-events-none inline-block -rotate-12 rounded-sm border-[3px] border-destructive font-black uppercase text-destructive shadow-[0_2px_18px_rgba(0,0,0,0.35)]",
        "bg-background/70 backdrop-blur-[2px]",
        size === "lg" && "border-[5px]",
        sizeClasses[size],
        className,
      )}
    >
      {label}
    </span>
  );
}
