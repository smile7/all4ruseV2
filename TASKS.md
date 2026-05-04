# TASKS — All4Ruse v2

## Phase 1 — Foundation

- [x] Create project planning files
- [x] Finalize product brief
- [x] Finalize architecture direction
- [x] Decide final stack
- [x] Define design direction (tweakcn "dashboard" theme tokens, shadcn/ui styling, Inter + Source Serif 4 + JetBrains Mono, View Transitions for key navigation)
- [x] Define MVP scope
  - Pages rollout: all events -> upcoming/current/past -> single event -> why all4ruse -> auth pages -> profile -> create event -> edit/duplicate event -> delete event -> my events
  - MVP feature scope (in addition to pages): searching and filtering (by tags, title, dates, host, place), locale routing (`/[locale]`), basic SEO metadata, role-based admin access for event management, theme changing, google calendar

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
- [ ] PWA foundation — `app/manifest.ts`, app icons, apple meta tags (installable, no service worker yet)
- [ ] EventCard component with "Live now" badge and View Transition name
- [ ] Active events page (home, SSR, initialData → EventsList + EventFilters with tag chips)
- [ ] Past events page (same pattern, reversed order, 15-day window)
- [ ] Event detail page (SSR, full content, SEO metadata, View Transition hero)
- [ ] Why All4Ruse page
- [ ] Legal pages (cookies, GDPR, privacy)

## Phase 6 — Auth + user pages

- [ ] Full auth flow: login, signup, email confirmation, callback route, forgot/update password
- [ ] Header + MobileBottomNav full auth wiring (avatar dropdown, logout)
- [ ] Profile page (view + edit)
- [ ] My events page
- [ ] Create event page (auth-guarded)
- [ ] Account security and deletion flow (change password + delete account with explicit confirmation)

## Phase 7 — Admin

- [ ] Admin layout with role check
- [ ] Admin event list with TanStack Query (create, edit, delete, toggle active/premium)
- [ ] Event form (create + edit, shared)
- [ ] Admin tags management page

## Phase 8 — Quality

- [ ] SEO metadata on all public pages (generateMetadata)
- [ ] JSON-LD structured data on event detail
- [ ] loading.tsx and error.tsx for key routes
- [ ] Mobile responsiveness review
- [ ] Accessibility review (keyboard nav, contrast, ARIA)
- [ ] i18n audit — all UI strings through t(), all 4 languages complete
- [ ] PWA service worker + offline fallback (next-pwa, cache strategies, offline page)

## Phase 9 — Future scope

- [ ] Event content auto-translation via Google Translate API
- [ ] Host profiles and submission workflow
- [ ] Premium and featured listings
- [ ] Sponsorship placements
- [ ] Ticket-related flows
- [ ] Push notifications — Web Push API subscription + Supabase Edge Function for delivery + user notification preferences in profile (by tag, by event reminder)
