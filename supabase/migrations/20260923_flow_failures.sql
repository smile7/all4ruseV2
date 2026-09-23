-- Shared diagnostics for user-facing flows (push reminders, smart fill, auth).
-- There is no external log service, so failures are recorded here and queried
-- directly in Postgres. Allowed stages per flow live in src/lib/failures.ts and
-- are validated with zod before insert; the database only pins the flow names.
create table if not exists public.flow_failures (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users(id) on delete cascade,
  flow       text        not null,
  stage      text        not null,
  message    text,
  metadata   jsonb       not null default '{}'::jsonb,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint flow_failures_flow_check check (
    flow in ('push_enable', 'smart_fill', 'auth')
  )
);

create index if not exists flow_failures_flow_created_at_idx
  on public.flow_failures (flow, created_at desc);

-- RLS on with no policies: only the service role may read or write. Rows are
-- inserted server-side by /api/failures and by the smart fill / auth routes.
alter table public.flow_failures enable row level security;

-- Move the existing push diagnostics over and retire the old table.
insert into public.flow_failures (id, user_id, flow, stage, message, metadata, user_agent, created_at)
select
  id,
  user_id,
  'push_enable',
  stage,
  message,
  case
    when permission is null then '{}'::jsonb
    else jsonb_build_object('permission', permission)
  end,
  user_agent,
  created_at
from public.push_enable_failures
on conflict (id) do nothing;

drop table if exists public.push_enable_failures;

-- Give back a smart fill import that was consumed but failed on our side
-- (scrape, Gemini, or upload error), so users only spend quota on successes.
create or replace function refund_smart_fill_import(
  p_user_id    uuid,
  p_usage_date date,
  p_feature    text  -- 'facebook' | 'text' | 'image'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update smart_fill_daily_usage
  set
    import_count   = greatest(import_count - 1, 0),
    facebook_count = greatest(facebook_count - case when p_feature = 'facebook' then 1 else 0 end, 0),
    text_count     = greatest(text_count     - case when p_feature = 'text'     then 1 else 0 end, 0),
    image_count    = greatest(image_count    - case when p_feature = 'image'    then 1 else 0 end, 0)
  where user_id = p_user_id
    and usage_date = p_usage_date;
end;
$$;

revoke all on function refund_smart_fill_import(uuid, date, text) from public;
grant execute on function refund_smart_fill_import(uuid, date, text) to service_role;
