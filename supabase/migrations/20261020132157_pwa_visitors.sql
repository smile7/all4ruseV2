-- Make pwa_events readable in the dashboard.
-- `browser` and `os` are filled from the user agent on write.
-- `pwa_visitors` is one row per browser, with a plain status.

alter table public.pwa_events
  add column if not exists browser text,
  add column if not exists os text;

alter table public.pwa_events
  drop constraint if exists pwa_events_browser_check,
  drop constraint if exists pwa_events_os_check;

alter table public.pwa_events
  add constraint pwa_events_browser_check check (
    browser is null or browser in ('Chrome', 'Edge', 'Firefox', 'Safari', 'Other')
  ),
  add constraint pwa_events_os_check check (
    os is null or os in ('Android', 'iOS', 'Windows', 'macOS', 'Linux', 'Other')
  );

update public.pwa_events
set
  browser = case
    when user_agent ilike '%Edg/%' then 'Edge'
    when user_agent ilike '%Firefox/%' then 'Firefox'
    when user_agent ilike '%Chrome/%' or user_agent ilike '%CriOS%' then 'Chrome'
    when user_agent ilike '%Safari/%' then 'Safari'
    when user_agent is null then null
    else 'Other'
  end,
  os = case
    when user_agent ilike '%Android%' then 'Android'
    when user_agent ilike '%iPhone%' or user_agent ilike '%iPad%' then 'iOS'
    when user_agent ilike '%Windows%' then 'Windows'
    when user_agent ilike '%Macintosh%' or user_agent ilike '%Mac OS X%' then 'macOS'
    when user_agent ilike '%Linux%' or user_agent ilike '%CrOS%' then 'Linux'
    when user_agent is null then null
    else 'Other'
  end
where browser is null or os is null;

create or replace function public.record_pwa_event(
  p_visitor_id uuid,
  p_event_name text,
  p_platform text,
  p_display_mode text,
  p_launch_source text default null,
  p_user_agent text default null,
  p_duration_seconds integer default null
) returns void
language plpgsql
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'Europe/Sofia')::date;
  v_dedupe text;
  v_browser text;
  v_os text;
