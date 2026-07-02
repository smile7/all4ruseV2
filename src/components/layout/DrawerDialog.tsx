"use client";

import {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  type ReactElement,
  type SetStateAction,
  useContext,
  useState,
} from "react";
import { useTranslations } from "next-intl";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useMediaQuery } from "~/hooks";
import { cn, getMinWidth } from "~/lib/utils";

type CaptureHandler = (v: boolean) => boolean;

type DialogDrawerContextState = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  setOnCaptureOpenChange: Dispatch<SetStateAction<CaptureHandler | undefined>>;
};

const DialogDrawerContext = createContext<DialogDrawerContextState | undefined>(
  undefined,
);

export type DialogDrawerProps = PropsWithChildren<{
  trigger?: ReactElement;
  open?: boolean;
  setOpen?: Dispatch<SetStateAction<boolean>>;
  title?: React.ReactNode;
  description?: React.ReactNode;
  showDrawerCancel?: boolean;
  tooltip?: React.ReactNode;
  contentClassName?: string;
}>;

export function DrawerDialog({
  children,
  trigger,
  open,
  setOpen,
  title,
  description,
  showDrawerCancel,
  tooltip,
  contentClassName,
}: DialogDrawerProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const isLargerThanMd = useMediaQuery(getMinWidth("--breakpoint-md"));
  const tProfile = useTranslations("Profile");

  const resolvedOpen = open ?? localOpen;
  const setResolvedOpen = setOpen ?? setLocalOpen;

  const [captureHandler, setCaptureHandler] = useState<
    CaptureHandler | undefined
  >();

  const value: DialogDrawerContextState = {
    open: resolvedOpen,
    setOpen: setResolvedOpen,
    setOnCaptureOpenChange: setCaptureHandler,
  };

  const onBeforeSetOpen = (v: boolean) => {
    if (typeof captureHandler === "function") {
      const shouldProceed = captureHandler(v);
      if (!shouldProceed) return;
    }
    setResolvedOpen(v);
  };

  return (
    <DialogDrawerContext.Provider value={value}>
      {isLargerThanMd ? (
        <Dialog open={resolvedOpen} onOpenChange={onBeforeSetOpen}>
          {Boolean(trigger) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>{trigger}</DialogTrigger>
              </TooltipTrigger>
              {Boolean(tooltip) && <TooltipContent>{tooltip}</TooltipContent>}
            </Tooltip>
          )}
          <DialogContent
            className={cn(
              "pb-0 md:max-w-[min(var(--breakpoint-sm),calc(100vw-2rem))]",
              contentClassName,
            )}
          >
            <DialogHeader>
              <DialogTitle className={cn(!title && "sr-only")}>
                {title}
              </DialogTitle>
              <DialogDescription className={cn(!description && "sr-only")}>
                {description}
              </DialogDescription>
            </DialogHeader>
            <div className="-mx-6 overflow-auto px-6">{children}</div>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={resolvedOpen} onOpenChange={onBeforeSetOpen}>
          {Boolean(trigger) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <DrawerTrigger asChild>{trigger}</DrawerTrigger>
              </TooltipTrigger>
              {Boolean(tooltip) && <TooltipContent>{tooltip}</TooltipContent>}
            </Tooltip>
          )}
          <DrawerContent className={contentClassName}>
            <DrawerHeader className="text-left">
              <DrawerTitle className={cn(!title && "sr-only")}>
                {title}
              </DrawerTitle>
              <DrawerDescription className={cn(!description && "sr-only")}>
                {description}
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-auto pb-2">{children}</div>
            {showDrawerCancel ? (
              <DrawerFooter className="pt-0">
                <DrawerClose asChild>
                  <Button variant="outline">{tProfile("cancel")}</Button>
                </DrawerClose>
              </DrawerFooter>
            ) : null}
          </DrawerContent>
        </Drawer>
      )}
    </DialogDrawerContext.Provider>
  );
}

export function useDialogDrawerContext() {
  const context = useContext(DialogDrawerContext);
  if (!context) {
    throw new Error(
      "useDialogDrawerContext must be used inside a DrawerDialog",
    );
  }
  return context;
}
