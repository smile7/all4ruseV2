# ARCHITECTURE — All4Ruse v2

## Overview

All4RuseV2 is an events discovery platform for Ruse, Bulgaria, written on the Next.js. The goal is a clean, readable codebase that is easy to extend — not an over-engineered one.

The reference project (`learning-module-agent-ui`) is used for inspiration on conventions: component shape, query hooks, form patterns, and styling. We borrow what fits naturally for a Next.js + Supabase app and leave the rest.

---

## Stack

| Concern                      | Choice                                 |
| ---------------------------- | -------------------------------------- |
| Framework                    | Next.js (App Router)                   |
| Language                     | TypeScript strict                      |
| Styling                      | Tailwind CSS v4                        |
| Components                   | shadcn/ui (add components as needed)   |
| Database + Auth              | Supabase                               |
| Server state                 | Server Components + Supabase (default) |
| Interactive data / mutations | TanStack Query v5 (where needed)       |
| Forms                        | react-hook-form + zod                  |
| Localization                 | next-intl                              |
| Icons                        | lucide-react                           |
| Toasts                       | sonner                                 |
| Dates                        | date-fns                               |

We add dependencies only when there is a clear need. Nothing is pre-installed "just in case."

---

## Pages

All pages live inside the `[locale]` segment so next-intl routing works out of the box. Visiting `all4ruse.com` redirects to `all4ruse.com/bg/` (Bulgarian default). The user can switch language from the header.

| URL                              | Page                 | Notes                                        |
| -------------------------------- | -------------------- | -------------------------------------------- |
| `/[locale]`                      | Upcoming events      | Home page — grid / calendar / map tabs       |
| `/[locale]/current`              | Current events       | Events happening right now                   |
| `/[locale]/past`                 | Past events          | Archive                                      |
| `/[locale]/[slug]`               | Event detail         | SSR                                          |
| `/[locale]/why-all4ruse`         | Why All4Ruse         | Static content page                          |
| `/[locale]/legal/cookies`        | Cookies policy       | Static                                       |
| `/[locale]/legal/gdpr`           | GDPR                 | Static                                       |
| `/[locale]/legal/privacy`        | Privacy policy       | Static                                       |
| `/[locale]/auth/login`           | Login                |                                              |
| `/[locale]/auth/signup`          | Sign up              |                                              |
| `/[locale]/auth/signup-success`  | Sign up success      |                                              |
| `/[locale]/auth/forgot-password` | Forgot password      |                                              |
| `/[locale]/auth/update-password` | Update password      | Requires session                             |
| `/[locale]/create-event`         | Create event         | Requires auth                                |
| `/[locale]/profile`              | Profile              | Requires auth                                |
| `/[locale]/my-events`            | My events            | Requires auth                                |
| `/[locale]/admin`                | Admin dashboard      | Admin role only                              |
| `/[locale]/admin/events`         | Admin event list     | Admin role only                              |
| `/[locale]/admin/events/new`     | Create event (admin) | Admin role only                              |
| `/[locale]/admin/events/[id]`    | Edit event           | Admin role only                              |
| `/[locale]/admin/tags`           | Manage tags          | Admin role only                              |
| `/[locale]/map`                  | Playgrounds & fitness map (V2) | Public read; admin-only add/edit/delete |
| `/auth/callback`                 | OAuth callback       | Outside `[locale]` — Supabase redirects here |

Events are grouped and filtered by **tags** (a separate `tags` table joined via `event_tags`).

---

## Folder Structure

```
src/
├── app/
│   ├── [locale]/                    # All user-facing pages live here
│   │   ├── layout.tsx               # Root layout for locale: Header, Footer, providers
│   │   ├── page.tsx                 # Home — upcoming events
│   │   ├── current/
│   │   │   └── page.tsx             # Current events
│   │   ├── past/
│   │   │   └── page.tsx             # Past events
│   │   ├── [slug]/
│   │   │   └── page.tsx             # Event detail
│   │   ├── why-all4ruse/
│   │   │   └── page.tsx
│   │   ├── legal/
│   │   │   ├── cookies/page.tsx
│   │   │   ├── gdpr/page.tsx
│   │   │   └── privacy/page.tsx
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── signup-success/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── update-password/page.tsx
│   │   ├── create-event/
│   │   │   └── page.tsx             # Requires auth
│   │   ├── profile/
│   │   │   └── page.tsx             # Requires auth
│   │   ├── my-events/
│   │   │   └── page.tsx             # Requires auth
│   │   └── admin/                   # Requires admin role
│   │       ├── layout.tsx           # Admin shell, role check
│   │       ├── page.tsx
│   │       ├── events/
│   │       │   ├── page.tsx
│   │       │   ├── new/page.tsx
│   │       │   └── [id]/page.tsx
│   │       └── tags/
│   │           └── page.tsx
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts             # Supabase OAuth callback (outside [locale])
│   ├── layout.tsx                   # Root: fonts, globals
│   ├── globals.css
│   └── not-found.tsx
│
├── components/
│   ├── ui/                          # shadcn primitives — added on demand
│   ├── layout/                      # Header, Footer, PageLayout
│   └── [Feature]/                   # One folder per feature component
│       ├── [Feature].tsx
│       └── index.ts
│
├── hooks/
│   └── query/                       # TanStack Query hooks — interactive + admin only
│       ├── events.ts                # useEvents (client filtering), mutations
│       ├── tags.ts                  # Admin tag management
│       └── index.ts
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Browser client
│   │   └── server.ts                # Server client (per-request)
│   ├── api/
│   │   ├── events.ts                # Typed Supabase query functions
│   │   ├── tags.ts
│   │   ├── profiles.ts
│   │   └── index.ts
│   └── utils.ts                     # cn(), normalizeError(), formatDate()
│
├── types/
│   ├── database.ts                  # Auto-generated by Supabase CLI
│   └── index.ts                     # Zod schemas + inferred types
│
├── i18n/
│   ├── messages/
│   │   ├── bg.json                  # Bulgarian — primary, written by hand
│   │   ├── en.json
│   │   ├── uk.json
│   │   └── ro.json
│   ├── request.ts
│   └── routing.ts
│
├── constants/
│   └── index.ts
│
└── middleware.ts                    # Locale detection + auth enforcement
```

