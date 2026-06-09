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

## Phase 4 — Saved events

Authenticated users can bookmark events; bookmarks persist in the database. Guests can discover the feature but must create an account before saving. **There is no in-app admin area** — listings, tags, moderation, and roles are managed in **Supabase** (Dashboard, SQL, RLS). This phase matches `TASKS.md` Phase 7.

### 4.1 Data model + RLS

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

### 4.2 API — `lib/api`

- Add `src/lib/api/saved-events.ts` and export it from `src/lib/api/index.ts`.
- `savedEventsApi` methods:
  - `getSavedEventIds(client, userId)` — returns ids for hydrating save icons on listing pages.
  - `getSavedEvents(client, userId)` — returns full event records with tags for the Saved page, ordered by `startDate` / `startTime` ascending.
  - `saveEvent(client, userId, eventId)` — inserts `{ user_id, event_id }`; use the DB unique constraint as the source of truth.
  - `unsaveEvent(client, userId, eventId)` — deletes the matching row.
- Keep all Supabase calls in `src/lib/api/*` per project rules.
- For listing pages, fetch the current user on the server and pass `savedEventIds` into the interactive list only when authenticated. Guests should not trigger a per-card auth fetch.

### 4.3 EventCard — save control

- Add a save/bookmark icon button over each event image, **bottom-right**.
- Authenticated behavior:
  - Empty icon means not saved.
  - Filled icon in `primary` color means saved.
  - Clicking toggles saved/unsaved and updates the UI immediately.
  - On failure, revert the optimistic state and show a translated toast.
- Guest behavior:
  - Clicking the save icon opens a responsive dialog/drawer instead of redirecting immediately.
  - Copy explains that to use this feature and track events, the user needs to create an account and that it takes about 1 minute.
  - Primary action links to signup; secondary action links to login or closes the dialog.
- Implement the icon as a small Client Component composed into the existing server-friendly `EventCard`; avoid duplicating the full card layout.
- Mirror the same save control on the **event detail** page for consistency after the listing behavior is stable.

### 4.4 Client state and mutations

- Add TanStack Query hooks under `src/hooks/query/saved-events.ts` because save/unsave is interactive client-side state.
- Query keys should separate:
  - all saved events for a user,
  - saved event ids for a user,
  - individual event toggle state if needed.
- Mutations should invalidate saved ids and saved events after settling.
- Use optimistic updates for the icon so the UI feels instant.
- Keep the page content itself SSR-first where possible; use client hooks only for toggles/removal.

### 4.5 Saved page

- Implement `src/app/[locale]/profile/saved-events/page.tsx` (already scaffolded): **auth required**.
- Guests who open the page directly can redirect to login, because the dialog/drawer requirement applies to clicking the save button from public event cards.
- Load saved events on the server through `savedEventsApi.getSavedEvents`.
- Split saved events into sections:
  - **Upcoming + current**: events where `endDate >= today`, sorted by `startDate` / `startTime` ascending.
  - **Past**: events where `endDate < today`, hidden initially behind a “Past events” control. Do not load/render past saved events until the user clicks that control; then fetch and show them, sorted newest first unless product decides otherwise.
- Empty states:
  - No saved events at all.
  - No upcoming/current saved events but past saved events exist.
  - No past saved events.
- Allow removal from the list by toggling the same filled save icon off, with the row/card disappearing from the section after success.

### 4.6 i18n + nav

- Add message keys for save, saved, unsave, auth prompt title/body, signup/login CTAs, mutation errors, empty states, section titles, and page title.
- Keep `bg` / `en` / `uk` / `ro` in sync; Bulgarian remains source copy.
- Ensure bottom nav **Saved** tab and any header/profile links point at `/[locale]/profile/saved-events`.
- Keep accessibility labels translated: “Save event”, “Remove from saved events”, and dialog/drawer labels.

### 4.7 Acceptance checks

- Guest clicking any card save icon opens the account prompt dialog/drawer and does not write to Supabase.
- Authenticated user can save and unsave from the home listing; icon state survives refresh.
- Authenticated user sees saved events on the Saved page split into upcoming/current and past.
- Removing from the Saved page updates the page without leaving stale cards.
- RLS blocks reading, creating, or deleting another user’s saved rows.

---

## Phase 5 — Public Profiles

Every registered user gets a public profile page at `/[locale]/user/[username]`. The page has two visual modes based on whether the person has ever created at least one event (past or present). For those users the page is designed to serve as a shareable mini-website. For pure consumers the page is a lighter info card.

### Design direction

