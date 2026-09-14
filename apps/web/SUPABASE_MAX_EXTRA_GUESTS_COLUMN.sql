-- Paid extra guests a host allows above the listing's guest count.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Occupancy rule after this migration:
--   maximum party (adults + kids) = properties.guests
--                                 + (allow_extra_guests ? max_extra_guests : 0)

alter table public.properties
  add column if not exists max_extra_guests integer;

alter table public.properties
  drop constraint if exists properties_max_extra_guests_range;

alter table public.properties
  add constraint properties_max_extra_guests_range
  check (max_extra_guests is null or (max_extra_guests >= 0 and max_extra_guests <= 20));

comment on column public.properties.max_extra_guests is
  'Paid extra guests allowed above properties.guests when allow_extra_guests is true. Null means none.';
