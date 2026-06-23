"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { executeRecaptcha } from "~/lib/recaptcha";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";

function makeSignupSchema(passwordLengthMsg: string, matchMsg: string, termsMsg: string) {
  return z
    .object({
      fullName: z.string().optional(),
      email: z.email(),
      password: z.string().min(6, passwordLengthMsg),
      confirmPassword: z.string(),
      acceptTerms: z.boolean(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: matchMsg,
      path: ["confirmPassword"],
    })
    .refine((d) => d.acceptTerms === true, {
      message: termsMsg,
      path: ["acceptTerms"],
    });
}

type SignupValues = {
  fullName?: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

function mapSignupError(message: string, t: (key: string) => string): string {
  if (
    message.toLowerCase().includes("user already registered") ||
    message.toLowerCase().includes("already been registered")
  ) {
    return t("userAlreadyExists");
  }
  return t("errorOccurred");
}

export default function SignupPage() {
  const t = useTranslations("Profile");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [authError, setAuthError] = useState<string | null>(null);
  const [duplicateEmail, setDuplicateEmail] = useState(false);

  const schema = makeSignupSchema(
    t("passwordLength"),
    t("passwordsDoNotMatch"),
    t("acceptTermsRequired"),
  );

  const form = useForm<SignupValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  async function onSubmit(values: SignupValues) {
    setAuthError(null);
    setDuplicateEmail(false);

    const token = await executeRecaptcha("signup");
    if (token) {
      const res = await fetch("/api/auth/verify-captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        setAuthError(t("captchaError"));
        return;
      }
    }

    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        // Supabase will redirect the user here after clicking the confirmation email.
        // This URL must be in the "Redirect URLs" allowlist in your Supabase dashboard.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: values.fullName ?? "",
        },
      },
    });

    if (error) {
      const isDuplicate =
        error.message.toLowerCase().includes("user already registered") ||
        error.message.toLowerCase().includes("already been registered");
      setDuplicateEmail(isDuplicate);
      setAuthError(mapSignupError(error.message, t));
      return;
    }

    // Confirmed duplicate: Supabase returns success with no error (anti-enumeration)
    // but identities is empty — no confirmation email is sent.
    if (!data.user?.identities?.length) {
      setDuplicateEmail(true);
      setAuthError(t("userAlreadyExists"));
      return;
    }

    router.push(`/${locale}/auth/signup-success`);
  }

  return (
    <div className="flex min-h-[calc(100svh-10rem)] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("signupTitle")}</CardTitle>
          <CardDescription>
            {t("haveAccount")}{" "}
            <Link
              href={`/${locale}/auth/login`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {t("loginButton")}
            </Link>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <SocialAuthButtons next={`/${locale}`} />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fullName")}</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                    <FormLabel>{t("password")}</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("repeatPassword")}</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <div className="flex items-start gap-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-0.5"
                        />
                      </FormControl>
                      <FormLabel className="text-sm leading-snug font-normal">
                        {t("acceptTermsPrefix")}
                        <Link
                          href={`/${locale}/legal/terms`}
                          target="_blank"
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {t("acceptTermsLink")}
                        </Link>
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {authError && (
                <p role="alert" className="text-destructive text-sm">
                  {authError}
                  {duplicateEmail && (
                    <>
                      {" "}
                      <Link
                        href={`/${locale}/auth/login`}
                        className="font-medium underline underline-offset-4"
                      >
                        {t("userAlreadyExistsLoginLink")}
                      </Link>
                    </>
                  )}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {t("signupButton")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