- **Host profile** — anyone with ≥ 1 created event (any status, past or present). Full landing-page feel: full-width cover photo with a branded color gradient overlay, avatar (their logo), name, bio, social links, website CTA button, and below that their upcoming/live events (hero section) then past events (collapsed).
- **User profile** — registered users with no created events. Lighter card: cover strip with color accent, avatar, name, bio. No events section, no social deep-dive. Just the basics.
- **Single page, two visual modes**: one route `/[locale]/user/[username]`, branching on whether the profile has any created events.
- URL is clean and shareable: `all4ruse.com/bg/user/theirname`.

### 5.1 DB schema additions

- Add `header_url text` column to `profiles` — the cover/banner photo. (The `color` column was already added separately.)
- Add `UNIQUE` constraint on `profiles.username` — required for reliable URL routing.
- Run `npm run db:types` to regenerate `src/types/database.ts`.
- RLS: public profiles should be **readable by everyone** (`SELECT` policy with no `auth.uid()` check). Write policies remain owner-only.
- No new storage bucket needed — upload cover photos to the existing avatars bucket under a `headers/` path prefix.

### 5.2 Edit profile additions

- **Color picker**: add to `ProfileForm` a curated palette of ~12 oklch swatches (warm/cool/neutral tones that guarantee legible contrast on the public page). Avoid a free-form `<input type="color">` — non-designers make poor choices.
- **Header/cover photo upload**: same upload UX pattern as the existing avatar field (`<input type="file">` → upload to Supabase Storage `headers/{userId}` → save URL to `header_url`). Show a preview strip (not a large thumbnail) so the form stays compact.
- Extend `updateProfileSchema` / `UpdateProfileInput` in `src/types/index.ts` with `color` and `header_url`.
- Extend `ProfileUpdatePayload` in `src/lib/api/profiles.ts` with the two new fields.

### 5.3 Data layer — `profilesApi` additions

- Add `getPublicProfile(client, username)` — selects the profile row by `username` (public, no auth required). Returns `null` when not found → 404.
- Add `getProfileEvents(client, userId)` — fetches events where `created_by = userId`. Returns upcoming/live (`endDate >= today`, ascending) and the total count. Past events are loaded lazily on demand (same pattern as Saved page). A non-zero total count is also what determines the "host" mode on the page — no separate flag needed.
- Keep both functions in `src/lib/api/profiles.ts`.

### 5.4 Public profile page — route and rendering

- Route: `src/app/[locale]/user/[username]/page.tsx` — async Server Component, SSG-friendly (`generateStaticParams` is optional for now since usernames are dynamic).
- `generateMetadata` — title = `{name_to_show} | All4Ruse`, description = bio (truncated to 160 chars), OG image = `header_url` or `avatar_url`. Hreflang alternates via next-intl.
- `notFound()` when `getPublicProfile` returns null.
- Fetch profile + events in parallel (`Promise.all`). The presence of any events (total count > 0) determines which layout to render — no extra DB column needed.
- **Host layout** (profile has ≥ 1 created event):
  - Full-width hero: cover photo (`header_url`) with `color` gradient overlay at bottom. If no cover photo, render a solid color gradient using `color`. Avatar centered over the hero bottom edge (overlapping).
  - Below hero: name, bio, social icon row (fb/ig/tiktok/website), primary CTA "Visit website" button (if `website` set).
  - Upcoming & live events section — `EventCard` grid, same component as the listing page.
  - Past events section — collapsed by default, toggle button to load on client click (same lazy pattern as Saved page).
- **User layout** (no created events):
  - Full-width cover strip using `header_url` or a solid `color` gradient.
  - Avatar, name, bio. Social links if present.
  - No events section. Clean, minimal.
- **No edit controls on the public page** — it is purely read-only. The edit link lives on the private `/profile` page.

### 5.5 i18n

- Add message keys under `PublicProfile` namespace: `upcomingEvents`, `pastEvents`, `showPastEvents`, `visitWebsite`, `noEvents`, `eventsBy`, `notFound`, meta title/description templates.
- Keep all four locale files in sync.

### 5.6 SEO + JSON-LD

- `generateMetadata` per 5.4 above.
- Add `LocalBusiness` or `Organization` JSON-LD block for host-mode profiles (≥ 1 event): `name`, `url`, `logo` (`avatar_url`), `image` (`header_url`), `sameAs` (social links). Embed in `<script type="application/ld+json">`.

### 5.7 Username enforcement + UX

