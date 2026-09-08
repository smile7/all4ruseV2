-- Diagnostics for the "enable reminders" flow. There is no external log service,
-- so failed attempts are recorded here and queried directly in Postgres.
create table if not exists public.push_enable_failures (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users(id) on delete cascade,
  stage      text        not null,
  message    text,
  permission text,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint push_enable_failures_stage_check check (
    stage in (
      'no_vapid_key',
      'permission_denied',
      'no_service_worker',
      'missing_keys',
      'save_rejected',
      'subscribe_threw',
      'sw_resubscribe_failed'
    )
  )
);

create index if not exists push_enable_failures_created_at_idx
  on public.push_enable_failures (created_at desc);

-- RLS on with no policies: only the service role may read or write. Rows are
-- inserted server-side by /api/push/failures.
alter table public.push_enable_failures enable row level security;
