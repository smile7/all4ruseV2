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
- Create `src/middleware.ts` — combine next-intl locale routing with auth guards for protected routes (create-event, profile, etc.; see ARCHITECTURE.md). There is no `/admin` UI — operations staff use the Supabase Dashboard.

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
- Show a badge with the date and hour top left on event. Uses `formatDateBadge` from `src/lib/event-utils.ts`: today/tomorrow → uppercase label + time; other dates → `"11 ЮНИ"` + full weekday + time (locale-aware).
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
- **Remember me** — checkbox on the login form (default **unchecked**). Stores the user’s choice in an `a4r-remember` cookie (`1` = persistent, `0` = session-only). Supabase SSR always writes long-lived auth cookies, so the app intercepts every cookie write and strips `maxAge` / `expires` when remember-me is off — auth cookies then die when the browser is fully closed. Wired through:
  - `src/lib/supabase/session-persistence.ts` — preference cookie + `applyRememberPolicyToCookieOptions`
  - `src/lib/supabase/browser-cookies.ts` — browser `setAll` adapter for `createBrowserClient`
  - `src/lib/supabase/server.ts` + `src/middleware.ts` — same policy on server-side refresh
  - `src/lib/supabase/client.ts` — clears preference on sign-out
- OAuth / email-confirmation / password-reset callbacks (`/auth/callback`) always use a persistent session — there is no remember-me UI on those flows.

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

### 3.7 Profiles data layer ✅

- `src/lib/api/profiles.ts` — `profilesApi` with `getProfile`, `updateProfile`.
- `updateProfileSchema` / `UpdateProfileInput` in `src/types/index.ts`.

### 3.8 Profile page ✅

- `src/app/[locale]/profile/page.tsx` — SSR session + profile, `ProfileForm` (react-hook-form + zod). Redirect to login if no session.

### 3.9 My events page ✅

- `src/app/[locale]/my-events/page.tsx` — SSR, `eventsApi.getMyEvents`, splits upcoming vs past, `EventCard`. Redirect to login if no session.

### 3.10 Create event page ✅

- `src/app/[locale]/create-event/page.tsx` — auth-guarded; `EventForm` with tags and profile defaults.
- Modes: create, `editId` (edit), `duplicateId` (duplicate) via search params; loads event by id when editing/duplicating.
- Submit/mutations live in `EventForm` (browser Supabase client + navigation on success).

### 3.11 Account security + deletion ✅

- Implemented at the bottom of the profile page: `ProfileAccountSecurity` (`change password` + delete account dialog).
- Change password: `supabase.auth.updateUser({ password })` with new + confirm fields; link to forgot-password flow.
- Account deletion: typed confirmation **`DELETE`**; `POST /api/account/delete` deletes the user’s events (same pattern as `eventsApi.deleteEvent`), then `auth.admin.deleteUser` via **`SUPABASE_SERVICE_ROLE_KEY`** (server-only in `src/lib/supabase/admin.ts`). Client signs out and redirects home.
- **Env:** add `SUPABASE_SERVICE_ROLE_KEY` to the server environment (never expose to the client). DB should cascade `profiles` from `auth.users` (typical Supabase template); events must be removed first because they reference `profiles`.

---

## Phase 4 — Saved events ✅

Authenticated users can bookmark events; bookmarks persist in the database. Guests can discover the feature but must create an account before saving. **There is no in-app admin area** — listings, tags, moderation, and roles are managed in **Supabase** (Dashboard, SQL, RLS). This phase matches `TASKS.md` Phase 7.

### 4.1 Data model + RLS ✅

- Add a join table `saved_events`.
- Columns:
  - `id uuid primary key default gen_random_uuid()` — stable row id for tooling/debugging.
  - `user_id uuid not null references auth.users(id) on delete cascade` — owner of the saved event.
  - `event_id int8 not null references public.events(id) on delete cascade` — saved event; this matches the current `events.id` type.
  - `created_at timestamptz not null default now()` — when the event was saved.
- Constraints and indexes:
  - `unique (user_id, event_id)` so one user cannot save the same event twice.
  - Index on `(user_id, created_at desc)` for quick “my saved events” lookups.
  - Index on `(event_id)` for cascade/delete and future aggregate queries.
- RLS:
  - Enable RLS on `saved_events`.
  - `SELECT`: users can read only rows where `user_id = auth.uid()`.
  - `INSERT`: users can insert only rows where `user_id = auth.uid()`.
  - `DELETE`: users can delete only rows where `user_id = auth.uid()`.
  - No public `UPDATE` policy needed; saving is insert/delete only.
- Run `npm run db:types` after the migration; extend domain types in `src/types/` with `DbSavedEvent` / `SavedEvent` only if the app needs named types beyond generated rows.

### 4.2 API — `lib/api` ✅

- `src/lib/api/saved-events.ts` — `savedEventsApi` with `getSavedEventIds`, `getSavedEvents` (upcoming/past timing), `getSavedEventsCount`, `saveEvent` (idempotent — skips if already saved), `unsaveEvent`. Exported from `src/lib/api/index.ts`.

### 4.3 EventCard — save control ✅

- Save icon bottom-right on `EventCard`; guest → account prompt dialog; authenticated → optimistic toggle via TanStack Query hooks.

### 4.4 Client state and mutations ✅

- `src/hooks/query/saved-events.ts` — mutations invalidate saved ids and saved events; optimistic updates on the icon.

### 4.5 Saved page ✅

- `src/app/[locale]/profile/saved-events/page.tsx` — SSR, upcoming/current + lazy past sections via `SavedEventsSections`.
- Route is publicly accessible (middleware `AUTH_EXCLUDED`); unauthenticated visitors see a prompt UI with login/signup CTAs instead of a hard redirect.

### 4.6 i18n + nav ✅

- `SavedEvents` namespace in all 4 locale files; bottom nav **Saved** tab wired.

### 4.7 Acceptance checks ✅

- Guest clicking any card save icon opens the account prompt dialog/drawer and does not write to Supabase.
- Authenticated user can save and unsave from the home listing; icon state survives refresh.
- Authenticated user sees saved events on the Saved page split into upcoming/current and past.
- Removing from the Saved page updates the page without leaving stale cards.
- RLS blocks reading, creating, or deleting another user’s saved rows.

---

## Phase 5 — Public Profiles ✅

Every registered user gets a public profile page at `/[locale]/user/[username]`. Implemented in `src/app/[locale]/user/[username]/page.tsx` with host vs user layout branching on event count.

### 5.1 DB schema additions ✅

- `header_url` column present in `database.ts`; `color` column in use.
- `UNIQUE` on `profiles.username` — migration applied.
- RLS: public `SELECT` on profiles; cover uploads to `headers/{userId}` in existing bucket.

