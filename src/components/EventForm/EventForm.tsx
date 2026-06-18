"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useLocale, useMessages, useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format, parseISO } from "date-fns";
import { bg, enUS, ro, uk } from "date-fns/locale";
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
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { EventTag } from "~/components/EventTag";
import { DatePopover } from "~/components/layout/DatePopover";
import {
  useRegisterUnsavedChanges,
  useUnsavedChangesNavigate,
} from "~/components/layout/UnsavedChangesGuard";
import { Badge } from "~/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
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
import { isValidYoutubeUrl } from "~/lib/youtube-url";
import type { Event, EventDraft, Tag } from "~/types";

import { EventDescriptionEditor } from "./EventDescriptionEditor";
import { EventImageUpload, type UploadableImage } from "./EventImageUpload";
import { SmartFillPanel } from "./SmartFillPanel";

/** Default населено място for new events (Ruse). */
const DEFAULT_EVENT_TOWN = "Русе";

const MAX_OCCURRENCES = 52;

const DATE_FNS_LOCALES = {
  bg,
  en: enUS,
  ua: uk,
  ro,
} as const;

/** JS getDay(): 0 = Sun … 6 = Sat. Display order Mon–Sun. */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const WEEKDAY_REF_DATE: Record<number, Date> = {
  0: new Date(2024, 0, 7),
  1: new Date(2024, 0, 1),
  2: new Date(2024, 0, 2),
  3: new Date(2024, 0, 3),
  4: new Date(2024, 0, 4),
  5: new Date(2024, 0, 5),
  6: new Date(2024, 0, 6),
};

type RecurrencePattern = "daily" | "weekly" | "monthly";

function weekdayFromDate(dateStr: string): number {
  return parseISO(dateStr).getDay();
}

function recurrenceUsesWeekdays(pattern: RecurrencePattern): boolean {
  return pattern === "weekly" || pattern === "monthly";
}

/** 1-based index of this date's weekday within its month (e.g. 2 = second Tuesday). */
function weekdayOccurrenceInMonth(date: Date): number {
  const weekday = date.getDay();
  const year = date.getFullYear();
  const month = date.getMonth();
  let count = 0;
  for (let d = 1; d <= date.getDate(); d++) {
    if (new Date(year, month, d).getDay() === weekday) count++;
  }
  return count;
}

function dateForNthWeekdayInMonth(
  year: number,
  month: number,
  weekday: number,
  occurrence: number,
): Date | null {
  let count = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    if (date.getDay() === weekday) {
      count++;
      if (count === occurrence) return date;
    }
  }
  return null;
}

