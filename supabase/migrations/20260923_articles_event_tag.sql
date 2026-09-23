-- An article can be promoted on event pages that carry one event tag.
-- One tag per article; the newest published article for a tag wins.

alter table public.articles
  add column if not exists event_tag_id bigint references public.tags(id) on delete set null;

-- Event-page lookup: published articles for a set of tags, newest first.
create index if not exists articles_event_tag_published_idx
  on public.articles (event_tag_id, published_at desc)
  where status = 'published' and event_tag_id is not null;

-- Replaces the promo that was hardcoded to THEATRE-tagged events.
update public.articles
set event_tag_id = (select id from public.tags where upper(title) = 'THEATRE' limit 1)
where locale = 'bg'
  and slug = 'komediyna-esen-v-ruse-nikolaos-kapitana-vergov'
  and event_tag_id is null;
