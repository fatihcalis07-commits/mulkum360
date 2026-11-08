-- İlan başına fotoğraf sınırı 15 → 30
alter table public.ilanlar drop constraint if exists ilanlar_fotolar_check;
alter table public.ilanlar add constraint ilanlar_fotolar_check check (cardinality(fotolar) <= 30);