### 5.2 Edit profile additions ✅

- Color swatch picker, header upload, copyable public link chip, username nudge in `ProfileForm`.
- `color` in `updateProfileSchema`; `header_url` in `ProfileUpdatePayload`.

### 5.3 Data layer — `profilesApi` additions ✅

- `getPublicProfile`, `getPublicProfileUpcomingEvents`, `getPublicProfilePastEvents` in `src/lib/api/profiles.ts`.

### 5.4 Public profile page — route and rendering ✅

- Full host/user layouts, `generateMetadata`, lazy past events via `ProfilePastEvents`.

### 5.5 i18n ✅

- `PublicProfile` namespace in all 4 locale files.

### 5.6 SEO + JSON-LD ✅

- `Organization` JSON-LD for host-mode profiles.

### 5.7 Username enforcement + UX ✅

- Format validation + nudge + copyable link ✅.
- Debounced uniqueness check in `ProfileForm` via `profilesApi.isUsernameAvailable` before save ✅.

### 5.8 Acceptance checks ✅

---

## Phase 6 — Event Creation Automation ✅

Smart-fill helpers pre-populate `EventForm` via `SmartFillPanel` and `src/app/api/smart-fill/*` routes. **Remaining:** confirm env vars in each deployment environment.

### 6.1 `EventDraft` type and `SmartFillPanel` component ✅

- `EventDraft` in `src/types/index.ts`; `SmartFillPanel.tsx` with Facebook · text · photo tabs + admin scrape tab; wired in `EventForm` with merge-only apply.

### 6.2 API routes (server-side — keys never reach the client) ✅

All routes under `src/app/api/smart-fill/` — auth gate, external call, `{ draft: EventDraft }` response. Image re-upload to Supabase Storage in facebook/photo/admin-scrape routes.

### 6.3 AI description style — Gemini prompt guidance ✅

Promotional Bulgarian description instructions in text and photo route system prompts.

### 6.4 Admin-only scraper tab — Grabo and Ruse on the Danube ✅

`admin-scrape/route.ts` — admin UUID check, source-specific Apify mappers, permanent image re-upload. Fourth tab in `SmartFillPanel` gated by `NEXT_PUBLIC_ADMIN_USER_ID`.

### 6.5 i18n ✅

`SmartFill` namespace in all 4 locale files.

### 6.6 Acceptance checks ✅

- Guest users receive 401 from all routes; `SmartFillPanel` is hidden.
- Facebook import: valid FB event URL → draft preview with title/dates/description → apply fills form → image URL is a permanent Supabase Storage URL (not a Facebook CDN URL).
- Text prompt: freeform description → draft preview with promotional description → apply fills form.
- Photo upload: poster image → draft preview → `imageUrl` is already uploaded to Supabase Storage → apply fills form including image field.
- Apply merges — does not overwrite fields the user has already manually typed.
- Admin scraper tab is invisible to all users except the owner.
- Non-admin user hitting `admin-scrape` route directly receives 403.
- Grabo and Ruse on the Danube scrapes produce valid `EventDraft` with permanent image URLs.

---

## Phase 7 — i18n, SEO, and Polish

**Remaining:** legal page copy still hardcoded in Bulgarian; auth/profile/create-event pages lack translated metadata; no route-level `loading.tsx` / `error.tsx`; full mobile + a11y pass.

### 7.1 Complete Bulgarian message file

- Audit every page and component for hardcoded Bulgarian or English strings.
- Move all UI strings into `src/i18n/messages/bg.json` — organized by page/feature key (`nav`, `home`, `events`, `auth`, `profile`, `saved`, `common`, `errors`).
- **Still hardcoded:** legal pages (`legal/*`) body copy and static `metadata` titles.

### 7.2 Translate to other languages

- Copy `bg.json` structure to `en.json`, `uk.json`, `ro.json`.
- Translate manually or using a script. (Auto-translate via Google Translate API is Phase 9 scope — for now, best-effort manual translation is fine.)
- Most UI namespaces are synced; legal page content is not locale-aware yet.

### 7.3 Wire all strings through `t()`

- Replace every hardcoded string in components with `t("key")` or `useTranslations("namespace")`.
- Verify locale switching works end-to-end on all pages.

### 7.4 SEO metadata — partial ✅

Translated `generateMetadata` on: home, current, past, event detail, public profile, saved events, why-all4ruse, advertise, offline, not-found.

**Remaining:**

- Auth pages (login, signup, forgot/update password), profile, my-events, create-event.
- Legal pages — replace static Bulgarian `metadata` exports with translated `generateMetadata`.
- Verify hreflang alternates on all public pages (event detail already has them).

### 7.5 JSON-LD structured data ✅

- Implemented on `app/[locale]/[slug]/page.tsx` (see Phase 2.5). Remaining polish: keep schema fields in sync if event model changes; extend only if SEO needs more types.

### 7.6 Loading and error states

- Add `loading.tsx` to `app/[locale]/` — renders a skeleton (add nested `loading.tsx` only under routes that benefit from it).
- Add `error.tsx` to `app/[locale]/` — friendly error message with retry.
- Add a custom `not-found.tsx` for event detail (when slug does not match any event).

### 7.7 Images

- Replace any `<img>` tags with `next/image` throughout.
- Add a placeholder/blur image for events without an image.
- Configure `next.config.ts` to allow the Supabase storage domain.

### 7.8 Responsive review

- Walk through every page on a 375 px viewport.
- Fix layout issues in the event listing grid, event detail, and the Saved page.

### 7.9 Accessibility pass

- Check keyboard navigation on filters, forms, and modals.
- Verify all interactive elements have accessible labels.
- Check color contrast ratios against WCAG AA on both light and dark themes.

### 7.10 PWA service worker + offline fallback ✅

- Installed `@serwist/next` + `serwist` (Serwist is the recommended PWA library for Next.js 16 — `next-pwa` requires webpack and conflicts with Turbopack).
- Created `src/app/sw.ts` — **minimal service worker** intentionally: only caches `/_next/static/*` (CacheFirst) and public images/icons (StaleWhileRevalidate). Navigation, RSC/Flight, and API routes go straight to the network — caching those breaks Supabase SSR auth redirects and causes infinite loading on mobile/PWA.
- `next.config.ts` wraps config with `withSerwistInit({ swSrc: "src/app/sw.ts", swDest: "public/sw.js", disable: dev })`.
- `src/app/sw.ts` excluded from the main tsconfig (it needs `webworker` lib, conflicting with DOM types).
- Created `src/app/[locale]/offline/page.tsx` — friendly "You are offline" screen with retry and home buttons; `Offline` i18n namespace added to all 4 locale files.
- All PWA icon assets generated into `public/`: `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`, `og-home.png`. Script preserved at `scripts/generate-icons.mjs` for easy re-generation when new branding arrives.
- `layout.tsx` already has all required meta tags: `appleWebApp`, `theme-color`, `icons`, OG tags — no changes needed.
- Verify: production build generates `public/sw.js`. Lighthouse PWA audit should pass. On Android Chrome "Add to Home Screen" prompt appears; on iOS Safari "Add to Home Screen" works.