`hooks/query/` holds TanStack Query hooks for interactive filtering and admin mutations only. Server Components fetch directly via `lib/api/` — no hook, no provider involved. We do not add `blocks/` unless a complex shared form emerges during development.

---

## Rendering Strategy

**Server Components are the default.** Data fetching happens on the server unless there is a concrete reason to move it to the client. This gives us SEO, fast first paint, and zero client-side loading spinners for content the user is just reading.

| Page                             | Default Strategy          | Primary Data fetching                                           |
| -------------------------------- | ------------------------- | --------------------------------------------------------------- |
| Upcoming / current / past events | SSR                       | Server Component → Supabase server client                       |
| Event detail `[slug]`            | SSR                       | Server Component → Supabase public server client                |
| Why All4Ruse, legal pages        | Static                    | No data fetching                                                |
| Profile, my events, create event | SSR                       | Server Component reads session + data                           |
| Admin pages                      | SSR + client interactions | Server Component for initial load; TanStack Query for mutations |
| Auth pages                       | Client-only               | Supabase browser client directly                                |

These are default route-level strategies. Individual client components or dynamic imports may still be used inside a route when interactivity or browser-only behavior is needed.

### When TanStack Query is used

TanStack Query is not the global data layer. It is used in three specific situations:

1. **Client-side filtering and search on the public listing.** When a visitor filters by tag, date, or searches by title the results must update without a page reload. TanStack Query handles this with `placeholderData: keepPreviousData` for smooth transitions.

2. **All admin mutations.** Creating, editing, and deleting events, managing tags, toggling visibility — these are all mutations with `onSettled → invalidateQueries`. TanStack Query is the right tool here.

3. **Admin list pages that refetch after mutations.** The admin events table needs to reflect changes immediately after a save or delete. TanStack Query's cache invalidation handles this cleanly.

Everywhere else — Server Components fetch directly and render. No hook, no cache, no provider needed.

### The initialData bridge (event listing pages)

The upcoming / current / past events pages are SSR but filters (tag, date range, search) are interactive. The pattern is:

```
page.tsx (Server Component)
  → fetches events with default params via server Supabase client
  → passes data as initialData to EventsList (Client Component)
      → EventsList renders immediately with server data (no loading flash)
      → when the user changes a filter, useEvents() takes over for that request only
```

---

## Supabase Integration

### Type generation

Database types are always auto-generated — never hand-written:

```bash
npx supabase gen types typescript \
  --project-id $SUPABASE_PROJECT_ID \
  --schema public \
  > src/types/database.ts
```

Add this as `npm run db:types`. Run it after any schema change.

### Clients

```typescript
// src/lib/supabase/client.ts — used in Client Components and hooks
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "~/types/database";

export function getSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

```typescript
// src/lib/supabase/server.ts — used in Server Components, layouts, middleware
import { createServerClient as createClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "~/types/database";

export async function createServerClient() {
  const cookieStore = await cookies();

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
}
```

---

## Data Layer

Each domain has a typed object of plain async functions that wrap Supabase queries. This mirrors the `learningApi` pattern from the reference — a readable named object with one method per operation.

The Supabase client is passed as the first argument so the same functions work from both Server Components and client hooks, without conditionals inside the function.

```typescript
// src/lib/api/events.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";
import type {
  Event,
  GetEventsParamsType,
  CreateEventSchemaType,
} from "~/types";

type Client = SupabaseClient<Database>;

export const eventsApi = {
  async getEvents(
    client: Client,
    params: GetEventsParamsType,
  ): Promise<Event[]> {
    let query = client
      .from("events")
      .select("*, event_tags(tag_id, tags(*))")
      .eq("isEventActive", true)
      .order("startDate", { ascending: true });

    if (params.tagId) query = query.eq("event_tags.tag_id", params.tagId);
    if (params.from) query = query.gte("startDate", params.from);
    if (params.to) query = query.lte("startDate", params.to);
    if (params.search) query = query.ilike("title", `%${params.search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getEventBySlug(client: Client, slug: string): Promise<Event> {
    const { data, error } = await client
      .from("events")
      .select("*, event_tags(tag_id, tags(*))")
      .eq("slug", slug)
      .single();

    if (error) throw error;
    return data;
  },

  async createEvent(
    client: Client,
    body: CreateEventSchemaType,
  ): Promise<Event> {
    const { data, error } = await client
      .from("events")
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateEvent(
    client: Client,
    id: number,
    body: Partial<CreateEventSchemaType>,
  ): Promise<Event> {
    const { data, error } = await client
      .from("events")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteEvent(client: Client, id: number): Promise<void> {
    const { error } = await client.from("events").delete().eq("id", id);
    if (error) throw error;
  },
};
```

---

## TanStack Query

Used only for interactive client-side data and mutations. Not used for pages or data that Server Components can handle.

### Setup

`QueryClientProvider` lives in the root layout so the client is available anywhere it is needed. The `QueryClient` is a good place to set shared defaults:

```typescript
// app/layout.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Hook pattern

Private query key factory at the top of the file, hooks below. One file per domain under `hooks/query/`. Same shape as the reference project.

```typescript
// src/hooks/query/events.ts
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { eventsApi } from "~/lib/api";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";
import type {
  CreateEventSchemaType,
  Event,
  GetEventsParamsType,
} from "~/types";

const eventQueryKeys = {
  all: () => ["events"],
  byParams: (params: GetEventsParamsType) => [...eventQueryKeys.all(), params],
};

// Used only on the public listing when filters are active.
// Receives initialData from the Server Component on first render.
export function useEvents(
  params: GetEventsParamsType,
  options?: { initialData?: Event[] },
) {
  const supabase = getSupabaseBrowserClient();

  return useQuery({
    queryKey: eventQueryKeys.byParams(params),
    queryFn: () => eventsApi.getEvents(supabase, params),
    placeholderData: keepPreviousData,
    ...options,
  });
}

// Used in admin — creates an event and invalidates the list.
export function useCreateEvent() {
  const supabase = getSupabaseBrowserClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateEventSchemaType) =>
      eventsApi.createEvent(supabase, body),
    onSuccess: () => {
      toast.success("Event created");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.all() });
    },
  });
}
```

Query hooks are only imported in Client Components that actually need them. Server Component pages do not import from `~/hooks/query`.

---

## Authentication

Supabase Auth with HTTP-only cookies via `@supabase/ssr`.

Middleware is used pragmatically:

- refresh the auth session
- protect clearly private routes such as `/admin`
- coordinate auth with locale routing if needed

We should avoid putting unnecessary auth logic in middleware for every route, since `supabase.auth.getUser()` performs a network validation. Public pages should remain as lightweight as possible.
This middleware should stay focused on route protection and session sync, not become a general-purpose app gate for every page.

```typescript
// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const isAdminRoute =
    request.nextUrl.pathname.startsWith(`/${locale}/admin`) ||
    request.nextUrl.pathname.startsWith("/admin");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAdminRoute && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

