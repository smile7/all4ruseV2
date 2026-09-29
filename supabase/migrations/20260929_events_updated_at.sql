-- events.updated_at
--
-- The sitemap had to use created_at as its <lastmod>, so editing an event (fixed
-- date, new venue, cancellation) gave Google no signal that the page changed and
-- the stale version stayed in the index. Same for dateModified in the Event
-- JSON-LD. Backfilled from created_at, which is the only honest starting value.

alter table public.events
  add column if not exists updated_at timestamptz not null default now();

update public.events set updated_at = created_at where updated_at is null;

-- No SECURITY DEFINER: the trigger only stamps a timestamp. search_path is
-- pinned so the function cannot be hijacked by a schema shadowing public.
create or replace function public.set_events_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists events_set_updated_at on public.events;

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_events_updated_at();

-- Sitemap generation orders/filters on this column across the whole table.
create index if not exists events_updated_at_idx
  on public.events (updated_at desc);