---

---

## Phase 8 — Quick Fixes & UI Polish

Small, targeted fixes to improve consistency and resolve reported bugs. Each sub-section is a self-contained commit.

### 8.1 Event form UX

- **Required field markers** ✅ — `RequiredMark` (`*`) and `aria-required="true"` on title, description, start/end date, start time, address, town, and first organizer in `EventForm`.
- **Price field type** ✅ — `price` input is `<Input type="text">`; schema already uses `z.string().optional()` (Supabase column is `text`).
- **Sticky bar mobile overflow** ✅ — sticky action bar uses `bottom-12` on mobile (clears `MobileBottomNav`) and `md:bottom-4` on desktop.

### 8.2 Event card date format ✅

- `formatDateBadge` in `src/lib/event-utils.ts` — locale-aware 3-letter month arrays (avoids numeric `Intl` month output in Node.js). Today/tomorrow → `{ primary: "ДНЕС"|"УТРЕ", secondary: null }`; all other dates → `{ primary: "11 ЮНИ", secondary: "ЧЕТВЪРТЪК" }` (full weekday, uppercase).
- `EventCard.tsx` — badge always renders primary → secondary (when present) → `startTime` on three lines; removed today/tomorrow label args from the formatter call.

### 8.3 Color consistency ✅

- `EventCard` hover edit action — `bg-primary text-primary-foreground` (used on my-events cards).
- Header filters trigger — `HeaderSearchButton` and `HeaderDesktopFiltersPanel` both use `variant="default"` (primary).
- Search button copy — `home.searchButtonText` / `home.filters` updated to "Търси" in locale messages.

### 8.4 Saved events multi-save bug ✅

Root cause: concurrent saves shared one optimistic cache; `onError` restored a stale full snapshot and wiped other in-flight saves. Inserts could also race on the `(user_id, event_id)` unique constraint.

Fixes in `src/lib/api/saved-events.ts` and `src/hooks/query/saved-events.ts`:

- `saveEvent` — pre-check for existing row; treat Postgres `23505` unique violation as no-op on insert.
- `useToggleSavedEvent` — `onError` reverts only the failed event id (not the whole ids array); `onSettled` still invalidates ids + list queries.
- `EventSaveButton` — `isSaved` uses `initialSaved` only while `savedIds` query is loading (`undefined`), not when the loaded list is empty.

### 8.5 Filter text search bug ✅

- `FilterContent.tsx` — search/host/place inputs use local state; debounced effects write to URL params only when value differs. Browser back syncs via `startTransition` effects.

### 8.6 Link improvements ✅

- **Remove `noreferrer`** from external event links — keep `rel="noopener"` only so partners can see referral traffic in analytics.
- **Obfuscate emails** — `ObfuscatedEmail` component (`src/components/ui/obfuscated-email.tsx`) on event detail, public profile, legal pages, and why-all4ruse; RTL CSS trick + `aria-label` for screen readers.

### 8.7 Smart Fill arcade overlay ✅

Full-viewport blurred overlay during Smart Fill import (`SmartFillImportOverlay`):

