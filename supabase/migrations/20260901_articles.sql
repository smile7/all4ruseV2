-- "Още от Русе" editorial articles.
-- One row per language; translations of the same article share a group_id.

create table if not exists public.articles (
  id               uuid primary key default gen_random_uuid(),
  group_id         uuid not null default gen_random_uuid(),
  locale           text not null check (locale in ('bg', 'en', 'ua', 'ro')),
  slug             text not null,
  title            text not null,
  excerpt          text not null,
  meta_description text,
  body_html        text not null,
  hero_image       text,
  hero_image_alt   text,
  category         text,
  author_name      text,
  is_sponsored     boolean not null default false,
  sponsor_name     text,
  sponsor_url      text,
  status           text not null default 'draft' check (status in ('draft', 'published')),
  reading_minutes  integer,
  published_at     timestamptz,
  updated_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  created_by       uuid references auth.users(id) on delete set null
);

-- One URL per language; one translation per language per article group.
create unique index if not exists articles_locale_slug_key
  on public.articles (locale, slug);
create unique index if not exists articles_group_locale_key
  on public.articles (group_id, locale);

-- Index listing: locale + published, newest first.
create index if not exists articles_locale_status_published_idx
  on public.articles (locale, status, published_at desc);

-- hreflang sibling lookup on the detail page.
create index if not exists articles_group_idx on public.articles (group_id);

alter table public.articles
  add constraint articles_published_at_check
  check (status = 'draft' or published_at is not null);

-- A sponsored article must name its sponsor: the disclosure label is built from it.
alter table public.articles
  add constraint articles_sponsor_name_check
  check (is_sponsored = false or sponsor_name is not null);

alter table public.articles enable row level security;

-- Public reads see published rows only. The author additionally sees their own
-- drafts, which removes the need for a service-role GET route for the edit form.
create policy "Published articles are readable"
  on public.articles for select
  using (status = 'published' or created_by = auth.uid());

-- No insert/update/delete policies: all writes go through the admin-checked
-- API routes using the service-role client.

-- No SECURITY DEFINER: the trigger only stamps a timestamp and writes always
-- come from the service-role client. search_path is pinned so the function
-- cannot be hijacked by a schema shadowing public.
create or replace function public.set_articles_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_articles_updated_at();
