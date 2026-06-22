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
- [x] Username validation in `ProfileForm`: debounced uniqueness check (format + inline sanitize done; DB uniqueness on save only)
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

- [ ] SEO metadata on all public pages (generateMetadata)
- [x] JSON-LD structured data on event detail (`[slug]` page — `Event` schema)
- [ ] loading.tsx and error.tsx for key routes
- [ ] Mobile responsiveness review
- [ ] Accessibility review (keyboard nav, contrast, ARIA)
- [ ] i18n audit — all UI strings through t(), all 4 languages complete
- [ ] PWA service worker + offline fallback (next-pwa, cache strategies, offline page)

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

- [ ] Add Google reCAPTCHA v3 to signup and login forms — server-side token verification before Supabase auth call
- [ ] Env: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`

### Registration

- [x] "Съгласен съм с Условията за ползване" checkbox on signup form — `acceptTerms: z.boolean()` + `.refine` in zod schema; links to terms page

### Profile navigation

- [x] Add "Виж публичния си профил" to avatar dropdown (desktop) and Profile sheet (mobile) — always shown (username is always set); links to `/user/[username]`

## Phase 13 — Event Interactions

### Claim event

- [ ] DB: create `event_claims` table (`id`, `event_id`, `claimant_id`, `status` pending/approved/declined, `message`, `created_at`) + RLS
- [ ] Add "Претендирам за събитието" button on event detail (hidden if already owner, hidden if pending claim exists)
- [ ] Clicking opens dialog: explanation + optional message + submit
- [ ] On submit: save to DB + send email to admin (event link, claimant info, approve/decline API action links)
- [ ] Approve/decline API routes update `status` + send result email to claimant

### Report event

- [ ] DB: create `event_reports` table (`id`, `event_id`, `reporter_id` nullable, `reason` text, `status` new/reviewed, `created_at`) + RLS
- [ ] Add "Докладвай събитието" button on event detail
- [ ] Clicking opens dialog: required reason textarea + submit
- [ ] On submit: save to DB + send email to admin with event info + reason
- [ ] Show success toast to reporter

## Phase 14 — Homepage Hero & Calendar View

### Homepage create event CTA

- [ ] Add hero section above event list: "СЪБИТИЯ В РУСЕ" heading + short subtitle
- [ ] Prominent "Създай събитие +" button always visible
- [ ] If guest: clicking → login page with `next=/create-event` param

### Calendar view

- [ ] Add view toggle on events listing page: "Карти" (grid) ↔ "Календар" (week view)
- [ ] Week view: starts Monday, shows event chips per day column
- [ ] Navigation: prev week / next week + "Тази седмица" reset
- [ ] Mobile: horizontally scrollable week strip
- [ ] Click on event chip → event detail page
- [ ] Custom implementation (no heavy calendar library)

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

- [ ] Create `src/app/[locale]/advertise/page.tsx` — clean static page: what All4Ruse is, audience, why sponsor, sponsorship tiers (visual cards), contact CTA
- [ ] Add to footer navigation and "More" mobile sheet

### Revolut support button

- [ ] Add "Подкрепи ни" button/chip linking to `https://revolut.me/silvenamiteva` in footer and "More" mobile sheet
- [ ] Tasteful placement — not intrusive

## Phase 18 — Advanced Filters & Premium

- [ ] Filter by place: multi-select with popular Ruse venues (Доходно, Блок 14, РИУ Сити Сентър, etc.) as preset chips + free text fallback; apply as `place ILIKE %value%`
- [ ] Filter by premium events: confirm `premium` column exists, add "Premium" toggle chip to filters panel

## Future scope (deferred)

- [ ] Event content auto-translation via Google Translate API
- [ ] Ticket-related flows
- [ ] Update terms page content (pending new content from owner)
- [ ] Email marketing campaign management (Brevo automation flows beyond basic subscribe)
