-- Nullable map coordinates on events.
-- Existing rows stay null — do not invent coords. Geocoding is a later task.

alter table public.events
  add column lat double precision,
  add column lng double precision,
  add column coords_source text;

alter table public.events
  add constraint events_coords_source_check
  check (coords_source is null or coords_source in ('geocode', 'places', 'manual'));

alter table public.events
  add constraint events_coords_pair_check
  check (
    (lat is null and lng is null and coords_source is null)
    or
    (lat is not null and lng is not null and coords_source is not null)
  );

comment on column public.events.lat is 'WGS84 latitude. Null when geocoding failed or was never attempted.';
comment on column public.events.lng is 'WGS84 longitude. Null when geocoding failed or was never attempted.';
comment on column public.events.coords_source is 'geocode = address lookup; places = autocomplete pick; manual = creator/admin dragged the pin.';
