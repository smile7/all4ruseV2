import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  label: string;
  children: ReactNode;
};

export function EventDetailRow({ icon, label, children }: Props) {
  return (
    <div className="bg-background/20 flex items-start gap-4 rounded-md border p-2">
      <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-muted-foreground mb-0.5 text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}