- If a user has no `username` set, their profile URL does not exist yet — the `/user/[username]` route returns 404 for an empty slug. The private profile page should nudge them to set one with a banner: "Set a username to get your public profile link."
- Username validation in `ProfileForm`: alphanumeric + hyphens only, 3–30 chars, checked for uniqueness via a debounced Supabase `select` call before save.
- After a successful username save, show the public profile link as a copyable chip on the profile page.

### 5.8 Acceptance checks

- Unauthenticated visitor can open `/bg/user/someusername` and see the profile without logging in.
- Host-mode page (≥ 1 event) renders cover photo, color gradient overlay, avatar, bio, social links, upcoming events, collapsed past events.
- User-mode page (no events) renders cover strip, avatar, name, bio — no events section.
- If `username` is not set, the `/user/` URL returns a proper 404.
- Changing `color` in profile form updates the public page gradient.
- Changing `header_url` in profile form updates the cover photo.
- `generateMetadata` produces correct OG image and title for sharing on WhatsApp/FB.

---

## Phase 6 — Event Creation Automation

Smart-fill helpers that pre-populate `EventForm` so users spend less time typing. All share the same output shape (`EventDraft`) and the same UX pattern: input → preview → "Apply to form". There is also a separate admin-only scraper (only the site owner's account) for pulling events from two additional local websites.

### Design principles

- None of these helpers are blocking paths. If Apify is down or the AI misparses, the user falls back to filling the form manually.
- Authentication is the only gate needed at this scale (~200 total events, users with at most 10 events, additions happen once a month). No dedicated rate-limit table — it is unnecessary over-engineering for this volume.
- The text prompt is **not a chat**. It is a single-shot input field. The user types or pastes a description, submits once, and the AI returns structured fields. There is no back-and-forth conversation.
- The AI-generated description should be written in an engaging, promotional Facebook-post style — punchy opening, key details stated clearly, emoji where natural, ending with a call to action. This is controlled entirely via the Gemini system prompt; the user can edit the result before saving.

### 6.1 `EventDraft` type and `SmartFillPanel` component

- Add `EventDraft` to `src/types/index.ts` — a partial `createEventSchema` shape: `title`, `description`, `startDate`, `startTime`, `endDate`, `endTime`, `place`, `imageUrl`, `facebookUrl`, `ticketUrl`, `price`, `tags`. All fields optional.
- Create `src/components/EventForm/SmartFillPanel.tsx` — a collapsible panel that renders above the form fields. Three tabs visible to all authenticated users: **Facebook URL** · **Describe event** · **Upload poster**. Admin users additionally see a fourth tab: **Scrape website** (see 6.4).
- Each tab: input UI → loading state → preview card listing parsed fields with their values → "Apply to form" + "Discard".
- "Apply to form" calls `onApply(draft: EventDraft)` on the parent `EventForm`. The parent merges non-empty draft fields via `react-hook-form`'s `setValue` — fields the user has already manually edited are **not overwritten**.
- The panel is opt-in: a "Smart fill ✨" toggle button at the top of `EventForm` shows/hides it. Hidden entirely for unauthenticated users.

### 6.2 API routes (server-side — keys never reach the client)

All routes under `src/app/api/smart-fill/`. Every route:
1. Calls `getUser()` on the server Supabase client; returns 401 if unauthenticated.
2. Executes the external call.
3. Returns `{ draft: EventDraft }` on success or `{ error: string }` on failure.

---

**`facebook/route.ts`** — Facebook event URL → Apify

- Accepts `{ url: string }` POST body.
- Validates the URL matches `facebook.com/events/`.
- Calls the Apify REST API with `APIFY_TOKEN` and `APIFY_ACTOR_ID`.
- Maps the Apify response fields to `EventDraft`.
- **Image handling — permanent URL:** Facebook CDN image URLs are time-limited tokens and expire within hours or days. To fix this: after Apify returns the image URL, the route fetches the image bytes server-side and uploads them to Supabase Storage at `event-images/{uuid}.{ext}` using the service role client. The permanent Supabase Storage URL is stored in `EventDraft.imageUrl`. The original Facebook CDN URL is discarded. This way the image survives indefinitely.
- Env vars: `APIFY_TOKEN`, `APIFY_ACTOR_ID`.

---

**`text/route.ts`** — freeform description → Gemini 1.5 Flash

- Accepts `{ text: string }` POST body (max 2000 chars).
- System prompt instructs Gemini to: extract event title, dates (ISO format), times, location, price, and any inferable tags; write the description in an engaging, promotional Facebook-post style (punchy, emoji where natural, ends with a call to action); return a JSON object only — no surrounding prose.
- Parses the JSON response and maps to `EventDraft`.
- Env var: `GEMINI_API_KEY`.

---

**`photo/route.ts`** — uploaded image → Gemini 1.5 Flash Vision

- Accepts `multipart/form-data` with an `image` file (max 5 MB, JPEG/PNG/WEBP).
- Uploads the image to Supabase Storage at `event-images/{uuid}.{ext}` immediately (permanent URL).
- Sends the image bytes + same structured extraction + promotional description prompt to Gemini Flash Vision.
- Returns the draft with `imageUrl` set to the already-uploaded Supabase Storage URL.
- Env vars: `GEMINI_API_KEY`, service role for storage.

### 6.3 AI description style — Gemini prompt guidance

Both text and photo routes use the same description generation instructions in the system prompt:

> Write the event description in Bulgarian, in an engaging and promotional style — as if writing a Facebook event post that makes people excited to attend. Use a punchy opening sentence. Include the key practical details (date, time, place, price if known) in a natural, readable way. Add 1–3 relevant emoji where they feel natural, not forced. End with a short call to action (e.g. "Очакваме ви!", "Не пропускайте!", "Елате да се забавляваме заедно!"). Keep the total length between 100 and 250 words. Return only the description text — no JSON wrapping for this field.

The description text is embedded in the JSON response as the `description` field value.

### 6.4 Admin-only scraper tab — Grabo and Ruse on the Danube

Two additional scraping sources only accessible to the site owner's account. Controlled via `ADMIN_USER_ID` env var (the owner's Supabase auth UUID — never hardcoded in source, lives in `.env.local`).

