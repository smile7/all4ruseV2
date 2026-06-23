"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import { setAuthRememberPreference } from "~/lib/supabase/session-persistence";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  rememberMe: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

function mapLoginError(message: string, t: (key: string) => string): string {
  if (message.toLowerCase().includes("invalid login credentials")) {
    return t("invalidCredentials");
  }
  if (message.toLowerCase().includes("email not confirmed")) {
    return t("pleaseCheckEmail");
  }
  return t("errorOccurred");
}

export default function LoginPage() {
  const t = useTranslations("Profile");
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const next = searchParams.get("next") ?? `/${locale}`;

  const [authError, setAuthError] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  async function onSubmit(values: LoginValues) {
    setAuthError(null);

    const token = await executeRecaptcha("login");
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

    setAuthRememberPreference(values.rememberMe);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setAuthError(mapLoginError(error.message, t));
      return;
    }

    router.push(next);
    router.refresh();
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
                      <PasswordInput autoComplete="current-password" {...field} />
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
