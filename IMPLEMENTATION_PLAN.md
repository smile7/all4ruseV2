# IMPLEMENTATION PLAN — All4Ruse v2

A practical build order for one developer working with Cursor. Each task is scoped to roughly 1–2 hours. File paths match the folder structure in ARCHITECTURE.md.

---

## Phase 1 — Project Skeleton

Get a running app with all tooling, routing, and plumbing in place before writing any feature code.

### 1.1 Initialize the project
- Run `npx create-next-app@latest` — select TypeScript, Tailwind, App Router, `src/` directory, no default import alias (we set our own).
- In `tsconfig.json`, add `"paths": { "~/*": ["./src/*"] }` and set `baseUrl: "."`.
- In `next.config.ts`, add the webpack alias so `~/` resolves at runtime too, and enable View Transitions: `experimental: { viewTransition: true }`.
- Add npm scripts to `package.json`: `"types": "tsc --noEmit"` and `"db:types": "supabase gen types typescript ..."`. Run `npm run types` to verify the setup is clean after each major change.

### 1.2 Linting and formatting
- Install `eslint-plugin-simple-import-sort`, `eslint-plugin-unused-imports`, `prettier`, `prettier-plugin-tailwindcss`.
- Configure `eslint.config.js` with the import sort groups from ARCHITECTURE.md.
- Add a `.prettierrc` with `"plugins": ["prettier-plugin-tailwindcss"]`.

