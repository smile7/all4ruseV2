import { Crown } from "lucide-react";

import { cn } from "~/lib/utils";

type PremiumBadgeSize = "sm" | "md";

type Props = {
  label: string;
  size?: PremiumBadgeSize;
  className?: string;
};

const sizeClasses: Record<PremiumBadgeSize, string> = {
  sm: "gap-0.5 px-1.5 py-0.5 text-[10px] [&>svg]:size-3",
  md: "gap-1 px-4 py-2 text-xs [&>svg]:size-3.5",
};

export function PremiumBadge({ label, size = "md", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-amber-500 font-bold tracking-wide text-white uppercase shadow-md ring-2 ring-white/90",
        sizeClasses[size],
        className,
      )}
    >
      <Crown className="shrink-0 fill-current" aria-hidden />
      {label}
    </span>
  );
}
