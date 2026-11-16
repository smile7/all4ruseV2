-- events.published_at
--
-- The moment an event first became publicly visible (isEventActive = true).
-- created_at is not good enough for "new since your last visit": events from
-- unconfirmed creators are inserted inactive and approved later, so their
-- created_at can predate a visit that never saw them.
--
-- Stamped once and never moved: deactivating and reactivating an event keeps
-- the original value. Clients cannot set it; the trigger overwrites any value
-- sent on insert or update.

alter table public.events
  add column if not exists published_at timestamptz;

-- Backfill before the trigger below exists (it would discard the value), and
-- with the updated_at trigger paused so every sitemap <lastmod> stays put.
-- created_at is the closest honest guess for already-active events.
alter table public.events disable trigger events_set_updated_at;

update public.events
  set published_at = created_at
  where "isEventActive" and published_at is null;

alter table public.events enable trigger events_set_updated_at;

create or replace function public.set_events_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.published_at = old.published_at;
  else
    new.published_at = null;
  end if;

  if new.published_at is null and new."isEventActive" then
    new.published_at = now();
  end if;

  return new;
end $$;

drop trigger if exists events_set_published_at on public.events;

create trigger events_set_published_at
  before insert or update on public.events
  for each row execute function public.set_events_published_at();
