"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Input } from "~/components/ui/input";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";

const schema = z.object({
  email: z.email(),
});

type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const t = useTranslations("Profile");
  const params = useParams();
  const locale = params.locale as string;

  const [sent, setSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: Values) {
    setAuthError(null);
    const supabase = getSupabaseBrowserClient();

    // After clicking the reset email link, the user goes through /auth/callback
    // which exchanges the code and then redirects to update-password.
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/${locale}/auth/update-password`,
    });

    if (error) {
      setAuthError(t("errorOccurred"));
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex min-h-[calc(100svh-10rem)] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-sm text-center">
          <CardHeader className="items-center">
            <div className="bg-primary/10 mb-4 rounded-full p-3">
              <MailCheck className="text-primary mx-auto size-8 text-center" />
            </div>
            <CardTitle className="text-xl">{t("checkEmail")}</CardTitle>
            <CardDescription className="mt-1">
              {t("resetEmail")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/${locale}/auth/login`}>{t("loginButton")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100svh-10rem)] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("forgotPassword")}</CardTitle>
          <CardDescription>{t("resetInstructions")}</CardDescription>
        </CardHeader>

        <CardContent>
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
                {t("send")}
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link href={`/${locale}/auth/login`}>{t("loginButton")}</Link>
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
