-- Anonymous "heart" likes on events.
--
-- Anyone can like an event, with or without an account, so there is no
-- per-user row: the browser remembers what it liked (localStorage) and the
-- database only keeps the total. Kept out of public.events on purpose — the
-- events_set_updated_at trigger would otherwise bump updated_at (sitemap
-- <lastmod>, JSON-LD dateModified) on every like.
--
-- Reads are public. Writes go through /api/event-likes (rate limited) with the
-- service-role client calling change_event_like_count.

create table if not exists public.event_like_counts (
  event_id   bigint      not null
    references public.events (id) on delete cascade,
  like_count integer     not null default 0,
  updated_at timestamptz not null default now(),
  constraint event_like_counts_pkey primary key (event_id),
  constraint event_like_counts_like_count_check check (like_count >= 0)
);

alter table public.event_like_counts enable row level security;

drop policy if exists "event_like_counts are publicly readable"
  on public.event_like_counts;

create policy "event_like_counts are publicly readable"
  on public.event_like_counts
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on table public.event_like_counts
  from anon, authenticated;

-- Applies +1 (like) or -1 (unlike) and returns the new total. Never goes
-- below zero. Liking an event that does not exist fails on the foreign key.
create or replace function public.change_event_like_count(
  p_event_id bigint,
  p_delta integer
) returns integer
language plpgsql
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_delta not in (1, -1) then
    raise exception 'invalid delta';
  end if;

  if p_delta = 1 then
    insert into public.event_like_counts (event_id, like_count)
    values (p_event_id, 1)
    on conflict (event_id) do update set
      like_count = public.event_like_counts.like_count + 1,
      updated_at = now()
    returning like_count into v_count;
  else
    update public.event_like_counts
    set
      like_count = greatest(like_count - 1, 0),
      updated_at = now()
    where event_id = p_event_id
    returning like_count into v_count;
  end if;

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.change_event_like_count(bigint, integer)
  from public, anon, authenticated;
grant execute on function public.change_event_like_count(bigint, integer)
  to service_role;
