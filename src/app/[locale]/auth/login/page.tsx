"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { SocialAuthButtons } from "~/components/auth/SocialAuthButtons";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { PasswordInput } from "~/components/ui/password-input";
import { LOGIN_ERROR_CODES, safeAuthNextPath } from "~/lib/auth/redirects";
import { resendConfirmationEmail } from "~/lib/auth/resend-confirmation";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";
import { setAuthRememberPreference } from "~/lib/supabase/session-persistence";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  rememberMe: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

function isEmailNotConfirmed(error: {
  code?: string;
  message: string;
}): boolean {
  return (
    error.code === "email_not_confirmed" ||
    error.message.toLowerCase().includes("email not confirmed")
  );
}

function mapLoginError(
  error: { code?: string; message: string },
  t: (key: string) => string,
): string {
  if (error.message.toLowerCase().includes("invalid login credentials")) {
    return t("invalidCredentials");
  }
  if (isEmailNotConfirmed(error)) {
    return t("pleaseCheckEmail");
  }
  return t("errorOccurred");
}

/** Errors the auth callback routes report back through `?error=`. */
function mapRedirectError(
  code: string | null,
  t: (key: string) => string,
): string | null {
  if (!code) return null;
  if (code === LOGIN_ERROR_CODES.emailLinkInvalid) {
    return t("emailLinkInvalid");
  }
  if (code === LOGIN_ERROR_CODES.resetLinkInvalid) {
    return t("resetLinkInvalid");
  }
  if (code === LOGIN_ERROR_CODES.oauthCancelled) {
    return t("oauthCancelled");
  }
  return t("errorOccurred");
}

/** Same-origin path only. Auth pages fall back to locale home so login cannot loop. */
function getPostLoginPath(next: string | null, locale: string): string {
  const home = `/${locale}`;
  const safeNext = safeAuthNextPath(next, home);

  const pathOnly = safeNext.split("?")[0] ?? safeNext;
  const withoutLocale = pathOnly.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  if (withoutLocale === "/auth" || withoutLocale.startsWith("/auth/")) {
    return home;
  }

  return safeNext;
}

function LoginForm() {
  const t = useTranslations("Profile");
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const next = getPostLoginPath(searchParams.get("next"), locale);
  const redirectError = searchParams.get("error");

  const [authError, setAuthError] = useState<string | null>(() =>
    mapRedirectError(redirectError, t),
  );
  // An unconfirmed account and a dead confirmation link both need a fresh
  // email; a dead password-reset link needs a new reset request instead.
  const [canResendConfirmation, setCanResendConfirmation] = useState(
    redirectError === LOGIN_ERROR_CODES.emailLinkInvalid,
  );
  const needsNewResetLink =
    redirectError === LOGIN_ERROR_CODES.resetLinkInvalid;
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    // Staying signed in is what users expect; unchecking it makes the session
    // cookies expire when the browser closes.
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  async function onSubmit(values: LoginValues) {
    setAuthError(null);

    setAuthRememberPreference(values.rememberMe);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setAuthError(mapLoginError(error, t));
      // Keep the offer once it is relevant: a mistyped password should not
      // take away the resend the user arrived here for.
      setCanResendConfirmation((prev) => prev || isEmailNotConfirmed(error));
      setResendState("idle");
      return;
    }

    // Hard navigation: client `push` + `refresh` can race on mobile Safari
    // and leave the user on this screen after a successful sign-in.
    window.location.replace(next);
  }

  async function onResendConfirmation() {
    const email = form.getValues("email").trim();
    if (!z.email().safeParse(email).success) {
      form.setError("email", { message: t("resendNeedsEmail") });
      return;
    }

    setAuthError(null);
    setResendState("sending");

    const outcome = await resendConfirmationEmail(email, locale);
    if (outcome !== "sent") {
      setResendState("idle");
      setAuthError(
        outcome === "captcha_failed" ? t("captchaError") : t("errorOccurred"),
      );
      return;
    }

    setResendState("sent");
  }

  return (
    <div className="flex min-h-[calc(100svh-10rem)] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("loginTitle")}</CardTitle>
          <CardDescription>
            {t("noAccount")}{" "}
            <Link
              href={`/${locale}/auth/signup`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {t("signupButton")}
            </Link>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <SocialAuthButtons next={next} />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>{t("password")}</FormLabel>
                      <Link
                        href={`/${locale}/auth/forgot-password`}
                        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
                      >
                        {t("forgotPassword")}
                      </Link>
                    </div>
                    <FormControl>
                      <PasswordInput
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) =>
                            field.onChange(checked === true)
                          }
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        {t("rememberMe")}
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {authError && (
                <p role="alert" className="text-destructive text-sm">
                  {authError}
                </p>
              )}

              {needsNewResetLink && (
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/${locale}/auth/forgot-password`}>
                    {t("requestNewResetLink")}
                  </Link>
                </Button>
              )}

              {canResendConfirmation &&
                (resendState === "sent" ? (
                  <p role="status" className="text-muted-foreground text-sm">
                    {t("confirmationEmailSent")}
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={onResendConfirmation}
                    disabled={resendState === "sending"}
                  >
                    {t("resendConfirmation")}
                  </Button>
                ))}

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {t("loginButton")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

// `useSearchParams` reads the `?next=` redirect target; the boundary lets the
// rest of the route prerender instead of forcing dynamic rendering.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
