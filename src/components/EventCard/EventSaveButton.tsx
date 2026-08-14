"use client";

import { type MouseEvent, useState } from "react";
import { useTranslations } from "next-intl";

import { Bookmark } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { useMediaQuery } from "~/hooks";
import {
  useCurrentUserId,
  useSavedEventIds,
  useToggleSavedEvent,
} from "~/hooks/query";
import { Link } from "~/i18n/navigation";
import { cn } from "~/lib/utils";

import { promptRemindersOnSave } from "./promptRemindersOnSave";

type Props = {
  eventId: number;
  initialSaved?: boolean;
  variant?: "icon" | "button";
  className?: string;
  onUnsaveSuccess?: (eventId: number) => void;
};

function GuestAuthPrompt({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("SavedEvents");
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("authPromptTitle")}</DialogTitle>
            <DialogDescription>{t("authPromptBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" asChild>
              <Link href="/auth/login">{t("loginCta")}</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">{t("signupCta")}</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{t("authPromptTitle")}</DrawerTitle>
          <DrawerDescription>{t("authPromptBody")}</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button asChild>
            <Link href="/auth/signup">{t("signupCta")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/auth/login">{t("loginCta")}</Link>
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export function EventSaveButton({
  eventId,
  initialSaved = false,
  variant = "icon",
  className,
  onUnsaveSuccess,
}: Props) {
  const t = useTranslations("SavedEvents");
  const [promptOpen, setPromptOpen] = useState(false);
  const { data: userId } = useCurrentUserId();
  const { data: savedIds } = useSavedEventIds(userId);
  const toggleSaved = useToggleSavedEvent(userId ?? "");

  const isSaved = savedIds?.includes(eventId) ?? initialSaved;
  const label = isSaved ? t("removeAria") : t("saveAria");

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!userId) {
      setPromptOpen(true);
      return;
    }

    const nextSaved = !isSaved;
    toggleSaved.mutate(
      { eventId, nextSaved },
      {
        onSuccess: () => {
          if (!nextSaved) {
            onUnsaveSuccess?.(eventId);
            return;
          }
          void promptRemindersOnSave(t);
        },
        onError: () => {
          toast.error(t("mutationError"));
        },
      },
    );
  }

  const icon = (
    <Bookmark
      className={cn("size-4", isSaved && "text-primary fill-current")}
      strokeWidth={isSaved ? 2.5 : 2}
    />
  );

  return (
    <>
      {variant === "button" ? (
        <Button
          type="button"
          variant="secondary"
          className={cn("w-full justify-start gap-2", className)}
          aria-pressed={isSaved}
          aria-label={label}
          disabled={toggleSaved.isPending}
          onClick={handleClick}
        >
          {icon}
          {isSaved ? t("saved") : t("save")}
        </Button>
      ) : (
        <button
          type="button"
          className={cn(
            "bg-background/92 text-foreground hover:bg-background focus-visible:ring-ring absolute right-2.5 bottom-2.5 z-30 flex size-10 cursor-pointer items-center justify-center rounded-full shadow backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
            className,
          )}
          aria-pressed={isSaved}
          aria-label={label}
          disabled={toggleSaved.isPending}
          onClick={handleClick}
        >
          {icon}
        </button>
      )}
      <GuestAuthPrompt open={promptOpen} onOpenChange={setPromptOpen} />
    </>
  );
}
