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
| `/[locale]`                      | Upcoming events      | Home page                                    |
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
