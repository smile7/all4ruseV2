-- Daily click counters for product analytics (homepage filters, advertise CTAs, …).
-- Writes go through /api/track with the service-role client.
-- New events only need a new event_key in the app allowlist — no schema change.

create table if not exists public.click_counts (
  event_key   text    not null,
  counted_on  date    not null,
  click_count integer not null default 0,
  constraint click_counts_pkey primary key (event_key, counted_on),
  constraint click_counts_event_key_len_check
    check (char_length(event_key) between 1 and 80),
  constraint click_counts_click_count_check
    check (click_count >= 0)
);

create index if not exists click_counts_counted_on_idx
  on public.click_counts (counted_on desc);

-- RLS on with no policies: only the service role may read or write.
alter table public.click_counts enable row level security;

create or replace function public.increment_click_count(p_event_key text)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_event_key is null
     or char_length(p_event_key) < 1
     or char_length(p_event_key) > 80 then
    raise exception 'invalid event_key';
  end if;

  insert into public.click_counts (event_key, counted_on, click_count)
  values (
    p_event_key,
    (now() at time zone 'Europe/Sofia')::date,
    1
  )
  on conflict (event_key, counted_on)
  do update set click_count = public.click_counts.click_count + 1;
end;
$$;

revoke all on function public.increment_click_count(text) from public, anon, authenticated;
grant execute on function public.increment_click_count(text) to service_role;
