"use client";

import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  buildHostSlugFromName,
  HOST_SLUG_MAX_LENGTH,
  HOST_SLUG_PATTERN,
} from "~/lib/host-slug";
import { isOptionalWebUrl } from "~/lib/url-input";
import { type EventHost, HOST_LIMITS } from "~/types";

export type HostFormValues = {
  name: string;
  slug: string;
  place: string;
  address: string;
  website: string;
  phone: string;
  email: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit mode when set; create mode otherwise. */
  host?: EventHost | null;
  /** Create-mode prefill, e.g. the fields currently typed into the event form. */
  draft?: Partial<HostFormValues>;
  onSaved: (host: EventHost) => void;
};

function makeSchema(t: ReturnType<typeof useTranslations<"Hosts">>) {
  const text = (max: number) => z.string().trim().max(max);
  return z.object({
    name: text(HOST_LIMITS.name).min(1, t("requiredField")),
    slug: z
      .string()
      .trim()
      .min(1, t("requiredField"))
      .max(HOST_SLUG_MAX_LENGTH)
      .regex(HOST_SLUG_PATTERN, t("invalidSlug")),
    place: text(HOST_LIMITS.place),
    address: text(HOST_LIMITS.address),
    website: text(HOST_LIMITS.website).refine(isOptionalWebUrl, {
      message: t("invalidUrl"),
    }),
    phone: text(HOST_LIMITS.phone),
    email: z.email(t("invalidEmail")).max(HOST_LIMITS.email).or(z.literal("")),
  });
}

function buildDefaults(
  host: EventHost | null | undefined,
  draft: Partial<HostFormValues> | undefined,
): HostFormValues {
  if (host) {
    return {
      name: host.name,
      slug: host.slug,
      place: host.place ?? "",
      address: host.address ?? "",
      website: host.website ?? "",
      phone: host.phone ?? "",
      email: host.email ?? "",
    };
  }
  const name = draft?.name?.trim() ?? "";
  return {
    name,
    slug: name ? buildHostSlugFromName(name) : "",
    place: draft?.place ?? "",
    address: draft?.address ?? "",
    website: draft?.website ?? "",
    phone: draft?.phone ?? "",
    email: draft?.email ?? "",
  };
}

export function HostFormDialog({
  open,
  onOpenChange,
  host,
  draft,
  onSaved,
}: Props) {
  const t = useTranslations("Hosts");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {host ? t("dialogEditTitle") : t("dialogCreateTitle")}
          </DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so every opening reads fresh defaults. */}
        <HostFormFields
          host={host}
          draft={draft}
          onCancel={() => onOpenChange(false)}
          onSaved={(saved) => {
            onSaved(saved);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function HostFormFields({
  host,
  draft,
  onCancel,
  onSaved,
}: {
  host?: EventHost | null;
  draft?: Partial<HostFormValues>;
  onCancel: () => void;
  onSaved: (host: EventHost) => void;
}) {
  const t = useTranslations("Hosts");
  const schema = useMemo(() => makeSchema(t), [t]);
  const [submitting, setSubmitting] = useState(false);
  // Keep the slug following the name until the admin edits it by hand.
  const slugTouchedRef = useRef(Boolean(host));

  const form = useForm<HostFormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(host, draft),
  });

  async function save(values: HostFormValues) {
    setSubmitting(true);
    try {
      const response = await fetch(
        host ? `/api/hosts/${host.id}` : "/api/hosts",
        {
          method: host ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const body = (await response.json().catch(() => ({}))) as {
        host?: EventHost;
        error?: string;
      };
      if (!response.ok || !body.host) {
        if (body.error === "slug_taken") {
          form.setError("slug", { message: t("slugTaken") });
        } else {
          toast.error(t("saveError"));
        }
        return;
      }
      toast.success(host ? t("updated") : t("created"));
      onSaved(body.host);
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form
        // The dialog is portalled, but React still bubbles submit through the
        // component tree — without this the event form would submit too.
        onSubmit={(event) => {
          event.stopPropagation();
          void form.handleSubmit(save)(event);
        }}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("name")}</FormLabel>
              <FormControl>
                <Input
                  aria-required="true"
                  {...field}
                  onChange={(event) => {
                    field.onChange(event);
                    if (!slugTouchedRef.current) {
                      form.setValue(
                        "slug",
                        buildHostSlugFromName(event.target.value),
                      );
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("slug")}</FormLabel>
              <FormControl>
                <Input
                  aria-required="true"
                  disabled={Boolean(host)}
                  {...field}
                  onChange={(event) => {
                    slugTouchedRef.current = true;
                    field.onChange(event);
                  }}
                />
              </FormControl>
              <FormDescription>
                {t("slugHint", { slug: field.value || "…" })}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="place"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("place")}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("address")}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("website")}</FormLabel>
              <FormControl>
                <Input inputMode="url" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("phone")}</FormLabel>
                <FormControl>
                  <Input type="tel" {...field} />
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
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {t("save")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
