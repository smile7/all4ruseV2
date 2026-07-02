import type { ComponentProps } from "react";

import { cn } from "~/lib/utils";

export type CardVariant = "default" | "section";

type DivProps = ComponentProps<"div">;

type CardProps = DivProps & {
  variant?: CardVariant;
};

function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(
        "bg-card text-card-foreground flex flex-col rounded-xl",
        variant === "default" && "gap-6 border py-8 shadow-sm",
        variant === "section" &&
          "gap-6 overflow-hidden border-none py-8 shadow-md",
        className,
      )}
      {...props}
    />
  );
}

type CardHeaderProps = DivProps & {
  variant?: CardVariant;
};

function CardHeader({
  className,
  variant = "default",
  ...props
}: CardHeaderProps) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        variant === "section" && "bg-muted/30 pb-4",
        className,
      )}
      {...props}
    />
  );
}

type CardTitleProps = ComponentProps<"div"> & {
  variant?: CardVariant;
};

function CardTitle({
  className,
  variant = "default",
  ...props
}: CardTitleProps) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "leading-none font-semibold",
        variant === "section" && "flex items-center gap-2 text-lg",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

type CardContentProps = DivProps & {
  variant?: CardVariant;
};

function CardContent({
  className,
  variant = "default",
  ...props
}: CardContentProps) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", variant === "section" && "space-y-5", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
