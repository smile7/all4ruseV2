"use client";

import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useMessages, useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  ImageIcon,
  MapPin,
  Phone,
  Plus,
  TagIcon,
  Ticket,
  Trash2,
  Type,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import {
  useRegisterUnsavedChanges,
  useUnsavedChangesNavigate,
} from "~/components/layout/UnsavedChangesGuard";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { EVENTS_BUCKET } from "~/constants";
import { localizedEventTagTitle } from "~/i18n/event-tag-label";
import { useRouter } from "~/i18n/navigation";
import { eventsApi } from "~/lib/api/events";
import {
  plainTextFromHtml,
  sanitizeEventDescription,
} from "~/lib/event-description-html";
import { getEventImageUrl } from "~/lib/event-utils";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";
import type { Event, Tag } from "~/types";

import { EventDescriptionEditor } from "./EventDescriptionEditor";
import { EventImageUpload, type UploadableImage } from "./EventImageUpload";

/** Default населено място for new events (Ruse). */
const DEFAULT_EVENT_TOWN = "Русе";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventFormMode = "create" | "edit" | "duplicate";

export type ProfileDefaults = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  place?: string | null;
  website?: string | null;
};

type Props = {
  mode: EventFormMode;
  initialData?: Event | null;
  tags: Tag[];
  profileDefaults?: ProfileDefaults | null;
  userId: string;
};

// ─── Schema ───────────────────────────────────────────────────────────────────

const organizerSchema = z.object({
  name: z.string().min(1),
  link: z.string().optional(),
});

function makeFormSchema(t: ReturnType<typeof useTranslations<"CreateEvent">>) {
  return z.object({
    title: z.string().min(3, t("requiredField")),
    description: z
      .string()
      .refine(
        (html) =>
          plainTextFromHtml(sanitizeEventDescription(html)).length >= 10,
        { message: t("requiredField") },
      ),
    startDate: z.string().min(1, t("requiredField")),
    endDate: z.string().min(1, t("requiredField")),
    startTime: z.string().min(1, t("requiredField")),
    endTime: z.string().optional(),
    address: z.string().min(3, t("requiredField")),
    town: z.string().min(2, t("requiredField")),
    place: z.string().optional(),
    price: z.string().optional(),
    ticketsLink: z.string().url(t("invalidUrl")).optional().or(z.literal("")),
    fbLink: z.string().url(t("invalidUrl")).optional().or(z.literal("")),
    phoneNumber: z.string().optional(),
    email: z.string().email(t("invalidEmail")).optional().or(z.literal("")),
    organizers: z.array(organizerSchema).min(1, t("atLeastOneOrganizer")),
    tagIds: z.array(z.number()).optional(),
  });
}