- All 10 CSS loaders from [css-loaders.com/arcade](https://css-loaders.com/arcade/) in `src/styles/smart-fill-arcade-loaders.css`; one picked at random per import.
- `fixed inset-0 z-[200]` with `backdrop-blur-lg` and semi-transparent background.
- Cancel button aborts the fetch via `AbortController` and closes the overlay.
- Optional "My events" link lets the user leave the page (import stops on unmount).

### 8.8 Host section on event detail ✅

Below the event details (after ticket/facebook links), add a "Организатор" section:

- Fetch profile for `event.created_by` user on the server (reuse `profilesApi.getProfile`).
- If `event.created_by === ADMIN_USER_ID` (from env), render nothing — admin-created events have no visible host.
- Otherwise render: host avatar + `name_to_show` + link to `/[locale]/user/[username]` if username is set; name only (no link) if no username.
- Add translation key `eventDetail.organizer`.

---

## Phase 9 — Auth Enhancements

### 9.1 Social OAuth (Facebook + Google) ✅

Supabase Auth handles the OAuth flow. Reference: https://supabase.com/ui/docs/nextjs/social-auth

- **Facebook**: enable in Supabase Dashboard → Auth → Providers. Requires a Facebook App with `https://<project>.supabase.co/auth/v1/callback` as the OAuth redirect URI.
- **Google**: enable in Supabase Dashboard → Auth → Providers. Requires a Google Cloud OAuth 2.0 client.
- Both use `supabase.auth.signInWithOAuth({ provider: 'facebook' | 'google', options: { redirectTo: '/auth/callback' } })`.
- `/auth/callback` route handles OAuth code exchange; syncs provider `avatar_url` into `profiles.avatar_url` on first login using a single atomic `UPDATE … WHERE avatar_url IS NULL` (no manual upload overwrite risk).
- `SocialAuthButtons` component on both `LoginPage` and `SignupPage` — outline variant, inline SVG provider icons ("Влез с Facebook", "Влез с Google"), separated by an "или" divider.
- Profile page auto-corrects email-based usernames inserted by the DB trigger (detects `@` in username, derives clean slug from email prefix on first visit).
- Duplicate email on signup: map explicit Supabase errors **and** detect confirmed duplicates via empty `data.user.identities` (Supabase anti-enumeration — no error, no email sent); show translated message with link to login instead of signup-success.

### 9.2 Remember me ✅

Implemented in Phase 3.1 — `a4r-remember` cookie + cookie maxAge stripping in browser/server/middleware when unchecked. Default: unchecked (session-only).

### 9.3 Duplicate email on signup ✅

Two cases:

1. **Explicit error** — Supabase may return `"User already registered"`; map to `Profile.userAlreadyExists`.
2. **Anti-enumeration (confirmed duplicate)** — `signUp` returns `{ error: null, user: { identities: [] } }`: no confirmation email is sent. Detect with `!data.user?.identities?.length`, show the same message + inline link to login. Do **not** redirect to signup-success.

Unconfirmed duplicate (same email, never confirmed): Supabase resends the confirmation email and returns a user **with** identities — signup-success is correct.

### 9.4 reCAPTCHA v3 ✅

- Script loaded in `src/app/[locale]/auth/layout.tsx`; `executeRecaptcha` in `src/lib/recaptcha.ts`.
- Login + signup verify via `POST /api/auth/verify-captcha` before Supabase auth (score threshold 0.5).
- Env: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`.

### 9.5 Terms checkbox on signup ✅

Signup form includes `acceptTerms: z.boolean()` with a `.refine` rule enforcing `true`. Label links to `/[locale]/legal/terms` (opens in new tab). Submit button is disabled until the checkbox is checked.

### 9.6 "See public profile" in navigation ✅

- **Desktop avatar dropdown**: "Виж публичния си профил" as the first item (with separator below), linking to `/[locale]/user/[username]`. `Header` (Server Component) fetches the profile and passes `username` down to `HeaderAuthButton`. Shown whenever `username` is set (always, since profile page auto-derives it).
- **Mobile Profile sheet**: same link appears above "Създай събитие" in the authenticated state of `MobileBottomNav`. Username is fetched client-side in a `useEffect` alongside `getUser`.
- Both items are auth-gated — only appear when the user is logged in.

---

## Phase 10 — Event Interactions

### 10.1 Claim event ✅ (UI + DB; email notifications pending)

**DB migration:** ✅

```sql
create table public.event_claims (
  id uuid primary key default gen_random_uuid(),
  event_id int8 not null references public.events(id) on delete cascade,
  claimant_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  message text,
  created_at timestamptz not null default now()
);
-- one pending claim per user per event
create unique index on event_claims (event_id, claimant_id) where status = 'pending';
```

RLS: INSERT when `claimant_id = auth.uid()`; SELECT when `claimant_id = auth.uid()` (user sees their own claims); no public UPDATE/DELETE.

**API routes (`src/app/api/events/claim/`):**

- `POST route.ts` ✅ — auth check → insert claim → 409 on duplicate. **Pending:** send admin email via Resend/Nodemailer with event title, claimant name, message, and two action links:
  - `GET /api/events/claim/[id]/approve` — updates status to `approved`, emails claimant with approval
  - `GET /api/events/claim/[id]/decline` — updates status to `declined`, emails claimant with decline message
- Both action routes use a signed token (HMAC of claim ID + secret) so they work without a login session. **Pending.**

**UI — event detail page:** ✅

- `ClaimEventButton` component (`src/components/ClaimEvent/ClaimEventButton.tsx`) — responsive Dialog/Drawer, `StatusBadge` for pending/approved/declined states.
- `claimsApi.getMyClaimForEvent` called on page load to hydrate initial claim status; passed as `initialClaimStatus` prop.
- Button visible when: user is authenticated AND `event.created_by !== user.id`.
- i18n keys in all 4 locale files under `SingleEvent` namespace.

### 10.2 Report event ✅ (UI + DB; admin email pending)

**DB migration:** ✅

```sql
create table public.event_reports (
  id uuid primary key default gen_random_uuid(),
  event_id int8 not null references public.events(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  message text,
  status text not null default 'new' check (status in ('new', 'reviewed')),
  created_at timestamptz not null default now()
);
```

RLS: INSERT for authenticated users; SELECT restricted to admin via service role in API route.

**API route `POST /api/events/report`:** ✅

- Auth required (authenticated users only at this scale).
- Insert report → 409 on duplicate. **Pending:** send admin email with event details, reporter info, reason.
- Returns 200 with `{ ok: true, report }`.

**UI — event detail page:** ✅

- `ReportEventButton` component (`src/components/ReportEvent/ReportEventButton.tsx`) — responsive Dialog/Drawer, ghost variant, `ReportedBadge` on already-reported state.
- Optional message textarea (not required — lower friction chosen over min-length enforcement).
- `reportsApi.getMyReportForEvent` called on page load; `alreadyReported` bool passed as prop.
- Success / duplicate / error toasts via sonner.
- i18n keys in all 4 locale files under `SingleEvent` namespace.

---

## Phase 11 — Homepage Hero & Calendar View

### 11.1 Homepage create event hero ✅

Compact hero on `src/app/[locale]/page.tsx`: translated `HomePage.pageTitle` H1 + "Създай събитие" CTA (`Link` to `/create-event`; middleware redirects guests to login with `next`). Server Component — no extra client JS.

### 11.2 Calendar month view ✅

View mode toggle in `EventsList`: **Карти** (grid, default) ↔ **Календар** (month grid). Preference persisted in `localStorage` via `useViewPreference`.

**Calendar layout (`src/components/EventsCalendar/`):**

- Month grid, week rows starting Monday, rendered by `EventsCalendarView.tsx`.
- Event chips span multiple day columns for multi-day events using a track-packing algorithm in `calendar-utils.ts` (up to 10 tracks per week).
- Each chip: event thumbnail + title (truncated) + time; clicking navigates to event detail.
- Today highlighted; days outside the current month dimmed.

**Navigation:**

- Prev month (`<`) / Next month (`>`) buttons with month + year heading.
- Month/year header shows current position.

**Data:**

- `useCalendarMonthEvents(year, month)` hook in `src/hooks/query/events.ts` — per-month cache key, queries `eventsApi.getEventsByMonthRange`, disabled for future months.
- Each month lazily populated on navigation; previous months reuse the TanStack Query cache.

**Additional — event detail hero zoom ✅:**

- LightGallery zoom plugin wired into `EventHeroGallery` — clicking the hero image opens a full-screen zoomable lightbox.

---

## Phase 12 — Notifications

### 12.1 DB schema

```sql
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,            -- e.g. 'event_today', 'event_tomorrow'
  event_id int8 references public.events(id) on delete cascade,
  message text not null,
  read bool not null default false,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, read, created_at desc);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
```

RLS on `notifications`: SELECT / UPDATE (`read = true`) where `user_id = auth.uid()`.
RLS on `push_subscriptions`: INSERT / SELECT / DELETE where `user_id = auth.uid()`.

Add `notification_reminders boolean not null default true` column to `profiles`.

Run `npm run db:types` after migrations.

### 12.2 In-app notification UI

- **Bell icon** in the header (right of locale switcher on desktop; in the header bar on mobile).
- **Unread badge**: small red dot or count badge when `notifications.read = false` rows exist.
- **Desktop**: `<Popover>` opens a notification list (max 10 latest, scrollable).
- **Mobile**: `<Sheet>` from the bottom with the notification list.
- Each notification row: event image thumbnail, message text, relative time, read/unread visual indicator.
- Clicking a notification: marks as read + navigates to event detail.
- "Маркирай всички като прочетени" action button at top of list.

Fetch notifications with a TanStack Query hook (`useNotifications`): `useQuery` with a 60-second `refetchInterval` to simulate near-real-time updates without a WebSocket.

### 12.3 Supabase Edge Function — daily notification generator

Create `supabase/functions/generate-notifications/index.ts`:

1. Select all users where `profiles.notification_reminders = true`.
2. For each user, find their saved events starting today or tomorrow.
3. For each match, upsert a notification row (unique on `user_id + event_id + type + date` to prevent duplicates).
4. Trigger push delivery (see 12.4) for users with push subscriptions.

Schedule via Supabase cron (pg_cron or Dashboard scheduled function): `0 8 * * *` (08:00 daily).

### 12.4 PWA push notifications

- Service worker in `public/sw.js` (or via `next-pwa`) handles `push` events and shows `self.registration.showNotification(...)`.
- On first PWA install (or from profile settings), request `Notification.permission`. On grant, call `serviceWorkerRegistration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })` and POST the subscription object to `POST /api/push/subscribe`.
- `POST /api/push/subscribe` (auth required): upserts the subscription into `push_subscriptions`.
- The Edge Function in 12.3 calls `POST /api/push/send` (internal, service role) for each subscription, which uses `web-push` npm package to send the payload.
- Env: `VAPID_PUBLIC_KEY` (public), `VAPID_PRIVATE_KEY` (server-only), `VAPID_SUBJECT` (mailto: or URL).

### 12.5 Notification preferences in profile

- Toggle in profile form: "Напомни ми за предстоящи запазени събития" → maps to `profiles.notification_reminders`.
- Toggle for push: "Получавай push известия" → shows browser permission state; clicking requests permission if not granted.

---

## Phase 13 — Email Marketing (Brevo)

### 13.1 Brevo API integration

Brevo (formerly Sendinblue) handles email marketing. All calls go through API routes — never expose `BREVO_API_KEY` to the client.

- Install `@getbrevo/brevo` npm package.
- `src/lib/brevo.ts` — thin wrapper: `subscribeContact(email, tagIds: number[])`, `unsubscribeContact(email)`, `updateContactAttributes(email, attrs)`.
- `POST /api/newsletter/subscribe` — auth check (optional, upserts by email) → call `subscribeContact` → return 200.

### 13.2 Tag subscription UI

In the profile page, add a "Любими тагове за имейл" section:

- Renders all available tags as checkboxes.
- User checks the tags they want email alerts for.
- On save: call the subscribe route with email + selected tag IDs.
- Brevo contact attributes are set (e.g. `TAG_SPORT: true`, `TAG_MUSIC: true`).
- Brevo automation/campaign uses these attributes to segment recipients.

When a new event with a followed tag is published (future automation, manual for now): admin sends a Brevo campaign targeted to the relevant segment.

### 13.3 Footer newsletter CTA

- Small "Абонирай се за нови събития" chip/link in the desktop footer and "More" mobile sheet.
- If authenticated → scrolls to tag subscription section in profile.
- If guest → links to `/[locale]/auth/signup`.

---

## Phase 14 — Advertisement & Support Pages

### 14.1 Sponsorship/advertisement page — mostly ✅

Route: `src/app/[locale]/advertise/page.tsx` — static Server Component with `generateMetadata`, `Advertise` i18n namespace (all 4 locales), intro + 4 option cards + contact section with obfuscated email.

Wired in: desktop footer dropdown, mobile "More" sheet, `sitemap.ts`.

**Remaining:** cross-link from `why-all4ruse/page.tsx`.

### 14.2 "Подкрепи ни" (Revolut support)

Revolut link: `https://revolut.me/silvenamiteva`.

