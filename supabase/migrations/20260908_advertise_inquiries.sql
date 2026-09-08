-- Partnership / advertising contact submissions from /advertise.
-- Writes go through /api/advertise/inquiries with the service-role client.
create table if not exists public.advertise_inquiries (
  id            uuid        primary key default gen_random_uuid(),
  email         text        not null,
  name          text        not null,
  business_name text        not null,
  message       text        not null,
  locale        text        check (locale is null or locale in ('bg', 'en', 'ua', 'ro')),
  created_at    timestamptz not null default now(),
  constraint advertise_inquiries_email_len_check
    check (char_length(email) between 3 and 254),
  constraint advertise_inquiries_name_len_check
    check (char_length(name) between 1 and 100),
  constraint advertise_inquiries_business_name_len_check
    check (char_length(business_name) between 1 and 150),
  constraint advertise_inquiries_message_len_check
    check (char_length(message) between 1 and 4000)
);

create index if not exists advertise_inquiries_created_at_idx
  on public.advertise_inquiries (created_at desc);

create index if not exists advertise_inquiries_email_created_at_idx
  on public.advertise_inquiries (lower(email), created_at desc);

-- RLS on with no policies: only the service role may read or write.
-- Rows are inserted server-side by /api/advertise/inquiries.
alter table public.advertise_inquiries enable row level security;