The auth callback route exchanges the code Supabase sends back after OAuth or magic link:

```typescript
// src/app/auth/callback/route.ts
import { createServerClient } from "~/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/`);
}
```

---

## Forms

Same pattern as the reference. A `block` component owns the form logic. It takes a zod schema, default values, and an `onSubmit` handler. It renders using `components/ui/form.tsx` and whatever shadcn inputs are needed.

```typescript
// src/blocks/EventForm.tsx
"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodTypeAny } from "zod";

import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import type { CreateEventSchemaType } from "~/types";

type EventFormProps = {
  defaultValues: CreateEventSchemaType;
  schema: ZodTypeAny;
  isPending?: boolean;
  onSubmit: SubmitHandler<CreateEventSchemaType>;
};

export function EventForm({ defaultValues, schema, isPending, onSubmit }: EventFormProps) {
  const form = useForm<CreateEventSchemaType>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>Save</Button>
      </form>
    </Form>
  );
}
```

Pages call the block and pass the mutation:

```typescript
const { mutate, isPending } = useCreateEvent();

<EventForm
  defaultValues={defaults}
  schema={createEventSchema}
  isPending={isPending}
  onSubmit={(values) => mutate(values)}
/>
```

---

## Types and Schemas

`src/types/database.ts` is auto-generated. `src/types/index.ts` is where all Zod schemas and domain types live — nothing is hand-written to match the database shape.

```typescript
// src/types/index.ts
import { z } from "zod";
import type { Database } from "./database";

// Raw DB row types — always from generated file
export type DbEvent = Database["public"]["Tables"]["events"]["Row"];
export type DbTag = Database["public"]["Tables"]["tags"]["Row"];
export type DbProfile = Database["public"]["Tables"]["profiles"]["Row"];

// Domain type with relations
export type Event = DbEvent & { tags: DbTag[] };
export type Tag = DbTag;
export type Profile = DbProfile;

// Schemas for forms and API params
export const createEventSchema = z.object({
  title: z.string().min(2).max(500),
  description: z.string().min(1),
  startDate: z.string().date(),
  endDate: z.string().date(),
  startTime: z.string(),
  address: z.string().min(1),
  town: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  price: z.string().optional(),
  ticketsLink: z.string().url().optional().or(z.literal("")),
  fbLink: z.string().url().optional().or(z.literal("")),
  place: z.string().optional(),
  isEventActive: z.boolean(),
  isEventPremium: z.boolean().optional(),
  isEventCancelled: z.boolean().optional(),
  isSoldOut: z.boolean().optional(),
});

export type CreateEventSchemaType = z.infer<typeof createEventSchema>;

export const getEventsParamsSchema = z.object({
  tagId: z.number().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
});

export type GetEventsParamsType = z.infer<typeof getEventsParamsSchema>;
```

---

## Components

Shadcn components are added with the CLI as they are needed — `npx shadcn add button`, `npx shadcn add form`, etc. They live in `components/ui/`.

Feature components live in `components/[Feature]/[Feature].tsx` with an `index.ts` barrel, same as the reference.

```typescript
// src/components/EventCard/EventCard.tsx
import { cn } from "~/lib/utils";
import type { Event } from "~/types";

type EventCardProps = {
  event: Event;
  className?: string;
};

export function EventCard({ event, className }: EventCardProps) {
  return (
    <article className={cn("rounded-lg border bg-card p-4", className)}>
      <h2 className="text-lg font-semibold">{event.title}</h2>
    </article>
  );
}
```

```typescript
// src/components/EventCard/index.ts
export { EventCard } from "./EventCard";
```

---

## Styling and Theming

### Theme

Theme is sourced from [tweakcn "dashboard"](https://tweakcn.com/themes/cmn1fszda000004l17tjz1g0d). Colors use `oklch` which Tailwind v4 supports natively — no HSL conversion needed.

**Fonts:** Comfortaa (sans-serif, subsets: latin + cyrillic), JetBrains Mono (mono) — loaded via `next/font/google`.

**Primary color:** `oklch(0.6397 0.1720 36.4421)` — a warm orange tone.

### globals.css

```css
/* src/app/globals.css */
@import "tailwindcss";
@plugin "tailwindcss-animate";

@custom-variant dark (&:is(.dark *));

