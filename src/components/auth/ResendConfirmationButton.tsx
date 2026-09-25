"use client";

import { useState, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "~/components/ui/button";
import {
  readPendingConfirmationEmail,
  resendConfirmationEmail,
} from "~/lib/auth/resend-confirmation";

/** The stored address cannot change while this screen is open. */
const subscribeNever = () => () => {};

/**
 * Offers a fresh confirmation email on the sign-up success screen. Renders
 * nothing unless the sign-up form left an address behind in this tab, so the
 * user is never asked to type their email again.
 */
export function ResendConfirmationButton() {
  const t = useTranslations("Profile");
  const params = useParams();
  const locale = params.locale as string;

  // Session storage is unreadable while the page is server-rendered, so the
  // button appears once the client takes over.
  const email = useSyncExternalStore(
    subscribeNever,
    readPendingConfirmationEmail,
    () => null,
  );
  const [state, setState] = useState<
    "idle" | "sending" | "sent" | "failed" | "captchaFailed"
  >("idle");

  async function onResend() {
    if (!email) return;

    setState("sending");
    const outcome = await resendConfirmationEmail(email, locale);
    if (outcome === "sent") {
      setState("sent");
      return;
    }

    setState(outcome === "captcha_failed" ? "captchaFailed" : "failed");
  }

  if (!email) return null;

  if (state === "sent") {
    return (
      <p role="status" className="text-muted-foreground mt-3 text-sm">
        {t("confirmationEmailSent")}
      </p>
    );
  }

  return (
    <div className="mt-3">
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={onResend}
        disabled={state === "sending"}
      >
        {t("resendConfirmation")}
      </Button>

      {(state === "failed" || state === "captchaFailed") && (
        <p role="alert" className="text-destructive mt-2 text-sm">
          {state === "captchaFailed" ? t("captchaError") : t("errorOccurred")}
        </p>
      )}
    </div>
  );
}
