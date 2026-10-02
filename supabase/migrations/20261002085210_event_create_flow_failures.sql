-- Allow event create/edit diagnostics in flow_failures (browser-reported).
alter table public.flow_failures drop constraint if exists flow_failures_flow_check;

alter table public.flow_failures add constraint flow_failures_flow_check check (
  flow in ('push_enable', 'smart_fill', 'auth', 'event_create')
);