@theme {
  --font-sans: var(--font-comfortaa), sans-serif;
  --font-mono: var(--font-jetbrains-mono), monospace;

  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

@layer base {
  :root {
    --background: oklch(0.9383 0.0042 236.4993);
    --foreground: oklch(0.3211 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.3211 0 0);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.3211 0 0);
    --primary: oklch(0.6397 0.172 36.4421);
    --primary-foreground: oklch(1 0 0);
    --secondary: oklch(0.967 0.0029 264.5419);
    --secondary-foreground: oklch(0.4461 0.0263 256.8018);
    --muted: oklch(0.9846 0.0017 247.8389);
    --muted-foreground: oklch(0.551 0.0234 264.3637);
    --accent: oklch(0.9119 0.0222 243.8174);
    --accent-foreground: oklch(0.3791 0.1378 265.5222);
    --destructive: oklch(0.6368 0.2078 25.3313);
    --destructive-foreground: oklch(1 0 0);
    --border: oklch(0.9022 0.0052 247.8822);
    --input: oklch(0.97 0.0029 264.542);
    --ring: oklch(0.6397 0.172 36.4421);
    --radius: 0.75rem;
    --sidebar: oklch(0.903 0.0046 258.3257);
    --sidebar-foreground: oklch(0.3211 0 0);
    --sidebar-primary: oklch(0.6397 0.172 36.4421);
    --sidebar-primary-foreground: oklch(1 0 0);
    --sidebar-accent: oklch(0.9119 0.0222 243.8174);
    --sidebar-accent-foreground: oklch(0.3791 0.1378 265.5222);
    --sidebar-border: oklch(0.9276 0.0058 264.5313);
    --sidebar-ring: oklch(0.6397 0.172 36.4421);
  }

  .dark {
    --background: oklch(0.2598 0.0306 262.6666);
    --foreground: oklch(0.9219 0 0);
    --card: oklch(0.3106 0.0301 268.6365);
    --card-foreground: oklch(0.9219 0 0);
    --popover: oklch(0.29 0.0249 268.3986);
    --popover-foreground: oklch(0.9219 0 0);
    --primary: oklch(0.6397 0.172 36.4421);
    --primary-foreground: oklch(1 0 0);
    --secondary: oklch(0.3095 0.0266 266.7132);
    --secondary-foreground: oklch(0.9219 0 0);
    --muted: oklch(0.3095 0.0266 266.7132);
    --muted-foreground: oklch(0.7155 0 0);
    --accent: oklch(0.338 0.0589 267.5867);
    --accent-foreground: oklch(0.8823 0.0571 254.1284);
    --destructive: oklch(0.6368 0.2078 25.3313);
    --destructive-foreground: oklch(1 0 0);
    --border: oklch(0.3843 0.0301 269.7337);
    --input: oklch(0.3843 0.0301 269.7337);
    --ring: oklch(0.6397 0.172 36.4421);
    --sidebar: oklch(0.31 0.0283 267.7408);
    --sidebar-foreground: oklch(0.9219 0 0);
    --sidebar-primary: oklch(0.6397 0.172 36.4421);
    --sidebar-primary-foreground: oklch(1 0 0);
    --sidebar-accent: oklch(0.338 0.0589 267.5867);
    --sidebar-accent-foreground: oklch(0.8823 0.0571 254.1284);
    --sidebar-border: oklch(0.3843 0.0301 269.7337);
    --sidebar-ring: oklch(0.6397 0.172 36.4421);
  }
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground font-sans;
  }
  html {
    scroll-behavior: smooth;
  }
}
```

Dark mode toggle follows the same `ThemeContext` pattern as the reference (stores preference in `localStorage`, applies class on `document.documentElement`).

### View Transitions

Next.js App Router supports the [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) via `unstable_ViewTransition`. This is used to animate the event image expanding from the card into the detail page when the user navigates.

The pattern is:

- On `EventCard`, the event image gets `style={{ viewTransitionName: \`event-image-${event.id}\` }}`.
- On the event detail page, the hero image gets the same `viewTransitionName`.
- The browser morphs between the two automatically — no animation CSS needed for the basic expand effect.
- Additional cross-page transitions (fade, slide) can be layered with `::view-transition-*` CSS.

Enable in `next.config.ts`:

```typescript
const nextConfig = {
  experimental: {
    viewTransition: true,
  },
};
```

Utility function:

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred.";
}
```

---

## Localization

**Four languages:** Bulgarian (`bg`) is the primary language and the only one written by hand. English (`en`), Ukrainian (`uk`), and Romanian (`ro`) are derived.

**What goes in message files:** UI strings only — labels, button text, navigation, common phrases, error messages, static page copy. Four JSON files under `src/i18n/messages/`.

**What uses Google Translate:** Event content — `title`, `description`, and other free-text fields entered by admins. These are translated on demand via the Google Cloud Translation API and cached. The translation is stored alongside the event in the database (e.g. a `translations` JSONB column or a separate `event_translations` table to be designed when the feature is built).

### next-intl setup

`next-intl` integrates with App Router via its server utilities and has no client-side overhead for static strings.

```typescript
// Server Component
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("home");
  return <h1>{t("title")}</h1>;
}
```

```typescript
// Client Component
import { useTranslations } from "next-intl";