begin
  if p_event_name not in (
    'prompt_eligible',
    'prompt_accepted',
    'prompt_dismissed',
    'installed',
    'related_installed',
    'standalone_open',
    'push_granted',
    'push_denied',
    'notification_open'
  ) then
    raise exception 'invalid event_name';
  end if;

  if p_platform not in ('desktop', 'mobile', 'unknown') then
    raise exception 'invalid platform';
  end if;

  if p_display_mode not in (
    'browser',
    'standalone',
    'minimal-ui',
    'fullscreen',
    'unknown'
  ) then
    raise exception 'invalid display_mode';
  end if;

  if p_launch_source is not null
     and p_launch_source not in ('icon', 'notification') then
    raise exception 'invalid launch_source';
  end if;

  if p_duration_seconds is not null
     and (p_duration_seconds < 0 or p_duration_seconds > 86400) then
    raise exception 'invalid duration_seconds';
  end if;

  if p_user_agent is not null and char_length(p_user_agent) > 512 then
    p_user_agent := left(p_user_agent, 512);
  end if;

  v_browser := case
    when p_user_agent ilike '%Edg/%' then 'Edge'
    when p_user_agent ilike '%Firefox/%' then 'Firefox'
    when p_user_agent ilike '%Chrome/%' or p_user_agent ilike '%CriOS%' then 'Chrome'
    when p_user_agent ilike '%Safari/%' then 'Safari'
    when p_user_agent is null then null
    else 'Other'
  end;

  v_os := case
    when p_user_agent ilike '%Android%' then 'Android'
    when p_user_agent ilike '%iPhone%' or p_user_agent ilike '%iPad%' then 'iOS'
    when p_user_agent ilike '%Windows%' then 'Windows'
    when p_user_agent ilike '%Macintosh%' or p_user_agent ilike '%Mac OS X%' then 'macOS'
    when p_user_agent ilike '%Linux%' or p_user_agent ilike '%CrOS%' then 'Linux'
    when p_user_agent is null then null
    else 'Other'
  end;

  if p_event_name in (
    'prompt_eligible',
    'prompt_accepted',
    'prompt_dismissed',
    'installed',
    'push_granted',
    'push_denied'
  ) then
    v_dedupe := 'once';
  else
    v_dedupe := to_char(v_day, 'YYYY-MM-DD');
  end if;

  insert into public.pwa_events (
    visitor_id,
    event_name,
    dedupe_key,
    counted_on,
    platform,
    display_mode,
    launch_source,
    duration_seconds,
    hit_count,
    user_agent,
    browser,
    os
  ) values (
    p_visitor_id,
    p_event_name,
    v_dedupe,
    v_day,
    p_platform,
    p_display_mode,
    p_launch_source,
    case
      when p_event_name = 'standalone_open' then p_duration_seconds
      else null
    end,
    1,
    p_user_agent,
    v_browser,
    v_os
  )
  on conflict (visitor_id, event_name, dedupe_key) do update set
    hit_count = case
      when p_event_name = 'notification_open' then public.pwa_events.hit_count + 1
      else public.pwa_events.hit_count
    end,
    duration_seconds = case
      when p_event_name = 'standalone_open'
           and excluded.duration_seconds is not null
        then greatest(
          coalesce(public.pwa_events.duration_seconds, 0),
          excluded.duration_seconds
        )
      else public.pwa_events.duration_seconds
    end,
    browser = coalesce(excluded.browser, public.pwa_events.browser),
    os = coalesce(excluded.os, public.pwa_events.os),
    updated_at = now()
  where
    p_event_name = 'notification_open'
    or (
      p_event_name = 'standalone_open'
      and excluded.duration_seconds is not null
    );
end;
$$;

revoke all on function public.record_pwa_event(uuid, text, text, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.record_pwa_event(uuid, text, text, text, text, text, integer)
  to service_role;

create or replace view public.pwa_visitors
with (security_invoker = true) as
select
  visitor_id,
  (array_agg(os order by created_at desc) filter (where os is not null))[1] as os,
  (array_agg(browser order by created_at desc) filter (where browser is not null))[1] as browser,
  (array_agg(platform order by created_at desc))[1] as platform,
  case
    when bool_or(event_name = 'installed')
         and bool_or(event_name = 'standalone_open')
      then 'installed and opened'
    when bool_or(event_name = 'installed')
      then 'installed, not opened yet'
    when bool_or(event_name = 'standalone_open')
      then 'opened the app'
    when bool_or(event_name = 'prompt_dismissed')
      then 'dismissed the install prompt'
    when bool_or(event_name = 'prompt_eligible')
      then 'install available, not installed'
    else 'other'
  end as status,
  (min(created_at) filter (where event_name = 'prompt_eligible'))
    at time zone 'Europe/Sofia' as install_available_at,
  (min(created_at) filter (where event_name = 'installed'))
    at time zone 'Europe/Sofia' as installed_at,
  (max(created_at) filter (where event_name = 'standalone_open'))
    at time zone 'Europe/Sofia' as last_opened_at,
  max(duration_seconds) filter (where event_name = 'standalone_open') as seconds_open,
  coalesce(sum(hit_count) filter (where event_name = 'notification_open'), 0)::integer
    as notification_clicks,
  (min(created_at) at time zone 'Europe/Sofia') as first_seen_at,
  (max(updated_at) at time zone 'Europe/Sofia') as last_seen_at
from public.pwa_events
group by visitor_id;

comment on view public.pwa_visitors is
  'One row per browser. Times are Europe/Sofia. Open this instead of pwa_events.';

revoke all on table public.pwa_visitors from public, anon, authenticated;
grant select on table public.pwa_visitors to service_role;