**`admin-scrape/route.ts`**
- After the standard 401 auth check, additionally verifies `user.id === process.env.ADMIN_USER_ID`. Returns 403 for any other user.
- Accepts `{ url: string, source: 'grabo' | 'ruse-on-the-danube' }` POST body.
- Validates the URL matches the expected domain for the given `source`.
- Calls the appropriate Apify actor or custom scraping logic per source.
- Maps the response to `EventDraft` using source-specific field mappers (each site has a different HTML structure).
- Same permanent image re-upload pattern as the Facebook route.
- Env vars: `APIFY_TOKEN`, `APIFY_ACTOR_ID_GRABO`, `APIFY_ACTOR_ID_RUSE_DANUBE`, `ADMIN_USER_ID`.

**`SmartFillPanel` — admin tab visibility:**
- The panel checks the current user's ID from session against `NEXT_PUBLIC_ADMIN_USER_ID` (a public env var — it's not a secret, it's just a UUID used for UI gating; the actual security check happens server-side in the route).
- If the IDs match, a fourth tab "Scrape website" is shown with a URL input and a `source` selector (Grabo · Ruse on the Danube).

### 6.5 i18n

Add keys under `SmartFill` namespace in all 4 locale files: panel toggle label, tab labels, input placeholders, loading messages, error messages, preview section titles, apply/discard labels.

### 6.6 Acceptance checks

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

### 7.1 Complete Bulgarian message file

- Audit every page and component for hardcoded Bulgarian or English strings.
- Move all UI strings into `src/i18n/messages/bg.json` — organized by page/feature key (`nav`, `home`, `events`, `auth`, `profile`, `saved`, `common`, `errors`).

### 7.2 Translate to other languages

- Copy `bg.json` structure to `en.json`, `uk.json`, `ro.json`.
- Translate manually or using a script. (Auto-translate via Google Translate API is Phase 9 scope — for now, best-effort manual translation is fine.)

### 7.3 Wire all strings through `t()`

- Replace every hardcoded string in components with `t("key")` or `useTranslations("namespace")`.
- Verify locale switching works end-to-end on all pages.

### 7.4 SEO metadata

- Add `generateMetadata` to `app/[locale]/page.tsx` and `past/page.tsx` — translated titles and descriptions.
- Verify event detail `generateMetadata` includes Open Graph image, title, description.
- Add `<link rel="alternate" hreflang>` via next-intl's alternates support.

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

### 7.10 PWA service worker + offline fallback

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
- **Event image uploads** via `EventForm` — wire Supabase Storage + file input in the existing user-facing form when ready; metadata stays manageable from Supabase if you prefer manual URLs in early iterations.
- **Event content translation** (Google Translate) is deferred to Phase 9 / future scope as defined in TASKS.md.
- **PWA push notifications** — Phase 9 scope. Requires: auth complete (Phase 3), saved events + routes stable (Phase 4+), and a push delivery backend (Supabase Edge Function + Web Push API). Implement after a user base exists to justify the complexity. User notification preferences (by tag, by event reminder) live in the `profiles` table.
