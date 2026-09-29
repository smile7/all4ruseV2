-- Event-tag promo can be paused or given an end date without unpublishing
-- the article. Existing tagged articles stay active until an editor turns
-- them off or sets an expiry.

alter table public.articles
  add column if not exists event_tag_is_active boolean not null default true;

alter table public.articles
  add column if not exists event_tag_expires_on date;

comment on column public.articles.event_tag_is_active is
  'When false, the article is not promoted on event pages even if event_tag_id is set.';

comment on column public.articles.event_tag_expires_on is
  'Last calendar day the promo is shown. Null means no expiry. Compared against Europe/Sofia.';

drop index if exists public.articles_event_tag_published_idx;

create index if not exists articles_event_tag_promo_idx
  on public.articles (event_tag_id, published_at desc)
  where status = 'published'
    and event_tag_id is not null
    and event_tag_is_active = true;