type FormValues = {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime?: string;
  address: string;
  town: string;
  place?: string;
  price?: string;
  ticketsLink?: string;
  fbLink?: string;
  phoneNumber?: string;
  email?: string;
  organizers: { name: string; link?: string }[];
  tagIds?: number[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uploadableImagesFingerprint(images: UploadableImage[]): string {
  return images
    .map((img) =>
      [
        img.storedPath ?? "",
        img.file ? `new:${img.file.name}:${img.file.size}` : "",
      ].join(":"),
    )
    .join("|");
}

function baselineFreeFromEvent(initialData?: Event | null): boolean {
  if (!initialData) return false;
  const p = initialData.price;
  return !p || p === "" || p === "0" || p === "0.00";
}

function baselineMultiFromEvent(initialData?: Event | null): boolean {
  if (!initialData) return false;
  return initialData.startDate !== initialData.endDate;
}

function buildInitialImages(event: Event): UploadableImage[] {
  const paths: string[] = [];

  if (Array.isArray(event.images)) {
    event.images.forEach((img) => {
      if (typeof img === "string") paths.push(img);
    });
  }
  // Ensure cover image is first; avoid duplicates
  if (event.image && !paths.includes(event.image)) {
    paths.unshift(event.image);
  }

  return paths.map((path, i) => ({
    id: `existing-${i}`,
    previewUrl: getEventImageUrl(path),
    storedPath: path,
  }));
}

function buildDefaultValues(
  mode: EventFormMode,
  initialData: Event | null | undefined,
  profileDefaults: ProfileDefaults | null | undefined,
): FormValues {
  const defaultName = profileDefaults?.name ?? "";
  const defaultLink = profileDefaults?.website ?? "";

  if (initialData) {
    const organizers = Array.isArray(initialData.organizers)
      ? (initialData.organizers as { name?: string; link?: string }[]).map(
          (o) => ({ name: o.name ?? "", link: o.link ?? "" }),
        )
      : [{ name: defaultName, link: defaultLink }];

    return {
      title: initialData.title,
      description: sanitizeEventDescription(initialData.description ?? ""),
      startDate: initialData.startDate,
      endDate: initialData.endDate,
      startTime: initialData.startTime.slice(0, 5),
      endTime: initialData.endTime?.slice(0, 5) ?? "",
      address: initialData.address,
      town: initialData.town,
      place: initialData.place ?? "",
      price: initialData.price ?? "",
      ticketsLink: initialData.ticketsLink ?? "",
      fbLink: initialData.fbLink ?? "",
      phoneNumber: initialData.phoneNumber ?? "",
      email: initialData.email ?? "",
      organizers,
      tagIds: initialData.tags?.map((tag) => tag.id) ?? [],
    };
  }

  return {
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    address: profileDefaults?.address ?? "",
    town: DEFAULT_EVENT_TOWN,
    place: profileDefaults?.place ?? "",
    price: "",
    ticketsLink: "",
    fbLink: "",
    phoneNumber: profileDefaults?.phone ?? "",
    email: profileDefaults?.email ?? "",
    organizers: [{ name: defaultName, link: defaultLink }],
    tagIds: [],
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EventForm({
  mode,
  initialData,
  tags,
  profileDefaults,
  userId,
}: Props) {
  const t = useTranslations("CreateEvent");
  const messages = useMessages() as { EventTags?: Record<string, string> };
  const eventTagLabels = messages.EventTags;
  const router = useRouter();
  const navigateGuarded = useUnsavedChangesNavigate();

  const formSchema = makeFormSchema(t);

  // ── UI-only state (not part of DB schema) ──────────────────────────────────
  const [isFree, setIsFree] = useState<boolean>(() => {
    if (!initialData) return false;
    const p = initialData.price;
    return !p || p === "" || p === "0" || p === "0.00";
  });
  const [isMultiDay, setIsMultiDay] = useState<boolean>(() => {
    if (!initialData) return false;
    return initialData.startDate !== initialData.endDate;
  });
  const [images, setImages] = useState<UploadableImage[]>(() =>
    initialData ? buildInitialImages(initialData) : [],
  );

  const baselineImagesFingerprintRef = useRef(
    uploadableImagesFingerprint(
      initialData ? buildInitialImages(initialData) : [],
    ),
  );
  const baselineTogglesRef = useRef({
    isFree: baselineFreeFromEvent(initialData),
    isMultiDay: baselineMultiFromEvent(initialData),
  });

  const imagesDirty =
    uploadableImagesFingerprint(images) !== baselineImagesFingerprintRef.current;
  const togglesDirty =
    isFree !== baselineTogglesRef.current.isFree ||
    isMultiDay !== baselineTogglesRef.current.isMultiDay;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const descriptionEditorKey =
    mode === "edit" && initialData
      ? `edit-${initialData.id}`
      : mode === "duplicate" && initialData
        ? `dup-${initialData.id}`
        : "create-new";

  // ── Form ──────────────────────────────────────────────────────────────────
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaultValues(mode, initialData, profileDefaults),
  });

  const {
    fields: organizerFields,
    append: appendOrganizer,
    remove: removeOrganizer,
  } = useFieldArray({ control: form.control, name: "organizers" });

  // Keep endDate in sync with startDate when single-day
  const startDate = form.watch("startDate");
  useEffect(() => {
    if (!isMultiDay) {
      form.setValue("endDate", startDate);
    }
  }, [startDate, isMultiDay, form]);

  useRegisterUnsavedChanges(
    form.formState.isDirty || imagesDirty || togglesDirty,
  );

  // ── Image upload ──────────────────────────────────────────────────────────
  async function uploadImage(file: File): Promise<string> {
    const supabase = getSupabaseBrowserClient();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from(EVENTS_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    return path;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();

      // Upload new files; keep existing stored paths as-is
      const uploadedPaths: string[] = [];
      for (const img of images) {
        if (img.file) {
          const path = await uploadImage(img.file);
          uploadedPaths.push(path);
        } else if (img.storedPath) {
          uploadedPaths.push(img.storedPath);
        }
      }

      const eventData = {
        title: values.title,
        description: sanitizeEventDescription(values.description),
        startDate: values.startDate,
        endDate: isMultiDay ? values.endDate : values.startDate,
        startTime: values.startTime,
        endTime: values.endTime || null,
        address: values.address,
        town: values.town,
        place: values.place || null,
        price: isFree ? null : values.price || null,
        ticketsLink: values.ticketsLink || null,
        fbLink: values.fbLink || null,
        phoneNumber: values.phoneNumber || null,
        email: values.email || null,
        image: uploadedPaths[0] ?? null,
        images: uploadedPaths.length > 0 ? uploadedPaths : null,
        organizers: values.organizers.filter((o) => o.name.trim()),
      };

      const tagIds = values.tagIds ?? [];

      let saved: Event;
      if (mode === "edit" && initialData) {
        saved = await eventsApi.updateEvent(
          supabase,
          initialData.id,
          eventData,
          tagIds,
        );
        toast.success(t("eventUpdated"));
      } else {
        saved = await eventsApi.createEvent(
          supabase,
          userId,
          eventData,
          tagIds,
        );
        toast.success(
          saved.isEventActive ? t("eventCreatedLive") : t("eventCreated"),
        );
      }

      const slug =
        typeof saved.slug === "string" ? saved.slug.trim() : "";
      if (saved.isEventActive && slug !== "") {
        router.push(`/${slug}`);
      } else {
        router.push("/");
      }
    } catch {
      toast.error(t("error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!initialData) return;
    setIsDeleting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await eventsApi.deleteEvent(supabase, initialData.id);
      toast.success(t("eventDeleted"));
      router.push("/my-events");
    } catch {
      toast.error(t("error"));
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* ── Basic info ─────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Type className="text-primary size-5" />
                {t("title")}
              </CardTitle>
            </CardHeader>
            <CardContent variant="section">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("title")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("enterTitle")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("description")}</FormLabel>
                    <FormControl>
                      <EventDescriptionEditor
                        key={descriptionEditorKey}
                        placeholder={t("enterDescription")}
                        disabled={isSubmitting}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ── Date & Time ─────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="text-primary size-5" />
                {t("eventDate")}
              </CardTitle>
            </CardHeader>
            <CardContent variant="section">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="isMultiDay"
                  checked={isMultiDay}
                  onCheckedChange={(v: boolean | "indeterminate") =>
                    setIsMultiDay(Boolean(v))
                  }
                />
                <label
                  htmlFor="isMultiDay"
                  className="cursor-pointer text-sm leading-none font-medium"
                >
                  {t("rangeDateCheckbox")}
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {isMultiDay ? t("fromDate") : t("eventDate")}
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isMultiDay && (
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("toDate")}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fromTime")}</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("toTime")}</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Location ────────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="text-primary size-5" />
                {t("address")}
              </CardTitle>
            </CardHeader>
            <CardContent variant="section">
              <FormField
                control={form.control}
                name="town"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("town")}</FormLabel>
                    <FormControl>
                      <Input placeholder="Русе" {...field} />
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
                      <Input placeholder={t("enterAddress")} {...field} />
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
                      <Input placeholder={t("enterPlace")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ── Organizers ──────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="text-primary size-5" />
                {t("organizers")}
              </CardTitle>
            </CardHeader>
            <CardContent variant="section">
              {organizerFields.map((field, index) => (
                <div key={field.id} className="space-y-3">
                  {index > 0 && <Separator />}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`organizers.${index}.name`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>{t("organizerName")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("enterOrganizerName")}
                              {...f}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`organizers.${index}.link`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>{t("organizerLink")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("organizerLinkPlaceholder")}
                              {...f}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {index > 0 && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOrganizer(index)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="mr-1 size-4" />
                        {t("removeOrganizer")}
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendOrganizer({ name: "", link: "" })}
              >
                <Plus className="mr-1 size-4" />
                {t("addOrganizer")}
              </Button>
            </CardContent>
          </Card>

          {/* ── Tickets & Pricing ───────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Ticket className="text-primary size-5" />
                {t("price")}
              </CardTitle>
            </CardHeader>
            <CardContent variant="section">
              <div className="flex items-center gap-3">
                <Switch
                  id="isFree"
                  checked={isFree}
                  onCheckedChange={(v) => {
                    setIsFree(v);
                    if (v) form.setValue("price", "");
                  }}
                />
                <label
                  htmlFor="isFree"
                  className="cursor-pointer text-sm font-medium"
                >
                  {t("freeEvent")}
                </label>
              </div>

              {!isFree && (
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("price")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={t("enterPrice")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="ticketsLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("ticketsLink")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("enterTicketsLink")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fbLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fbLink")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("enterFbLink")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ── Contact ─────────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Phone className="text-primary size-5" />
                {t("contactInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent variant="section">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("phoneNumber")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("enterPhoneNumber")} {...field} />
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
                        placeholder={t("enterEmail")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ── Tags ────────────────────────────────────────────────────── */}
          {tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TagIcon className="text-primary size-5" />
                  {t("tags")}
                </CardTitle>
              </CardHeader>
              <CardContent variant="section" className="space-y-0">
                <FormField
                  control={form.control}
                  name="tagIds"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => {
                          const isSelected = (field.value ?? []).includes(
                            tag.id,
                          );
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => {
                                const current = field.value ?? [];
                                field.onChange(
                                  isSelected
                                    ? current.filter((id) => id !== tag.id)
                                    : [...current, tag.id],
                                );
                              }}
                              className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                  : "bg-muted/50 border-border text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              {localizedEventTagTitle(tag.title, eventTagLabels)}
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* ── Images ──────────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ImageIcon className="text-primary size-5" />
                {t("images")}
              </CardTitle>
            </CardHeader>
            <CardContent variant="section" className="space-y-0">
              <EventImageUpload images={images} onChange={setImages} />
            </CardContent>
          </Card>

          {/* ── Actions ─────────────────────────────────────────────────── */}
          <div className="bg-background/80 sticky bottom-4 z-10 mt-8 flex items-center justify-end gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-md">
            {mode === "edit" && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isSubmitting}
                className="mr-auto"
              >
                <Trash2 className="mr-2 size-4" />
                {t("deleteEventTitle")}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => navigateGuarded(() => router.back())}
              disabled={isSubmitting}
            >
              {t("cancel") || "Cancel"}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-32">
              {isSubmitting ? "..." : t("submitButton")}
            </Button>
          </div>
        </form>
      </Form>

      {/* ── Delete confirmation dialog ───────────────────────────────────── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteEventTitle")}</DialogTitle>
            <DialogDescription>{t("confirmDeleteEvent")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              {t("unsavedChangesCancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "..." : t("deleteEventTitle")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
