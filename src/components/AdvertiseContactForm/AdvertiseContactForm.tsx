"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { ADVERTISE_CONTACT_HASH, type Locale, LOCALES } from "~/constants";
import { Link } from "~/i18n/navigation";
import { cn } from "~/lib/utils";
import {
  ADVERTISE_INQUIRY_LIMITS,
  ADVERTISE_INTERESTS,
  type AdvertiseInterest,
} from "~/types";

const INTEREST_LABEL_KEYS = {
  rubric: "formInterestRubric",
  nearby: "formInterestNearby",
  sponsored: "formInterestSponsored",
  premium: "formInterestPremium",
  unsure: "formInterestUnsure",
  other: "formInterestOther",
} as const;

function makeSchema(t: ReturnType<typeof useTranslations<"Advertise">>) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("formNameRequired"))
      .max(ADVERTISE_INQUIRY_LIMITS.name),
    email: z
      .email(t("formEmailInvalid"))
      .max(ADVERTISE_INQUIRY_LIMITS.email, t("formEmailInvalid")),
    businessName: z
      .string()
      .trim()
      .min(1, t("formBusinessNameRequired"))
      .max(ADVERTISE_INQUIRY_LIMITS.businessName),
    interest: z.enum(ADVERTISE_INTERESTS, {
      error: t("formInterestRequired"),
    }),
    message: z
      .string()
      .trim()
      .min(1, t("formMessageRequired"))
      .max(ADVERTISE_INQUIRY_LIMITS.message),
    website: z.string().max(200),
  });
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

type AdvertiseContactFormProps = {
  defaultInterest?: AdvertiseInterest;
};

export function AdvertiseContactForm({
  defaultInterest = "unsure",
}: AdvertiseContactFormProps) {
  const t = useTranslations("Advertise");
  const locale = useLocale();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const schema = makeSchema(t);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      businessName: "",
      interest: defaultInterest,
      message: "",
      website: "",
    },
  });

  useEffect(() => {
    form.setValue("interest", defaultInterest);
  }, [defaultInterest, form]);

  useEffect(() => {
    if (window.location.hash !== `#${ADVERTISE_CONTACT_HASH}`) return;
    document
      .getElementById(ADVERTISE_CONTACT_HASH)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);

    const interestLine = `${t("formInterestLabel")} ${t(INTEREST_LABEL_KEYS[values.interest])}`;
    const message = `${interestLine}\n\n${values.message}`.slice(
      0,
      ADVERTISE_INQUIRY_LIMITS.message,
    );

    try {
      const res = await fetch("/api/advertise/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          businessName: values.businessName,
          message,
          website: values.website,
          locale: isLocale(locale) ? locale : undefined,
        }),
      });

      if (res.status === 429) {
        setSubmitError(t("formRateLimited"));
        return;
      }
      if (!res.ok) {
        setSubmitError(t("formError"));
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError(t("formError"));
    }
  }

  if (submitted) {
    return (
      <div
        className="flex flex-col items-center gap-3 py-6 text-center"
        role="status"
      >
        <CheckCircle2 className="text-primary size-10" aria-hidden />
        <p className="text-lg font-semibold">{t("formSuccessTitle")}</p>
        <p className="text-muted-foreground max-w-md text-pretty">
          {t("formSuccessText")}
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="relative flex flex-col gap-4"
        noValidate
      >
        <div className="sr-only" aria-hidden>
          <label htmlFor="advertise-website">Website</label>
          <input
            id="advertise-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...form.register("website")}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("formNameLabel")}</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="name"
                    maxLength={ADVERTISE_INQUIRY_LIMITS.name}
                    {...field}
                  />
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
                <FormLabel>{t("formEmailLabel")}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    maxLength={ADVERTISE_INQUIRY_LIMITS.email}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="businessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formBusinessNameLabel")}</FormLabel>
              <FormControl>
                <Input
                  autoComplete="organization"
                  maxLength={ADVERTISE_INQUIRY_LIMITS.businessName}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="interest"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formInterestLabel")}</FormLabel>
              <div
                role="radiogroup"
                aria-label={t("formInterestLabel")}
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                {ADVERTISE_INTERESTS.map((value) => {
                  const selected = field.value === value;
                  return (
                    <label
                      key={value}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm leading-snug transition-colors",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:bg-muted/60",
                      )}
                    >
                      <input
                        type="radio"
                        name={field.name}
                        value={value}
                        checked={selected}
                        onBlur={field.onBlur}
                        onChange={() => field.onChange(value)}
                        className="accent-primary size-4 shrink-0"
                      />
                      <span>{t(INTEREST_LABEL_KEYS[value])}</span>
                    </label>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formMessageLabel")}</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  maxLength={ADVERTISE_INQUIRY_LIMITS.message}
                  className="min-h-28"
                  placeholder={t("formMessagePlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {submitError ? (
          <p className="text-destructive text-sm" role="alert">
            {submitError}
          </p>
        ) : null}

        <p className="text-muted-foreground text-xs text-pretty">
          {t.rich("formPrivacyNote", {
            privacyLink: (chunks) => (
              <Link href="/legal/privacy" className="underline">
                {chunks}
              </Link>
            ),
          })}
        </p>

        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
          {form.formState.isSubmitting ? t("formSending") : t("formSubmit")}
        </Button>
      </form>
    </Form>
  );
}
