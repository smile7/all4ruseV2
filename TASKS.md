# TASKS — All4Ruse v2

## Phase 1 — Foundation

- [x] Create project planning files
- [x] Finalize product brief
- [x] Finalize architecture direction
- [x] Decide final stack
- [x] Define design direction (tweakcn "dashboard" theme tokens, shadcn/ui styling, Inter + Source Serif 4 + JetBrains Mono, View Transitions for key navigation)
- [x] Define MVP scope
  - Pages rollout: all events -> upcoming/current/past -> single event -> why all4ruse -> auth pages -> profile -> create event -> edit/duplicate event -> delete event -> my events
  - MVP feature scope (in addition to pages): searching and filtering (by tags, title, dates, host, place), locale routing (`/[locale]`), basic SEO metadata, saved events for logged-in users, theme changing, google calendar — **no in-app admin UI**; staff use Supabase Dashboard for content control

## Phase 2 — Technical setup

- [x] Initialize Next.js app with TypeScript, Tailwind, App Router, src/ dir
- [x] Configure path alias `~/` → `src/`, ESLint, Prettier
- [x] Set up Tailwind v4 in globals.css with full shadcn token set
- [x] Add shadcn CLI, run init, add first components as needed
- [x] Configure .env.local and generate Supabase types (`npm run db:types`)
- [x] Set up next-intl with `[locale]` routing, middleware, and 4 message files

## Phase 3 — Architecture

- [x] Define folder structure
- [x] Define app routing strategy
- [x] Define shared UI/component strategy
- [x] Define data layer (lib/api/, Supabase clients)
- [x] Define types and schema conventions
- [x] Define rendering strategy (Server Components vs TanStack Query)

## Phase 4 — Data model

- [x] Events schema (exists in Supabase)
- [x] Tags schema + event_tags join (exists in Supabase)
- [x] Confirm profiles schema covers all needed fields
  - Schema confirmed via `npm run db:types`: covers `full_name`, `username`, `avatar_url`, `email`, `email_to_show`, `name_to_show`, `phone`, `place`, `address_physical`, `fb`, `instagram`, `tiktok`, `website`, `is_confirmed` — all MVP fields present
- [x] Decide event_translations approach for multilingual event content
  - No `event_translations` DB table — translate event descriptions on-demand via Google Translate API (key already in `.env.local`). Same approach as the old app. Revisit for caching in Phase 9 if needed.

## Phase 5 — Public experience

- [x] Data layer — `eventsApi` (getActiveEvents, getPastEvents, getEventBySlug) + `tagsApi.getTags`
- [x] Design structure task 1 — create pages with dummy content (`Typography.P` lorem ipsum) for: create event, saved events, profile, cookies, privacy, GDPR, why-all4ruse, single event, past events, my events
- [x] Design structure task 2 — implement header and document final design decisions in `Header.tsx`
- [x] Design structure task 3 — implement footer (`Footer.tsx`) + mobile bottom nav (`MobileBottomNav.tsx`) + locale layout wiring
- [x] PWA foundation — `app/manifest.ts`, app icons, apple meta tags (installable, no service worker yet)
- [x] EventCard component with "Live now" badge and View Transition name
- [x] Active events page (home, SSR, initialData → EventsList + EventFilters with tag chips)
- [x] Past events page (same pattern, reversed order, 15-day window)
- [x] Event detail page (SSR, full content, SEO metadata, View Transition hero, JSON-LD)
- [x] Why All4Ruse page
- [x] Legal pages (cookies, GDPR, privacy, terms)

## Phase 6 — Auth + user pages (`IMPLEMENTATION_PLAN.md` Phase 3)

- [x] Full auth flow: login, signup, email confirmation, callback route, forgot/update password
  - Login (`/auth/login`), signup (`/auth/signup`), signup-success, forgot-password, update-password
  - Auth callback route at `src/app/auth/callback/route.ts` (PKCE code exchange)
  - All error states mapped to translated messages; password visibility toggle on all password fields
  - Supabase Auth via `@supabase/ssr` — no external auth library
- [x] Header + MobileBottomNav full auth wiring
  - Mobile header top-right: primary "+" button → `/create-event`
  - Desktop header: avatar dropdown (Create Event · Profile · My Events · Logout) when authenticated, "Влез" link when guest
  - Bottom nav: Events · Saved · More · Profile (two separate sheets — More = social/legal, Profile = auth state)
  - Logout: `supabase.auth.signOut()` + `router.refresh()` to re-render Server Components
