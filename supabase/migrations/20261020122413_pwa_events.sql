-- PWA install and usage signals.
-- Writes go through /api/pwa-events with the service-role client.
-- One row per visitor per signal. Daily signals (related_installed,
-- standalone_open, notification_open) use the Europe/Sofia date as the
-- dedupe key. notification_open.hit_count is how many times they opened a
-- notification that day. standalone_open.duration_seconds is the longest
-- installed-app session recorded that day.

create table if not exists public.pwa_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  event_name text not null,
  dedupe_key text not null,
  counted_on date not null,
  platform text not null,
  display_mode text not null,
  launch_source text,
  duration_seconds integer,
  hit_count integer not null default 1,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pwa_events_event_name_check check (
    event_name in (
      'prompt_eligible',
      'prompt_accepted',
      'prompt_dismissed',
      'installed',
      'related_installed',
      'standalone_open',
      'push_granted',
      'push_denied',
      'notification_open'
    )
  ),
  constraint pwa_events_dedupe_key_check
    check (char_length(dedupe_key) between 1 and 32),
  constraint pwa_events_platform_check check (
    platform in ('desktop', 'mobile', 'unknown')
  ),
  constraint pwa_events_display_mode_check check (
    display_mode in (
      'browser',
      'standalone',
      'minimal-ui',
      'fullscreen',
      'unknown'
    )
  ),
  constraint pwa_events_launch_source_check check (
    launch_source is null or launch_source in ('icon', 'notification')
  ),
  constraint pwa_events_duration_check check (
    duration_seconds is null
    or (duration_seconds >= 0 and duration_seconds <= 86400)
  ),
  constraint pwa_events_hit_count_check check (hit_count >= 1),
  constraint pwa_events_user_agent_check check (
    user_agent is null or char_length(user_agent) <= 512
  ),
  constraint pwa_events_visitor_event_dedupe
    unique (visitor_id, event_name, dedupe_key)
);

create index if not exists pwa_events_event_counted_on_idx
  on public.pwa_events (event_name, counted_on desc);

-- RLS on with no policies: only the service role may read or write.
alter table public.pwa_events enable row level security;

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

  -- One-time choices stay a single row. Usage signals start a new row each
  -- Sofia day so return visits stay visible.
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
    user_agent
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
    p_user_agent
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
    updated_at = now()
  where
    p_event_name = 'notification_open'
    or (
      p_event_name = 'standalone_open'
      and excluded.duration_seconds is not null
    );
end;
$$;

-- Supabase grants EXECUTE on new public functions to anon and authenticated.
-- `revoke ... from public` does not remove those grants.
revoke all on function public.record_pwa_event(uuid, text, text, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.record_pwa_event(uuid, text, text, text, text, text, integer)
  to service_role;
