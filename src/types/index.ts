import { z } from "zod";

import { LOCALES } from "~/constants";
import {
  ARTICLE_SLUG_PATTERN,
  isReservedArticleSlug,
} from "~/lib/article-slug";
import { plainTextFromHtml } from "~/lib/event-description-html";
import {
  USERNAME_PATTERN,
  USERNAME_VALIDATION_MESSAGE,
} from "~/lib/profile-username";
import { isOptionalWebUrl } from "~/lib/url-input";
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
export type Article = Tables<"articles">;

/** A published translation of the same article, used to build hreflang. */
export type ArticleSibling = {
  locale: string;
  slug: string;
};

// ─── Zod schemas ──────────────────────────────────────────────────────────────

export const getEventsParamsSchema = z.object({
  // Multi-tag filter: events must match ANY of the selected tag IDs.
  tagIds: z.array(z.number().int().positive()).optional(),
  search: z.string().trim().optional(),
  // Date range using overlap semantics:
  //   event.endDate >= from  AND  event.startDate <= to
  // This correctly includes multi-day events that span the selected range.
  from: z.string().optional(), // ISO date YYYY-MM-DD
  to: z.string().optional(), // ISO date YYYY-MM-DD
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
    .refine((html) => plainTextFromHtml(html).length >= 10, {
      message: "Описанието е задължително",
    }),
  startDate: z.string().min(1, "Начална дата е задължителна"),
  endDate: z.string().min(1, "Крайна дата е задължителна"),
  startTime: z.string().min(1, "Начален час е задължителен"),
  endTime: z.string().optional(),
  address: z.string().min(3, "Адресът е задължителен"),
  town: z.string().min(2, "Градът е задължителен"),
  place: z.string().optional(),
  price: z.string().optional(),
  ticketsLink: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => isOptionalWebUrl(val), { message: "Невалиден линк" }),
  fbLink: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => isOptionalWebUrl(val), { message: "Невалиден линк" }),
  youtubeUrl: z.string().optional().or(z.literal("")),
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
  username: z.string().regex(USERNAME_PATTERN, USERNAME_VALIDATION_MESSAGE),
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
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Невалиден цвят")
    .optional()
    .or(z.literal("")),
  show_saved_events: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ─── Articles („Още от Русе") ─────────────────────────────────────────────────

/**
 * Stored as stable keys — display names come from the `MoreFromRuse` messages,
 * so the vocabulary is never duplicated across the four locales.
 */
export const ARTICLE_CATEGORIES = [
  "landmarks",
  "food-drink",
  "things-to-do",
  "history-culture",
  "nature-walks",
  "practical",
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export const ARTICLE_STATUSES = ["draft", "published"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

/**
 * Fields required only to publish are enforced in `superRefine` against
 * `status`, so a half-written draft can still be saved.
 */
export const articleSchema = z
  .object({
    locale: z.enum(LOCALES),
    group_id: z.string().uuid().optional().or(z.literal("")),
    title: z
      .string()
      .trim()
      .min(10, "Заглавието трябва да е поне 10 символа")
      // 110 is the practical `headline` limit for Google's Article rich results.
      .max(110, "Заглавието трябва да е под 110 символа"),
    slug: z
      .string()
      .trim()
      .min(1, "URL адресът е задължителен")
      .max(80, "URL адресът трябва да е под 80 символа")
      .regex(ARTICLE_SLUG_PATTERN, "Само малки латински букви, цифри и тирета")
      .refine((slug) => !isReservedArticleSlug(slug), {
        message: "Този URL адрес е запазен",
      }),
    excerpt: z.string().trim().max(300, "Резюмето трябва да е под 300 символа"),
    meta_description: z
      .string()
      .trim()
      .max(160, "Мета описанието трябва да е под 160 символа")
      .optional()
      .or(z.literal("")),
    body_html: z.string(),
    hero_image: z.string().optional().or(z.literal("")),
    hero_image_alt: z
      .string()
      .trim()
      .max(160, "Alt текстът трябва да е под 160 символа")
      .optional()
      .or(z.literal("")),
    category: z.enum(ARTICLE_CATEGORIES).optional().or(z.literal("")),
    author_name: z
      .string()
      .trim()
      .max(100, "Името на автора трябва да е под 100 символа")
      .optional()
      .or(z.literal("")),
    is_sponsored: z.boolean(),
    sponsor_name: z
      .string()
      .trim()
      .max(100, "Името на спонсора трябва да е под 100 символа")
      .optional()
      .or(z.literal("")),
    sponsor_url: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine((val) => isOptionalWebUrl(val), { message: "Невалиден линк" }),
    status: z.enum(ARTICLE_STATUSES),
  })
  .superRefine((values, ctx) => {
    // A hero image without alt text is both an a11y failure and a lost
    // image-search signal, so it blocks saving regardless of status.
    if (values.hero_image && !values.hero_image_alt) {
      ctx.addIssue({
        code: "custom",
        path: ["hero_image_alt"],
        message: "Alt текстът е задължителен при качено изображение",
      });
    }

    if (values.is_sponsored && !values.sponsor_name) {
      ctx.addIssue({
        code: "custom",
        path: ["sponsor_name"],
        message: "Името на спонсора е задължително",
      });
    }

    if (values.status !== "published") return;

    if (values.excerpt.length < 60) {
      ctx.addIssue({
        code: "custom",
        path: ["excerpt"],
        message: "Резюмето трябва да е поне 60 символа за публикуване",
      });
    }

    if (plainTextFromHtml(values.body_html).length < 200) {
      ctx.addIssue({
        code: "custom",
        path: ["body_html"],
        message: "Текстът е твърде кратък за публикуване",
      });
    }

    if (!values.author_name) {
      ctx.addIssue({
        code: "custom",
        path: ["author_name"],
        message: "Авторът е задължителен за публикуване",
      });
    }
  });

export type ArticleFormValues = z.infer<typeof articleSchema>;

// ─── Smart Fill ───────────────────────────────────────────────────────────────

/**
 * Partial event data produced by any smart-fill source (Facebook import,
 * AI text prompt, or poster image upload). All fields are optional — only
 * the fields the source was able to parse are populated.
 *
 * `image` is a storage path relative to EVENTS_BUCKET (same convention as
 * the rest of the app). The image has already been re-uploaded to Supabase
 * Storage by the API route before this draft reaches the client, so the URL
 * is permanent and never a Facebook CDN token.
 */
export type EventDraft = {
  title?: string;
  /** HTML string — simple <p> paragraphs. Ready to set directly into TipTap. */
  description?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:MM (24-hour)
  endTime?: string; // HH:MM (24-hour)
  address?: string;
  town?: string;
  place?: string;
  price?: string;
  ticketsLink?: string;
  fbLink?: string;
  /** Storage path relative to EVENTS_BUCKET, e.g. "smart-fill/uuid.jpg" */
  image?: string;
  /** Organizer / host name — applied to organizers[0].name in the form. */
  organizer?: string;
  /** Organizer profile URL — applied to organizers[0].link in the form. */
  organizerLink?: string;
  /** Multiple hosts — replaces the organizers array in the form when provided. */
  organizers?: { name: string; link?: string }[];
  /**
   * Raw category/tag names from the source (e.g. "За деца", "Музика").
   * handleDraftApply matches these against available Tag titles to set tagIds.
   */
  suggestedTagNames?: string[];
  /**
   * When true, handleDraftApply will clear organizers[0].link.
   * Used by scrapers (Grabo, Ruse on the Danube) whose events are not owned
   * by the current user, so the profile website should not bleed through.
   */
  clearOrganizerLink?: boolean;
};