**Not implemented yet.** Planned placement:

- Desktop footer: small "☕ Подкрепи ни" text link, rightmost position (before social icons).
- Mobile "More" sheet: listed item with a coffee emoji icon.
- (Optional) Profile page dropdown: subtle link in the "About" section.

Open link in new tab. Simple `<a href="..." target="_blank" rel="noopener">` — no modal.

---

## Phase 15 — Observability: Error Tracking & Product Analytics

Today the app has **no error monitoring**. The only visibility is scattered `console.error` calls that land in Vercel runtime logs (retained **1 hour** on Hobby, **1 day** on Pro) plus Supabase auth logs (**1 hour** on Free, **7 days** on Pro). By the time a user reports a problem, the evidence is usually already gone. Worse, the flows we care most about are the least covered: event creation swallows its error entirely, and registration runs in the browser so its failures never reach our server at all.

Goal: **every user-facing failure becomes a durable, grouped, alertable event with enough context to fix it without asking the user to reproduce.**

Split into two parts. **Part A (15.1–15.12) is error tracking** — build this now. **Part B (15.13) is button-click analytics** — deferred, and it needs a product decision before we start.

### 15.1 Locked decisions

- **Sentry** (`@sentry/nextjs`) is the error backend. Not a DIY `error_log` table: a homegrown table cannot capture client-side crashes (which is exactly where registration lives), gives no sourcemap symbolication so minified stacks stay unreadable, and has no grouping or alerting. Free tier is 5k errors/month — ample for this traffic.
- **Errors only in v1.** `tracesSampleRate: 0` and **no Session Replay**. Rationale: 80% of traffic is mobile and this is an SEO-first site, so the client bundle matters; Replay adds roughly 50 KB and pulls in real GDPR obligations (it records user input). Performance tracing and Replay can be switched on later — both are config-only changes once the wiring exists.
- **Tunnel through our own domain** (`tunnelRoute`). Roughly a third of EU browser traffic runs an ad blocker that blocks `*.ingest.sentry.io` outright. Without a tunnel our client error counts would be silently wrong, and biased toward exactly the technical users most likely to hit edge cases. This is not optional given that capturing registration errors is a primary goal.
- **No PII.** `sendDefaultPii: false`. We attach the Supabase user **UUID** only — never email, name, or phone. See 15.10.
- **Sentry is not consent-gated.** It runs as security/functionality processing under legitimate interest, cookie-free. Gating it behind analytics consent would drop the majority of the errors we are trying to see. This is only defensible because we send no PII and no Replay — if either changes, revisit.
- **A thin internal wrapper**, not scattered SDK calls. All Sentry imports live in `src/lib/observability/*`, matching how `lib/api/*` and `lib/geocode/*` already isolate external services. Swapping vendors later touches one folder.
- **No Server Actions exist** in this codebase (`"use server"` appears nowhere), so `Sentry.withServerActionInstrumentation` is not needed. Revisit if server actions are introduced.

### 15.2 Install and wire Sentry