- [x] Profiles data layer (`src/lib/api/profiles.ts` — `getProfile`, `updateProfile`, `updateProfileSchema`)
- [x] Profile page (view + edit optional fields via `ProfileForm`)
- [x] My events page (SSR, `eventsApi.getMyEvents`, upcoming/past sections)
- [x] Create event page (auth-guarded, `EventForm`; create / edit / duplicate via `editId` · `duplicateId` query params)
- [x] Account security and deletion flow (change password + delete account with typed DELETE; `Profile` page + `/api/account/delete`)

## Phase 7 - Saved events

- [x] Guest clicking the saved icon sees an account prompt dialog/drawer with signup/login actions.
- [x] When a person is logged in, he should be able to mark an event as saved. (save icon over the event card bottom right)
- [x] Each stored event id is kept in the database.
- [x] Create a page "Saved" where user sees all his saved events.
- [x] Order the events in Saved page by date.
- [x] Split Saved page into upcoming + current and past sections.
- [x] Give option to remove an event from the list (or by clicking again the save icon over the event)

## Phase 8 — Public Profiles (`IMPLEMENTATION_PLAN.md` Phase 5)

### DB + types

- [ ] Add `header_url text` column to `profiles` in Supabase
- [ ] Add `UNIQUE` constraint on `profiles.username`
- [ ] Run `npm run db:types` to regenerate `src/types/database.ts`
- [ ] Extend `updateProfileSchema` / `UpdateProfileInput` in `src/types/index.ts` with `color` and `header_url`
- [ ] Extend `ProfileUpdatePayload` in `src/lib/api/profiles.ts` with the two new fields

### Data layer

- [ ] Add `getPublicProfile(client, username)` to `profilesApi` — public, no auth
- [ ] Add `getProfileEvents(client, userId)` to `profilesApi` — upcoming/live and past events for a user

### Edit profile additions

- [ ] Add color picker (curated ~12-swatch palette) to `ProfileForm`
- [ ] Add header/cover photo upload to `ProfileForm` — same pattern as avatar, stores to `headers/{userId}` path
- [ ] Show copyable public profile link on profile page after username is set
- [ ] Username validation in `ProfileForm`: alphanumeric + hyphens, 3–30 chars, debounced uniqueness check
- [ ] Show banner nudge on profile page when no username set

### Public profile page

- [ ] Create `src/app/[locale]/user/[username]/page.tsx` — async Server Component
- [ ] `generateMetadata` — title, description (bio), OG image (header or avatar), hreflang
- [ ] Host layout (profile has ≥ 1 created event): cover photo + color gradient overlay, avatar, name, bio, social links, "Visit website" CTA
- [ ] Upcoming/live events grid (same `EventCard`)
- [ ] Past events section — collapsed by default, toggle to load lazily
- [ ] User layout (no created events): cover strip with color accent, avatar, name, bio — no events section
- [ ] `notFound()` when username does not exist
- [ ] `LocalBusiness` / `Organization` JSON-LD block for host-mode profiles

### i18n

- [ ] Add `PublicProfile` namespace keys to all 4 locale files

### Acceptance checks

- [ ] Unauthenticated visitor can view any public profile
- [ ] Host-mode page (≥ 1 event): cover photo, color gradient, avatar, bio, social links, upcoming events, collapsed past events
- [ ] User-mode page (no events): cover strip, avatar, name, bio — no events section shown
- [ ] Missing username → 404
- [ ] Color and cover photo changes reflect on public page
- [ ] OG image and title correct for social sharing

## Phase 9 — Event Creation Automation (`IMPLEMENTATION_PLAN.md` Phase 6)

Smart-fill helpers that pre-populate `EventForm` from a Facebook URL, freeform text prompt, or an uploaded poster image. A separate admin-only tab handles scraping from Grabo and Ruse on the Danube. All routes are server-side (API keys never reach the client). No dedicated rate-limit table — authentication is a sufficient gate at this usage scale.

### Types

- [ ] Add `EventDraft` partial type to `src/types/index.ts` (all optional: `title`, `description`, `startDate`, `startTime`, `endDate`, `endTime`, `place`, `imageUrl`, `facebookUrl`, `ticketUrl`, `price`, `tags`)

