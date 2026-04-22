import { z } from "zod";

import type { Tables } from "~/types/database";

// ─── Domain types ─────────────────────────────────────────────────────────────

export type Tag = {
  id: number;
  title: string;
};

export type Event = Tables<"events"> & {
  tags?: Tag[];
};

// Direct alias so it stays in sync with generated types
export type Profile = Tables<"profiles">;
export type EventTag = Tables<"event_tags">;

// ─── Zod schemas ──────────────────────────────────────────────────────────────

export const getEventsParamsSchema = z.object({
  tagId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
  startDate: z.string().optional(), // ISO date string YYYY-MM-DD
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(12),
});

export type GetEventsParams = z.infer<typeof getEventsParamsSchema>;

export const createEventSchema = z.object({
  title: z.string().min(3, "Заглавието е задължително"),
  description: z.string().min(10, "Описанието е задължително"),
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