### 1.3 Tailwind v4 + global styles
- Replace the default `src/app/globals.css` with the Tailwind v4 CSS-first setup from ARCHITECTURE.md.
- Copy the full oklch token set from ARCHITECTURE.md exactly — both `:root` (light) and `.dark`. The theme is the [tweakcn "dashboard"](https://tweakcn.com/themes/cmn1fszda000004l17tjz1g0d) palette with a warm orange primary.
- Apply base body/html styles.
- Load fonts in `src/app/layout.tsx` via `next/font/google`: Comfortaa (subsets: latin, cyrillic), JetBrains Mono. Apply as `--font-comfortaa` and `--font-jetbrains-mono` CSS variables on `<html>`.

### 1.4 shadcn init
- Run `npx shadcn init` — select the same options as the reference project (`style: default`, `baseColor: zinc`, `cssVariables: true`, `rsc: true`).
- Add the first few components you will immediately need: `npx shadcn add button input form label badge card separator skeleton toast`.
- All generated files land in `src/components/ui/`.

### 1.5 Supabase setup
- Create `src/lib/supabase/client.ts` — browser client with `Database` generic.
- Create `src/lib/supabase/server.ts` — async server client using `cookies()` from `next/headers`.
- Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_PROJECT_ID`.
- Add `"db:types"` script to `package.json` and run it to generate `src/types/database.ts`.

### 1.6 Types and utils
- Create `src/types/index.ts` — derive `DbEvent`, `DbTag`, `DbProfile` from `database.ts`. Add `Event`, `Tag`, `Profile` domain types. Add `createEventSchema`, `getEventsParamsSchema` and their inferred types.
- Create `src/lib/utils.ts` — `cn()`, `normalizeError()`, `formatEventDate()`.
- Create `src/constants/index.ts` — empty for now, add values as needed.

### 1.7 next-intl routing setup
- Install `next-intl`.
- Create `src/i18n/routing.ts` — define `locales: ["bg", "en", "uk", "ro"]` and `defaultLocale: "bg"`.
- Create `src/i18n/request.ts` — the next-intl server config that loads the correct message file.
- Create `src/i18n/messages/bg.json`, `en.json`, `uk.json`, `ro.json` with a minimal structure (just `common`, `nav` keys for now).
- Create `src/middleware.ts` — combine next-intl locale routing with admin route protection (see ARCHITECTURE.md).

### 1.8 App shell
- Create `src/app/layout.tsx` — root layout: font loading, `<html>` tag, import `globals.css`. No providers yet.
- Create `src/app/[locale]/layout.tsx` — locale layout: `NextIntlClientProvider`, `QueryClientProvider` (TanStack Query), `<Toaster />` from sonner. This is where all providers live.
- Create `src/components/layout/Header.tsx` and `src/components/layout/Footer.tsx` as simple shells — we flesh them out in Phase 2.
- Verify the app boots at `localhost:3000` and redirects to `/bg/`.

---

## Phase 2 — Public Experience

Build everything a visitor sees. Server Components are the default throughout this phase.

### 2.1 Data layer — events and tags
- Write `src/lib/api/events.ts` — `eventsApi` with `getEvents`, `getUpcomingEvents`, `getCurrentEvents`, `getPastEvents`, `getEventBySlug`. The difference between upcoming/current/past is the date filter applied inside each function.
- Write `src/lib/api/tags.ts` — `tagsApi` with `getTags` (returns all tags, used for the filter UI).
- Write `src/lib/api/index.ts` — re-export both.

### 2.2 EventCard component
- Create `src/components/EventCard/EventCard.tsx` — displays event image (`next/image`), title, date, place, tag badges. Server Component friendly (no hooks).
- Add `style={{ viewTransitionName: \`event-image-${event.id}\` }}` to the image element so the View Transitions API can morph it into the detail page hero.
- Create `src/components/EventCard/index.ts` — barrel export.

### 2.3 Upcoming events page (home)
- Build `src/app/[locale]/page.tsx` as a Server Component — call `eventsApi.getUpcomingEvents(serverClient, {})` and pass the result as `initialData` to `EventsList`.
- Create `src/components/EventsList/EventsList.tsx` as a `"use client"` component — receives `initialData`, holds filter state, renders a grid of `EventCard` components.
- Create `src/components/EventFilters/EventFilters.tsx` as a `"use client"` component — tag multiselect, date-from/to pickers, text search. Updates local state that `EventsList` reads.
- Write `src/hooks/query/events.ts` — `useEvents(params, { initialData })` using `keepPreviousData`. This hook is only called from `EventsList` when filters change.

### 2.4 Current and past events pages
- Build `src/app/[locale]/current/page.tsx` — same pattern as upcoming, different `eventsApi` function.
- Build `src/app/[locale]/past/page.tsx` — same pattern, reversed date order.
- Both reuse `EventsList` and `EventFilters` — no new components needed.

### 2.5 Event detail page
- Build `src/app/[locale]/events/[slug]/page.tsx` — Server Component.
- Add `generateStaticParams` to pre-generate known slugs at build time.
- Add `export const revalidate = 60` for ISR.
- Add `generateMetadata` — page title = event title, description = first 160 chars of description, Open Graph image = event image.
- On the hero image, add `style={{ viewTransitionName: \`event-image-${event.id}\` }}` — same name as the EventCard image. The browser will animate the shared element transition automatically when navigating from the listing.
- Render a full-page event detail layout: large image, title, date/time, address, price, tags, description, ticket link, Facebook link.

### 2.6 Header + Footer — real content
- Fill in `Header.tsx` — logo, nav links (upcoming / current / past / why-all4ruse), locale switcher dropdown, login button.
- Fill in `Footer.tsx` — copyright, links to legal pages.
- Wire nav links through next-intl's `Link` so locale is preserved automatically.

### 2.7 Static content pages
- Build `src/app/[locale]/why-all4ruse/page.tsx` — static, no data fetching.
- Build `src/app/[locale]/legal/cookies/page.tsx`, `gdpr/page.tsx`, `privacy/page.tsx` — static. Add `generateMetadata` to each.

---

## Phase 3 — Auth and User Pages

### 3.1 Auth callback
- Write `src/app/auth/callback/route.ts` — `exchangeCodeForSession`, redirect to home.

### 3.2 Login page
- Build `src/app/[locale]/auth/login/page.tsx` — `"use client"`, email + password form using react-hook-form + zod, calls `supabase.auth.signInWithPassword`. On success, redirect to `/[locale]`. On error, show inline message.

### 3.3 Signup page
- Build `src/app/[locale]/auth/signup/page.tsx` — email + password form, calls `supabase.auth.signUp`. On success, redirect to signup-success.

### 3.4 Signup success page
- Build `src/app/[locale]/auth/signup-success/page.tsx` — static confirmation message, no data.

### 3.5 Password reset pages
- Build `src/app/[locale]/auth/forgot-password/page.tsx` — email form, calls `supabase.auth.resetPasswordForEmail`.
- Build `src/app/[locale]/auth/update-password/page.tsx` — new password form, calls `supabase.auth.updateUser`. Requires session (redirect to login if no session).

### 3.6 Header auth state
- Update `Header.tsx` to show user avatar + name when a session exists, and a login button when not. Read the session in the Server Component parent and pass it as a prop.

### 3.7 Profiles data layer
- Write `src/lib/api/profiles.ts` — `profilesApi` with `getProfile(client, userId)`, `updateProfile(client, userId, data)`.
- Add `updateProfileSchema` and `UpdateProfileSchemaType` to `src/types/index.ts`.

### 3.8 Profile page
- Build `src/app/[locale]/profile/page.tsx` — SSR, read session and profile via server client. Render profile display + edit form (react-hook-form). Submit calls `supabase.auth.updateUser` / `profilesApi.updateProfile` directly from a Server Action or Client Component mutation.
- Redirect to login if no session.

### 3.9 My events page
- Build `src/app/[locale]/my-events/page.tsx` — SSR, filter events by `createdBy = session.user.id`. Reuse `EventCard`. Redirect to login if no session.

### 3.10 Create event page (public user)
- Build `src/app/[locale]/create-event/page.tsx` — auth-guarded (redirect to login if no session).
- Render `EventForm` (a form component built here) with react-hook-form + zod using `createEventSchema`.
- On submit, call `eventsApi.createEvent(browserClient, values)` directly — no admin TanStack Query needed here, just a single mutation that navigates to my-events on success.

---

## Phase 4 — Admin

### 4.1 Admin layout and role check
- Build `src/app/[locale]/admin/layout.tsx` — Server Component. Read session via server client. Check `profile.is_admin` (or whatever role field is used). If not admin, redirect to home. Render an admin sidebar shell.

### 4.2 Admin dashboard
- Build `src/app/[locale]/admin/page.tsx` — simple stats: total events, active events, total tags. Fetch counts via server client. Static-ish, no TanStack Query needed.

### 4.3 TanStack Query hooks for admin
- Extend `src/hooks/query/events.ts` — add `useAdminEvents(params)`, `useCreateEvent()`, `useUpdateEvent()`, `useDeleteEvent()`. Each mutation calls `invalidateQueries({ queryKey: eventQueryKeys.all() })` on settled.
- Write `src/hooks/query/tags.ts` — `useTags()`, `useCreateTag()`, `useDeleteTag()`.
- Write `src/hooks/query/index.ts` — re-export all.

### 4.4 Admin events list
- Build `src/app/[locale]/admin/events/page.tsx` — `"use client"` wrapper around a table. Uses `useAdminEvents(params)` with `keepPreviousData`. Columns: title, dates, status (active/premium), actions (edit, delete, toggle active).
- Add confirmation dialog before delete (shadcn `AlertDialog`).
- Add a "New event" link to the admin events/new page.

### 4.5 Event form component
- Create `src/components/EventForm/EventForm.tsx` — `"use client"`, react-hook-form + zod, renders all fields from `createEventSchema`. Accepts `defaultValues`, `schema`, `isPending`, `onSubmit` as props. Works for both create and edit.
- Create `src/components/EventForm/index.ts`.

### 4.6 Admin create event page
- Build `src/app/[locale]/admin/events/new/page.tsx` — renders `EventForm` with empty defaults. Passes `useCreateEvent().mutate` as `onSubmit`. On success, router.push to events list.

### 4.7 Admin edit event page
- Build `src/app/[locale]/admin/events/[id]/page.tsx` — Server Component fetches the event by id via server client and passes it as `defaultValues` to `EventForm`. Mutation uses `useUpdateEvent()`.

### 4.8 Admin tags page
- Build `src/app/[locale]/admin/tags/page.tsx` — lists all tags, inline add form (tag title input + submit), delete button per tag. Uses `useTags()`, `useCreateTag()`, `useDeleteTag()`.

---

## Phase 5 — i18n, SEO, and Polish

### 5.1 Complete Bulgarian message file
- Audit every page and component for hardcoded Bulgarian or English strings.
- Move all UI strings into `src/i18n/messages/bg.json` — organized by page/feature key (`nav`, `home`, `events`, `auth`, `profile`, `admin`, `common`, `errors`).

### 5.2 Translate to other languages
- Copy `bg.json` structure to `en.json`, `uk.json`, `ro.json`.
- Translate manually or using a script. (Auto-translate via Google Translate API is Phase 9 scope — for now, best-effort manual translation is fine.)

### 5.3 Wire all strings through `t()`
- Replace every hardcoded string in components with `t("key")` or `useTranslations("namespace")`.
- Verify locale switching works end-to-end on all pages.

### 5.4 SEO metadata
- Add `generateMetadata` to `app/[locale]/page.tsx`, `current/page.tsx`, `past/page.tsx` — translated titles and descriptions.
- Verify event detail `generateMetadata` includes Open Graph image, title, description.
- Add `<link rel="alternate" hreflang>` via next-intl's alternates support.

### 5.5 JSON-LD structured data
- Add a `<script type="application/ld+json">` block to `app/[locale]/events/[slug]/page.tsx` with the [Event schema](https://schema.org/Event) — name, startDate, endDate, location, image, url.

### 5.6 Loading and error states
- Add `loading.tsx` to `app/[locale]/` and `app/[locale]/admin/` — renders a skeleton.
- Add `error.tsx` to `app/[locale]/` — friendly error message with retry.
- Add a custom `not-found.tsx` for event detail (when slug does not match any event).

### 5.7 Images
- Replace any `<img>` tags with `next/image` throughout.
- Add a placeholder/blur image for events without an image.
- Configure `next.config.ts` to allow the Supabase storage domain.

### 5.8 Responsive review
- Walk through every page on a 375 px viewport.
- Fix layout issues in the event listing grid, event detail, and admin tables.

### 5.9 Accessibility pass
- Check keyboard navigation on filters, forms, and modals.
- Verify all interactive elements have accessible labels.
- Check color contrast ratios against WCAG AA on both light and dark themes.

---

## Notes

- **Design tokens** in `globals.css` are finalized — the oklch token set from ARCHITECTURE.md is ready to copy in on day one. No placeholder colors.
- **Design reference** — the existing all4ruse.com website will be shared when we reach the UI build phase. Match layout/spacing from it where relevant.
- **Fonts** — Comfortaa (cyrillic subset required for Bulgarian/Ukrainian), Source Serif 4, JetBrains Mono. Load all three via `next/font/google` in the root layout.
- **View Transitions** — enabled in `next.config.ts`. The image expand effect works by matching `viewTransitionName` between `EventCard` and the event detail hero. If the browser does not support View Transitions (Firefox without the flag), the navigation falls back to a normal page load silently.
- **`npm run types`** — run after any major refactor or before committing. It catches type errors across the whole project without building.
- **Supabase RLS policies** need to be in place before auth-guarded pages work correctly in production. Set them up alongside Phase 3.
- **Event image uploads** (admin form) are not scoped above — this will need Supabase Storage and a file input in `EventForm`. Add as a task when reaching Phase 4.
- **Event content translation** (Google Translate) is deferred to Phase 9 / future scope as defined in TASKS.md.
