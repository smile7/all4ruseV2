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
- [x] Remember me on login — unchecked = session-only auth cookies (cleared when the browser is fully quit); checked = persistent cookies (~400 days). Preference stored in `a4r-remember`; policy applied in `session-persistence.ts`, `browser-cookies.ts`, server client, and middleware on every request.
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

- [x] Add `header_url text` column to `profiles` in Supabase (in `database.ts`)
- [x] Add `UNIQUE` constraint on `profiles.username`
- [x] Run `npm run db:types` to regenerate `src/types/database.ts`
- [x] Extend `updateProfileSchema` / `UpdateProfileInput` with `color`; `header_url` via `ProfileUpdatePayload` in `profiles.ts`
- [x] Extend `ProfileUpdatePayload` in `src/lib/api/profiles.ts` with `header_url` (+ `color` through schema)

### Data layer

- [x] Add `getPublicProfile(client, username)` to `profilesApi` — public, no auth
- [x] Add `getPublicProfileUpcomingEvents` + `getPublicProfilePastEvents` to `profilesApi`

### Edit profile additions

- [x] Add color picker (curated swatch palette) to `ProfileForm`
- [x] Add header/cover photo upload to `ProfileForm` — `headers/{userId}` path
- [x] Show copyable public profile link on profile page after username is set
- [x] Username validation in `ProfileForm`: format + inline sanitize + debounced `profilesApi.isUsernameAvailable` check before save
- [x] Show banner nudge on profile page when no username set

### Public profile page

- [x] Create `src/app/[locale]/user/[username]/page.tsx` — async Server Component
- [x] `generateMetadata` — title, description (bio), OG image (header or avatar)
- [x] Host layout (profile has ≥ 1 created event): cover photo + color gradient overlay, avatar, name, bio, social links, "Visit website" CTA
- [x] Upcoming/live events grid (same `EventCard`)
- [x] Past events section — collapsed by default, toggle to load lazily (`ProfilePastEvents`)
- [x] User layout (no created events): cover strip with color accent, avatar, name, bio — no events section
- [x] `notFound()` when username does not exist
- [x] `Organization` JSON-LD block for host-mode profiles

### i18n

- [x] Add `PublicProfile` namespace keys to all 4 locale files

### Acceptance checks

- [x] Unauthenticated visitor can view any public profile
- [x] Host-mode page (≥ 1 event): cover photo, color gradient, avatar, bio, social links, upcoming events, collapsed past events
- [x] User-mode page (no events): cover strip, avatar, name, bio — no events section shown
- [x] Missing username → 404
- [x] Color and cover photo changes reflect on public page
- [x] OG image and title correct for social sharing

## Phase 9 — Event Creation Automation (`IMPLEMENTATION_PLAN.md` Phase 6)

Smart-fill helpers that pre-populate `EventForm` from a Facebook URL, freeform text prompt, or an uploaded poster image. A separate admin-only tab handles scraping from Grabo and Ruse on the Danube. All routes are server-side (API keys never reach the client). No dedicated rate-limit table — authentication is a sufficient gate at this usage scale.

### Types

- [x] Add `EventDraft` partial type to `src/types/index.ts`

### API routes (`src/app/api/smart-fill/`)

- [x] `facebook/route.ts` — auth → Apify → re-upload image to Supabase Storage → `EventDraft`
- [x] `text/route.ts` — auth → Gemini structured extraction + promotional description → `EventDraft`
- [x] `photo/route.ts` — auth → upload to Storage → Gemini Vision → `EventDraft`
- [x] `admin-scrape/route.ts` — auth + admin check → Grabo / Ruse on the Danube scrape → `EventDraft`

### UI — `SmartFillPanel` component

- [x] Create `src/components/EventForm/SmartFillPanel.tsx` with tabs: Facebook URL · Describe event · Upload poster
- [x] Each tab: input → loading state → preview card → Apply / Discard
- [x] Wire `onApply(draft)`; `EventForm` merges via `setValue` without overwriting manually edited fields
- [x] Smart fill toggle at top of `EventForm`; hidden when not authenticated
- [x] Admin-only fourth tab "Scrape website" when `session.user.id === NEXT_PUBLIC_ADMIN_USER_ID`

### Gemini prompt

- [x] System prompt for text and photo routes: structured JSON + promotional Bulgarian description

### Env vars to add to `.env.local`

- [x] `APIFY_TOKEN`, `APIFY_ACTOR_ID` (deploy-time — confirm in each environment)
- [x] `APIFY_ACTOR_ID_GRABO`, `APIFY_ACTOR_ID_RUSE_DANUBE`
- [x] `GEMINI_API_KEY`
- [x] `ADMIN_USER_ID` (server-only), `NEXT_PUBLIC_ADMIN_USER_ID` (UI gating)

### i18n

- [x] Add `SmartFill` namespace to all 4 locale files

### Acceptance checks

- [x] Guest users: panel hidden, all routes return 401
- [x] FB import: valid URL → draft preview → apply fills form → permanent Storage image URL
- [x] Text prompt: freeform description → draft with promotional description → apply fills form
- [x] Photo upload: poster → Storage upload → draft preview → apply fills form including image
- [x] Apply merges only — does not overwrite already-edited fields
- [x] Admin scraper tab invisible to non-admin; direct route call returns 403
- [x] Grabo and Ruse on the Danube scrapes produce valid draft with permanent image URLs

## Phase 10 — Quality

- [x] SEO metadata on main public pages — home, current, past, event detail, public profile, saved events, why-all4ruse, advertise (`generateMetadata`)
- [ ] SEO metadata on remaining pages:
  - [ ] Auth pages (login, signup, forgot-password, update-password) — currently `"use client"` with no metadata; split into a thin server wrapper + client form component so each auth page can export `generateMetadata` with page-specific title and `robots: noindex, nofollow`
  - [ ] Profile page (`src/app/[locale]/profile/page.tsx`) — add `generateMetadata` with translated title and `robots: noindex`
  - [ ] My events page (`src/app/[locale]/my-events/page.tsx`) — add `generateMetadata` with translated title and `robots: noindex`
  - [ ] Create event page (`src/app/[locale]/create-event/page.tsx`) — add `generateMetadata` with translated title and `robots: noindex`
  - [ ] Legal pages — replace static hardcoded Bulgarian `metadata` export with `generateMetadata` using i18n keys; remove `lang="bg"` attribute hardcoded regardless of `[locale]`
- [x] JSON-LD structured data on event detail (`[slug]` page — `Event` schema)
- [ ] JSON-LD Event schema completeness — currently missing:
  - [ ] `offers` block for free events (currently omitted when `price` is null — add `{ price: 0, priceCurrency: "BGN" }` for free events)
  - [ ] `organizer` block when no hosts in `event.organizers` array (fall back to site organizer entity)
- [ ] `loading.tsx` and `error.tsx` for key routes:
  - [ ] `src/app/[locale]/loading.tsx` — skeleton for the home events grid (reuse `EventsGridSkeleton`)
  - [ ] `src/app/[locale]/error.tsx` — friendly error with retry button (must be `"use client"`)
  - [ ] `src/app/[locale]/[slug]/loading.tsx` — skeleton for event detail hero + content
  - [ ] `src/app/[locale]/past/loading.tsx` — same skeleton as home loading
  - [ ] `src/app/[locale]/profile/saved-events/loading.tsx` — skeleton for saved list
  - [ ] Global `src/app/not-found.tsx` (in addition to locale-aware `src/app/[locale]/not-found.tsx` which already exists)
- [ ] Suspense boundary on past/current `EventsList` — `src/app/[locale]/past/page.tsx` and `src/app/[locale]/current/page.tsx` render `<EventsList>` without `<Suspense>`; `EventsList` uses `useSearchParams()` which can cause a CSR bailout; wrap with `<Suspense fallback={<EventsGridSkeleton />}>`
- [ ] Mobile responsiveness review
- [ ] Accessibility review (keyboard nav, contrast, ARIA):
  - [ ] `FilterContent.tsx` — search, host, and place inputs have placeholder text but no `<label>` or `aria-label`; add `aria-label` to each; add `role="search"` or `aria-label` on the filter container
  - [ ] `EventCard` card `<Link>` — no `aria-label`; screen readers announce the title from the inner `<h3>` but the link itself has no accessible name; add `aria-label={event.title}` (or `aria-labelledby` pointing to the heading)
  - [ ] `Header.tsx` — no `<nav>` landmark wrapping navigation links; add `<nav aria-label="Main navigation">`
  - [ ] Full keyboard nav pass: filters, modals, drawers, date pickers, tag chips
  - [ ] WCAG AA contrast check on light + dark themes
- [ ] i18n audit — all UI strings through `t()`, all 4 languages complete (legal page body copy still BG-only)
- [x] PWA service worker + offline fallback — Serwist (`@serwist/next`), minimal SW (static assets + images only, no navigation cache to protect Supabase SSR auth), offline page at `/[locale]/offline`, all icons in `public/`

## Phase 11 — Quick Fixes & UI Polish

