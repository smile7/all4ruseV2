"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, ExternalLink, Globe, ImagePlus, Phone, Sparkles, User } from "lucide-react";
import { toast } from "sonner";

import { useRegisterUnsavedChanges } from "~/components/layout/UnsavedChangesGuard";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
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
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { AVATARS_BUCKET, DEFAULT_PROFILE_COLOR, PROFILE_COLOR_SWATCHES } from "~/constants";
import { Link, useRouter } from "~/i18n/navigation";
import { profilesApi } from "~/lib/api";
import {
  AVATAR_INPUT_ACCEPT,
  buildAvatarPublicUrl,
  buildAvatarStorageObjectPath,
  validateAvatarFile,
} from "~/lib/profile-avatar";
import {
  buildProfileGalleryPublicUrl,
  buildProfileGalleryStorageObjectPath,
  extractProfileGalleryStoragePathFromPublicUrl,
  MAX_PROFILE_GALLERY_IMAGES,
  parseProfileGallery,
  PROFILE_GALLERY_INPUT_ACCEPT,
  validateProfileGalleryFile,
} from "~/lib/profile-gallery";
import {
  buildHeaderPublicUrl,
  buildHeaderStorageObjectPath,
  extractHeaderStoragePathFromPublicUrl,
  HEADER_INPUT_ACCEPT,
  validateHeaderFile,
} from "~/lib/profile-header";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";
import { type Profile, type UpdateProfileInput, updateProfileSchema } from "~/types";

import { ProfileAccountSecurity } from "./ProfileAccountSecurity";

type Props = {
  profile: Profile | null;
  userEmail: string;
  userId: string;
  hasEmailAuth: boolean;
  hasCreatedEvents: boolean;
};

function toFormDefaults(
  profile: Profile | null,
  hasCreatedEvents: boolean,
): UpdateProfileInput {
  // show_saved_events will be properly typed once the DB column is on profiles
  // and db:types is re-run. Until then we use a cast.
  const p = profile as (Profile & { show_saved_events?: boolean | null }) | null;
  return {
    full_name: p?.full_name ?? "",
    username: p?.username ?? "",
    bio: p?.bio ?? "",
    name_to_show: p?.name_to_show ?? "",
    phone: p?.phone ?? "",
    place: p?.place ?? "",
    address_physical: p?.address_physical ?? "",
    email_to_show: p?.email_to_show ?? "",
    website: p?.website ?? "",
    fb: p?.fb ?? "",
    instagram: p?.instagram ?? "",
    tiktok: p?.tiktok ?? "",
    color: p?.color ?? "",
    // Default: checked when user has no created events
    show_saved_events: p?.show_saved_events ?? !hasCreatedEvents,
  };
}

function avatarFallbackLetter(fullName: string | undefined, email: string): string {
  const raw = fullName?.trim() || email;
  return raw.charAt(0).toUpperCase() || "?";
}

