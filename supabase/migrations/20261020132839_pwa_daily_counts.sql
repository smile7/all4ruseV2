-- Replace the per-visit PWA log with daily counters, same shape as click_counts.
-- fresh_install: a browser finished installing the app.
-- icon_open: a browser opened the installed app. The client counts each
-- browser once per Sofia day, so the number is people, not repeat taps.

create table public.pwa_event_counts_seed as
select
  'fresh_install'::text as event_key,
  counted_on,
  count(*)::integer as event_count
from public.pwa_events
where event_name = 'installed'
group by counted_on
union all
select
  'icon_open'::text,
  counted_on,
  count(*)::integer
from public.pwa_events
where event_name = 'standalone_open'
group by counted_on;

drop view if exists public.pwa_visitors;
drop function if exists public.record_pwa_event(uuid, text, text, text, text, text, integer);
drop table public.pwa_events;

create table public.pwa_events (
  event_key   text    not null,
  counted_on  date    not null,
  event_count integer not null default 0,
  constraint pwa_events_pkey primary key (event_key, counted_on),
  constraint pwa_events_event_key_check
    check (event_key in ('fresh_install', 'icon_open')),
  constraint pwa_events_event_count_check
    check (event_count >= 0)
);

create index pwa_events_counted_on_idx
  on public.pwa_events (counted_on desc);

insert into public.pwa_events (event_key, counted_on, event_count)
select event_key, counted_on, event_count
from public.pwa_event_counts_seed;

drop table public.pwa_event_counts_seed;

alter table public.pwa_events enable row level security;

create or replace function public.increment_pwa_count(p_event_key text)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_event_key is null
     or p_event_key not in ('fresh_install', 'icon_open') then
    raise exception 'invalid event_key';
  end if;

  insert into public.pwa_events (event_key, counted_on, event_count)
  values (
    p_event_key,
    (now() at time zone 'Europe/Sofia')::date,
    1
  )
  on conflict (event_key, counted_on)
  do update set event_count = public.pwa_events.event_count + 1;
end;
$$;

revoke all on function public.increment_pwa_count(text) from public, anon, authenticated;
grant execute on function public.increment_pwa_count(text) to service_role;
