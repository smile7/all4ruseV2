"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { BadgeCheck, Loader2, ShieldAlert } from "lucide-react";
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
import type { ClaimStatus } from "~/lib/api/claims";

type Props = {
  eventId: number;
  initialClaimStatus: ClaimStatus | null;
  className?: string;
};

function StatusBadge({ status }: { status: ClaimStatus }) {
  const t = useTranslations("SingleEvent");

  if (status === "pending") {
    return (
      <Button
        variant="outline"
        disabled
        className="w-full cursor-default justify-start gap-2 opacity-70"
      >
        <BadgeCheck className="size-4" />
        {t("claimEventPending")}
      </Button>
    );
  }

  if (status === "approved") {
    return (
      <Button
        variant="outline"
        disabled
        className="w-full cursor-default justify-start gap-2 opacity-70"
      >
        <BadgeCheck className="size-4 text-green-600" />
        {t("claimEventApproved")}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      disabled
      className="w-full cursor-default justify-start gap-2 opacity-70"
    >
      <ShieldAlert className="text-destructive size-4" />
      {t("claimEventDeclined")}
    </Button>
  );
}

type FormProps = {
  eventId: number;
  onSuccess: () => void;
  onClose: () => void;
};

function ClaimForm({ eventId, onSuccess, onClose }: FormProps) {
  const t = useTranslations("SingleEvent");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/events/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, message: message.trim() || null }),
      });

      if (res.status === 409) {
        toast.info(t("claimEventAlreadyClaimed"));
        onSuccess();
        return;
      }

      if (!res.ok) {
        toast.error(t("claimEventError"));
        return;
      }

      toast.success(t("claimEventSuccess"));
      onSuccess();
    } catch {
      toast.error(t("claimEventError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 px-4 pb-4 md:px-0 md:pb-0"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="claim-message">{t("claimEventMessageLabel")}</Label>
        <Textarea
          id="claim-message"
          placeholder={t("claimEventMessagePlaceholder")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={1000}
          disabled={submitting}
        />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {t("claimEventSubmit")}
        </Button>
      </div>
    </form>
  );
}

export function ClaimEventButton({
  eventId,
  initialClaimStatus,
  className,
}: Props) {
  const t = useTranslations("SingleEvent");
  const [open, setOpen] = useState(false);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(
    initialClaimStatus,
  );
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (claimStatus !== null) {
    return <StatusBadge status={claimStatus} />;
  }

  function handleSuccess() {
    setClaimStatus("pending");
    setOpen(false);
  }

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      className={className ?? "w-full justify-start gap-2"}
      onClick={() => setOpen(true)}
    >
      <BadgeCheck className="size-4 shrink-0" />
      {t("claimEvent")}
    </Button>
  );

  if (isDesktop) {
    return (
      <>
        {triggerButton}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("claimEventDialogTitle")}</DialogTitle>
              <DialogDescription>
                {t("claimEventDialogDescription")}
              </DialogDescription>
            </DialogHeader>
            <ClaimForm
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
            <DrawerTitle>{t("claimEventDialogTitle")}</DrawerTitle>
            <DrawerDescription>
              {t("claimEventDialogDescription")}
            </DrawerDescription>
          </DrawerHeader>
          <ClaimForm
            eventId={eventId}
            onSuccess={handleSuccess}
            onClose={() => setOpen(false)}
          />
          <DrawerFooter className="pt-0">
            <DrawerClose asChild>
              <Button variant="outline">
                {t("claimEventCancel") as string}
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
