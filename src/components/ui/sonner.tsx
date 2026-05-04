import { Toaster as Sonner, ToasterProps } from "sonner";

import { useTheme } from "~/components/ThemeProvider";
import { useMediaQuery } from "~/hooks";

import { cn, getMinWidth } from "~/lib/utils";

function Toaster({ ...props }: ToasterProps) {
  const { resolvedTheme } = useTheme();

  const isLargerThanMd = useMediaQuery(getMinWidth("--breakpoint-md"));

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      position={isLargerThanMd ? "bottom-right" : "top-center"}
      toastOptions={{
        closeButton: true,
        unstyled: true,
        classNames: {
          toast: cn(
            "group toast",
            "bg-background text-foreground border rounded-lg shadow-lg overflow-hidden",
            "flex items-start gap-2 p-4 w-full",
          ),
          content: "leading-tight text-base pr-4 w-full",
          icon: "h-4 w-auto mx-0 *:mx-0",
          closeButton:
            "absolute right-1.5 top-2 border border-current! rounded inline-grid place-content-center p-1 bg-transparent!",
          success: "bg-success text-success-foreground!",
          error: "bg-destructive text-destructive-foreground!",
          info: "bg-info text-info-foreground!",
          warning: "bg-warning text-warning-foreground!",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
