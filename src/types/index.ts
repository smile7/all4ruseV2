import { z } from "zod";

import {
  plainTextFromHtml,
  sanitizeEventDescription,
} from "~/lib/event-description-html";
import type { Tables } from "~/types/database";

// ─── Domain types ─────────────────────────────────────────────────────────────

export type Tag = {
  id: number;
  title: string;
};

// Matches the shape stored in events.organizers (JSON array)
export type Host = {
  name?: string;
  link?: string;
};

export type Event = Tables<"events"> & {
  tags?: Tag[];
};

// Direct alias so it stays in sync with generated types
export type Profile = Tables<"profiles">;
export type EventTag = Tables<"event_tags">;

// ─── Zod schemas ──────────────────────────────────────────────────────────────

export const getEventsParamsSchema = z.object({
  // Multi-tag filter: events must match ANY of the selected tag IDs.
  tagIds: z.array(z.number().int().positive()).optional(),
  search: z.string().trim().optional(),
  // Date range using overlap semantics:
  //   event.endDate >= from  AND  event.startDate <= to
  // This correctly includes multi-day events that span the selected range.
  from: z.string().optional(), // ISO date YYYY-MM-DD
  to: z.string().optional(),   // ISO date YYYY-MM-DD
  isFree: z.boolean().optional(),
  host: z.string().trim().optional(),
  place: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(12),
});

export type GetEventsParams = z.infer<typeof getEventsParamsSchema>;

export const createEventSchema = z.object({
  title: z.string().min(3, "Заглавието е задължително"),
  description: z
    .string()
    .refine(
      (html) =>
        plainTextFromHtml(sanitizeEventDescription(html)).length >= 10,
      { message: "Описанието е задължително" },
    ),
  startDate: z.string().min(1, "Начална дата е задължителна"),
  endDate: z.string().min(1, "Крайна дата е задължителна"),
  startTime: z.string().min(1, "Начален час е задължителен"),
  endTime: z.string().optional(),
  address: z.string().min(3, "Адресът е задължителен"),
  town: z.string().min(2, "Градът е задължителен"),
  place: z.string().optional(),
  price: z.string().optional(),
  ticketsLink: z.string().url("Невалиден линк").optional().or(z.literal("")),
  fbLink: z.string().url("Невалиден линк").optional().or(z.literal("")),
  phoneNumber: z.string().optional(),
  email: z.string().email("Невалиден имейл").optional().or(z.literal("")),
  image: z.string().optional(),
  images: z.array(z.unknown()).optional(),
  organizers: z.array(z.unknown()).optional(),
  isEventPremium: z.boolean().optional(),
  isEventCancelled: z.boolean().optional(),
  isSoldOut: z.boolean().optional(),
  tagIds: z.array(z.number().int().positive()).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export type UpdateEventInput = Partial<CreateEventInput>;

// ─── Profile schema ────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  full_name: z.string().max(100).optional().or(z.literal("")),
  username: z.string().max(50).optional().or(z.literal("")),
  bio: z.string().max(500).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  place: z.string().max(100).optional().or(z.literal("")),
  address_physical: z.string().max(200).optional().or(z.literal("")),
  email_to_show: z.string().email().optional().or(z.literal("")),
  name_to_show: z.string().max(100).optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  fb: z.string().url().optional().or(z.literal("")),
  instagram: z.string().url().optional().or(z.literal("")),
  tiktok: z.string().url().optional().or(z.literal("")),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
