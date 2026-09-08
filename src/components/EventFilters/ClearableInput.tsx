"use client";

import { X } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

type Props = {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  icon?: React.ReactNode;
  className?: string;
  "aria-label"?: string;
};

export function ClearableInput({
  placeholder,
  value,
  onChange,
  onClear,
  icon,
  className,
  "aria-label": ariaLabel,
}: Props) {
  return (
    <div className={cn("relative w-full", className)}>
      {icon && (
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2">
          {icon}
        </span>
      )}
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel ?? placeholder}
        className={cn("bg-background h-9 w-full", icon ? "pl-8" : "")}
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2 cursor-pointer opacity-40 hover:opacity-80 [&_svg]:size-3.5"
          onClick={onClear}
        >
          <X />
        </Button>
      )}
    </div>
  );
}