Small targeted fixes and visual consistency improvements.

### Event form

- [x] Mark required fields with `*` and `aria-required` in `EventForm` — title, description, start/end date, start time, address, town, first organizer
- [x] Change `price` field from `number` input to `text` — accepts "10", "10–20", "Безплатно", etc. (matches Supabase `text` column)
- [x] Fix sticky bottom action bar on mobile — `bottom-12` on mobile clears bottom nav; `md:bottom-4` on desktop

### Event card

- [x] Always show date in 3 lines: date → day name → time. Today/tomorrow use a single uppercase label (`ДНЕС`/`УТРЕ`) on line 1; other dates use `11 ЮНИ` → full weekday → time. Locale-aware month abbreviations in `formatDateBadge` (`src/lib/event-utils.ts`).

### Color & style consistency

- [x] My events page: change edit button to primary color (`EventCard` hover edit action)
- [x] Header: change filters trigger button to primary color (`HeaderSearchButton` + `HeaderDesktopFiltersPanel`; search label i18n → "Търси")

### Saved events bug

- [x] Fix multi-save error — root cause was a unique constraint on `user_id` alone (`saved_events_user_id_key`) instead of the correct `(user_id, event_id)` pair. Fix: drop wrong constraint and add `saved_events_user_id_event_id_key UNIQUE (user_id, event_id)` in Supabase SQL Editor. Code: `saveEvent` treats `23505` as no-op (already saved).

### Filter text search bug

- [x] Fix controlled input reset — local state + debounced URL sync in `FilterContent.tsx` (`useDebounce`, `ClearableInput`)

### Links & email safety

- [x] Remove `noreferrer` from external event links (keep `noopener` only) so partner websites can track referrals
- [x] Obfuscate displayed email addresses (CSS `direction: rtl` + `bidi-override` trick via `ObfuscatedEmail` component) to prevent scraper spam

### Smart Fill loading UX (Phase 9 extension)

