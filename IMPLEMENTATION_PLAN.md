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

### 2.1 Data layer — events and tags ✅

- `src/lib/api/events.ts` — `eventsApi` with `getActiveEvents` (current + upcoming combined, `endDate >= today`), `getPastEvents` (last 15 days, `endDate < today AND endDate >= today-15`), `getEventBySlug`. Simplified from original plan — no separate current/upcoming split at the API level.
- `src/lib/api/tags.ts` — `tagsApi.getTags`.
- `src/lib/api/index.ts` — re-exports both.
- `EVENTS_PAGE_SIZE` and `PAST_EVENTS_WINDOW_DAYS` added to `src/constants/index.ts`.

### 2.2 Design structure split (no business logic yet)

Design reference: [onhuddle.co](https://onhuddle.co) (mobile-native feel) and [bnt.bg](https://bnt.bg) (clean category navigation). 80% of traffic is mobile — mobile-first throughout.

Keep interactions animated/polished (drawer, dropdown, transitions).

Use rounded-md everywhere.

#### 2.2.1 Pages + dummy content scaffolding ✅

Create routes and temporary page shells for:

- `create-event`
- `profile/saved-events`
- `profile`
- `legal/cookies`
- `legal/privacy`
- `legal/gdpr`
- `why-all4ruse`
- `events/[slug]` (single event)
- `past`
- `my-events`

For each page:

- Add a translated page title (`Typography.H1` or equivalent heading style), using existing keys from messages.
- Add 3–4 rows of placeholder content below with `Typography.P` and lorem ipsum text. Make it long enough to have scrollbar.
- Keep these pages purely presentational for now (no data queries, no forms, no auth checks beyond existing middleware).
- Goal: make all navigation targets visually available while we finalize shell design.

#### 2.2.2 Header implementation + design notes ✅

Header requirements:

- **Desktop** (`md+`):
  - Left: logo (`<Logo />`).
  - Center: filter entry point button looking like an input (should open the filters, but actual filters implementation comes later in events tasks, now only the button).
  - Right: locale switcher, theme toggle, "ВЛЕЗ" button (translated) primary. The button again should do nothing.
- **Mobile** (`<md`):
  - Left: logo
  - Center: filter entry point
  - Right: Try to keep the same structure

#### 2.2.3 Footer implementation + design notes ✅

Footer requirements:

- **Desktop** (`md+`):
  Light 1 line sticky footer:
  - Left: arrow with dropdown links (legal and whyall4ruse)
  - Center: copyright
  - Right: fb inst and tiktok logos
- **Mobile** (`<md`):
  Bottom Navigation Bar with links: Events, Create event, Saved, More (which will store the legal links and social icons and whyall4ruse).

#### Locale layout wiring (`src/app/[locale]/layout.tsx`) ✅

- Render order: `<Header />` → `<main>{children}</main>` → `<Footer />` → `<MobileBottomNav />`.
- `pb-16 md:pb-10` on `<main>` — clears mobile bottom nav (~56px) and fixed desktop footer (~40px).

### 2.3 EventCard component ✅

- Create `src/components/EventCard/EventCard.tsx` — displays event image (`next/image`), title, host, tag badges. Server Component friendly (no hooks).
- Show a badge with the date and hour top left on event. date should be in format "25 фев" and below it the hour (19:00).
- Show a "Live now" badge (pulsing green dot) when `event.startDate <= today <= event.endDate` — computed from props, no extra fetch.
- Uses React 19 `<ViewTransition name={...} share="event-image">` on the image wrapper so the View Transitions API morphs it into the detail page hero.
- Create `src/components/EventCard/index.ts` — barrel export.

### 2.4 Events listing pages ✅

- `src/app/[locale]/page.tsx` — Server Component. Calls `eventsApi.getActiveEvents`, passes as `initialData` to `EventsList`.
- `src/app/[locale]/past/page.tsx` — same pattern with `eventsApi.getPastEvents`.
- `src/components/EventsList/EventsList.tsx` — `"use client"`, receives `initialData`, renders grid of `EventCard` via TanStack Query with `initialData`.
- `src/hooks/query/events.ts` — `useActiveEvents` and `usePastEvents` with `keepPreviousData`.

### 2.5 Event detail page ✅

- `src/app/[locale]/[slug]/page.tsx` — async Server Component, `force-dynamic`.
- `generateMetadata` — title, description (160-char strip), OG image, OG `article` type, hreflang alternates.
- JSON-LD `Event` schema block embedded in the page.
- React 19 `<ViewTransition>` on the hero image to match the card transition name.
- Layout: hero gallery, title, date/time, address, price, tags, description, ticket link, Facebook link, related events.
- `sitemap.ts` and `robots.ts` added under `src/app/` for crawler coverage.

### 2.6 Filters ✅

### 2.7 Static content pages ✅

- Build `src/app/[locale]/why-all4ruse/page.tsx` — static, no data fetching.
- Build `src/app/[locale]/legal/cookies/page.tsx`, `gdpr/page.tsx`, `privacy/page.tsx`, `terms/page.tsx` — static. Add `generateMetadata` to each.

### 2.8 PWA foundation — installable app ✅

Make the app installable on iOS and Android via "Add to Home Screen". No service worker yet — just the manifest and meta tags.

- Create `src/app/manifest.ts` — Next.js native manifest API. Fields: `name: "All4Ruse"`, `short_name: "All4Ruse"`, `description`, `start_url: "/"`, `display: "standalone"`, `background_color`, `theme_color` (match `--primary` token), `icons` array (192×192, 512×512 PNG in `public/icons/`).
- Add to `src/app/layout.tsx` `<head>`:
  - `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">` (180×180)
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
  - `<meta name="theme-color" content="..." />` (matches `--primary`)
- Create placeholder app icons in `public/icons/` (192×192, 512×512, 180×180). Replace with final brand icons before launch.
- Verify: Lighthouse PWA audit shows installable. On Android Chrome "Add to Home Screen" prompt appears. On iOS Safari "Add to Home Screen" works.

---

## Phase 3 — Auth and User Pages

This phase covers the full authentication experience and user-facing account pages.

### 3.1 Login page ✅

- `src/app/[locale]/auth/login/page.tsx` — `"use client"`, email + password form, react-hook-form + zod, `supabase.auth.signInWithPassword`. Inline error messages mapped from Supabase error strings. Password visibility toggle via `PasswordInput` component. Redirects to `next` param or locale home on success.

### 3.2 Signup page + email confirmation ✅

- `src/app/[locale]/auth/signup/page.tsx` — email + password + confirm + optional full name + terms checkbox. `supabase.auth.signUp` with `emailRedirectTo: /auth/callback`. Minimal fields — profile completion deferred to the profile page.

### 3.3 Signup success page ✅

- `src/app/[locale]/auth/signup-success/page.tsx` — static Server Component, MailCheck icon, "check your email" message.

### 3.4 Auth callback route ✅

- `src/app/auth/callback/route.ts` — PKCE code exchange (`supabase.auth.exchangeCodeForSession`). Redirects to `next` query param or default locale home. Handles both email confirmation and password reset flows.

### 3.5 Password management pages ✅

- `src/app/[locale]/auth/forgot-password/page.tsx` — email form, `supabase.auth.resetPasswordForEmail` with `redirectTo: /auth/callback?next=/[locale]/auth/update-password`. Inline "check your email" state after submit.
- `src/app/[locale]/auth/update-password/page.tsx` — new + confirm password, `supabase.auth.updateUser`. Guards against no session on mount (redirects to login).

### 3.6 Header + MobileBottomNav auth state — full wiring ✅

- Mobile header top-right: primary "+" button → `/create-event` (middleware handles unauthenticated redirect).
- Desktop header: `HeaderAuthButton` client component — avatar dropdown (Create Event · Profile · My Events · Logout) when authenticated, "Влез" link when guest.
- Bottom nav restructured to 4 tabs: Events · Saved · More · Profile. More sheet = social/legal/Why All4Ruse. Profile sheet = full auth state (login/signup buttons or user info + links + logout).
- Logout: `supabase.auth.signOut()` + `router.refresh()` re-renders the Server Component header with cleared session.
- `PasswordInput` component added at `src/components/ui/password-input.tsx` — reusable eye-toggle wrapper.

### 3.7 Profiles data layer

- Write `src/lib/api/profiles.ts` — `profilesApi` with `getProfile(client, userId)`, `updateProfile(client, userId, data)`.
- Add `updateProfileSchema` to `src/types/index.ts`.

### 3.8 Profile page

- Build `src/app/[locale]/profile/page.tsx` — SSR, read session and profile via server client. Render profile display + edit form (react-hook-form + zod). Redirect to login if no session.

### 3.9 My events page

- Build `src/app/[locale]/my-events/page.tsx` — SSR, filter events by `created_by = session.user.id`. Reuse `EventCard`. Redirect to login if no session.

### 3.10 Create event page

- Build `src/app/[locale]/create-event/page.tsx` — auth-guarded (middleware already handles redirect to login).
- Render `EventForm` with react-hook-form + zod using `createEventSchema`.
- On submit, call `eventsApi.createEvent(browserClient, values)`, navigate to my-events on success.

### 3.11 Account security + deletion

- Build `src/app/[locale]/profile/security/page.tsx` (or a dedicated section in profile) with:
  - Change password form (`supabase.auth.updateUser({ password })`)
  - Re-auth confirmation step for sensitive actions (when required by provider/session age)
- Build account deletion flow:
  - Confirmation UI requiring typed confirmation text (e.g. "DELETE")
  - Server-side endpoint/action that performs account cleanup and deletion in Supabase
  - Final sign-out and redirect with a success state
- Add safety constraints:
  - Soft-delete profile/event ownership data first (or transfer policy), then delete auth user
  - Explicit irreversible-action copy and double-confirmation in UI

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

- Add `generateMetadata` to `app/[locale]/page.tsx` and `past/page.tsx` — translated titles and descriptions.
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

### 5.10 PWA service worker + offline fallback

Do this after all routes are stable so cache strategies don't keep changing.

- Install `next-pwa` (or write a custom service worker via `next.config.ts` `experimental.serviceWorker`).
- Cache strategy: stale-while-revalidate for static assets, network-first for API routes, cache-first for Supabase Storage images.
- Create `src/app/offline/page.tsx` — friendly "You are offline" screen with logo and message.
- Register the service worker in the root layout. Verify offline fallback works in DevTools (Network → Offline).

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
- **PWA push notifications** — Phase 9 scope. Requires: auth complete (Phase 3), stable routes (Phase 4+), and a push delivery backend (Supabase Edge Function + Web Push API). Implement after a user base exists to justify the complexity. User notification preferences (by tag, by event reminder) live in the `profiles` table.
