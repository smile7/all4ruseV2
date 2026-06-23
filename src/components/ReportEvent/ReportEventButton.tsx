"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Flag, Loader2 } from "lucide-react";
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
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { useMediaQuery } from "~/hooks";

type Props = {
  eventId: number;
  alreadyReported?: boolean;
  className?: string;
};

function ReportedBadge() {
  const t = useTranslations("SingleEvent");
  return (
    <Button
      variant="outline"
      disabled
      className="w-full cursor-default justify-start gap-2 opacity-70"
    >
      <Flag className="size-4" />
      {t("reportEventReported")}
    </Button>
  );
}

type FormProps = {
  eventId: number;
  onSuccess: () => void;
  onClose: () => void;
};

function ReportForm({ eventId, onSuccess, onClose }: FormProps) {
  const t = useTranslations("SingleEvent");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/events/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, message: message.trim() || null }),
      });

      if (res.status === 409) {
        toast.info(t("reportEventAlreadyReported"));
        onSuccess();
        return;
      }

      if (!res.ok) {
        toast.error(t("reportEventError"));
        return;
      }

      toast.success(t("reportEventSuccess"));
      onSuccess();
    } catch {
      toast.error(t("reportEventError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pb-4 md:px-0 md:pb-0">
      <div className="flex flex-col gap-2">
        <Label htmlFor="report-message">{t("reportEventMessageLabel")}</Label>
        <Textarea
          id="report-message"
          placeholder={t("reportEventMessagePlaceholder")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={1000}
          disabled={submitting}
        />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
          {t("reportEventCancel")}
        </Button>
        <Button type="submit" variant="destructive" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {t("reportEventSubmit")}
        </Button>
      </div>
    </form>
  );
}

export function ReportEventButton({ eventId, alreadyReported = false, className }: Props) {
  const t = useTranslations("SingleEvent");
  const [open, setOpen] = useState(false);
  const [reported, setReported] = useState(alreadyReported);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (reported) {
    return <ReportedBadge />;
  }

  function handleSuccess() {
    setReported(true);
    setOpen(false);
  }

  const triggerButton = (
    <Button
      type="button"
      variant="ghost"
      className={className ?? "w-full justify-start gap-2 text-muted-foreground hover:text-destructive"}
      onClick={() => setOpen(true)}
    >
      <Flag className="size-4 shrink-0" />
      {t("reportEvent")}
    </Button>
  );

  if (isDesktop) {
    return (
      <>
        {triggerButton}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("reportEventDialogTitle")}</DialogTitle>
              <DialogDescription>{t("reportEventDialogDescription")}</DialogDescription>
            </DialogHeader>
            <ReportForm
              eventId={eventId}
              onSuccess={handleSuccess}
              onClose={() => setOpen(false)}
            />
            <DialogFooter />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      {triggerButton}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{t("reportEventDialogTitle")}</DrawerTitle>
            <DrawerDescription>{t("reportEventDialogDescription")}</DrawerDescription>
          </DrawerHeader>
          <ReportForm
            eventId={eventId}
            onSuccess={handleSuccess}
            onClose={() => setOpen(false)}
          />
          <DrawerFooter className="pt-0">
            <DrawerClose asChild>
              <Button variant="outline">{t("reportEventCancel") as string}</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