export function ProfileForm({ profile, userEmail, userId, hasEmailAuth, hasCreatedEvents }: Props) {
  const t = useTranslations("Profile");
  const tPub = useTranslations("PublicProfile");
  const locale = useLocale();
  const router = useRouter();

  // ── Avatar state ────────────────────────────────────────────────────────────
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);

  const previewAvatarUrl = useMemo(() => {
    if (!pendingAvatarFile) return null;
    return URL.createObjectURL(pendingAvatarFile);
  }, [pendingAvatarFile]);

  useEffect(() => {
    return () => {
      if (previewAvatarUrl) URL.revokeObjectURL(previewAvatarUrl);
    };
  }, [previewAvatarUrl]);

  const serverAvatarUrl = profile?.avatar_url ?? null;
  const displayAvatarSrc =
    previewAvatarUrl ?? (!avatarRemoved ? serverAvatarUrl ?? undefined : undefined);
  const avatarDirty =
    pendingAvatarFile !== null || (avatarRemoved && Boolean(serverAvatarUrl));

  // ── Header photo state ───────────────────────────────────────────────────────
  const headerFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingHeaderFile, setPendingHeaderFile] = useState<File | null>(null);
  const [headerRemoved, setHeaderRemoved] = useState(false);

  const previewHeaderUrl = useMemo(() => {
    if (!pendingHeaderFile) return null;
    return URL.createObjectURL(pendingHeaderFile);
  }, [pendingHeaderFile]);

  useEffect(() => {
    return () => {
      if (previewHeaderUrl) URL.revokeObjectURL(previewHeaderUrl);
    };
  }, [previewHeaderUrl]);

  const serverHeaderUrl = profile?.header_url ?? null;
  const displayHeaderSrc =
    previewHeaderUrl ?? (!headerRemoved ? serverHeaderUrl ?? undefined : undefined);
  const headerDirty =
    pendingHeaderFile !== null || (headerRemoved && Boolean(serverHeaderUrl));

  // ── Profile gallery state ───────────────────────────────────────────────────
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>(
    () => parseProfileGallery(profile?.profile_gallery),
  );
  const [pendingGalleryFiles, setPendingGalleryFiles] = useState<File[]>([]);
  const [removedGalleryUrls, setRemovedGalleryUrls] = useState<string[]>([]);

  const previewGalleryUrls = useMemo(
    () => pendingGalleryFiles.map((file) => URL.createObjectURL(file)),
    [pendingGalleryFiles],
  );

  useEffect(() => {
    return () => {
      previewGalleryUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewGalleryUrls]);

  const galleryDirty = pendingGalleryFiles.length > 0 || removedGalleryUrls.length > 0;
  const displayGalleryUrls = [...galleryUrls, ...previewGalleryUrls];

  // ── Form ─────────────────────────────────────────────────────────────────────
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: toFormDefaults(profile, hasCreatedEvents),
  });

  const watchUsername = useWatch({ control: form.control, name: "username" });
  const watchColor = useWatch({ control: form.control, name: "color" });
  const activeColor = watchColor || DEFAULT_PROFILE_COLOR;

  useRegisterUnsavedChanges(
    form.formState.isDirty || avatarDirty || headerDirty || galleryDirty,
  );

  // ── Public link copy ─────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);
  function handleCopyLink() {
    if (!watchUsername) return;
    const url = `${window.location.origin}/${locale}/user/${watchUsername}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success(tPub("linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Avatar handlers ──────────────────────────────────────────────────────────
  function onAvatarFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const err = validateAvatarFile(file);
    if (err === "type") { toast.error(t("avatarInvalidType")); return; }
    if (err === "size")  { toast.error(t("avatarTooLarge")); return; }
    setAvatarRemoved(false);
    setPendingAvatarFile(file);
  }

  function handleRemoveAvatarClick() {
    if (pendingAvatarFile) { setPendingAvatarFile(null); return; }
    if (serverAvatarUrl) setAvatarRemoved(true);
  }

  // ── Header photo handlers ────────────────────────────────────────────────────
  function onHeaderFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const err = validateHeaderFile(file);
    if (err === "type") { toast.error(tPub("headerPhotoInvalidType")); return; }
    if (err === "size")  { toast.error(tPub("headerPhotoTooLarge")); return; }
    setHeaderRemoved(false);
    setPendingHeaderFile(file);
  }

  function handleRemoveHeaderClick() {
    if (pendingHeaderFile) { setPendingHeaderFile(null); return; }
    if (serverHeaderUrl) setHeaderRemoved(true);
  }

  // ── Profile gallery handlers ────────────────────────────────────────────────
  function onGalleryFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const remainingSlots =
      MAX_PROFILE_GALLERY_IMAGES - galleryUrls.length - pendingGalleryFiles.length;
    if (remainingSlots <= 0) {
      toast.error(tPub("galleryMaxImagesExceeded"));
      return;
    }

    const nextFiles: File[] = [];
    let hadTypeError = false;
    let hadSizeError = false;

    for (const file of files.slice(0, remainingSlots)) {
      const err = validateProfileGalleryFile(file);
      if (err === "type") {
        hadTypeError = true;
        continue;
      }
      if (err === "size") {
        hadSizeError = true;
        continue;
      }
      nextFiles.push(file);
    }

    if (files.length > remainingSlots) toast.error(tPub("galleryMaxImagesExceeded"));
    if (hadTypeError) toast.error(tPub("galleryInvalidType"));
    if (hadSizeError) toast.error(tPub("galleryTooLarge"));
    if (nextFiles.length > 0) {
      setPendingGalleryFiles((current) => [...current, ...nextFiles]);
    }
  }

  function handleRemoveGalleryImage(index: number) {
    if (index < galleryUrls.length) {
      const removedUrl = galleryUrls[index];
      setGalleryUrls((current) => current.filter((_, i) => i !== index));
      if (removedUrl) {
        setRemovedGalleryUrls((current) => [...current, removedUrl]);
      }
      return;
    }

    const pendingIndex = index - galleryUrls.length;
    setPendingGalleryFiles((current) => current.filter((_, i) => i !== pendingIndex));
  }

  // ── Storage helpers ──────────────────────────────────────────────────────────
  async function removeStoredObject(bucket: string, previousPublicUrl: string | null) {
    const supabase = getSupabaseBrowserClient();
    const marker = `/object/public/${bucket}/`;
    const i = previousPublicUrl?.indexOf(marker) ?? -1;
    if (i === -1) return;
    const path = previousPublicUrl!.slice(i + marker.length);
    try {
      await supabase.storage.from(bucket).remove([path]);
    } catch { /* best-effort */ }
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

  async function uploadHeaderToStorage(file: File): Promise<string> {
    const supabase = getSupabaseBrowserClient();
    const path = buildHeaderStorageObjectPath(userId, file);
    const { error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    return buildHeaderPublicUrl(path);
  }

  async function uploadGalleryImageToStorage(file: File): Promise<string> {
    const supabase = getSupabaseBrowserClient();
    const path = buildProfileGalleryStorageObjectPath(userId, file);
    const { error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    return buildProfileGalleryPublicUrl(path);
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function onSubmit(values: UpdateProfileInput) {
    const supabase = getSupabaseBrowserClient();
    let nextAvatarUrl: string | null | undefined;
    let nextHeaderUrl: string | null | undefined;
    let nextGalleryUrls: string[] | undefined;

    try {
      if (pendingAvatarFile) {
        nextAvatarUrl = await uploadAvatarToStorage(pendingAvatarFile);
      } else if (avatarRemoved && serverAvatarUrl) {
        nextAvatarUrl = null;
      }

      if (pendingHeaderFile) {
        nextHeaderUrl = await uploadHeaderToStorage(pendingHeaderFile);
      } else if (headerRemoved && serverHeaderUrl) {
        nextHeaderUrl = null;
      }

      if (galleryDirty) {
        const uploadedGalleryUrls: string[] = [];
        for (const file of pendingGalleryFiles) {
          uploadedGalleryUrls.push(await uploadGalleryImageToStorage(file));
        }
        nextGalleryUrls = [...galleryUrls, ...uploadedGalleryUrls].slice(
          0,
          MAX_PROFILE_GALLERY_IMAGES,
        );
      }

      const payload = {
        ...values,
        ...(nextAvatarUrl !== undefined && { avatar_url: nextAvatarUrl }),
        ...(nextHeaderUrl !== undefined && { header_url: nextHeaderUrl }),
        ...(nextGalleryUrls !== undefined && { profile_gallery: nextGalleryUrls }),
      };

      const { error } = await profilesApi.updateProfile(supabase, userId, payload);
      if (error) {
        toast.error(t("errorMessage"));
        return;
      }

      if (nextAvatarUrl !== undefined) {
        await supabase.auth.updateUser({ data: { avatar_url: nextAvatarUrl ?? "" } }).catch(console.error);
        const previous = serverAvatarUrl;
        if (previous && previous !== nextAvatarUrl) {
          await removeStoredObject(AVATARS_BUCKET, previous);
        }
        setPendingAvatarFile(null);
        setAvatarRemoved(false);
      }

      if (nextHeaderUrl !== undefined) {
        const previous = serverHeaderUrl;
        if (previous && previous !== nextHeaderUrl) {
          const path = extractHeaderStoragePathFromPublicUrl(previous);
          if (path) {
            try {
              await getSupabaseBrowserClient().storage.from(AVATARS_BUCKET).remove([path]);
            } catch { /* best-effort */ }
          }
        }
        setPendingHeaderFile(null);
        setHeaderRemoved(false);
      }

      if (nextGalleryUrls !== undefined) {
        for (const previous of removedGalleryUrls) {
          const path = extractProfileGalleryStoragePathFromPublicUrl(previous);
          if (path) {
            try {
              await getSupabaseBrowserClient().storage.from(AVATARS_BUCKET).remove([path]);
            } catch { /* best-effort */ }
          }
        }
        setGalleryUrls(nextGalleryUrls);
        setPendingGalleryFiles([]);
        setRemovedGalleryUrls([]);
      }

      toast.success(t("savedMessage"));
      form.reset(values);
      if (
        nextAvatarUrl !== undefined ||
        nextHeaderUrl !== undefined ||
        nextGalleryUrls !== undefined
      ) {
        router.refresh();
      }
    } catch {
      const isHeaderError = pendingHeaderFile !== null;
      const isGalleryError = pendingGalleryFiles.length > 0;
      toast.error(
        isHeaderError
          ? tPub("headerPhotoUploadFailed")
          : isGalleryError
            ? tPub("galleryUploadFailed")
            : (pendingAvatarFile ? t("avatarUploadFailed") : t("errorMessage")),
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

            {/* Username + public link ────────────────────────────── */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("username")}</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="username"
                      placeholder="your-name"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Public link chip — shown when username is saved */}
            {watchUsername && watchUsername.length >= 3 ? (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                <ExternalLink className="text-muted-foreground size-3.5 shrink-0" />
                <Link
                  href={`/user/${watchUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary min-w-0 flex-1 truncate text-xs underline-offset-2 hover:underline"
                >
                  all4ruse.com/{locale}/user/{watchUsername}
                </Link>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7 shrink-0"
                  onClick={handleCopyLink}
                  aria-label={tPub("yourPublicLink")}
                >
                  {copied ? (
                    <Check className="size-3.5 text-green-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                {tPub("setUsernameNudge")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Public profile appearance ──────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="size-5 text-primary" />
              {tPub("publicProfileCard")}
            </CardTitle>
            <CardDescription>{tPub("publicProfileCardDescr")}</CardDescription>
          </CardHeader>
          <CardContent variant="section">
            {/* Show saved events toggle */}
            <FormField
              control={form.control}
              name="show_saved_events"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-start gap-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                        className="mt-0.5"
                      />
                    </FormControl>
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium leading-snug">
                        {tPub("showSavedEventsLabel")}
                      </FormLabel>
                      {/* <p className="text-muted-foreground text-xs">
                        {tPub("showSavedEventsHint")}
                      </p> */}
                    </div>
                  </div>
                </FormItem>
              )}
            />

            {/* Color swatches */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">{tPub("colorLabel")}</p>
                <p className="text-muted-foreground text-xs">{tPub("colorHint")}</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {PROFILE_COLOR_SWATCHES.map((swatch) => {
                  const isActive = activeColor === swatch.value;
                  return (
                    <button
                      key={swatch.value}
                      type="button"
                      aria-label={swatch.label}
                      title={swatch.label}
                      onClick={() =>
                        form.setValue("color", swatch.value, { shouldDirty: true })
                      }
                      className={cn(
                        "size-8 rounded-full border-2 transition-all duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                        isActive
                          ? "scale-110 border-white ring-2 ring-offset-2"
                          : "border-transparent",
                      )}
                      style={{
                        backgroundColor: swatch.value,
                        ...(isActive && { boxShadow: `0 0 0 2px ${swatch.value}` }),
                      }}
                    />
                  );
                })}
              </div>
              {/* Live preview strip */}
              <div
                className="h-10 w-full rounded-xl transition-all duration-300"
                style={{
                  background: `linear-gradient(135deg, ${activeColor}30 0%, ${activeColor}80 50%, ${activeColor} 100%)`,
                }}
              />
            </div>

            <Separator />

            {/* Header / cover photo */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">{tPub("headerPhotoLabel")}</p>
                <p className="text-muted-foreground text-xs">{tPub("headerPhotoHint")}</p>
              </div>

              {displayHeaderSrc ? (
                <div className="relative w-full overflow-hidden rounded-xl border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayHeaderSrc}
                    alt={tPub("headerPhotoLabel")}
                    className="aspect-3/1 w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => headerFileInputRef.current?.click()}
                    >
                      {tPub("headerPhotoUploadButton")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={handleRemoveHeaderClick}
                    >
                      {tPub("headerPhotoRemoveButton")}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => headerFileInputRef.current?.click()}
                  className="flex aspect-3/1 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors hover:border-primary hover:bg-muted/30"
                >
                  <ImagePlus className="text-muted-foreground size-8" />
                  <span className="text-muted-foreground text-sm">
                    {tPub("headerPhotoUploadButton")}
                  </span>
                </button>
              )}

              <input
                ref={headerFileInputRef}
                type="file"
                accept={HEADER_INPUT_ACCEPT}
                className="sr-only"
                aria-label={tPub("headerPhotoUploadButton")}
                onChange={onHeaderFileChange}
              />
            </div>

            <Separator />

            {/* Profile gallery */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">{tPub("galleryLabel")}</p>
                <p className="text-muted-foreground text-xs">{tPub("galleryHint")}</p>
              </div>

              {displayGalleryUrls.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {displayGalleryUrls.map((url, index) => (
                    <div
                      key={`${url}-${index}`}
                      className="relative h-28 w-40 shrink-0 overflow-hidden rounded-xl border bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={tPub("galleryLabel")}
                        className="size-full object-cover"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="absolute right-2 top-2 h-7 px-2 text-xs"
                        onClick={() => handleRemoveGalleryImage(index)}
                      >
                        {tPub("galleryRemoveButton")}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={galleryFileInputRef}
                type="file"
                multiple
                accept={PROFILE_GALLERY_INPUT_ACCEPT}
                className="sr-only"
                aria-label={tPub("galleryUploadButton")}
                onChange={onGalleryFilesChange}
              />

              {displayGalleryUrls.length < MAX_PROFILE_GALLERY_IMAGES && (
                <button
                  type="button"
                  onClick={() => galleryFileInputRef.current?.click()}
                  className="flex min-h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors hover:border-primary hover:bg-muted/30"
                >
                  <ImagePlus className="text-muted-foreground size-8" />
                  <span className="text-muted-foreground text-sm">
                    {tPub("galleryUploadButton")}
                  </span>
                </button>
              )}
            </div>
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
        <ProfileAccountSecurity hasEmailAuth={hasEmailAuth} />
      </TabsContent>
    </Tabs>
  );
}
