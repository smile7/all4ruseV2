"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { PasswordInput } from "~/components/ui/password-input";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";

function makeSchema(minLengthMsg: string, matchMsg: string) {
  return z
    .object({
      password: z.string().min(6, minLengthMsg),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: matchMsg,
      path: ["confirmPassword"],
    });
}

type Values = { password: string; confirmPassword: string };

export default function UpdatePasswordPage() {
  const t = useTranslations("Profile");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Guard: this page is only reachable after a password-reset email link.
  // If there's no active session, send the user back to login.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace(`/${locale}/auth/login`);
      } else {
        setSessionChecked(true);
      }
    });
  }, [locale, router]);

  const schema = makeSchema(t("passwordLength"), t("passwordsDoNotMatch"));

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: Values) {
    setAuthError(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });

    if (error) {
      setAuthError(t("errorUpdatingPassword"));
      return;
    }

    router.push(`/${locale}/auth/login`);
  }

  if (!sessionChecked) {
    return null;
  }

  return (
    <div className="flex min-h-[calc(100svh-10rem)] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("resetPassword")}</CardTitle>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("newPassword")}</FormLabel>
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
                {t("changePassword")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
