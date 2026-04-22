import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircleIcon, AlertTriangleIcon } from "lucide-react";

import { cn } from "~/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-md border px-4 py-3 text-base grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "border-destructive/50 text-destructive-foreground bg-destructive dark:border-destructive [&>svg]:text-current",
        warning:
          "border-amber-400/60 bg-amber-50 text-amber-900 dark:border-amber-300/60 dark:bg-amber-950/40 dark:text-amber-50 [&>svg]:text-current",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 leading-tight font-medium tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

function ErrorAlert({
  error,
  ...rest
}: React.ComponentProps<"div"> & { error: string }) {
  return (
    <Alert {...rest} variant="destructive">
      <AlertCircleIcon className="size-4" />
      <AlertTitle>Възникна грешка</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
function WarningAlert({
  warning,
  ...rest
}: React.ComponentProps<"div"> & { warning: string }) {
  return (
    <Alert {...rest} variant="warning">
      <AlertTriangleIcon className="size-4" />
      {/* <AlertTitle></AlertTitle> */}
      <AlertDescription>{warning}</AlertDescription>
    </Alert>
  );
}

export { Alert, AlertDescription, AlertTitle, ErrorAlert, WarningAlert };
