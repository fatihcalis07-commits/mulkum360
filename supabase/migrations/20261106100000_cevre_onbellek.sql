-- Rapor çevre verisi önbelleği: aynı ~100 m'lik noktanın OpenStreetMap/OSRM sonucu 30 gün tekrar kullanılır.
create table if not exists public.cevre_onbellek (
  anahtar text primary key check (char_length(anahtar) <= 40),
  veri jsonb not null,
  olusturma timestamptz not null default now()
);
alter table public.cevre_onbellek enable row level security;
drop policy if exists "önbellek okunur" on public.cevre_onbellek;
create policy "önbellek okunur" on public.cevre_onbellek for select to authenticated using (true);
drop policy if exists "önbellek yazılır" on public.cevre_onbellek;
create policy "önbellek yazılır" on public.cevre_onbellek for insert to authenticated with check (pg_column_size(veri) < 200000);
drop policy if exists "önbellek yenilenir" on public.cevre_onbellek;
create policy "önbellek yenilenir" on public.cevre_onbellek for update to authenticated using (olusturma < now() - interval '30 days') with check (pg_column_size(veri) < 200000);
