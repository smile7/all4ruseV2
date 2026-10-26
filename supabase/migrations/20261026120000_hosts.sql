-- Admin-managed hosts (venues / organizers) that have no account of their own.
-- An event links to at most one host; the event keeps its own copy of the
-- place/address/contact fields, so editing a host never rewrites past events.

create table if not exists public.hosts (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique
                check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (length(trim(name)) > 0),
  place       text,
  address     text,
  website     text,
  phone       text,
  email       text,
  -- Reserved for letting a registered organizer take over the page later.
  profile_id  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.hosts enable row level security;

create policy "Hosts are readable"
  on public.hosts for select
  using (true);

-- No insert/update/delete policies: all writes go through the admin-checked
-- API routes using the service-role client.

create or replace function public.set_hosts_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger hosts_set_updated_at
  before update on public.hosts
  for each row execute function public.set_hosts_updated_at();

alter table public.events
  add column if not exists host_id uuid references public.hosts(id) on delete set null;

create index if not exists events_host_id_idx
  on public.events (host_id)
  where host_id is not null;

-- Events are written from the browser under RLS, so any organizer could
-- otherwise attach their event to someone else's host page. Only the
-- service-role client (admin API route) and direct SQL may set host_id.
create or replace function public.guard_events_host_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' and new.host_id is not null then
      raise exception 'host_id can only be set by an admin'
        using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.host_id is distinct from old.host_id then
      raise exception 'host_id can only be set by an admin'
        using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger events_guard_host_id
  before insert or update of host_id on public.events
  for each row execute function public.guard_events_host_id();