export function SearchInput() {
  const t = useTranslations("common");
  return <Input placeholder={t("search")} />;
}
```

Message files stay small and focused. If a string is part of dynamic user content (event title, description, organizer info), it does not belong in the message file — it is translated via the API.

---

## Code Conventions

These follow the reference project.

**Path alias:** `~/` → `src/`. All imports use `~/`, never upward relative paths.

**Import order** (enforced by `eslint-plugin-simple-import-sort`):

1. React / Next.js
2. Third-party packages
3. Internal `~/` imports
4. Relative imports (same module only)

**Naming:**

- Components and their files: `PascalCase`
- Hooks: `use` prefix, `camelCase`
- API objects: `camelCase` + `Api` suffix (e.g. `eventsApi`)
- Query key objects: `camelCase` + `QueryKeys` suffix (e.g. `eventQueryKeys`)
- Zod schemas: `camelCase` + `Schema` suffix
- Inferred types from schemas: `PascalCase` + `SchemaType` suffix
- Domain entity types: plain `PascalCase` (e.g. `Event`, `Tag`)

**TypeScript:**

- Strict mode. No `any`. Use `unknown` when needed.
- `type` not `interface`.
- Types from `z.infer` — never duplicated by hand.

**Components:**

- One named export per file.
- Every component folder has an `index.ts` barrel.
- No default exports except Next.js pages and layouts (framework requirement).
- `cn()` for all class merging.

---

## Events Map View (listing tab)

A third view on the **upcoming events home list** (`/[locale]`): Grid · Calendar · Map. It is **not** a new route and it is **not** the playgrounds/fitness map at `/[locale]/map` (see the next section). Past events are never geocoded or shown on this map. `/current` and `/past` stay grid-only, same as calendar today.

This feature has two halves that must stay separate:

1. **Coordinates on `events`** — server-side Google Geocoding + Places, stored as `lat` / `lng`.
2. **The public map widget** — Google Maps JavaScript API via the existing `@react-google-maps/api` dependency. The event detail page keeps the **Embed iframe** (unlimited free). The listing map is a real JS map so it can show many pins.

Google is not unlimited-free. Dynamic Maps, Geocoding, and Autocomplete each have **10,000 free events/month**. After that, Dynamic Maps is $7 / 1,000 loads. At All4Ruse volume (opt-in tab, one city) this stays $0. Leaflet + OSM is the only $0-forever option; we are not using it because the site already has a Google key, Maps JS is already enabled with billing, Embed is already on event pages, and Bulgarian POI quality is better. Do not add a second map library.

### Locked decisions

| Topic | Decision |
| --- | --- |
| Where it lives | Home upcoming list only (`ActiveEventsList`). New tab, not a new URL. |
| Past events | Out. No backfill, no pins, no map tab on `/past`. |
| Filters | Map **respects** current filters. Do not kick the user back to grid (calendar still does that). |
| Failed geocode | `lat`/`lng` stay `null`. Event still publishes. No fake pin on the city center. |
| Outliers | A result more than 40 km from Ruse center is treated as failure (`null`). Do not zoom the map out to Sofia. |
| Coarse results | A result whose Google viewport spans more than 5 km is treated as failure. Ruse itself spans ~15 km, so a settlement-centroid fallback would pin the event on an arbitrary street. Village centroids stay under the threshold and are kept. |
| Stacked venues | One marker per venue, not per event (`groupEventsByCoords`), labelled with the event count when it holds more than one. Markers at identical coords otherwise stack and only the top one is clickable. Clustering is still required on top of that, and cluster bubbles count events rather than venues via the `calculator` prop. |
| Pin popup | Title, date, link to the event page, for every event at that venue. Not a full `EventCard`. Maps JS builds the bubble outside React with light-mode chrome, so it is rethemed with the popover tokens in `globals.css` — verify it after a Maps JS version bump. |
| Mobile | In-page view that fills remaining viewport (same height measurement as calendar). **Persist** the map tab in `localStorage` on mobile — unlike calendar, which is a one-shot overlay. |
| Re-geocode | Only when `address`, `place`, or `town` change. Unrelated edits (title, dates, image) must not call Google. |
| Manual pin | `coords_source = 'manual'` is kept on unrelated saves. If location fields change, re-geocode and clear the manual flag — the old pin is stale. |
| Venues table | Not in this phase. Coords live on `events`. Recurring series geocode once and copy. |
| Map library | Google Maps JavaScript via `@react-google-maps/api` (already in `package.json`). Lazy-load so the home grid does not pay a map load. |
| Geocoding | Google Geocoding API + Places Autocomplete/Details, **server-only** (`GOOGLE_MAPS_GEOCODING_API_KEY`). |
| Cookies | Same vendor as the event-detail embed. No new cookie category. Lazy-load Maps JS only when the map tab (or form preview) opens. |
| Geolocation | Change `Permissions-Policy` in `next.config.ts` from `geolocation=()` (blocked) to `geolocation=(self)`. The map offers an opt-in “Show my location” button that places a transient blue dot — no proximity filtering, no data stored. "Near me" distance-based filtering is still deferred. |
| Default center | Ruse. Never fitBounds to the whole country because of one bad pin. |

### Data model

Add nullable coordinates on `events`. Do not make them required — scraped and incomplete addresses will fail.

```sql
-- supabase/migrations/20260814_events_lat_lng.sql

alter table public.events
  add column lat double precision,
  add column lng double precision,
  add column coords_source text;

alter table public.events
  add constraint events_coords_source_check
  check (coords_source is null or coords_source in ('geocode', 'places', 'manual'));

alter table public.events
  add constraint events_coords_pair_check
  check (
    (lat is null and lng is null and coords_source is null)
    or
    (lat is not null and lng is not null and coords_source is not null)
  );

comment on column public.events.lat is 'WGS84 latitude. Null when geocoding failed or was never attempted.';
comment on column public.events.lng is 'WGS84 longitude. Null when geocoding failed or was never attempted.';
comment on column public.events.coords_source is 'geocode = address lookup; places = autocomplete pick; manual = creator/admin dragged the pin.';
```

RLS: no extra policies. `lat`/`lng` are as public as `address`. Event owners already `insert`/`update` their own rows; they may write these columns the same way. The app still obtains values from our geocode API rather than letting the form invent numbers, except for a manual drag.

After the migration: `npm run db:types`.

`EventWriteInput` in `src/lib/api/events.ts` gains optional `lat`, `lng`, `coords_source`. Zod on the public create schema does **not** require them — the server/form fills them.

### Ruse geographic constants

Single source of truth: `src/lib/geocode/ruse.ts`.

- Center: `43.8486, 25.9536` (city center).
- Max accepted distance: **40 km** (Haversine). Covers province villages that host events (Бръшлен and Чилнов are the furthest at ~37 km) and still rejects Бяла at 46 km, the town Google falls back to on ambiguous addresses. Raising this further starts accepting Бяла.
- Google search bias box: **15 km**, deliberately tighter than the accepted radius, so a street lookup prefers the Ruse one over a same-named street in a village. `bounds` is only a bias — Google returns results outside it, so `isInsideRuse` is what actually enforces the radius.
- Default map zoom: 13. Min zoom 10 (low enough to fit the whole accepted radius), max zoom 18.
- Dark theme: a small Google `styles` array (or a Cloud map ID later). Do not leave a white map on a dark page.
- Hide Google's own POIs and transit labels in both themes (`googleMapStyles` in `map-styles.ts`). Park fills stay; cafe/shop/landmark icons must not compete with All4Ruse pins. `clickableIcons: false` is not enough — those icons still draw.

### Geocoding (server-only)

**Never geocode in the browser. Never geocode when the map tab opens.**

Package layout:

```
src/lib/geocode/
  ruse.ts          # center, max distance, isInsideRuse()
  query.ts         # buildGeocodeQuery(), expandAddressAbbreviations()
  google.ts        # geocodeAddress(), placeAutocomplete(), placeDetails()
  index.ts
