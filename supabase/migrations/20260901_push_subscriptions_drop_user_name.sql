-- `user_name` was added directly in the dashboard, never appeared in a migration,
-- and is written by nothing in the app, so every row created since is null.
-- Display names live in public.profiles.full_name; join on user_id when needed.
alter table public.push_subscriptions
  drop column if exists user_name;
