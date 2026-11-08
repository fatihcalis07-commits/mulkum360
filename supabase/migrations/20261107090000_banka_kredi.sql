-- Banka kredi teklifleri (konut, taşıt, ihtiyaç). Herkes okur, yalnız yönetici yazar.
create table if not exists public.banka_teklifleri (
  id uuid primary key default gen_random_uuid(),
  banka text not null check (char_length(banka) between 2 and 60),
  tur text not null check (tur in ('konut', 'tasit', 'ihtiyac')),
  faiz numeric(6,3) not null check (faiz > 0 and faiz < 20), -- aylık %
  vade_min int not null default 12 check (vade_min > 0),
  vade_max int not null default 120 check (vade_max >= vade_min and vade_max <= 360),
  tutar_min numeric(14,0),
  tutar_max numeric(14,0),
  tahsis numeric(5,2), -- tahsis ücreti, kredi tutarının %'si
  aciklama text check (char_length(aciklama) <= 300),
  baglanti text check (baglanti is null or baglanti ~ '^https://'),
  aktif boolean not null default true,
  guncelleme timestamptz not null default now()
);
create index if not exists banka_teklifleri_tur on public.banka_teklifleri (tur, aktif, faiz);
alter table public.banka_teklifleri enable row level security;
drop policy if exists "teklif herkes okur" on public.banka_teklifleri;
create policy "teklif herkes okur" on public.banka_teklifleri for select using (aktif or public.yonetici());
drop policy if exists "teklif yonetici yazar" on public.banka_teklifleri;
create policy "teklif yonetici yazar" on public.banka_teklifleri for all to authenticated using (public.yonetici()) with check (public.yonetici());

-- Piyasa ortalaması (TCMB EVDS ağırlıklı ortalama kredi faizi). Elle ya da EVDS işiyle doldurulur.
create table if not exists public.kredi_ortalama (
  tur text not null check (tur in ('konut', 'tasit', 'ihtiyac')),
  donem date not null,
  faiz_yillik numeric(6,2) not null,
  kaynak text not null default 'TCMB EVDS',
  primary key (tur, donem)
);
alter table public.kredi_ortalama enable row level security;
drop policy if exists "ortalama herkes okur" on public.kredi_ortalama;
create policy "ortalama herkes okur" on public.kredi_ortalama for select using (true);
drop policy if exists "ortalama yonetici yazar" on public.kredi_ortalama;
create policy "ortalama yonetici yazar" on public.kredi_ortalama for all to authenticated using (public.yonetici()) with check (public.yonetici());