- `npm install @sentry/nextjs`. Create the Sentry project (platform: Next.js), note the org slug, project slug, and DSN.
- `src/instrumentation-client.ts` — browser init. Export `onRouterTransitionStart = Sentry.captureRouterTransitionStart`.
- `sentry.server.config.ts` and `sentry.edge.config.ts` at the project root — Node and edge init.
- `src/instrumentation.ts` — `register()` dynamically imports the server/edge config based on `process.env.NEXT_RUNTIME`, and **must** export `onRequestError = Sentry.captureRequestError`. Without that export, errors thrown in Server Components, route handlers, and middleware never reach Sentry — this is the single most common setup mistake.
- `next.config.ts` — wrap with `withSentryConfig` as the **outermost** wrapper: `withSentryConfig(withSerwist(withNextIntl(nextConfig)), { ... })`. Order matters; wrapping inside `withSerwist` breaks source map upload.

Options to set in `withSentryConfig`:

| Option | Value | Why |
| --- | --- | --- |
| `org` / `project` | from env | required for upload |
| `authToken` | `process.env.SENTRY_AUTH_TOKEN` | source map upload |
| `tunnelRoute` | `"/monitoring"` | fixed route, ad-blocker bypass. Must be fixed, not `true` — a random route cannot be excluded from the middleware matcher |
| `sourcemaps.deleteSourcemapsAfterUpload` | `true` | readable stacks in Sentry without shipping our source to the browser |
| `disableLogger` | `true` | strips Sentry's own debug logging from the production bundle |
| `automaticVercelMonitors` | `true` | free cron monitoring for the `/api/push/send-reminders` job in `vercel.json` |
| `silent` | `!process.env.CI` | quiet local builds |

- **Middleware matcher fix.** `src/middleware.ts` currently uses `matcher: ["/((?!_next|_vercel|api|auth|.*\\..*).*)"]`. `/monitoring` is **not** excluded by that pattern, so every tunnelled error POST would be run through next-intl + a Supabase `getUser()` call. Add `monitoring` to the negative lookahead.
- Build uses `next build --webpack`, so the Sentry **webpack** setup path applies: source maps upload via the plugin during build, and `webpack.treeshake.removeDebugLogging` is available. No Turbopack caveats.
- **No service worker change needed.** `src/app/sw.ts` only caches `/_next/static/*` and images; the tunnel is a `POST` and is never cached.
- Builds must not break when `SENTRY_AUTH_TOKEN` is absent (local dev, or a contributor without Sentry access) — the build should succeed and simply skip source map upload. Verify this explicitly.

**Env vars** (add to `.env.local` and Vercel; document in ARCHITECTURE.md):

```bash
# Error tracking — public DSN, safe in the browser
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@oXXXX.ingest.de.sentry.io/XXXX

# Build-time only (source map upload). Never needed at runtime.
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=all4ruse
```

Prefer an **EU-region** Sentry project (`ingest.de.sentry.io`) so error data stays in the EU — simpler GDPR story for a Bulgarian site.

### 15.3 Internal reporting layer — `src/lib/observability/`

Three small modules. Everything else in the app imports from here, never from `@sentry/nextjs` directly.

- **`features.ts`** — a string-literal union of every feature we tag. Consistent tags are what make Sentry searchable; free-form tag strings rot within a week. Start with:

```ts
export type ObservedFeature =
  | "event-create" | "event-update" | "event-delete" | "event-image-upload"
  | "smart-fill-facebook" | "smart-fill-facebook-check" | "smart-fill-text"
  | "smart-fill-photo" | "smart-fill-admin-scrape" | "smart-fill-image-reupload"
  | "auth-signup" | "auth-login" | "auth-oauth" | "auth-callback"
  | "auth-captcha" | "auth-password-reset" | "account-delete"
  | "profile-update" | "profile-avatar-upload"
  | "saved-events" | "event-claim" | "event-report"
  | "geocode" | "push-subscribe" | "push-reminders";
```

- **`report.ts`** — `reportError(error: unknown, ctx: { feature: ObservedFeature; extra?: Record<string, unknown> }): void`. Isomorphic (works in both Server Components/route handlers and Client Components). Normalizes `unknown` into an `Error`, sets the `feature` tag, attaches `extra` as Sentry context, and never throws — a failure in reporting must never break the user's flow. Optionally mirror to `console.error` in development for local visibility.
- **`user.ts`** — `setObservedUser(userId: string | null)` wrapping `Sentry.setUser({ id })` / `Sentry.setUser(null)`. **UUID only.** Call it once where the session is already known (locale layout for the initial state, and after login/logout/signup) so every subsequent error is attributable to a user without us storing an email in Sentry.

Rule for the rest of the phase: **replace** existing `console.error` calls with `reportError`, do not stack both. The prefixed-string convention (`[smart-fill/facebook]`) becomes the `feature` tag.

### 15.4 Event creation coverage

The biggest blind spot in the app. `src/components/EventForm/EventForm.tsx` has bare `catch {}` blocks that discard the error object completely:

- **line ~855** — the entire `onSubmit` path: image uploads, coord resolution, `createEvent` / `updateEvent`, tag writes. Every possible failure becomes `toast.error(t("error"))` with nothing recorded anywhere.
- **line ~871** — `handleDelete`.
- **line ~707** — `patchEventCoords` on geocode retry.

Tasks:

- Change all three to `catch (err)` and call `reportError(err, { feature: ..., extra: ... })`. Keep the user-facing toast exactly as-is — this is diagnostics, not a UX change.
- Attach enough context to fix a failure without the user: `mode` (create/edit/duplicate), `isRecurring`, image count, whether images were newly uploaded vs reused stored paths, `coords_source`, tag count, and `initialData.id` when editing. **Never** attach full form values (free-text description could contain personal data).
- Split the submit `try` so we can tell *which step* failed. One generic "event create failed" issue covering four distinct root causes is nearly useless. Either wrap the image-upload loop and the save call separately, or tag a `step` (`"image-upload" | "geocode" | "save" | "tags"`) in `extra`.
- `src/lib/api/events.ts` — leave throwing behaviour as-is; the form is the right place to report, since that's where the user-visible outcome is decided.

### 15.5 Smart Fill coverage — Facebook, AI text, AI photo

Where the external dependencies are, and where failures are least reproducible. Give every import a **correlation id** so the client-side symptom and the server-side cause are one search.

