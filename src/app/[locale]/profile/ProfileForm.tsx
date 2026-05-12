"use client";

import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { Globe, Phone, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { profilesApi } from "~/lib/api";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";
import { type Profile, type UpdateProfileInput,updateProfileSchema } from "~/types";

type Props = {
  profile: Profile | null;
  userEmail: string;
  userId: string;
};

function toFormDefaults(profile: Profile | null): UpdateProfileInput {
  return {
    full_name: profile?.full_name ?? "",
    username: profile?.username ?? "",
    bio: profile?.bio ?? "",
    name_to_show: profile?.name_to_show ?? "",
    phone: profile?.phone ?? "",
    place: profile?.place ?? "",
    address_physical: profile?.address_physical ?? "",
    email_to_show: profile?.email_to_show ?? "",
    website: profile?.website ?? "",
    fb: profile?.fb ?? "",
    instagram: profile?.instagram ?? "",
    tiktok: profile?.tiktok ?? "",
  };
}

export function ProfileForm({ profile, userEmail, userId }: Props) {
  const t = useTranslations("Profile");

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: toFormDefaults(profile),
  });

  async function onSubmit(values: UpdateProfileInput) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await profilesApi.updateProfile(supabase, userId, values);

    if (error) {
      toast.error(t("errorMessage"));
      return;
    }

    toast.success(t("savedMessage"));
    form.reset(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Personal information ──────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="size-5 text-primary" />
              {t("personalInformation")}
            </CardTitle>
            <CardDescription>{t("personalInformationDescr")}</CardDescription>
          </CardHeader>
          <CardContent variant="section">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="full_name"
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
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("username")}</FormLabel>
                    <FormControl>
                      <Input autoComplete="username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name_to_show"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("nameToShow")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("bio")}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ── Contact information ───────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Phone className="size-5 text-primary" />
              {t("contactInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent variant="section">
            {/* Auth email — display only */}
            <FormItem>
              <FormLabel>{t("email")}</FormLabel>
              <Input value={userEmail} disabled />
            </FormItem>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="email_to_show"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("emailToShow")}</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("phone")}</FormLabel>
                    <FormControl>
                      <Input type="tel" autoComplete="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                name="address_physical"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("addressPhysical")}</FormLabel>
                    <FormControl>
                      <Input autoComplete="street-address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Social links ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="size-5 text-primary" />
              {t("socialLinks")}
            </CardTitle>
          </CardHeader>
          <CardContent variant="section">
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("website")}</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="fb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://facebook.com/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://instagram.com/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tiktok"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TikTok</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://tiktok.com/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting} size="lg" className="min-w-32">
            {t("edit")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
