"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { Globe, Phone, User } from "lucide-react";
import { toast } from "sonner";

import { useRegisterUnsavedChanges } from "~/components/layout/UnsavedChangesGuard";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { AVATARS_BUCKET } from "~/constants";
import { useRouter } from "~/i18n/navigation";
import { profilesApi } from "~/lib/api";
import {
  AVATAR_INPUT_ACCEPT,
  buildAvatarPublicUrl,
  buildAvatarStorageObjectPath,
  extractAvatarStoragePathFromPublicUrl,
  validateAvatarFile,
} from "~/lib/profile-avatar";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";
import { type Profile, type UpdateProfileInput, updateProfileSchema } from "~/types";

import { ProfileAccountSecurity } from "./ProfileAccountSecurity";

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

function avatarFallbackLetter(fullName: string | undefined, email: string): string {
  const raw = fullName?.trim() || email;
  return raw.charAt(0).toUpperCase() || "?";
}

export function ProfileForm({ profile, userEmail, userId }: Props) {
  const t = useTranslations("Profile");
  const router = useRouter();
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);

  const previewObjectUrl = useMemo(() => {
    if (!pendingAvatarFile) return null;
    return URL.createObjectURL(pendingAvatarFile);
  }, [pendingAvatarFile]);

  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    };
  }, [previewObjectUrl]);

  const serverAvatarUrl = profile?.avatar_url ?? null;

  const displayAvatarSrc =
    previewObjectUrl ?? (!avatarRemoved ? serverAvatarUrl ?? undefined : undefined);

  const avatarDirty =
    pendingAvatarFile !== null || (avatarRemoved && Boolean(serverAvatarUrl));

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: toFormDefaults(profile),
  });

  useRegisterUnsavedChanges(form.formState.isDirty || avatarDirty);

  function onAvatarFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const err = validateAvatarFile(file);
    if (err === "type") {
      toast.error(t("avatarInvalidType"));
      return;
    }
    if (err === "size") {
      toast.error(t("avatarTooLarge"));
      return;
    }
    setAvatarRemoved(false);
    setPendingAvatarFile(file);
  }

  function handleRemoveAvatarClick() {
    if (pendingAvatarFile) {
      setPendingAvatarFile(null);
      return;
    }
    if (serverAvatarUrl) setAvatarRemoved(true);
  }

  async function removeStoredObjectIfOwned(previousPublicUrl: string | null) {
    const path = extractAvatarStoragePathFromPublicUrl(previousPublicUrl);
    if (!path) return;
    const supabase = getSupabaseBrowserClient();
    try {
      await supabase.storage.from(AVATARS_BUCKET).remove([path]);
    } catch {
      // best-effort cleanup
    }
  }

  async function uploadAvatarToStorage(file: File): Promise<string> {
    const supabase = getSupabaseBrowserClient();
    const path = buildAvatarStorageObjectPath(userId, file);
    const { error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    return buildAvatarPublicUrl(path);
  }

  async function onSubmit(values: UpdateProfileInput) {
    const supabase = getSupabaseBrowserClient();
    let nextAvatarUrl: string | null | undefined;

    try {
      if (pendingAvatarFile) {
        nextAvatarUrl = await uploadAvatarToStorage(pendingAvatarFile);
      } else if (avatarRemoved && serverAvatarUrl) {
        nextAvatarUrl = null;
      }

      const payload =
        nextAvatarUrl !== undefined
          ? { ...values, avatar_url: nextAvatarUrl }
          : values;

      const { error } = await profilesApi.updateProfile(supabase, userId, payload);
      if (error) {
        toast.error(t("errorMessage"));
        return;
      }

      if (nextAvatarUrl !== undefined) {
        const { error: authError } = await supabase.auth.updateUser({
          data: { avatar_url: nextAvatarUrl ?? "" },
        });
        if (authError) {
          console.error(authError);
        }

        const previous = serverAvatarUrl;
        if (previous && previous !== nextAvatarUrl) {
          await removeStoredObjectIfOwned(previous);
        }

        setPendingAvatarFile(null);
        setAvatarRemoved(false);
      }

      toast.success(t("savedMessage"));
      form.reset(values);
      if (nextAvatarUrl !== undefined) router.refresh();
    } catch {
      toast.error(
        pendingAvatarFile ? t("avatarUploadFailed") : t("errorMessage"),
      );
    }
  }

  return (
    <Tabs defaultValue="information" className="w-full">
      <TabsList className="mb-6 flex h-auto min-h-10 w-full flex-wrap gap-1 p-1">
        <TabsTrigger value="information" className="flex-1">
          {t("tabAccountInformation")}
        </TabsTrigger>
        <TabsTrigger value="security" className="flex-1">
          {t("tabAccountSecurity")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="information" className="mt-0 space-y-6">
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
            <div className="mb-6 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left">
              <Avatar className="size-24 shrink-0 rounded-lg border bg-muted">
                <AvatarImage
                  src={displayAvatarSrc}
                  alt={t("avatarLabel")}
                  className="object-contain"
                />
                <AvatarFallback className="rounded-lg text-lg font-semibold">
                  {avatarFallbackLetter(profile?.full_name ?? undefined, userEmail)}
                </AvatarFallback>
              </Avatar>
              <div className="flex w-full min-w-0 flex-1 flex-col gap-3 sm:min-h-24 sm:gap-0">
                <p className="text-sm font-medium leading-none">{t("avatarLabel")}</p>
                <div className="flex w-full justify-center sm:flex-1 sm:items-center sm:justify-start">
                  <p className="text-muted-foreground text-sm">{t("avatarHint")}</p>
                </div>
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept={AVATAR_INPUT_ACCEPT}
                  className="sr-only"
                  aria-label={t("avatarUploadButton")}
                  onChange={onAvatarFileChange}
                />
                <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => avatarFileInputRef.current?.click()}
                  >
                    {t("avatarUploadButton")}
                  </Button>
                  {(Boolean(displayAvatarSrc) || pendingAvatarFile !== null) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={handleRemoveAvatarClick}
                    >
                      {t("avatarRemoveButton")}
                    </Button>
                  )}
                </div>
              </div>
            </div>

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
            </div>

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
                name="address_physical"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("addressPhysical")}</FormLabel>
                    <FormControl>
                      <Input autoComplete="street-address" {...field} placeholder={t("addressPhysicalPlaceholder")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="place"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("place")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("placePlaceholder")} />
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
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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

        <div className="bg-background/80 sticky bottom-4 z-10 mt-8 flex items-center justify-end gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-md">
          <Button type="submit" disabled={form.formState.isSubmitting} size="lg" className="min-w-32">
            {t("edit")}
          </Button>
        </div>
        </form>
      </Form>
      </TabsContent>

      <TabsContent value="security" className="mt-0">
        <ProfileAccountSecurity />
      </TabsContent>
    </Tabs>
  );
}