- Generate a short `importId` at the start of each `src/app/api/smart-fill/*` route, return it in the JSON response, and include it in every `reportError` call from that request. When a user says "the Facebook import failed", the id from the UI leads straight to the issue.
- **`facebook/route.ts`** — replace `console.warn` (~L69) and `console.error` (~L90). Attach: source URL, Apify `runId`, retry attempt number, whether it was the empty-dataset retry path. Also report the currently **re-thrown** rate-limit RPC failure (~L56), which today becomes an unhandled 500 with no log at all.
- **`text/route.ts`** — replace `console.error` (~L65). Attach prompt **length** (not the prompt text), Gemini model used, and whether the fallback model was reached. Same re-thrown rate-limit gap as above.
- **`photo/route.ts`** — two distinct paths, and they must not be conflated:
  - Storage upload failure (~L89) → 502, report as an error.
  - Gemini extraction failure (~L105) → currently returns **HTTP 200** with a partial draft and a `warning`. This is correct UX (the image is saved) but it means "AI upload didn't work" is invisible in every error metric. Report it explicitly with a `partial_success` marker so it shows up without changing the response contract.
- **`facebook/check/route.ts`** (~L43) and **`admin-scrape/route.ts`** (~L83) — same treatment; tag the scrape `source` (grabo / ruse-danube) on admin-scrape.
- **`src/lib/smart-fill/apify.ts`** — the empty-dataset diagnostics at ~L411–424 already log URL, run id, and a raw response snippet. Move that payload into `reportError` context so it survives longer than an hour.
- **`src/lib/smart-fill/image-reupload.ts`** — logs and returns `null` on every failure (~L41, L49, L54), so an event can be created with a **missing image** and no signal at all. Report each failure. Keep returning `null` — swallowing is the right behaviour here, silence is not.
- **`src/lib/smart-fill/gemini.ts`** — retry and fallback-model `console.warn`s (~L129, ~L255) are useful signal, not errors. Report as Sentry **breadcrumbs** or messages at `warning` level, not exceptions, so they add context to real failures without inflating the error count against the free-tier quota.
- **`SmartFillPanel.tsx`** — report the client-side network/abort catch (~L249) with the `importId`, but **skip user-initiated aborts** (the overlay's cancel button uses `AbortController`; a deliberate cancel is not an error). Check for `AbortError` before reporting.

### 15.6 Auth and registration coverage

Registration is currently invisible to us: `src/app/[locale]/auth/signup/page.tsx` is a Client Component, so `supabase.auth.signUp` failures never touch our server and never reach Vercel logs.

- **`signup/page.tsx`** (~L134) — report `signUp` errors before showing the mapped message. Attach: the Supabase error code/message, whether it was classified as a duplicate, whether reCAPTCHA passed, and locale. **Never** attach the email or password. Exclude the anti-enumeration duplicate case (empty `identities`) from error reporting — that's expected behaviour, not a fault.
- **`login/page.tsx`** (~L100) and **`forgot-password/page.tsx`** (~L61) — same pattern.
- **`SocialAuthButtons.tsx`** (~L62) — report OAuth initiation failures, tagged with provider.
- **`src/app/auth/callback/route.ts`** — the highest-value fix in this section. Today an `exchangeCodeForSession` failure (~L39) just redirects to `?error=auth_callback_failed` with **nothing logged**, and the profile-bootstrap error is caught by an **empty `catch`** (~L64). If OAuth signups are quietly failing for a subset of users right now, we have no way to know. Report both. Keep the redirect behaviour unchanged.
- **`src/app/auth/confirm/route.ts`** — same empty-catch pattern (~L62), same fix.
- **`verify-captcha/route.ts`** (~L52–61) — already logs score/action/hostname on failure. Report as a `warning`-level message with those fields, not an exception: a low reCAPTCHA score is usually a bot, not a bug. Watch the volume and adjust if it drowns the quota.
- **`src/lib/api/profiles.ts`** (~L103) — `if (error && error.code !== "23505") throw error` is thrown from the callbacks and then ignored there. Once the callbacks report, this is covered.
- Wire `setObservedUser` on successful login/signup and clear it on logout.

### 15.7 Remaining API route coverage

Sweep the rest so "every user error" is literally true. For each: replace `console.error` with `reportError`, or add reporting where there is none.

- `account/delete/route.ts` — service-role deletion; a partial failure here leaves orphaned data and must be loud.
- `events/claim/route.ts`, `events/report/route.ts` — distinguish real errors from expected 409 duplicates (do **not** report 409s).
- `geocode/route.ts`, `geocode/suggest/route.ts`, `geocode/place/route.ts`, and `src/lib/geocode/google.ts` (~L60–174 `console.warn`s) — report as warnings, not exceptions. A failed geocode is a designed-for outcome (publish must never fail because Google is down), so these must not look like crashes.
- `admin/geocode-upcoming/route.ts` (~L35, L50, L55).
- `push/subscribe/route.ts`, `push/reminder-time/route.ts`.
- `push/send-reminders/route.ts` — the hourly cron currently discards individual send failures via `Promise.allSettled` (~L44–60) with no logging. Report an aggregate (counts of sent/failed plus a sample of failure reasons), not one issue per subscription. `automaticVercelMonitors` separately catches the case where the cron stops running at all.
- `saved-events/route.ts` — treat the `23505` unique violation as a no-op, not an error (already handled in `saved-events.ts`; do not start reporting it).
- `src/lib/api/events.ts` (~L464, L486) and `src/lib/api/profiles.ts` (~L334) — build/sitemap helpers. `getAllSlugs` deliberately returns `[]` on error so builds don't fail; report it so that silent degradation is at least visible.
- Client-side toast catches: `ProfileForm.tsx` (10 sites, including the `.catch(console.error)` at ~L550), `ProfileAccountSecurity.tsx`, `ClaimEventButton.tsx`, `ReportEventButton.tsx`, `EventSaveButton.tsx`, `PushNotificationCard.tsx`, `EventsMapView.tsx`, `ProfilePastEvents.tsx`, `promptRemindersOnSave.tsx`.

### 15.8 Global boundaries

- **Create `src/app/global-error.tsx`** — does not exist today. Must be at `src/app/` (not under `[locale]`), be a Client Component, render its own `<html>` and `<body>`, and call `Sentry.captureException(error)`. This is the last-resort net for render errors in the root layout, which `[locale]/error.tsx` cannot catch.
- **`src/app/[locale]/error.tsx`** — currently `console.error(error)` in a `useEffect` (L19–21), which writes only to the **user's own browser console** where we can never see it. Replace with `reportError`, passing the `error.digest` so the client-side boundary can be correlated with the server-side issue that produced it.
- Keep both boundaries' visual output unchanged.
- `src/app/[locale]/not-found.tsx` — leave alone. A 404 is not an error and reporting it would be noise.
- This overlaps with the open TASKS Phase 10 item for `loading.tsx` / `error.tsx` — do the Sentry wiring here and cross-reference rather than duplicating the work.

### 15.9 Verify the wiring actually works

Do not trust a green build; each runtime is wired separately and can silently fail. Deliberately trigger one error in each and confirm it arrives in Sentry:

- A Client Component error (throw from a button handler).
- A Server Component error (throw in a page).
- A route handler error (throw in an API route) — this is the one that proves `onRequestError` is exported correctly.
- Middleware.
- Confirm the stack trace is **readable** (source maps uploaded and applied), that the event was delivered via `/monitoring` and not `*.ingest.sentry.io` (check the network tab), and that it still arrives with an ad blocker enabled.
- Confirm no `email` appears anywhere in a signup-failure event's payload.

### 15.10 GDPR and legal

Non-optional given the existing cookie-consent system and legal pages.

- `sendDefaultPii: false`; user context is the Supabase **UUID** only.
- Add a `beforeSend` scrubber that strips `email`, `password`, `phone`, and `full_name` keys from any event payload — defence in depth, so a future careless `extra` cannot leak PII.
- Prefer the **EU** Sentry region (see 15.2).
- Update `src/app/[locale]/legal/privacy/page.tsx` — Sentry as a data processor: what is collected (error diagnostics, pseudonymous user id, IP for the request), why (security and service functionality, legitimate interest), where it is stored (EU), and retention. The page already names Vercel, so extend the existing sub-processor list rather than adding a new section.
- Update `src/app/[locale]/legal/cookies/page.tsx` — state that error monitoring is cookie-free and therefore not consent-gated. If Session Replay is ever enabled, it **must** move behind analytics consent.
- All four locales.

### 15.11 Alerting — otherwise none of this gets read

A dashboard nobody opens is worth nothing. The point of this phase is finding out *without being told*.

- Sentry alert rule: **email on every new issue** (first occurrence of a not-seen-before error). Low volume at this scale, high value.
- A second rule for **spike detection** on the `feature` tag values `event-create`, `auth-signup`, `smart-fill-facebook` — these are the flows where a silent breakage costs real users.
- Cron monitor alert from `automaticVercelMonitors` if `send-reminders` stops running.
- Set a **spend cap / rate limit** in Sentry so a runaway loop cannot burn the whole monthly quota in an hour.

### 15.12 Quality gate

- `npm run types` and lint on touched files.
- Check the production client bundle delta. Errors-only Sentry should land around 30–40 KB gzipped. If it is materially larger, tracing or replay integrations are being pulled in and need tree-shaking.
- Re-run a Lighthouse pass on the home page — this is an SEO-first site and the phase must not regress mobile performance.
- Update **ARCHITECTURE.md**: new `src/lib/observability/` layer in the folder structure, the four Sentry env vars, `@sentry/nextjs` in Dependencies, and a short "Observability" section covering the tagging convention and the no-PII rule. Do this at implementation time, once the code exists.

### 15.13 Part B — button click analytics (deferred, needs a decision)

Separate concern from error tracking, deliberately **not** built into Sentry (it is not an analytics tool, and click volume would obliterate the error quota). Goal: count clicks on specific UI elements — Create Event CTA, view-mode toggles (grid/calendar/map), Smart Fill tabs, save-event icon, filter usage, signup CTAs.

Three viable options, with an honest read on each:

| Option | Cost | Accuracy | Effort |
| --- | --- | --- | --- |
| **GA4 custom events** via the existing `gtag` in `TrackingScripts.tsx` | free | undercounts ~30–40% (consent-gated + ad blockers) | very low — gtag is already loaded |
| **PostHog** | free to 1M events/mo | good, and supports funnels + session replay | medium — new vendor, new privacy-policy entry, new consent decision |
| **First-party `ui_events` table** in Supabase | DB rows | exact, ad-blocker-proof | medium — table, RLS, batching endpoint, and an admin view to read it |

**Recommendation: start with GA4 custom events.** Google Analytics is already wired and consent-gated in `src/components/layout/TrackingScripts.tsx`, so this is close to zero new infrastructure. The undercount is uniform across buttons, so *relative* comparisons — which is what actually drives product decisions ("the Create Event CTA gets 3× the clicks of the calendar toggle") — stay valid. Absolute totals will be low; if exact first-party numbers are ever needed, the Supabase table is the fallback.

When we build it:

- `src/lib/observability/track.ts` — `trackEvent(name: TrackedEvent, props?: Record<string, string | number>)` with a string-literal union of event names, mirroring `features.ts`. One file to change if we later switch to PostHog.
- Respect the existing `hasAnalyticsConsent` check — no event fires without analytics consent.
- No-op safely when `NEXT_PUBLIC_GA_ID` is unset (local dev).
- Never pass PII or free-text user content as event properties.
- Instrument a **small** initial set (5–8 buttons). Tracking everything produces a dashboard nobody reads; pick the elements where a real decision is pending.

**Blocked on a decision:** GA4 vs PostHog vs first-party table. Do not start Part B until that is settled.

---

## Notes

- **Design tokens** in `globals.css` are finalized — the oklch token set from ARCHITECTURE.md is ready to copy in on day one. No placeholder colors.
- **Design reference** — the existing all4ruse.com website will be shared when we reach the UI build phase. Match layout/spacing from it where relevant.
- **Fonts** — Comfortaa (cyrillic subset required for Bulgarian/Ukrainian), Source Serif 4, JetBrains Mono. Load all three via `next/font/google` in the root layout.
- **View Transitions** — enabled in `next.config.ts`. The image expand effect works by matching `viewTransitionName` between `EventCard` and the event detail hero. If the browser does not support View Transitions (Firefox without the flag), the navigation falls back to a normal page load silently.
- **`npm run types`** — run after any major refactor or before committing. It catches type errors across the whole project without building.
- **Supabase RLS policies** need to be in place before auth-guarded pages work correctly in production. Set them up alongside Phase 3.
- **Event image uploads** via `EventForm` — wire Supabase Storage + file input in the existing user-facing form when ready; metadata stays manageable from Supabase if you prefer manual URLs in early iterations.
- **Event content translation** (Google Translate) is deferred to future scope as defined in TASKS.md.
- **FB image expiry bug** — the permanent fix is already specified in Phase 6.2 (facebook/route.ts): fetch the image server-side from Apify's response URL and re-upload it to Supabase Storage immediately. The Facebook CDN URL is discarded. Ensure this is implemented before Phase 9 goes live.
- **Revolut** support link: `https://revolut.me/silvenamiteva` — owner's personal Revolut handle.
- **reCAPTCHA v3** scores are continuous (0.0–1.0). Threshold 0.5 is a reasonable starting point; tune based on false-positive reports.
- **VAPID keys** for push notifications: generate once with `npx web-push generate-vapid-keys` and store in env. Never regenerate without clearing all existing push subscriptions.
