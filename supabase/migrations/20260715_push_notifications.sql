-- push_subscriptions: stores Web Push API subscriptions per user.
-- One user can have multiple subscriptions (different devices/browsers).
create table public.push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  endpoint   text        not null,
  p256dh     text        not null,
  auth       text        not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

-- Users can only read/write their own subscriptions.
create policy "Users manage own push subscriptions"
  on public.push_subscriptions
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Reject arbitrary URLs at the DB layer (defense in depth against SSRF via direct client writes).
create or replace function public.is_valid_push_endpoint(endpoint text)
returns boolean
language sql
immutable
as $$
  select
    endpoint ~ '^https://'
    and (
      host in (
        'fcm.googleapis.com',
        'updates.push.services.mozilla.com',
        'notify.windows.com',
        'web.push.apple.com',
        'push.apple.com'
      )
      or host like '%.fcm.googleapis.com'
      or host like '%.updates.push.services.mozilla.com'
      or host like '%.notify.windows.com'
      or host like '%.web.push.apple.com'
      or host like '%.push.apple.com'
    )
  from (
    select split_part(split_part(endpoint, '://', 2), '/', 1) as raw_host
  ) parts
  cross join lateral (
    select split_part(raw_host, ':', 1) as host
  ) normalized;
$$;

alter table public.push_subscriptions
  add constraint push_subscriptions_valid_endpoint
  check (public.is_valid_push_endpoint(endpoint));

-- Add reminder time preference to profiles (HH:MM, local Bulgarian time, default 09:00).
alter table public.profiles
  add column if not exists reminder_time text not null default '09:00';
