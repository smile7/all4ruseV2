-- Tracks whether a profile currently has at least one active push subscription.
alter table public.profiles
  add column if not exists push_notifications_enabled boolean not null default false;

-- Backfill existing profiles from the current subscription table.
update public.profiles profile
set push_notifications_enabled = exists (
  select 1
  from public.push_subscriptions sub
  where sub.user_id = profile.id
);