function generateOccurrenceDates(
  firstDate: string,
  pattern: RecurrencePattern,
  periodEnd: string,
  weekdays: number[] = [],
): string[] {
  if (!firstDate || !periodEnd) return [];
  const dates: string[] = [];
  const start = parseISO(firstDate);
  const end = parseISO(periodEnd);
  if (start > end) return [];

  if (pattern === "weekly") {
    if (weekdays.length === 0) return [];
    const daySet = new Set(weekdays);
    let current = start;
    while (current <= end && dates.length < MAX_OCCURRENCES) {
      if (daySet.has(current.getDay())) {
        dates.push(format(current, "yyyy-MM-dd"));
      }
      current = addDays(current, 1);
    }
    return dates;
  }

  if (pattern === "monthly") {
    if (weekdays.length === 0) return [];
    const occurrence = weekdayOccurrenceInMonth(start);
    let year = start.getFullYear();
    let month = start.getMonth();
    const endYear = end.getFullYear();
    const endMonth = end.getMonth();

    while (
      (year < endYear || (year === endYear && month <= endMonth)) &&
      dates.length < MAX_OCCURRENCES
    ) {
      for (const weekday of weekdays) {
        const candidate = dateForNthWeekdayInMonth(
          year,
          month,
          weekday,
          occurrence,
        );
        if (candidate && candidate >= start && candidate <= end) {
          dates.push(format(candidate, "yyyy-MM-dd"));
        }
      }
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }

    return [...new Set(dates)].sort().slice(0, MAX_OCCURRENCES);
  }

  let current = start;
  while (current <= end && dates.length < MAX_OCCURRENCES) {
    dates.push(format(current, "yyyy-MM-dd"));
    current = addDays(current, 1);
  }
  return dates;
}

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
    youtubeUrl: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine((val) => !val || isValidYoutubeUrl(val), {
        message: t("invalidYoutubeUrl"),
      }),
    phoneNumber: z.string().optional(),
    email: z.string().email(t("invalidEmail")).optional().or(z.literal("")),
    organizers: z.array(organizerSchema).min(1, t("atLeastOneOrganizer")),
    tagIds: z.array(z.number()).optional(),
  })
    .refine((data) => data.endDate >= data.startDate, {
      message: t("endDateAfterStartDate"),
      path: ["endDate"],
    })
    .refine(
      (data) => {
        if (!data.endTime?.trim()) return true;
        if (data.endDate !== data.startDate) return true;
        return data.endTime >= data.startTime;
      },
      { message: t("endTimeAfterStartTime"), path: ["endTime"] },
    );
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
  youtubeUrl?: string;
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
      title: initialData.title ?? "",
      description: sanitizeEventDescription(initialData.description ?? ""),
      startDate: initialData.startDate ?? "",
      endDate: initialData.endDate ?? "",
      startTime: initialData.startTime?.slice(0, 5) ?? "",
      endTime: initialData.endTime?.slice(0, 5) ?? "",
      address: initialData.address ?? "",
      town: initialData.town ?? "",
      place: initialData.place ?? "",
      price: initialData.price ?? "",
      ticketsLink: initialData.ticketsLink ?? "",
      fbLink: initialData.fbLink ?? "",
      youtubeUrl: initialData.youtubeUrl ?? "",
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
    youtubeUrl: "",
    phoneNumber: profileDefaults?.phone ?? "",
    email: profileDefaults?.email ?? "",
    organizers: [{ name: defaultName, link: defaultLink }],
    tagIds: [],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RequiredMark() {
  return (
    <span className="text-destructive ml-0.5" aria-hidden="true">
      *
    </span>
  );
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
  const locale = useLocale();
  const messages = useMessages() as { EventTags?: Record<string, string> };
  const eventTagLabels = messages.EventTags;
  const router = useRouter();
  const navigateGuarded = useUnsavedChangesNavigate();

  const formSchema = useMemo(() => makeFormSchema(t), [t]);

  // ── UI-only state (not part of DB schema) ──────────────────────────────────
  const [isFree, setIsFree] = useState<boolean>(() => {
    if (!initialData) return false;
    const p = initialData.price;
    return !p || p === "" || p === "0" || p === "0.00";
  });
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] =
    useState<RecurrencePattern>("weekly");
  const [recurrencePeriodEnd, setRecurrencePeriodEnd] = useState("");
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[]>([]);
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
  });

  const imagesDirty =
    uploadableImagesFingerprint(images) !== baselineImagesFingerprintRef.current;
  const togglesDirty =
    isFree !== baselineTogglesRef.current.isFree || isRecurring;

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

  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");
  const startTime = form.watch("startTime");

  const dateFnsLocale =
    DATE_FNS_LOCALES[locale as keyof typeof DATE_FNS_LOCALES] ?? bg;

  const weekdayLabels = useMemo(
    () =>
      Object.fromEntries(
        WEEKDAY_ORDER.map((day) => [
          day,
          format(WEEKDAY_REF_DATE[day]!, "EEEEEE", { locale: dateFnsLocale }),
        ]),
      ) as Record<number, string>,
    [dateFnsLocale],
  );

  // Default weekdays from start date when none selected yet
  useEffect(() => {
    if (
      !isRecurring ||
      !recurrenceUsesWeekdays(recurrencePattern) ||
      !startDate
    ) {
      return;
    }
    setRecurrenceWeekdays((prev) =>
      prev.length > 0 ? prev : [weekdayFromDate(startDate)],
    );
  }, [startDate, isRecurring, recurrencePattern]);

  // Prefill / clamp endDate when start moves forward.
  // In recurring mode the endDate field is hidden; mirror startDate into it so
  // the zod schema (which requires endDate) doesn't silently block submit.
  useEffect(() => {
    if (!startDate) return;
    if (isRecurring) {
      form.setValue("endDate", startDate);
      return;
    }
    const currentEnd = form.getValues("endDate");
    if (!currentEnd || currentEnd < startDate) {
      form.setValue("endDate", startDate);
    }
  }, [startDate, isRecurring, form]);

  // Block end time before start time on the same day
  useEffect(() => {
    if (!startDate || !startTime) return;
    const currentEndDate = form.getValues("endDate");
    const currentEndTime = form.getValues("endTime");
    if (
      currentEndDate === startDate &&
      currentEndTime &&
      currentEndTime < startTime
    ) {
      form.setValue("endTime", startTime);
    }
  }, [startDate, endDate, startTime, form]);

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
    // Store the full public URL so both the old and new app can display the image
    // without needing to know the Supabase base URL at render time.
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${EVENTS_BUCKET}/${path}`;
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

      const baseEventData = {
        title: values.title,
        description: sanitizeEventDescription(values.description),
        startTime: values.startTime,
        endTime: values.endTime || null,
        address: values.address,
        town: values.town,
        place: values.place || null,
        price: isFree ? null : values.price || null,
        ticketsLink: values.ticketsLink || null,
        fbLink: values.fbLink || null,
        youtubeUrl: values.youtubeUrl || null,
        phoneNumber: values.phoneNumber || null,
        email: values.email || null,
        image: uploadedPaths[0] ?? null,
        images: uploadedPaths.length > 0 ? uploadedPaths : null,
        organizers: values.organizers.filter((o) => o.name.trim()),
      };

      const tagIds = values.tagIds ?? [];

      // ── Recurring create ─────────────────────────────────────────────────
      if (isRecurring && mode !== "edit") {
        if (
          recurrenceUsesWeekdays(recurrencePattern) &&
          recurrenceWeekdays.length === 0
        ) {
          toast.error(t("recurrenceWeekdaysRequired"));
          return;
        }
        const occurrenceDates = generateOccurrenceDates(
          values.startDate,
          recurrencePattern,
          recurrencePeriodEnd,
          recurrenceWeekdays,
        );
        if (occurrenceDates.length === 0) {
          toast.error(t("recurrenceNoOccurrences"));
          return;
        }
        const seriesId = crypto.randomUUID();
        const created = await eventsApi.createRecurringEvents(
          supabase,
          userId,
          baseEventData,
          tagIds,
          occurrenceDates,
          seriesId,
        );
        const anyLive = created.some((e) => e.isEventActive);
        toast.success(
          anyLive
            ? t("recurringEventsCreated", { count: created.length })
            : t("recurringEventsCreatedPending", { count: created.length }),
        );
        router.push("/my-events");
        return;
      }

      // ── Single create / edit ─────────────────────────────────────────────
      const eventData = {
        ...baseEventData,
        startDate: values.startDate,
        endDate: values.endDate || values.startDate,
      };

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

  // ── Smart Fill ────────────────────────────────────────────────────────────
  function handleDraftApply(draft: EventDraft) {
    const textFields = [
      "title",
      "description",
      "startDate",
      "endDate",
      "startTime",
      "endTime",
      "address",
      "town",
      "place",
      "price",
      "ticketsLink",
      "fbLink",
    ] as const;

    for (const field of textFields) {
      const value = draft[field];
      if (value !== undefined && value !== "") {
        form.setValue(field as keyof FormValues, value, { shouldDirty: true });
      }
    }

    // Organizers — replace the full list when multiple hosts are scraped
    if (draft.organizers && draft.organizers.length > 0) {
      form.setValue(
        "organizers",
        draft.organizers.map((o) => ({ name: o.name, link: o.link ?? "" })),
        { shouldDirty: true },
      );
    } else if (draft.organizer || draft.organizerLink) {
      const currentOrganizers = form.getValues("organizers");
      if (currentOrganizers.length > 0) {
        if (draft.organizer) {
          form.setValue("organizers.0.name", draft.organizer, { shouldDirty: true });
        }
        if (draft.organizerLink) {
          form.setValue("organizers.0.link", draft.organizerLink, { shouldDirty: true });
        }
      } else {
        form.setValue(
          "organizers",
          [{ name: draft.organizer ?? "", link: draft.organizerLink ?? "" }],
          { shouldDirty: true },
        );
      }
    }

    // Scraper sources (Grabo, Ruse on the Danube) set clearOrganizerLink so
    // the profile website URL pre-filled in organizers[0].link gets removed —
    // those events belong to third parties, not the current user's profile.
    if (draft.clearOrganizerLink) {
      const currentOrganizers = form.getValues("organizers");
      if (currentOrganizers.length > 0) {
        form.setValue("organizers.0.link", "", { shouldDirty: true });
      }
    }

    // Match suggested tag names against available tags (case-insensitive)
    if (draft.suggestedTagNames && draft.suggestedTagNames.length > 0) {
      const currentTagIds = form.getValues("tagIds") ?? [];
      const matched = draft.suggestedTagNames
        .flatMap((name) => {
          const norm = name.toLowerCase().trim();
          const match = tags.find(
            (t) =>
              t.title.toLowerCase().includes(norm) ||
              norm.includes(t.title.toLowerCase()),
          );
          return match ? [match.id] : [];
        })
        .filter((id) => !currentTagIds.includes(id));

      if (matched.length > 0) {
        form.setValue("tagIds", [...currentTagIds, ...matched], {
          shouldDirty: true,
        });
      }
    }

    // Default end date to start when importer only provides one date
    if (draft.startDate && !draft.endDate) {
      form.setValue("endDate", draft.startDate, { shouldDirty: true });
    }

    // Prepend draft image to the images list (avoid duplicates)
    if (draft.image) {
      setImages((prev) => {
        if (prev.some((img) => img.storedPath === draft.image)) return prev;
        return [
          {
            id: crypto.randomUUID(),
            previewUrl: getEventImageUrl(draft.image!),
            storedPath: draft.image,
          },
          ...prev,
        ];
      });
    }
  }

  const isAdminUser = userId === process.env.NEXT_PUBLIC_ADMIN_USER_ID;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* ── Smart Fill ─────────────────────────────────────────────── */}
          <SmartFillPanel onApply={handleDraftApply} isAdmin={isAdminUser} />

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
                    <FormLabel>{t("title")}<RequiredMark /></FormLabel>
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
                    <FormLabel>{t("description")}<RequiredMark /></FormLabel>
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

              <FormField
                control={form.control}
                name="youtubeUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Video className="size-4" aria-hidden />
                      {t("youtubeUrl")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        inputMode="url"
                        placeholder={t("enterYoutubeUrl")}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-muted-foreground text-xs">
                      {t("youtubeUrlHint")}
                    </p>
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
              {/* Recurring toggle — only in create / duplicate mode */}
              {mode !== "edit" && (
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="isRecurring"
                    checked={isRecurring}
                    onCheckedChange={(v: boolean | "indeterminate") => {
                      const next = Boolean(v);
                      setIsRecurring(next);
                      if (!next) {
                        setRecurrencePeriodEnd("");
                      } else if (!recurrencePeriodEnd) {
                        const fallback =
                          form.getValues("endDate") || startDate || "";
                        if (fallback) setRecurrencePeriodEnd(fallback);
                      }
                    }}
                  />
                  <label
                    htmlFor="isRecurring"
                    className="flex cursor-pointer items-center gap-1.5 text-sm leading-none font-medium"
                  >
                    {t("recurringEvent")}
                  </label>
                </div>
              )}

              {/* Date pickers */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fromDate")}<RequiredMark /></FormLabel>
                      <FormControl>
                        <DatePopover
                          id={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder={t("pickDate")}
                          clearLabel={t("clearDate")}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isRecurring ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm leading-none font-medium">
                      {t("recurrenceSeriesEndDate")}
                    </label>
                    <DatePopover
                      id="recurrencePeriodEnd"
                      value={recurrencePeriodEnd}
                      onChange={setRecurrencePeriodEnd}
                      placeholder={t("pickDate")}
                      clearLabel={t("clearDate")}
                      disableBefore={startDate}
                      disabled={isSubmitting}
                    />
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("toDate")}</FormLabel>
                        <FormControl>
                          <DatePopover
                            id={field.name}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            placeholder={t("pickDate")}
                            clearLabel={t("clearDate")}
                            disableBefore={startDate}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Recurrence pattern + preview */}
              {isRecurring && (
                <div className="bg-muted/40 space-y-4 rounded-lg border p-4">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="recurrencePattern"
                      className="text-sm font-medium"
                    >
                      {t("recurrencePattern")}
                    </label>
                    <Select
                      value={recurrencePattern}
                      onValueChange={(v) => {
                        const next = v as RecurrencePattern;
                        setRecurrencePattern(next);
                        if (recurrenceUsesWeekdays(next) && startDate) {
                          setRecurrenceWeekdays((prev) =>
                            prev.length > 0
                              ? prev
                              : [weekdayFromDate(startDate)],
                          );
                        }
                      }}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="recurrencePattern" className="w-full sm:w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">
                          {t("recurrencePatternDaily")}
                        </SelectItem>
                        <SelectItem value="weekly">
                          {t("recurrencePatternWeekly")}
                        </SelectItem>
                        <SelectItem value="monthly">
                          {t("recurrencePatternMonthly")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {recurrenceUsesWeekdays(recurrencePattern) && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium">
                        {t("recurrenceWeekdays")}
                      </span>
                      <ToggleGroup
                        type="multiple"
                        variant="outline"
                        spacing={0}
                        value={recurrenceWeekdays.map(String)}
                        onValueChange={(values) =>
                          setRecurrenceWeekdays(values.map(Number))
                        }
                        disabled={isSubmitting}
                        className="w-full flex-wrap"
                        aria-label={t("recurrenceWeekdays")}
                      >
                        {WEEKDAY_ORDER.map((day) => (
                          <ToggleGroupItem
                            key={day}
                            value={String(day)}
                            className="min-w-10 flex-1 capitalize"
                            aria-label={weekdayLabels[day]}
                          >
                            {weekdayLabels[day]}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </div>
                  )}

                  {/* Occurrence count preview */}
                  {(() => {
                    if (!startDate || !recurrencePeriodEnd) return null;
                    const dates = generateOccurrenceDates(
                      startDate,
                      recurrencePattern,
                      recurrencePeriodEnd,
                      recurrenceWeekdays,
                    );
                    if (dates.length === 0) {
                      return (
                        <p className="text-muted-foreground text-sm">
                          {t("recurrenceNoOccurrences")}
                        </p>
                      );
                    }
                    const hitCap = dates.length >= MAX_OCCURRENCES;
                    return (
                      <div className="flex items-center gap-2">
                        <Badge variant={hitCap ? "destructive" : "secondary"}>
                          {hitCap
                            ? t("recurrenceMaxExceeded")
                            : t("recurrencePreview", { count: dates.length })}
                        </Badge>
                        {!hitCap && (
                          <span className="text-muted-foreground text-xs">
                            {dates[0]} → {dates[dates.length - 1]}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Time pickers */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fromTime")}<RequiredMark /></FormLabel>
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
                        <Input
                          type="time"
                          min={
                            startDate &&
                            endDate === startDate &&
                            startTime
                              ? startTime
                              : undefined
                          }
                          {...field}
                        />
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
            <CardContent variant="section" className="grid gap-3 md:grid-cols-3">

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("address")}<RequiredMark /></FormLabel>
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
            </CardContent>
          </Card>

          {/* ── Hosts ──────────────────────────────────────────────── */}
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
                          <FormLabel>
                            {t("organizerName")}
                            {index === 0 && <RequiredMark />}
                          </FormLabel>
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
            <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("price")}</FormLabel>
                    <div className="grid grid-cols-2 items-center gap-3">
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="text"
                          placeholder="10-20"
                          disabled={isFree}
                          {...field}
                        />
                      </FormControl>
                      <div className="flex items-center gap-2">
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
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-3 sm:grid-cols-2">
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
              </div>
            </CardContent>
          </Card>

          {/* ── Contact ─────────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Phone className="text-primary size-5" />
                  {t("contactInfo")}
                </CardTitle>
                {isAdminUser && (
                  <button
                    type="button"
                    onClick={() => {
                      form.setValue("phoneNumber", "", { shouldDirty: true });
                      form.setValue("email", "", { shouldDirty: true });
                    }}
                    className="text-muted-foreground hover:text-foreground text-xs underline"
                  >
                    {t("clearContacts")}
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent variant="section">
            <div className="grid gap-3 sm:grid-cols-2">
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
              </div>
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
                            <EventTag
                              key={tag.id}
                              title={tag.title}
                              label={localizedEventTagTitle(
                                tag.title,
                                eventTagLabels,
                              )}
                              size="md"
                              interactive
                              selected={isSelected}
                              onClick={() => {
                                const current = field.value ?? [];
                                field.onChange(
                                  isSelected
                                    ? current.filter((id) => id !== tag.id)
                                    : [...current, tag.id],
                                );
                              }}
                            />
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
          <div className="bg-background/80 sticky bottom-12 z-10 mt-8 flex items-center justify-end gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-md md:bottom-4">
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
              {t("cancel")}
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