```

`buildGeocodeQuery` joins non-empty `place`, `address`, `town`, then appends `България` if missing. Always bias with `region=bg`.

`geocodeAddress` tries up to four queries, stopping at the first accepted result. Each step drops a known source of bad matches, and later steps only run when the earlier ones returned nothing or were rejected:

1. `place, address, town` as typed.
2. The same with abbreviations spelled out. Google reads `пл.` as `ул.` and matches a same-named street in another town. Expansion is retry-only because expanding `ул.` eagerly downgrades some exact addresses to the street centerline.
3. `address, town` — freeform place names hijack the match. `градинката пред Паметника на Сръбско-българската война` resolves to **Serbia**.
4. Step 3 with abbreviations expanded.

Never expand `с.` — it is also a middle initial, and `Георги С. Раковски` becomes a different street.

Do not add `components=country:BG` as a guard. It looks like a stronger filter than the bounds bias but returns `ZERO_RESULTS` for addresses that currently work (`Кея Русе`).

`geocodeAddress` calls Google Geocoding JSON:

- `region=bg`
- `bounds` around Ruse
- take the first result
- if `isInsideRuse` fails → return `{ lat: null, lng: null, source: null }`
- if HTTP/API error → same null result, log once, **do not throw into the create-event flow**

Places (autocomplete uses **session tokens** to avoid per-request billing):

- `placeAutocomplete(input, sessionToken)` → suggestions (Ruse-biased, country `BG`). Pass the same session token on every keystroke in the same "session" (input open → pick or dismiss).
- `placeDetails(placeId, sessionToken)` → formatted address parts + lat/lng. Passing the same session token as autocomplete collapses the entire interaction into a single **Autocomplete Session Usage** event, which Google bills as unlimited free. A new session token must be generated after each pick or after the input is dismissed without a pick.
- If outside Ruse → null coords.

API routes (auth required for writes/lookups used by the form; listing never calls these). Any logged-in user can call them, so they share a **Sofia-day cap of 80 Google-backed requests** per user (`consume_geocode_call`). `ADMIN_USER_ID` bypasses the cap. Over-limit returns 429; save still proceeds with null coords.

| Route | Purpose |
| --- | --- |
| `POST /api/geocode` | Body `{ address, place, town }` → `{ lat, lng, source: "geocode" }` or nulls. Used on save when the user typed a free-text address. |
| `GET /api/geocode/suggest?q=` | Places Autocomplete. |
| `GET /api/geocode/place?id=` | Place Details after a suggestion is picked. |
| `POST /api/admin/geocode-upcoming` | Admin-only backfill. Upcoming rows with null coords, sequential, skip past. Overlapping runs return 409. |

Env: **`GOOGLE_MAPS_GEOCODING_API_KEY`** — server-only, never `NEXT_PUBLIC_`. Enable Geocoding API and Places API (New) on that key. Do not reuse `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (that key is already in the browser for the detail embed). Vercel IPs are dynamic, so restrict the server key by API type, not by IP.

If the server key is missing, create/update still succeeds with null coords. Log a warning. Do not crash the form.

### When coordinates are written

**Create (single and recurring)** — `EventForm` before insert:

1. If the user picked a Place suggestion this session, use those coords (`source: "places"`).
2. Else `POST /api/geocode`. Await it. On null/error, insert with null coords.
3. Recurring: geocode **once**, pass the same `lat`/`lng`/`coords_source` into every occurrence (`createRecurringEvents`).

**Update** — `EventForm` receives `initialData` (the event as loaded from the server). At submit time, compare `initialData.address` / `.place` / `.town` (trimmed, case-insensitive) against the current form values to decide whether location changed:

- Unchanged + existing coords → pass `initialData.lat` / `initialData.lng` / `initialData.coords_source` through unchanged. No Google call.
- Unchanged + `coords_source === "manual"` → pass manual coords through unchanged.
- Changed → geocode again (or use the new Places pick). This intentionally overwrites a previous manual pin because the old coords are now stale.

**Smart fill / scrape** — no extra work. They only fill the form; geocoding runs on save.

**Backfill** — upcoming only (`endDate >= today` in Europe/Sofia), `lat is null`, sequential with a **200 ms delay** between Google calls. Skip rows whose query is empty or consists only of whitespace. Do not touch past events even if they have addresses. Missing `GOOGLE_MAPS_GEOCODING_API_KEY` is a hard fail (HTTP 503 / script exit 1) — no silent partial success. **First run:** `npm run geocode:upcoming` (service-role client). The HTTP route can 504 on Vercel Hobby (`maxDuration = 300` only helps Pro) and rejects overlapping POSTs with 409 via a Postgres advisory lock.

### Event form UX

Keep the three text fields (`address`, `place`, `town`). Address becomes an autocomplete input:

- Generate a session token when the address input is focused (one token per "session").
- Debounced `GET /api/geocode/suggest?q=&sessionToken=` — pass the session token on every suggest call.
- Picking a suggestion calls `GET /api/geocode/place?id=&sessionToken=` with the **same token** — this collapses the whole interaction into one free billing event.
- Generate a fresh session token after a pick, or after the input is dismissed without a pick.
- Picking fills address (and town/place when Place Details provides them) and stores coords in form state (`source: "places"`).
- Typing after a pick clears the stored Places coords so save falls back to geocoding the new text. Town/place keystrokes clear the Places stash only — they do not hide an existing pin preview.
- Autocomplete is a progressive enhancement. Paste/scrape still works.

