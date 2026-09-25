import { reportFailure } from "~/lib/failures";
import { executeRecaptcha } from "~/lib/recaptcha";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";

/**
 * Where the sign-up form leaves the address so the success screen can offer a
 * resend. Kept out of the URL on purpose: page URLs reach analytics.
 */
const PENDING_CONFIRMATION_EMAIL_KEY = "a4r-pending-confirmation-email";

export function rememberPendingConfirmationEmail(email: string) {
  try {
    window.sessionStorage.setItem(PENDING_CONFIRMATION_EMAIL_KEY, email);
  } catch {
    // Storage can be unavailable in private mode; the resend button is then
    // simply not offered on the success screen.
  }
}

export function readPendingConfirmationEmail(): string | null {
  try {
    return window.sessionStorage.getItem(PENDING_CONFIRMATION_EMAIL_KEY);
  } catch {
    return null;
  }
}

export type ResendOutcome = "sent" | "captcha_failed" | "failed";

/**
 * Sends a fresh sign-up confirmation email. Guarded by reCAPTCHA like the
 * sign-up form, since it can trigger mail for any address. Failures are
 * recorded before returning.
 */
export async function resendConfirmationEmail(
  email: string,
  locale: string,
): Promise<ResendOutcome> {
  // The auth layout loads the reCAPTCHA script; a null token means it is not
  // configured, and verification is then skipped as it is on sign-up.
  const token = await executeRecaptcha("resend");
  if (token) {
    const res = await fetch("/api/auth/verify-captcha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "resend" }),
    });

    if (!res.ok) {
      void reportFailure({
        flow: "auth",
        stage: "captcha_failed",
        message: `HTTP ${res.status}`,
        metadata: { method: "email", action: "resend" },
      });
      return "captcha_failed";
    }
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback?next=/${locale}`,
    },
  });

  if (error) {
    void reportFailure({
      flow: "auth",
      stage: "resend_failed",
      message: error.message,
      metadata: {
        method: "email",
        ...(error.code && { error_code: error.code }),
      },
    });
    return "failed";
  }

  return "sent";
}