### API routes (`src/app/api/smart-fill/`)

- [ ] `facebook/route.ts` — auth check → Apify actor call → **fetch + re-upload Apify image to Supabase Storage** (permanent URL, fixes FB CDN expiry) → map to `EventDraft`. Env: `APIFY_TOKEN`, `APIFY_ACTOR_ID`
- [ ] `text/route.ts` — auth check → Gemini 1.5 Flash with structured extraction + promotional description prompt → `EventDraft`. Env: `GEMINI_API_KEY`
- [ ] `photo/route.ts` — auth check → upload image to Supabase Storage `event-images/{uuid}` → Gemini 1.5 Flash Vision with same prompt → `EventDraft` with permanent `imageUrl`. Env: `GEMINI_API_KEY`
- [ ] `admin-scrape/route.ts` — auth check + `userId === ADMIN_USER_ID` check (403 otherwise) → scrape Grabo or Ruse on the Danube via Apify → re-upload image to Supabase Storage → `EventDraft`. Env: `APIFY_TOKEN`, `APIFY_ACTOR_ID_GRABO`, `APIFY_ACTOR_ID_RUSE_DANUBE`, `ADMIN_USER_ID`

### UI — `SmartFillPanel` component

- [ ] Create `src/components/EventForm/SmartFillPanel.tsx` with tabs: **Facebook URL** · **Describe event** · **Upload poster**
- [ ] Each tab: input → loading state → preview card listing parsed field values → "Apply to form" / "Discard"
- [ ] Wire `onApply(draft: EventDraft)`; parent `EventForm` merges via `setValue` — does not overwrite fields the user has already manually edited
- [ ] Add "Smart fill ✨" toggle button at top of `EventForm`; hide panel entirely when not authenticated
- [ ] Admin-only fourth tab "Scrape website" (URL input + Grabo / Ruse on the Danube selector) — visible only when `session.user.id === NEXT_PUBLIC_ADMIN_USER_ID`

### Gemini prompt

- [ ] System prompt for text and photo routes instructs: extract structured fields as JSON + write `description` in engaging Bulgarian promotional style (punchy opener, emoji where natural, call to action, 100–250 words)

### Env vars to add to `.env.local`

- [ ] `APIFY_TOKEN`, `APIFY_ACTOR_ID`
- [ ] `APIFY_ACTOR_ID_GRABO`, `APIFY_ACTOR_ID_RUSE_DANUBE`
- [ ] `GEMINI_API_KEY`
- [ ] `ADMIN_USER_ID` (server-only), `NEXT_PUBLIC_ADMIN_USER_ID` (UI gating only — not a secret)

### i18n

- [ ] Add `SmartFill` namespace to all 4 locale files (tab labels, placeholders, loading, error messages, preview titles, apply/discard labels)

### Acceptance checks

- [ ] Guest users: panel hidden, all routes return 401
- [ ] FB import: valid URL → draft preview → apply fills form → image URL is a permanent Supabase Storage URL (not Facebook CDN)
- [ ] Text prompt: freeform description → draft with promotional Bulgarian description → apply fills form
- [ ] Photo upload: poster → image uploaded to Supabase Storage → draft preview → apply fills form including image field
- [ ] Apply merges only — does not overwrite already-edited fields
- [ ] Admin scraper tab invisible to all non-admin users; direct route call by non-admin returns 403
- [ ] Grabo and Ruse on the Danube scrapes produce valid draft with permanent image URLs

## Phase 10 — Quality

- [ ] SEO metadata on all public pages (generateMetadata)
- [x] JSON-LD structured data on event detail (`[slug]` page — `Event` schema)
- [ ] loading.tsx and error.tsx for key routes
- [ ] Mobile responsiveness review
- [ ] Accessibility review (keyboard nav, contrast, ARIA)
- [ ] i18n audit — all UI strings through t(), all 4 languages complete
- [ ] PWA service worker + offline fallback (next-pwa, cache strategies, offline page)

## Phase 11 — Future scope

- [ ] Event content auto-translation via Google Translate API
- [ ] Premium and featured listings
- [ ] Sponsorship placements
- [ ] Ticket-related flows
- [ ] Push notifications — Web Push API subscription + Supabase Edge Function for delivery + user notification preferences in profile (by tag, by event reminder)
