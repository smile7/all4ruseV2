alter table public.saved_events
  drop constraint if exists saved_events_event_id_key;

alter table public.saved_events
  drop constraint if exists saved_events_user_id_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'saved_events_user_id_event_id_key'
      and conrelid = 'public.saved_events'::regclass
  ) then
    alter table public.saved_events
      add constraint saved_events_user_id_event_id_key
      unique (user_id, event_id);
  end if;
end $$;