- [x] Replace plain spinner in `SmartFillPanel` with full-screen blurred overlay + random arcade CSS loader from [css-loaders.com/arcade](https://css-loaders.com/arcade/) during AI/FB/URL import
- [x] Add cancel button on overlay to abort the request and close (`AbortController` + `loadingCancel` i18n)

### Host display on event detail

- [x] Add host section on single event page: avatar + name + link to `/[locale]/user/[username]` if they have a username
- [x] Only show when `event.created_by !== ADMIN_USER_ID`; if host has no username, show name without link

## Phase 12 — Auth Enhancements

### Social OAuth

- [x] Add Facebook login/signup via Supabase Auth (`supabase.auth.signInWithOAuth({ provider: 'facebook' })`)
- [x] Add Google login/signup via Supabase Auth (`supabase.auth.signInWithOAuth({ provider: 'google' })`)
- [x] Add provider buttons to both login and signup pages — `SocialAuthButtons` component with outline variant + provider icons
- [x] `/auth/callback` route handles OAuth redirect correctly; syncs provider `avatar_url` into profiles on first login (atomically, no overwrite of manual uploads)
- [x] Profile page auto-fixes email-based usernames (from DB trigger) on first visit — derives clean slug from email prefix

### Login UX

- [x] Add "Запомни ме" (Remember me) checkbox to login form — when unchecked, use `persistSession: false`
- [x] Handle duplicate email on signup — explicit Supabase error **and** empty `identities` anti-enumeration response; translated message + link to login (no false "check your email" redirect)

### Security

- [x] Add Google reCAPTCHA v3 to signup and login forms — server-side token verification before Supabase auth call
- [x] Env: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`

### Registration

- [x] "Съгласен съм с Условията за ползване" checkbox on signup form — `acceptTerms: z.boolean()` + `.refine` in zod schema; links to terms page

### Profile navigation

- [x] Add "Виж публичния си профил" to avatar dropdown (desktop) and Profile sheet (mobile) — always shown (username is always set); links to `/user/[username]`

## Phase 13 — Event Interactions

### Claim event

- [x] DB: `event_claims` table (`id`, `event_id`, `claimant_id`, `status` pending/approved/declined, `message`, `created_at`) + RLS — exists in `database.ts`
- [x] `claimsApi` in `src/lib/api/claims.ts` — `createEventClaim`, `getMyClaimForEvent`; exported from `lib/api/index.ts`
- [x] `POST /api/events/claim` route — auth check, insert, 409 on duplicate
- [x] `ClaimEventButton` component — responsive Dialog/Drawer, status badges, optional message textarea
- [x] Wired in event detail page — `getMyClaimForEvent` on server, `initialClaimStatus` passed as prop; button hidden when user is the event owner
- [x] i18n keys in all 4 locale files (`SingleEvent` namespace)

### Report event

- [x] DB: `event_reports` table (`id`, `event_id`, `reporter_id` nullable, `message` text, `status` new/reviewed, `created_at`) + RLS — exists in `database.ts`
- [x] `reportsApi` in `src/lib/api/reports.ts` — `createEventReport`, `getMyReportForEvent`; exported from `lib/api/index.ts`
- [x] `POST /api/events/report` route — auth check, insert, 409 on duplicate, 500 on error
- [x] `ReportEventButton` component — responsive Dialog/Drawer, ghost variant, optional message textarea, `ReportedBadge` on reported state
- [x] Wired in event detail page — `getMyReportForEvent` on server, `alreadyReported` bool passed as prop
- [x] Success / duplicate / error toasts
- [x] i18n keys in all 4 locale files (`SingleEvent` namespace)

### Email notifications (pending)

- [ ] Admin email when a user submits an event claim (with signed approve/decline action links)
- [ ] Admin email when a user reports an event
- [ ] Claimant email on approve/decline

## Phase 14 — Homepage Hero & Calendar View

### Homepage create event CTA

- [x] Add hero section above event list: "СЪБИТИЯ В РУСЕ" heading + short subtitle
- [x] Prominent "Създай събитие +" button always visible (middleware redirects guests to login with `next` param)

### Calendar view

- [x] Add view toggle on events listing page: "Карти" (grid) ↔ "Календар" (month view)
- [x] Month calendar: week rows starting Monday, events rendered as multi-day chips with track layout
- [x] Navigation: prev month / next month with month/year heading
- [x] Click on event chip → event detail page
- [x] View preference persisted in `localStorage` (`useViewPreference` hook)
- [x] Custom implementation — `EventsCalendarView.tsx` + `calendar-utils.ts` (no heavy calendar library)
- [x] `useCalendarMonthEvents` hook — per-month query cache, lazy-loads past months, disabled for future months
- [x] Event hero image zoom — LightGallery zoom plugin added to `EventHeroGallery` (click image to expand)

## Phase 15 — Notifications

### In-app notification system

- [ ] DB: create `notifications` table (`id`, `user_id`, `type`, `event_id` nullable, `message`, `read` bool, `created_at`) + RLS (user reads/updates own rows only)
- [ ] Bell icon in header: desktop = dropdown, mobile = sheet
- [ ] Unread badge count on bell icon
- [ ] Notification types (v1): "saved event is today", "saved event is tomorrow"
- [ ] Mark notifications as read on open; "Mark all as read" action
- [ ] Supabase Edge Function or scheduled cron: runs daily, creates notifications for users with saved events starting today/tomorrow (respects user preference)

### PWA push notifications

- [ ] Service worker setup (next-pwa or custom)
- [ ] Web Push subscription flow: request permission when user first installs PWA or opts in
- [ ] DB: create `push_subscriptions` table (`user_id`, `endpoint`, `p256dh`, `auth`, `created_at`) + RLS
- [ ] Supabase Edge Function triggered by daily cron: sends push payload to subscriptions for relevant events
- [ ] Env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

### Notification preferences in profile

- [ ] DB: add `notification_reminders boolean default true` column to `profiles`
- [ ] Add toggle in profile page: "Напомни ми за запазени събития"
- [ ] Cron/Edge Function respects this preference before generating notifications

## Phase 16 — Email Marketing (Brevo)

- [ ] Add `BREVO_API_KEY` to env
- [ ] Create API route `src/app/api/newsletter/subscribe/route.ts` — accepts email + selected tag IDs, upserts Brevo contact with tag attributes
- [ ] Tag subscription section in profile page: checkboxes for all available tags
- [ ] On tag save: sync preferences to Brevo contact attributes
- [ ] Footer or profile: "Абонирай се за любими тагове" CTA → profile page if logged in, signup if guest

## Phase 17 — Advertisement & Support

### Sponsorship page

- [x] Create `src/app/[locale]/advertise/page.tsx` — static page with intro, 4 option cards, contact CTA, `generateMetadata`
- [x] Add to footer navigation and "More" mobile sheet
- [x] Add to `sitemap.ts`
- [ ] Cross-link from `why-all4ruse/page.tsx`

### Revolut support ("Подкрепи ни")

- [ ] Desktop footer link → `https://revolut.me/silvenamiteva`
- [ ] Mobile "More" sheet item with coffee icon
- [ ] (Optional) subtle link on profile page

## Phase 18 — Advanced Filters & Premium

- [ ] Filter by place: multi-select with popular Ruse venues (Доходно, Блок 14, РИУ Сити Сентър, etc.) as preset chips + free text fallback; apply as `place ILIKE %value%`
- [ ] Filter by premium events: confirm `premium` column exists, add "Premium" toggle chip to filters panel

## Phase 19 — Pre-Launch SEO & Code Quality Hardening

These items were discovered during a pre-launch audit. They are not blockers but are important for SEO correctness, security, and code reliability before going live.

### SEO — crawling & indexing

- [x] **`robots.ts` — add locale-prefixed disallow rules** — current `Disallow: /auth/` does not block `/bg/auth/login` (locale-prefixed routes); change to `Disallow: /*/auth/`, `/*/profile`, `/*/my-events`, `/*/create-event` (or add individual patterns per locale). Also disallow `/api/` (already present) and `/*/saved-events`.
- [x] **Hreflang alternates on home and other public pages** — `src/app/[locale]/page.tsx` `generateMetadata` has no `alternates.languages`; add all 4 locales. Same for `past/page.tsx`, `current/page.tsx`, `why-all4ruse/page.tsx`, `advertise/page.tsx`. Event detail already has this — `buildAlternates(locale, path)` helper created in `src/lib/seo.ts`.
- [x] **Fix root-layout canonical URL conflict** — `src/app/layout.tsx` sets `alternates.canonical: "/"` globally, which resolves to `https://all4ruse.com/` for every page; this tells Google all pages have the same canonical. Remove the root-level canonical and instead set it per-page only where needed (event detail already does it correctly).
- [x] **Add user public profile URLs to sitemap** — `src/app/sitemap.ts` does not include `/user/[username]` entries; fetch all distinct non-null usernames from `profiles` (public SELECT — no auth needed) and add `/[locale]/user/[username]` entries for all 4 locales. `profilesApi.getAllPublicUsernames` added.
- [x] **Sitemap `lastModified` — use real dates** — event entries now use `events.created_at` (no `updated_at` column exists); static/editorial pages use hardcoded last-edited dates; dynamic listing pages (home/past/current) still use `new Date()` since content changes daily. `eventsApi.getAllSlugsWithDates` replaces `getAllSlugs` for sitemap use.

### SEO — structured data

- [x] **JSON-LD `offers` for free events** — when `event.price` is null/empty, the `offers` block is omitted entirely; Google prefers explicit `{ "@type": "Offer", "price": "0", "priceCurrency": "BGN", "availability": "InStock" }` for free events.
- [x] **JSON-LD `organizer` fallback** — when `event.organizers` is empty or null, the `organizer` field is absent; add a site-level fallback `{ "@type": "Organization", "name": "All4Ruse", "url": "https://all4ruse.com" }`.

### Security headers

- [x] **Add HTTP security headers in `next.config.ts`** — the app currently sets no security headers at all; at minimum add:
  - `X-Frame-Options: SAMEORIGIN` (clickjacking protection)
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - A basic `Content-Security-Policy` (or at least `X-Frame-Options` while full CSP is refined)

### Image optimization

- [x] **Replace raw `<img>` tags with `next/image`** — `src/app/[locale]/profile/ProfileForm.tsx` (avatar/header preview, lines ~907 and ~975) and `src/components/EventForm/EventImageUpload.tsx` (upload preview, line ~120) still use plain `<img>`; switch to `next/image` with `unoptimized` prop for blob URLs if needed, or keep `<img>` only for local blob object URLs (which `next/image` cannot optimize) and add a comment explaining the exception.

### Performance

- [x] **Dynamic import `EventsCalendarView`** — `EventsList.tsx` statically imports `EventsCalendarView` (~615 lines of calendar logic + CSS); only loaded when user switches to calendar view; use `dynamic(() => import("../EventsCalendar/EventsCalendarView"), { ssr: false })` to keep it out of the initial bundle.

### AI / LLM SEO (GEO — Generative Engine Optimization)

AI assistants (ChatGPT, Perplexity, Claude, Gemini) are increasingly used to answer "what's happening in Ruse this weekend?" — being cited by them is real traffic. These tasks make the site legible to LLMs.

- [x] **`public/llms.txt`** — create a plain-text/markdown file at the site root following the [llms.txt spec](https://llmstxt.org/). This is the emerging standard (like `robots.txt` but for LLMs). Include: site name + one-line description, what it does, supported locales, key page URLs, and a note that event data is real and updated regularly. LLM crawlers that respect it will include this context when answering queries about Ruse events.

```
# All4Ruse

> All4Ruse is a Bulgarian events platform for the city of Ruse. It lists concerts, exhibitions, theatre, sports, workshops, and all public events happening in Ruse.

## Key pages
- Homepage (upcoming events): https://all4ruse.com/bg
- Past events: https://all4ruse.com/bg/past
- Why All4Ruse: https://all4ruse.com/bg/why-all4ruse

## Notes
- Content is available in Bulgarian (bg), English (en), Ukrainian (uk), and Romanian (ro).
- Each event has a dedicated page at https://all4ruse.com/bg/[slug] with full details.
- Events include structured JSON-LD (schema.org/Event) for machine readability.
```

- [ ] **`public/llms-full.txt`** — optional extended version; auto-generate at build time from the sitemap (list all live event URLs with titles and dates); linked from `llms.txt` as `## Full event listing: /llms-full.txt`. Build script task, deferred post-launch.

- [x] **AI crawler rules in `robots.ts`** — added explicit allow rules for GPTBot, ClaudeBot, anthropic-ai, PerplexityBot, Google-Extended, Applebot-Extended, OAI-SearchBot, cohere-ai; blocked CCBot, Bytespider, PetalBot.

- [x] **`<meta name="description">` quality audit for AI** — expanded home/past/current page descriptions to 120–160 chars, natural language, city name mentioned, in all 4 locales; fixed event detail description trim to respect word boundaries (no mid-word cuts).

- [x] **Semantic HTML pass for AI readability** — verified `<h1>` for event title; added `<time dateTime>` for start date, end date, and start time on event detail page; wrapped event description in `<article>` instead of `<div>`.

### Code reliability

- [x] **`getAllSlugs` error handling** — `src/lib/api/events.ts` `getAllSlugs` silently returns `[]` on DB error; this causes the sitemap to be generated with no event URLs, harming SEO; log the error (at minimum `console.error`) and consider re-throwing so the sitemap build fails visibly. `getAllSlugsWithDates` (sitemap) now re-throws; `getAllSlugs` (generateStaticParams) keeps returning `[]` with a comment explaining the exception.
- [x] **Remove `mapEvent(row: any)` typed as `any`** — `src/lib/api/events.ts` and `src/lib/api/profiles.ts` now use `EventRow = Tables<"events"> & { event_tags: unknown }` and `QueryResult` uses `EventRow[]`; ESLint disable comments removed.
- [x] **`updateProfile` `as any` cast** — `src/lib/api/profiles.ts` payload now typed as `TablesUpdate<"profiles">`; comment about `header_url` removed (it exists in generated types).
- [x] **Reduce `console.error` in page components** — `src/app/[locale]/page.tsx`, `src/app/[locale]/past/page.tsx`, and `src/app/[locale]/current/page.tsx` no longer swallow errors; they re-throw to the `src/app/[locale]/error.tsx` boundary (created with retry button + home link, all 4 locales).

## Phase 20 — Ruse Map: Playgrounds & Street Fitness (V2)

New public feature, tracked separately from the MVP as V2 scope: an interactive map of Ruse with a pin for every children's playground and street fitness spot. Content is admin-only — reuses the existing single-admin `ADMIN_USER_ID` / `NEXT_PUBLIC_ADMIN_USER_ID` pattern from Smart Fill (no roles table). No public submission flow and no saved/favorites for v1.

### Data model

- [ ] Migration: `map_points` table — `id`, `type` (`playground` | `street_fitness`), `name`, `description`, `address`, `latitude`, `longitude`, `images` (jsonb array of storage paths), `created_by`, `created_at`, `updated_at`
- [ ] Enable RLS: public `SELECT` only; no client-side `INSERT`/`UPDATE`/`DELETE` policies — all writes go through admin-checked API routes using the service-role client (same pattern as `smart-fill`)
- [ ] Run `npm run db:types` after the migration

### Storage

- [ ] New public bucket `map-point-images` (parallel to `event-images`)
- [ ] Upload validation mirrors `src/app/api/smart-fill/photo/route.ts` (file type/size checks, service-role upload)

### Data layer

- [ ] `src/lib/api/map-points.ts` — `mapPointsApi.getMapPoints(client, filters?)`, `getMapPointById` — public reads via the normal Supabase client (no API route needed for reads)
- [ ] Export from `src/lib/api/index.ts`

### API routes (admin-only writes)

- [ ] `POST /api/map-points` — auth + `user.id === process.env.ADMIN_USER_ID` check, upload image(s) to `map-point-images`, insert via service-role client
- [ ] `PATCH /api/map-points/[id]` — same admin check, update fields/images
- [ ] `DELETE /api/map-points/[id]` — same admin check, delete row + associated storage objects
- [ ] `GET /api/map-points/geocode?q=` — server-side proxy to OpenStreetMap Nominatim (descriptive `User-Agent`, rate-limited to 1 req/sec) for address → lat/lng lookup; kept server-side since Nominatim's usage policy disallows direct browser calls

### Public map page

- [ ] `src/app/[locale]/map/page.tsx` — Server Component, fetches all points via `mapPointsApi`, passes to client `MapView`
- [ ] `src/components/Map/MapView.tsx` — `"use client"`, `@react-google-maps/api` `GoogleMap` centered on Ruse, distinct marker icon per `type`
- [ ] Type filter control (playgrounds / fitness / both)
- [ ] Marker click → info window with name + thumbnail
- [ ] Tapping a photo opens a full-screen `lightgallery` viewer (same pattern as `EventImagesGallery`), supports multiple images per pin

### Admin add/edit/delete UI

- [ ] Floating "+" button on `/map`, visible only when `user.id === NEXT_PUBLIC_ADMIN_USER_ID`
- [ ] `MapPointForm` — name, type, description, multi-image upload, location via:
  - "Use my GPS" button (`navigator.geolocation.getCurrentPosition`)
  - Address text input → `/api/map-points/geocode` lookup
  - Either path plots a draggable pin on a small preview map so the exact position can be fine-tuned before saving
- [ ] Edit/delete affordance in the info window when the logged-in user is admin

### Navigation

- [ ] Add "Map" link to the "More" drawer in `MobileBottomNav.tsx`
- [ ] Add "Map" link to the desktop dropdown in `Footer.tsx`

### i18n

- [ ] New `MapPage` namespace in `bg.json` (source), `en.json`, `ua.json`, `ro.json`
- [ ] New nav string for the More drawer / footer link

### Env vars

- [ ] Confirm `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` has the Maps JavaScript API enabled with billing (already confirmed working) — no new Google API needed since geocoding uses Nominatim

### Acceptance checks

- [ ] Guest and non-admin users can view the map and open pins, but see no add/edit/delete controls
- [ ] Admin can add a pin via GPS and see it appear at their real-world location
- [ ] Admin can add a pin via typed address and adjust the pin position before saving
- [ ] Multiple photos per pin open in a full-screen gallery
- [ ] Admin can edit a pin's name/description/photos and delete a pin
- [ ] Non-admin direct calls to the write API routes return 403

## Phase 21 — Events Map View (listing tab)

Full spec: `ARCHITECTURE.md` → **Events Map View (listing tab)**. Do not start this until `GOOGLE_MAPS_GEOCODING_API_KEY` exists in Google Cloud (Geocoding API + Places API New enabled) and in `.env.local` / Vercel, and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` has **Maps JavaScript API** enabled (needed for the listing; Embed alone is not enough). Distinct from Phase 20 (`/[locale]/map` playgrounds). No map on `/current`.

Implement in order. Each subsection is one doable pass: schema → geocode backend → save wiring → form autocomplete → backfill → public map tab → status/manual pin → detail follow-through.

### 21.1 Schema + types

- [x] Create `supabase/migrations/20260814_events_lat_lng.sql`: nullable `lat`, `lng`, `coords_source` on `events`, with `coords_source` check (`geocode` | `places` | `manual`) and pair check (all null or all set)
- [x] Apply on the remote project (SQL Editor or CLI). Do not invent coords for past rows.
- [x] `npm run db:types`
- [x] Add optional `lat`, `lng`, `coords_source` to `EventWriteInput` in `src/lib/api/events.ts`; pass them through `createEvent`, `updateEvent`, and `createRecurringEvents` (same coords on every occurrence)
- [x] Confirm generated `Tables<"events">` includes the new columns (no hand-written Event overrides)

### 21.2 Geocode library + API routes

- [x] `src/lib/geocode/ruse.ts` — Ruse center `43.8486, 25.9536`, Haversine, `isInsideRuse` (15 km). Results outside → treat as failure
- [x] `src/lib/geocode/query.ts` — `buildGeocodeQuery(place, address, town)` appends България, skips blanks
- [x] `src/lib/geocode/google.ts` — server-only `geocodeAddress`, `placeAutocomplete`, `placeDetails`. Use `GOOGLE_MAPS_GEOCODING_API_KEY`. Never throw into the event save path; return null coords on missing key / HTTP / ZERO_RESULTS / out-of-Ruse. Log a warning
- [x] `POST /api/geocode` — auth required, zod body `{ address, place, town }`, returns `{ lat, lng, source }` or nulls
- [x] `GET /api/geocode/suggest?q=` — auth required, Places Autocomplete biased to BG / Ruse
- [x] `GET /api/geocode/place?id=` — auth required, Place Details → lat/lng + address parts
- [x] Daily cap (80 Google-backed calls / Sofia day / user, `ADMIN_USER_ID` bypass) on geocode / suggest / place; 429 when exceeded
- [x] Add `GOOGLE_MAPS_GEOCODING_API_KEY=` to `.env.example` (comment: server-only, Geocoding + Places New)
- [x] Confirm `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` has **Maps JavaScript API** enabled in Google Cloud (Embed alone is not enough for the listing map)
- [x] Confirm `@react-google-maps/marker-clusterer` is importable — it is a dep at v2.20.0; no separate install needed

### 21.3 Save path (create / update / recurring)

- [x] `EventForm`: before `createEvent` / `createRecurringEvents` / `updateEvent`, resolve coords:
  - Places pick this session → `source: "places"`
  - else `POST /api/geocode` and await
  - geocode failure → save anyway with null coords (never block publish)
- [x] Recurring: one geocode, copy onto every occurrence
- [x] Update: compare `initialData.address` / `.place` / `.town` (trimmed, case-insensitive) against form values at submit time to decide whether location changed. `initialData` is the event as passed to `EventForm` from the server — use it as the baseline, not a ref or a separate fetch
- [x] If location unchanged, send `initialData.lat` / `initialData.lng` / `initialData.coords_source` through. No Google call
- [x] If location fields changed, re-geocode even when previous source was `manual`
- [x] Smart fill / scrape: no extra calls — they only fill the form

### 21.4 Places autocomplete on the address field

- [x] Debounced suggest list on `address` (same debounce idea as `FilterContent`), keyboard-accessible listbox
- [x] **Session token billing** — generate a `sessionToken` (a random UUID string is fine) when the address input is focused. Pass it with every `GET /api/geocode/suggest?q=&sessionToken=` call and with the final `GET /api/geocode/place?id=&sessionToken=` call. This collapses the whole autocomplete interaction into one **Autocomplete Session Usage** event (unlimited free). Generate a fresh token after each pick, or after the input is dismissed without a pick
- [x] `GET /api/geocode/suggest` and `GET /api/geocode/place` must forward the `sessionToken` to the Google Places API call
- [x] Selecting a suggestion: Place Details → fill address / town / place when provided, stash coords in form state
- [x] Further typing clears stashed Places coords so save geocodes the new text
- [x] Autocomplete is optional UX — paste and scrape still work with free-text geocode on save
- [x] i18n: `addressSuggestLoading` and `addressSuggestNoResults` in `CreateEvent` for bg, en, ua, ro

### 21.5 Upcoming backfill

- [x] `POST /api/admin/geocode-upcoming` — `user.id === ADMIN_USER_ID` only; 403 otherwise. Selects upcoming (`endDate >= today`) with `lat is null`. Sequential Google calls with a **200 ms delay** between each. Skip rows whose query is empty or whitespace-only. Do not update past events
- [x] Optional `npm run geocode:upcoming` script that hits the same helper with the service-role client for local/ops use — still upcoming-only. Prefer this for the first backfill (Vercel Hobby can 504 the HTTP route)
- [x] Overlapping `POST /api/admin/geocode-upcoming` returns 409 (advisory lock)
- [x] Missing server key → 503 with a clear message, no partial silent success

### 21.6 Map tab UI

- [x] Use existing `@react-google-maps/api`; import `MarkerClusterer` from `@react-google-maps/marker-clusterer` (v2.20.0, already installed). Do not add Leaflet
- [x] `src/components/EventsMap/EventsMapView.tsx` — `"use client"`, `dynamic(..., { ssr: false })` from `EventsList` so Maps JS is not in the home bundle and does not bill a map load until the tab opens
- [x] **Shared Maps JS loader** — call `useJsApiLoader` exactly once in `ActiveEventsList` (or a `GoogleMapsProvider` wrapper); pass `isLoaded` as a prop to `EventsMapView` and the form pin preview. Never call `useJsApiLoader` inside both components independently — duplicate loaders crash at runtime
- [x] Center/zoom on Ruse; `restriction.latLngBounds` so the user cannot pan to the whole of Bulgaria
- [x] Dark theme: Google `styles` array (e.g. standard dark palette). Light theme: default roadmap
- [x] Add `Map` icon from `lucide-react` to the third tab trigger (Grid: `LayoutGrid`, calendar: `CalendarDays`, map: `Map`)
- [x] `ViewPreference = "grid" | "calendar" | "map"`. Update the localStorage guard in `useViewPreference`: the current `stored === "grid" || stored === "calendar"` check silently drops `"map"`, so preference never restores — add `|| stored === "map"`. Persist `"map"` on mobile. Calendar stays a non-persisted overlay
- [x] Third tab trigger + `mapView` i18n key in `HomePage` for all 4 locales
- [x] Reuse `calendarSlotRef` height fill when `view === "calendar" || view === "map"`. Update the height-measurement `useEffect` cleanup condition from `view !== "calendar"` to `view !== "calendar" && view !== "map"` — without this, switching to map tears down the height before the component renders
- [x] **Today scope (client-side, no extra fetch).** Derive the map’s dataset from the already-fetched `events` array:
  - No active date filter → keep only events where `startDate <= today AND endDate >= today` (ongoing multi-day included)
  - Active `filters.from` / `filters.to` → use those dates instead
- [x] Split that scoped subset into two groups: (a) events with `lat` + `lng` → pins, (b) events without coords → below-map list
- [x] Show a **date scope label** above the map („Събитията днес, 14 август 2026“ or „Събитията за {from} – {to}“). `mapTodayLabel` / `mapFilteredLabel` i18n keys
- [x] **Do not** auto-switch map → grid when filters are active. Keep that behavior for calendar only
- [x] Cluster same-venue pins. InfoWindow: title, date, link to the event. InfoWindow content is plain DOM — use `<a href="/[locale]/[slug]">` with the locale-prefixed URL, **not** Next.js `Link` (which requires the React tree and does not work inside a Maps InfoWindow)
- [x] **Below-map list for events without coords.** Render a section below the map container with heading `eventsWithoutLocation` („{count} събития нямат локация на картата“). Each entry: event title + date as an `<a>` link. Not a full `EventCard`. Only events from the today-scoped subset that lack coords
- [x] If the scoped subset is entirely empty (no events today / in filter range): existing empty state. If there are pins but no pin-less events: omit the below-map list entirely
- [x] `/current` and `/past` stay grid-only
- [x] **Show my location button.** Floating button inside the map (bottom-right, above Google’s own controls). On click, calls `navigator.geolocation.getCurrentPosition()`. On success, places a blue "You are here" marker distinct from event pins. Does **not** auto-pan to the user. Toggles to “Hide my location” while dot is visible (`mapShowMyLocation` / `mapHideMyLocation` i18n). Location is transient state — never stored. If browser denies permission, show a toast (`mapLocationDenied` i18n)
- [x] Change `Permissions-Policy` in `next.config.ts` from `geolocation=()` to `geolocation=(self)`

### 21.7 Geocode status + manual pin

- [x] Location card on `EventForm` (edit): on the map / failed / not attempted. Retry button → `POST /api/geocode` and patch coords
- [x] Upcoming rows on My events (`showManageActions`): quiet mapped / missing indicator. Hide on past rows
- [x] Small Google Map preview on edit when coords exist; dragging sets `coords_source: "manual"`. Hidden when coords are null. Same lazy Maps JS loader as the listing
- [x] i18n for status + retry in `CreateEvent` / `HomePage`, all 4 locales

### 21.8 Event detail follow-through

- [x] Detail embed: if `lat`/`lng` present, `q=${lat},${lng}`; else keep today’s address string
- [x] JSON-LD: add `location.geo` (`GeoCoordinates`) only when coords exist

### 21.9 Quality gate

- [x] `npm run types` after the phase
- [x] Lint on touched files
- [ ] Manual check: create with a real Ruse street → pin appears; create with garbage address → event saves, no pin; filter concerts on the map → only those pins; recurring series → identical coords; edit title only → no Google call; edit address → new coords; past events untouched
- [x] Tab switching: grid → map → calendar → map → grid — height fills correctly each time; no visible layout jump or collapsed map

### Acceptance checks

- [ ] Home has three tabs: grid, calendar, map. Preference restores map on desktop and mobile
- [ ] Map shows upcoming (and currently running home-list) events that have coords; never past events
- [ ] Filters change the pins in place
- [ ] Events in today’s scope that failed geocoding appear in the below-map list with a heading; they still appear in the grid. Events outside today’s scope are absent from both map and list (expected)
- [ ] New events get coords on save without a manual lat/lng field
- [ ] Places pick stores `coords_source = 'places'`; typed address stores `geocode`; dragged pin stores `manual` and survives a title-only save
- [ ] Autocomplete interactions bill as Autocomplete Session Usage (confirm in Google Cloud billing console after test — should show session events, not per-request events)
- [ ] Publish never fails because Google is down or the key is missing
- [ ] Guest can open the map tab; geocode/suggest routes return 401 when unauthenticated
- [ ] Admin backfill does not write to past rows
- [ ] Event detail embed and JSON-LD use stored coords when present
- [ ] Map defaults to today’s events when no date filter is active; applying a date filter changes the map scope and label
- [ ] Date scope label is visible and updates correctly (today default vs active filter)
- [ ] "Show my location" button places a blue dot; "Hide my location" removes it; denying permission shows a toast
- [ ] `geolocation=(self)` in Permissions-Policy (verify via browser devtools → Application → Permissions Policy)
- [ ] Listing map uses Google Maps JS, lazy-loaded only when the map tab opens. Event detail keeps the Embed iframe
- [ ] `/map` playgrounds URL is unused and not claimed by this feature

## Phase 22 — Observability: Error Tracking & Analytics (`IMPLEMENTATION_PLAN.md` Phase 15)

Full spec and rationale: `IMPLEMENTATION_PLAN.md` → **Phase 15**. There is currently **no error monitoring** — the only visibility is `console.error` in Vercel runtime logs (1 h retention on Hobby, 1 day on Pro) and Supabase auth logs (1 h on Free, 7 days on Pro). Event creation swallows its error entirely; registration runs client-side so its failures never reach our server.

Locked decisions: **Sentry** (`@sentry/nextjs`), **errors only** (no tracing, no Session Replay in v1), **tunnel through our own domain**, **no PII** (Supabase UUID only), **not consent-gated**, all SDK calls isolated in `src/lib/observability/*`.

Implement in order — the wrapper (22.2) must exist before the coverage passes.

### 22.1 Install and wire

- [ ] `npm install @sentry/nextjs`; create the Sentry project in the **EU region** (`ingest.de.sentry.io`) so error data stays in the EU
- [ ] `src/instrumentation-client.ts` — browser init + `export const onRouterTransitionStart = Sentry.captureRouterTransitionStart`
- [ ] `sentry.server.config.ts` + `sentry.edge.config.ts` at project root
- [ ] `src/instrumentation.ts` — `register()` importing server/edge config by `NEXT_RUNTIME`, **and** `export const onRequestError = Sentry.captureRequestError` (without this, Server Component / route handler / middleware errors never arrive — the most common setup mistake)
- [ ] `next.config.ts` — `withSentryConfig` as the **outermost** wrapper: `withSentryConfig(withSerwist(withNextIntl(nextConfig)), {...})`. Wrapping inside `withSerwist` breaks source map upload
- [ ] Set `tunnelRoute: "/monitoring"` (fixed, not `true` — a random route can't be excluded from the middleware matcher), `sourcemaps.deleteSourcemapsAfterUpload: true`, `disableLogger: true`, `automaticVercelMonitors: true`, `silent: !process.env.CI`
- [ ] `tracesSampleRate: 0` and no `replayIntegration` — errors only in v1
- [ ] **Middleware matcher fix** — `src/middleware.ts` matcher `["/((?!_next|_vercel|api|auth|.*\\..*).*)"]` does not exclude `/monitoring`; every tunnelled error POST would run next-intl + a Supabase `getUser()`. Add `monitoring` to the negative lookahead
- [ ] Env: `NEXT_PUBLIC_SENTRY_DSN` (public), `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` (build-time only) — in `.env.local` and Vercel
- [ ] Verify the build **succeeds without** `SENTRY_AUTH_TOKEN` (local dev / contributors without Sentry access) — it should just skip source map upload
- [ ] Confirm no `src/app/sw.ts` change is needed (SW caches only `/_next/static/*` and images; the tunnel is a POST)

### 22.2 Internal reporting layer — `src/lib/observability/`

- [ ] `features.ts` — `ObservedFeature` string-literal union (`event-create`, `smart-fill-facebook`, `auth-signup`, …) so tags stay consistent and searchable
- [ ] `report.ts` — `reportError(error: unknown, ctx: { feature: ObservedFeature; extra?: Record<string, unknown> })`. Isomorphic, normalizes `unknown` → `Error`, sets the `feature` tag, **never throws**
- [ ] `user.ts` — `setObservedUser(userId: string | null)`, **UUID only**, never email
- [ ] Wire `setObservedUser` in the locale layout (initial session) and after login / signup / logout
- [ ] Rule for all coverage passes below: **replace** `console.error` with `reportError`, don't stack both; the `[smart-fill/facebook]` string prefix becomes the `feature` tag

### 22.3 Event creation coverage (biggest blind spot)

- [ ] `EventForm.tsx` ~L855 — bare `catch {}` discards the **entire** `onSubmit` error (image uploads, coords, `createEvent`/`updateEvent`, tags) into a generic toast. Change to `catch (err)` + `reportError`
- [ ] `EventForm.tsx` ~L871 — same for `handleDelete`
- [ ] `EventForm.tsx` ~L707 — same for `patchEventCoords` on geocode retry
- [ ] Tag a `step` (`image-upload` | `geocode` | `save` | `tags`) so four distinct root causes don't group into one useless issue
- [ ] Context: `mode`, `isRecurring`, image count, new-upload vs stored-path, `coords_source`, tag count, `initialData.id` when editing. **Never** the full form values (description is free text)
- [ ] Keep every user-facing toast exactly as-is — diagnostics only, no UX change

### 22.4 Smart Fill coverage (Apify + Gemini)

- [ ] Generate a short `importId` per `smart-fill/*` request, return it in the JSON response, include it in every report — one search links the user's symptom to the server cause
- [ ] `facebook/route.ts` — replace `console.warn` ~L69 and `console.error` ~L90; attach source URL, Apify `runId`, retry attempt, empty-dataset retry path
- [ ] `facebook/route.ts` ~L56 — report the **re-thrown** rate-limit RPC failure (today an unhandled 500 with no log at all)
- [ ] `text/route.ts` ~L65 — attach prompt **length** (not text), Gemini model, fallback-model flag; same re-thrown rate-limit gap
- [ ] `photo/route.ts` ~L89 — storage upload failure → report as error
- [ ] `photo/route.ts` ~L105 — Gemini extraction failure returns **HTTP 200** with a partial draft, so "AI upload didn't work" is invisible in every error metric. Report with a `partial_success` marker **without** changing the response contract
- [ ] `facebook/check/route.ts` ~L43 and `admin-scrape/route.ts` ~L83 (tag scrape `source`: grabo / ruse-danube)
- [ ] `lib/smart-fill/apify.ts` ~L411–424 — move the empty-dataset diagnostics (URL, run id, raw snippet) into report context so they outlive the 1 h log window
- [ ] `lib/smart-fill/image-reupload.ts` ~L41/L49/L54 — logs and returns `null`, so events can be created with a **missing image** and no signal. Report each failure; keep returning `null`
- [ ] `lib/smart-fill/gemini.ts` ~L129/L255 — retries and fallback-model as **breadcrumbs / warnings**, not exceptions (context for real failures, no quota inflation)
- [ ] `SmartFillPanel.tsx` ~L249 — report the client network catch with `importId`, but **skip `AbortError`** (the overlay cancel button is a deliberate user action, not a fault)

### 22.5 Auth and registration coverage

- [ ] `auth/signup/page.tsx` ~L134 — report `signUp` errors (Supabase code/message, duplicate classification, reCAPTCHA outcome, locale). **Never** email or password. **Exclude** the anti-enumeration empty-`identities` case — that's expected behaviour
- [ ] `auth/login/page.tsx` ~L100 and `auth/forgot-password/page.tsx` ~L61 — same pattern
- [ ] `SocialAuthButtons.tsx` ~L62 — report OAuth initiation failures, tagged by provider
- [ ] `src/app/auth/callback/route.ts` — **highest-value fix**: `exchangeCodeForSession` failure ~L39 only redirects to `?error=auth_callback_failed` with nothing logged, and the profile bootstrap has an **empty `catch`** ~L64. If OAuth signups are silently failing today we cannot know. Report both; keep redirects unchanged
- [ ] `src/app/auth/confirm/route.ts` ~L62 — same empty-catch fix
- [ ] `auth/verify-captcha/route.ts` ~L52–61 — report as **warning-level message** with score/action/hostname, not an exception (a low score is usually a bot, not a bug); watch volume vs quota

### 22.6 Remaining route + client coverage

- [ ] `account/delete/route.ts` — service-role deletion; partial failure leaves orphaned data, must be loud
- [ ] `events/claim/route.ts`, `events/report/route.ts` — report real errors, **not** expected 409 duplicates
- [ ] `geocode/route.ts`, `geocode/suggest/route.ts`, `geocode/place/route.ts`, `lib/geocode/google.ts` ~L60–174 — **warnings, not exceptions**: a failed geocode is a designed-for outcome (publish must never fail because Google is down)
- [ ] `admin/geocode-upcoming/route.ts` ~L35/L50/L55
- [ ] `push/subscribe/route.ts`, `push/reminder-time/route.ts`
- [ ] `push/send-reminders/route.ts` ~L44–60 — hourly cron discards individual failures via `Promise.allSettled`; report an **aggregate** (sent/failed counts + sample reasons), not one issue per subscription
- [ ] `saved-events/route.ts` — keep treating `23505` as a no-op; do **not** report it
- [ ] `lib/api/events.ts` ~L464/L486 and `lib/api/profiles.ts` ~L334 — build/sitemap helpers; report so silent degradation (`getAllSlugs` returning `[]`) becomes visible
- [ ] Client toast catches: `ProfileForm.tsx` (10 sites incl. `.catch(console.error)` ~L550), `ProfileAccountSecurity.tsx`, `ClaimEventButton.tsx`, `ReportEventButton.tsx`, `EventSaveButton.tsx`, `PushNotificationCard.tsx`, `EventsMapView.tsx`, `ProfilePastEvents.tsx`, `promptRemindersOnSave.tsx`

### 22.7 Global boundaries

- [ ] **Create `src/app/global-error.tsx`** — does not exist. Must be at `src/app/`, be `"use client"`, render its own `<html>`/`<body>`, and call `Sentry.captureException`. Last-resort net for root-layout render errors that `[locale]/error.tsx` cannot catch
- [ ] `src/app/[locale]/error.tsx` L19–21 — `console.error(error)` writes only to the **user's own browser console** where we never see it. Replace with `reportError`, passing `error.digest` to correlate with the server-side issue
- [ ] Leave `not-found.tsx` alone — a 404 is not an error, reporting it is noise
- [ ] Cross-reference the open Phase 10 `loading.tsx` / `error.tsx` item instead of duplicating it

### 22.8 GDPR and legal

- [ ] `sendDefaultPii: false`
- [ ] `beforeSend` scrubber stripping `email`, `password`, `phone`, `full_name` from any payload — defence in depth against a future careless `extra`
- [ ] Update `legal/privacy/page.tsx` — extend the existing sub-processor list (already names Vercel) with Sentry: what is collected, why (legitimate interest — security and functionality), EU storage, retention
- [ ] Update `legal/cookies/page.tsx` — error monitoring is cookie-free and therefore not consent-gated. If Session Replay is ever enabled it **must** move behind analytics consent
- [ ] Both legal updates in all 4 locales

### 22.9 Alerting (otherwise nothing here gets read)

- [ ] Sentry alert rule: email on **every new issue** (first occurrence) — low volume at this scale, high value
- [ ] Spike-detection rule on `feature` = `event-create`, `auth-signup`, `smart-fill-facebook`
- [ ] Cron monitor alert if `/api/push/send-reminders` stops running (`automaticVercelMonitors`)
- [ ] Set a **spend cap / rate limit** so a runaway loop can't burn the monthly quota in an hour

### 22.10 Verification + quality gate

- [ ] Deliberately trigger and confirm arrival for **each runtime**: Client Component, Server Component, route handler (proves `onRequestError` works), middleware
- [ ] Stack traces are **readable** (source maps uploaded and applied)
- [ ] Events go through `/monitoring`, not `*.ingest.sentry.io` — check the network tab, then re-test **with an ad blocker enabled**
- [ ] No `email` anywhere in a signup-failure payload
- [ ] `npm run types` + lint on touched files
- [ ] Client bundle delta ≈ 30–40 KB gzipped; if materially larger, tracing/replay integrations are leaking in and need tree-shaking
- [ ] Lighthouse pass on home — must not regress mobile performance on an SEO-first site
- [ ] Update `ARCHITECTURE.md`: `src/lib/observability/` in the folder structure, the 4 Sentry env vars, `@sentry/nextjs` in Dependencies, short "Observability" section (tagging convention + no-PII rule)

### 22.11 Part B — button click analytics (deferred, blocked on a decision)

Not built into Sentry — it is not an analytics tool and click volume would obliterate the error quota. Target elements: Create Event CTA, view-mode toggles (grid/calendar/map), Smart Fill tabs, save-event icon, filter usage, signup CTAs.

- [ ] **Decide the provider** — GA4 custom events (free, already wired via `gtag`, undercounts ~30–40% from consent-gating + ad blockers) vs PostHog (free to 1M events/mo, funnels + replay, new vendor + new consent entry) vs first-party `ui_events` Supabase table (exact and ad-blocker-proof, but needs table + RLS + batching endpoint + admin view). **Recommendation: GA4 first** — the undercount is uniform across buttons, so relative comparisons stay valid, and that is what drives product decisions
- [ ] `src/lib/observability/track.ts` — `trackEvent(name: TrackedEvent, props?)` with a string-literal union of event names, mirroring `features.ts`; one file to change if we switch provider later
- [ ] Respect the existing `hasAnalyticsConsent` check — no event fires without analytics consent
- [ ] No-op safely when `NEXT_PUBLIC_GA_ID` is unset (local dev)
- [ ] Never pass PII or free-text user content as event properties
- [ ] Instrument a **small** initial set (5–8 buttons) where a real decision is pending — tracking everything produces a dashboard nobody reads

## Phase 23 — "Още от Русе" Editorial Articles (`IMPLEMENTATION_PLAN.md` Phase 16)

Full spec and rationale: `IMPLEMENTATION_PLAN.md` → **Phase 16**. A blog-style section at `/[locale]/more-from-ruse` with an index and per-article detail pages, each article having a hero image and rich-text body. Content is evergreen city guides and listicles, not news. **This section exists for SEO** — event pages decay after two weeks, so articles are the only content on the site that can accumulate authority over years and rank for queries like „какво да правя в Русе".

Locked decisions: URL `/[locale]/more-from-ruse[/slug]`; **one row per language** linked by `group_id` (BG required, others optional, hreflang only between translations that exist); admin-only authoring via an in-app form; TipTap → sanitize-html → `dangerouslySetInnerHTML`; `Article` + `BreadcrumbList` JSON-LD; slug **locked after publish** (no redirect table); `revalidate = 300` + `revalidatePath` on write; category column now, archive pages later.

**Blocked before starting:** confirm the **category vocabulary** with the owner. Until then `category` is a nullable column with no DB check constraint and allowed values enforced only in zod.

Implement in order — the data layer and content pipeline must exist before the pages.

### 23.1 Data model + storage

- [ ] Migration `supabase/migrations/20260901_articles.sql` — `articles` table: `id`, `group_id`, `locale`, `slug`, `title`, `excerpt`, `meta_description`, `body_html`, `hero_image`, `hero_image_alt`, `category`, `status` (draft/published), `reading_minutes`, `published_at`, `updated_at`, `created_at`, `created_by`
- [ ] Unique indexes `(locale, slug)` and `(group_id, locale)`; indexes on `(locale, status, published_at desc)` and `(group_id)`
- [ ] Check constraint: `status = 'draft' or published_at is not null`
- [ ] RLS: `select using (status = 'published' or created_by = auth.uid())`. **No** insert/update/delete policies — all writes go through admin-checked API routes with the service-role client
- [ ] `set_articles_updated_at` trigger — `updated_at` feeds sitemap `lastModified` and JSON-LD `dateModified`, so it must be real; never touch rows programmatically for non-content reasons
- [ ] `npm run db:types`
- [ ] Create public Supabase bucket `article-images`
- [ ] `src/constants/index.ts` — `ARTICLES_BUCKET`, `ARTICLES_PAGE_SIZE = 12`, `ARTICLES_TEASER_COUNT = 3`
- [ ] Confirm no `next.config.ts` change is needed (existing `*.supabase.co/storage/v1/object/public/**` pattern covers the new bucket)

### 23.2 Types + validation

- [ ] `src/types/index.ts` — `Article = Tables<"articles">`, `ARTICLE_CATEGORIES` const tuple + `ArticleCategory` union
- [ ] `articleSchema` (zod) with SEO limits encoded: `title` 10–110 chars (110 = practical `headline` limit for Google rich results), `slug` lowercase-hyphen regex + max 80 + reserved words (`new`, `edit`, `page`, `rss`), `excerpt` 60–300 required, `meta_description` optional max 160, `body_html` non-empty after sanitizing, `hero_image_alt` **required whenever `hero_image` is set**
- [ ] `ArticleFormValues = z.infer<typeof articleSchema>`

### 23.3 Content pipeline

- [ ] `src/lib/article-html.ts` — `sanitizeArticleHtml` with a **wider allowlist than events** (`a`, `img`, `figure`, `figcaption`, `h4`, `hr`). Do **not** widen the event allowlist — event descriptions come from arbitrary users, article bodies only from the admin
- [ ] Sanitizer must: strip `h1` (the page `<h1>` is the title), force `rel="noopener"` on external links (no `noreferrer` — see Phase 11), force `loading="lazy"` + `decoding="async"` on images, and **drop any `img` whose host is not our Supabase storage domain** (hotlinks leak visitor IPs and wreck LCP)
- [ ] `addHeadingIds(html)` — transliterated `id` on `h2`/`h3` at save time so the ToC and deep links need no client JS
- [ ] `estimateReadingMinutes(html)` — word count ÷ 200, min 1; stored in `reading_minutes` on write
- [ ] `ARTICLE_BODY_CLASSES` prose string, following `EVENT_DESCRIPTION_BODY_CLASSES`
- [ ] `src/lib/article-slug.ts` — `buildArticleSlugFromTitle` reusing `transliterateCyrillicToLatin`, **no `-{id}` suffix** (unlike events; the slug is the strongest on-page keyword signal), max 80, shared reserved-word list

### 23.4 Data layer — `src/lib/api/articles.ts`

- [ ] `getPublishedArticles(client, { locale, page, pageSize })` → `{ articles, total }` with `.range()` + exact count
- [ ] `getPublishedArticleBySlug(client, locale, slug)` → `Article | null` (`PGRST116` → null, else throw)
- [ ] `getTranslationSiblings(client, groupId)` → `{ locale, slug }[]`, **published only** — this is what hreflang is built from
- [ ] `getLatestArticles(client, locale, limit)` for the homepage teaser
- [ ] `getArticleById(client, id)` for the edit form (relies on the `created_by` select policy)
- [ ] `getArticleSitemapEntries(client)` → all published `{ locale, slug, updatedAt }`; **throws** on error like `getAllSlugsWithDates`
- [ ] `isSlugAvailable(client, locale, slug, excludeId?)` mirroring `profilesApi.isUsernameAvailable`
- [ ] Export from `src/lib/api/index.ts`
- [ ] **Every public listing query filters `.eq("status", "published")` explicitly** — the select policy also matches `created_by = auth.uid()`, so without it the admin sees their own drafts in the public index

### 23.5 SEO helpers

- [ ] `src/lib/seo.ts` — `buildArticleAlternates(locale, slug, siblings)`: canonical + hreflang for **existing published siblings only**, keyed via the existing `LOCALE_TO_HREFLANG` map (`ua` → `uk`), **including a self-referencing entry** (Google treats a set without one as invalid), `x-default` → BG sibling when it exists. Do not reuse `buildAlternates`, which blindly emits all 4 locales
- [ ] `src/lib/article-jsonld.ts` — `buildArticleJsonLd`: `@type: "Article"`, `headline` hard-trimmed to 110, `description`, `image` array, `datePublished`, `dateModified`, `inLanguage`, `articleSection`, `author` + `publisher` as the All4Ruse `Organization` with a `logo` `ImageObject`, `mainEntityOfPage`, `isAccessibleForFree`
- [ ] `buildBreadcrumbJsonLd(items)` → `BreadcrumbList`, written generically (worth backporting to event detail + public profiles later — the site has no breadcrumbs today)
- [ ] `buildArticleListJsonLd` → `CollectionPage` with an `ItemList` `mainEntity`
- [ ] Serialize all JSON-LD with the existing `.replace(/</g, "\\u003c")` guard

### 23.6 Index page

- [ ] `src/app/[locale]/more-from-ruse/page.tsx` — Server Component, `export const revalidate = 300`
- [ ] `generateMetadata` — translated title/description, `buildAlternates(locale, "/more-from-ruse")`, OG `type: "website"`; canonical includes `?page=n` on page 2+
- [ ] **Locale with zero published articles** → translated empty state + `robots: { index: false }`. Four empty archive pages must not enter the index
- [ ] `<h1>` „Още от Русе" + keyword-bearing intro paragraph (real copy, not filler) + responsive `ArticleCard` grid
- [ ] `src/components/ArticleCard/ArticleCard.tsx` — Server-Component-friendly (no hooks): `next/image` hero, `<h2>` title in a locale-aware `Link`, `<time dateTime>`, reading time, category badge, 3-line clamped excerpt, **`aria-label` on the card link** (do not repeat the `EventCard` gap flagged in Phase 10)
- [ ] Pagination with `rel="prev"`/`rel="next"`, self-referencing canonical per page, out-of-range page → `notFound()`
- [ ] `CollectionPage` + `ItemList` JSON-LD

### 23.7 Article detail page

- [ ] `src/app/[locale]/more-from-ruse/[articleSlug]/page.tsx` — Server Component, `revalidate = 300`, fetch wrapped in React `cache()` so `generateMetadata` and the body share one query (same as `getEventBySlugCached`)
- [ ] `notFound()` when the slug does not exist **for this locale** — an untranslated article must 404, not render a wrong-language stub
- [ ] `generateMetadata` — title; description = `meta_description` or `excerpt` trimmed to 160 on a **word boundary** (same fix as Phase 19); `buildArticleAlternates`; OG `type: "article"` with `publishedTime`, `modifiedTime`, `section`, absolute 1200×630 image, `locale` + `alternateLocale`; Twitter `summary_large_image`
- [ ] Visible breadcrumb `<nav aria-label="Breadcrumb">`: Home → Още от Русе → title
- [ ] `<article>`, single `<h1>`, byline row with `<time dateTime>` + reading time + category
- [ ] Hero image in a fixed-aspect-ratio `<figure>` — `next/image` with `priority` + explicit `sizes`, wrapper reserving space so there is **no CLS**
- [ ] Server-rendered table of contents (`<nav>` list of `h2` anchors) when the body has ≥ 3 `h2`s — zero client JS
- [ ] Body via `dangerouslySetInnerHTML` with `ARTICLE_BODY_CLASSES`; sanitize on read as well as on write so a row edited in the Dashboard can't inject anything
- [ ] „Още статии" block — up to 3 other published articles in the same locale + link back to the index
- [ ] `Article` + `BreadcrumbList` JSON-LD

### 23.8 Admin authoring

- [ ] `src/app/[locale]/create-article/page.tsx` — server wrapper mirroring `create-event`; `notFound()` (not `redirect`) when `user.id !== ADMIN_USER_ID` so the route's existence isn't advertised; `?editId=` for edit
- [ ] Add `/create-article` to `AUTH_REQUIRED` in `src/middleware.ts`
- [ ] `generateMetadata` with `robots: { index: false, follow: false }`
- [ ] `src/components/ArticleForm/ArticleForm.tsx` — `"use client"`, react-hook-form + zod, structured like `EventForm`
- [ ] Locale select + "translation of" picker that attaches the row to an existing `group_id` (empty = new group)
- [ ] Slug auto-derived from title, editable, debounced availability check; **disabled once published**, with an inline explanation so the lock reads as intentional
- [ ] Category select; excerpt textarea with live counter + 120–160 guidance; optional `meta_description` with counter and SERP-snippet preview
- [ ] Hero image upload (react-dropzone, same constraints as `EventImageUpload`) with a **required** alt-text field directly beneath it
- [ ] `src/components/ArticleForm/ArticleBodyEditor.tsx` — TipTap setup from `EventDescriptionEditor` plus `Link` + `Image` extensions and `h4`. **Do not add article-only features to the event editor**
- [ ] Draft / Publish actions + a "Preview" link (works via the `created_by` select policy)
- [ ] Report failures through `reportError` once Phase 22 exists — do not repeat `EventForm`'s bare `catch {}`
- [ ] `POST /api/articles` — admin gate → sanitize body, add heading ids, compute `reading_minutes`, set `published_at` on publish
- [ ] `PATCH /api/articles/[id]` — **rejects a slug change when the stored row is already published**
- [ ] `DELETE /api/articles/[id]` — delete row + associated storage objects
- [ ] `POST /api/articles/image` — upload to `article-images`, type/size validation mirroring `smart-fill/photo`; the browser never writes to storage directly here
- [ ] All mutating routes call `revalidatePath` for the article path + the locale index so edits are live immediately instead of waiting out the 300 s window

### 23.9 Homepage teaser

- [ ] `src/components/ArticlesTeaser/ArticlesTeaser.tsx` — Server Component, 3 latest published for the locale
- [ ] Fetched in the **same `Promise.all`** as events in `src/app/[locale]/page.tsx` — no serial latency
- [ ] Placed **below** the events list: the events grid is the primary content and owns the LCP element
- [ ] `<h2>` heading that links to `/more-from-ruse` + an explicit „Виж всички" link (real internal links)
- [ ] Images `loading="lazy"`, never `priority`
- [ ] Renders `null` when the locale has no published articles

### 23.10 Crawling and indexing

- [ ] `src/app/sitemap.ts` — one entry per **existing** published translation (`/${locale}/more-from-ruse/${slug}`), `lastModified` from `updated_at`, `changeFrequency: "monthly"`, priority `0.7` (above events at `0.55`); section index per locale **only where ≥ 1 published article exists**, priority `0.8`
- [ ] `src/app/robots.ts` — add `/*/create-article` to disallow (no allow rule needed for the section)
- [ ] `public/llms.txt` — add the section under `## Key pages` + a line noting articles are editorial city guides. Far more citable by an LLM answering „what should I do in Ruse?" than any single event page
- [ ] `ARCHITECTURE.md` — add both routes to the Pages table, `articles` to the data model, the `article-images` bucket, and `src/lib/api/articles.ts` to the folder structure. Do this **at implementation time**, once the code exists

### 23.11 i18n

- [ ] `MoreFromRuse` namespace in `bg.json` (source) → `en.json`, `ua.json`, `ro.json`: section title, intro, index metadata title/description, empty state, „Още статии", reading-time format (`{minutes} мин четене`), breadcrumb labels, ToC heading, pagination labels, „Достъпно на български" chip
- [ ] Admin form strings (labels, counter hints, slug-locked explanation, validation messages) — fold into `MoreFromRuse` rather than adding a namespace for one admin screen
- [ ] `HomePage.moreFromRuseTitle` + `HomePage.moreFromRuseSeeAll` for the teaser
- [ ] Category display names once the vocabulary is confirmed

### 23.12 Performance + accessibility

- [ ] Both public pages ship **zero feature-level client JS** — no TanStack Query, no `useSearchParams` (pagination reads `searchParams` on the server)
- [ ] Hero `priority` + explicit `sizes` + reserved aspect ratio; cards lazy with grid-matching `sizes`
- [ ] Lighthouse on the index and a real article — mobile performance must not regress against the homepage
- [ ] Single `<h1>`, correct `h2`/`h3` nesting, `<time dateTime>`, `<figure>`/`<figcaption>`, `aria-label` on card links and breadcrumb nav, keyboard-reachable pagination
- [ ] WCAG AA contrast on category badge + byline text in both themes
- [ ] `npm run types` + lint on touched files

### 23.13 Acceptance checks

- [ ] BG article renders at `/bg/more-from-ruse/{slug}` with hero image, body, and exactly one `<h1>`
- [ ] Article with no EN translation is absent from `/en/more-from-ruse`, and `/en/more-from-ruse/{bg-slug}` returns 404
- [ ] After adding an EN translation, both pages emit hreflang for `bg` and `en` **only** (not `uk`/`ro`), each including a self-referencing alternate
- [ ] `x-default` points at the Bulgarian URL
- [ ] Google Rich Results Test passes `Article` + `BreadcrumbList` with no errors or warnings; index emits valid `CollectionPage` + `ItemList`
- [ ] Locale with zero articles → empty state, `noindex`, absent from sitemap
- [ ] Sitemap has exactly one entry per existing published translation, `lastModified` = `updated_at`
- [ ] Drafts invisible to guests in the listing, sitemap, and on the direct URL (404); author can preview
- [ ] Slug field disabled on a published article; direct `PATCH` attempting a slug change is rejected
- [ ] Guest and non-admin both get 404 on `/create-article`; direct calls to every `/api/articles/*` route return 403
- [ ] An `<img>` pointing outside our Supabase storage domain is stripped on save
- [ ] Publishing blocked when a hero image has no alt text
- [ ] Editing a published article is visible immediately; `dateModified` updates while `datePublished` does not
- [ ] Homepage teaser shows 3 latest, disappears when there are none, and is not the LCP element
- [ ] Page 2 has a self-referencing canonical (not one pointing at page 1) and is absent from the sitemap; out-of-range page → 404
- [ ] Reading time present and plausible; ToC appears only with ≥ 3 `h2`s and its anchors work

### 23.14 Not selected — reconsider at implementation time

The only entry point chosen was the homepage teaser. With 80% mobile traffic and no link in the mobile "More" drawer or desktop footer, the section is reachable only by scrolling the homepage — which also means deep crawl paths.

- [ ] Mobile "More" drawer link in `MobileBottomNav.tsx` (two-line change, alongside `why-all4ruse` / `advertise`)
- [ ] Desktop footer dropdown link in `Footer.tsx`
- [ ] Bidirectional event ↔ article cross-linking (related articles on event detail, related events on articles)

### 23.15 Deliberately out of scope

- Category **archive pages** — column exists, pages wait for content volume (~15–20 articles)
- **Auto-translation** — hand-written for now. Machine-translated articles are exactly what Google's quality guidance targets; if ever automated it must produce reviewable drafts, never auto-publish
- Comments, per-article author profiles, article search, shared taxonomy with event tags
- **RSS feed** at `/more-from-ruse/rss.xml` — cheap and useful for distribution, not required to rank; add once there is enough content to be worth subscribing to
- Newsletter integration — belongs with Brevo (Phase 16)
- `FAQPage` / `HowTo` structured data — only where an article genuinely has that shape; misapplied schema earns manual actions

## Future scope (deferred)

- [ ] Event content auto-translation via Google Translate API
- [ ] Ticket-related flows
- [ ] Update terms page content (pending new content from owner)
- [ ] Email marketing campaign management (Brevo automation flows beyond basic subscribe)