On edit, show geocode status under the location card (all 4 locales):

- On the map
- Could not place on the map (with a Retry button that calls `POST /api/geocode`)
- Not attempted (legacy row not yet backfilled)

Optional but in this phase: a small Google Map preview on edit when coords exist. Dragging the pin sets `coords_source: "manual"`. Hidden when coords are null. Lazy-load the same Maps JS loader as the listing.

My events (`EventCard` with `showManageActions`): a quiet status for upcoming rows only — mapped / missing. Past rows: no status.

There is no in-app admin events table; do not invent one. Status lives on the form and on My events.

### Public map UI

Follow the calendar pattern: lazy `dynamic(..., { ssr: false })` so Maps JS is not in the home bundle and does not count as a map load until the user opens the tab.

```
src/components/EventsMap/
  EventsMapView.tsx     # client GoogleMap, MarkerClusterer, InfoWindow
  index.ts
```

Use `@react-google-maps/api` (`GoogleMap`). For clustering, import `MarkerClusterer` from `@react-google-maps/marker-clusterer` (already a dep at v2.20.0). Restrict pan with `restriction.latLngBounds` around Ruse.

**Shared Maps JS loader** — `@react-google-maps/api` errors if `useJsApiLoader` is mounted in two places at once (the listing map and the form pin preview can both be visible). Call `useJsApiLoader` exactly once — in `ActiveEventsList` or a `GoogleMapsProvider` wrapper — and pass the `isLoaded` flag down as a prop to `EventsMapView` and the form preview. Never call `useJsApiLoader` inside both components independently.

**Map tab icon** — `Map` from `lucide-react` (already in the project). Grid: `LayoutGrid`, calendar: `CalendarDays`, map: `Map`.

`EventsList` / `useViewPreference`:

- `ViewPreference = "grid" | "calendar" | "map"`. Update the localStorage guard in `useViewPreference` — the current check `stored === "grid" || stored === "calendar"` silently drops `"map"`, so the tab preference never restores. Add `|| stored === "map"`.
- Third `TabsTrigger` with the `Map` icon
- `view === "map"` → `EventsMapView` inside the same `calendarSlotRef` height slot
- Reuse the existing remaining-viewport measurement when `view === "calendar" || view === "map"`. Update the cleanup condition in the height-measurement `useEffect` from `view !== "calendar"` to `view !== "calendar" && view !== "map"` — otherwise switching to the map tab resets the height before the map renders.
- Persist `"map"` on mobile
- **Remove** the “filters → force grid” effect for map. Keep it for calendar only.

**Map data scope — today by default.**
The `events` array from `useActiveEvents` (all upcoming, already user-filtered) is too broad for a map. The map derives its own subset client-side:

- **Default (no active date filter):** events where `startDate <= today AND endDate >= today`. This includes ongoing multi-day events. No extra fetch.
- **Active date filter (`filters.from` or `filters.to`):** use those dates directly — the user chose a range, respect it.

From that subset, split into two groups:

1. **Events with `lat` + `lng`** — plotted as pins.
2. **Events without coords** — displayed in a compact list **below the map** under a heading "X събития нямат локация на картата". Each row shows the event title and date as a link to the event page. Not a full `EventCard`.

Events in the fetched array that are **not** in today’s scope (future dates, no active date filter) are simply absent from both groups — no note needed, it is expected that the map shows today.

**Date scope label.** A visible label above or inside the map shows what time window is active:

- Default: “Събитията днес, {date}” (e.g. “Събитията днес, 14 август 2026”)
- Active date filter: “Събитията за {from} – {to}”
- No events in scope: existing empty state (no pins, no below-list).

**Show my location.** A floating button inside the map (bottom-right, above Google’s own controls). On click, calls `navigator.geolocation.getCurrentPosition()`. On success, places a blue “You are here” marker (distinct from event pins). Does **not** pan to the user’s location automatically — the map stays centered on Ruse. Button toggles to “Hide my location” while the dot is visible. Location is not stored anywhere — transient component state only. If the browser denies permission, show a brief toast. Requires `geolocation=(self)` in `Permissions-Policy` (see `next.config.ts`).

**Clustering.** `MarkerClusterer`. Click a cluster → list of those events in an `InfoWindow`; click a single pin → one event InfoWindow (title, formatted date, link). InfoWindow content renders into a plain DOM container outside the React tree — use a plain `<a href="/[locale]/[slug]">` with the locale-prefixed URL. Do **not** use Next.js `Link` here; it requires the React tree and will not work inside a Maps InfoWindow.

### Event detail (small follow-through)

When `lat`/`lng` exist, build the embed `q` from coordinates (`${lat},${lng}`) instead of the address string — fewer wrong pins on the detail page. When they are null, keep today’s `place, address, town` query.

JSON-LD: if coords exist, add `location.geo` (`GeoCoordinates`). Skip when null.

### i18n

Bulgarian source in `HomePage` and `CreateEvent`; keep `en` / `ua` / `ro` in sync. Minimum keys:

| Key | Namespace | Purpose |
| --- | --- | --- |
| `mapView` | `HomePage` | Third tab label („Карта“) |
| `mapTodayLabel` | `HomePage` | Date scope label: „Събитията днес, {date}“ |
| `mapFilteredLabel` | `HomePage` | Date scope when filter active: „Събитията за {from} – {to}“ |
| `eventsWithoutLocation` | `HomePage` | Heading above below-map list: „{count} събития нямат локация на картата“ |
| `mapOpenEvent` | `HomePage` | Link text in the InfoWindow popup („Виж събитието“) |
| `mapShowMyLocation` | `HomePage` | Button: „Покажи местоположението ми“ |
| `mapHideMyLocation` | `HomePage` | Button toggle: „Скрий местоположението ми“ |
| `mapLocationDenied` | `HomePage` | Toast when browser denies geolocation permission |
| `geocodeOnMap` | `CreateEvent` | Status: event is on the map |
| `geocodeFailed` | `CreateEvent` | Status: could not place on the map |
| `geocodeNotAttempted` | `CreateEvent` | Status: location not yet geocoded |
| `geocodeRetry` | `CreateEvent` | Retry button label |
| `addressSuggestLoading` | `CreateEvent` | Autocomplete loading state |
| `addressSuggestNoResults` | `CreateEvent` | Autocomplete empty state |

### What this phase does not do

- No `/map` events page (that URL is reserved for playgrounds/fitness).
- No venues table, no Leaflet/OSM.
- No “near me” distance-based proximity filtering. The location dot shows where the user is; it does not sort or filter events by distance.
- No geocoding of past events.
- No blocking publish on geocode failure.
- No full event cards inside map popups.
- Do not load Maps JS on the home grid. One map load per tab open is expected and is what Google bills.
- Phase 20 playgrounds map should reuse this same `@react-google-maps/api` shell when it is built.

---

## V2 Feature — Ruse Map (Playgrounds & Street Fitness)

A public map page (`/[locale]/map`) showing a pin for every children's playground and street fitness spot in Ruse. This is a **different product surface** from the events listing map tab. Content is admin-only to create/edit/delete — there is no public submission flow, matching the "no in-app admin UI for content moderation, staff manage it directly" philosophy used elsewhere, except here the admin acts through a small in-app form instead of the Supabase Dashboard, since pins are added on-site via GPS.

### Data model

One table for both pin types (simpler filtering than two tables):

```sql
create table public.map_points (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('playground', 'street_fitness')),
  name        text not null,
  description text,
  address     text,
  latitude    double precision not null,
  longitude   double precision not null,
  images      jsonb not null default '[]'::jsonb, -- storage paths, same convention as events.images
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.map_points enable row level security;

create policy "Anyone can view map points"
  on public.map_points for select
  using (true);

-- No insert/update/delete policies — all writes go through the
-- admin-checked API routes using the service-role client (see below).
```

### Admin-only write path

Reuses the existing single-admin pattern (`ADMIN_USER_ID` / `NEXT_PUBLIC_ADMIN_USER_ID`) from Smart Fill rather than introducing a roles table:

- `POST /api/map-points`, `PATCH /api/map-points/[id]`, `DELETE /api/map-points/[id]` each check `user.id === process.env.ADMIN_USER_ID` server-side before writing via `createSupabaseAdminClient()` — same guard shape as `isSmartFillAdmin` in `src/lib/smart-fill/rate-limit.ts`.
- Reads have no API route: since RLS allows public `select`, `mapPointsApi` in `src/lib/api/map-points.ts` queries Supabase directly from the Server Component, following the `eventsApi` convention.

### Storage

A dedicated public bucket, `map-point-images`, parallel to `event-images`. Upload flow mirrors `src/app/api/smart-fill/photo/route.ts`: validate type/size → upload via the service-role client → store the path → resolve to a public URL the same way `getEventImageUrl` does in `src/lib/event-utils.ts`.

### Location capture

Two ways to set a pin's coordinates, both admin-only and both landing on a draggable marker preview so the position can be fine-tuned before saving:

1. **GPS** — `navigator.geolocation.getCurrentPosition()` in the browser, used when the admin is physically at the location.
2. **Address** — a server route `GET /api/map-points/geocode?q=` proxies to OpenStreetMap's Nominatim (free, no extra Google Cloud billing/setup). Nominatim requires a descriptive `User-Agent` and enforces a strict 1 req/sec rate limit, so the lookup must happen server-side, never directly from the browser.

The map display itself (both the admin preview and the public page) stays Google Maps via `@react-google-maps/api`. When this feature is built, reuse the events listing map loader/shell rather than a second map stack. Nominatim remains fine for admin address lookup on playgrounds pins.

### Public page and components

- `src/app/[locale]/map/page.tsx` — Server Component, fetches all points via `mapPointsApi.getMapPoints`, renders `MapView`.
- `src/components/Map/MapView.tsx` — `"use client"`, `GoogleMap` centered on Ruse with a distinct marker icon per `type`, plus a filter control (playgrounds / fitness / both).
- Clicking a marker opens an info window with the pin's name and a thumbnail; tapping the photo opens a full-screen `lightgallery` viewer — the same plugin setup (`lgZoom`, `lgThumbnail`) already used in `EventImagesGallery.tsx`, supporting multiple images per pin.
- When the logged-in user is the admin, a floating "+" button opens `MapPointForm` to add a pin, and each info window gets edit/delete actions.

### Navigation

Surfaced the same way other secondary pages (`/why-all4ruse`, `/advertise`) are — a link in the "More" drawer (`MobileBottomNav.tsx`) and in the desktop dropdown (`Footer.tsx`). There is no dedicated bottom-nav tab for it.

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Server-only (scripts, not the app)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_PROJECT_ID=xxxx

# Google Translate (for event content translation)
GOOGLE_TRANSLATE_API_KEY=...

# Event detail embed + (future) playgrounds map display
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...

# Server-only — Geocoding API + Places API (New). Never expose to the browser.
# Used to fill events.lat / events.lng on create, update, and upcoming backfill.
GOOGLE_MAPS_GEOCODING_API_KEY=...

# Ruse playgrounds map (V2) — display key is NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
# address geocoding for that feature uses Nominatim, no extra key needed
```

---

## npm Scripts

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "types": "tsc --noEmit",
  "lint": "next lint",
  "db:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID --schema public > src/types/database.ts"
}
```

`npm run types` — runs the TypeScript compiler without emitting files. Use this to catch type errors across the whole project without building.

---

## Dependencies

Only what is decided. New packages are added when there is a real need.

```
next
react / react-dom
typescript

@supabase/supabase-js
@supabase/ssr

@tanstack/react-query
@tanstack/react-query-devtools

react-hook-form
@hookform/resolvers
zod

next-intl

sonner
lucide-react
date-fns

tailwindcss (v4)
tailwindcss-animate
class-variance-authority
clsx
tailwind-merge
radix-ui
```
