-- İlçe / mahalle piyasa m² fiyatları: yönetici girer (kaynak + tarih zorunlu). Değerleme önce bunu, yoksa il referansını kullanır.
create table if not exists public.piyasa_m2 (
  id bigint generated always as identity primary key,
  il text not null, ilce text not null default '', mahalle text not null default '',
  islem text not null check (islem in ('Satılık', 'Kiralık')),
  m2_fiyat numeric not null check (m2_fiyat > 0 and m2_fiyat < 10000000),
  kaynak text not null check (char_length(kaynak) between 3 and 200),
  donem date not null default current_date,
  olusturma timestamptz not null default now()
);
create index if not exists piyasa_m2_yer on public.piyasa_m2 (il, ilce, mahalle, islem, donem desc);
alter table public.piyasa_m2 enable row level security;
drop policy if exists "piyasa m2 herkese açık" on public.piyasa_m2;
create policy "piyasa m2 herkese açık" on public.piyasa_m2 for select using (true);
drop policy if exists "yönetici piyasa m2 yazar" on public.piyasa_m2;
create policy "yönetici piyasa m2 yazar" on public.piyasa_m2 for all to authenticated using (public.yonetici()) with check (public.yonetici());

-- Kullanıcıların değerlemede girdiği emsaller (kalabalık veri; kimlik tutulmaz)
create table if not exists public.kullanici_emsal (
  id bigint generated always as identity primary key,
  il text not null, ilce text not null default '', mahalle text not null default '',
  islem text not null, alt text, oda text,
  m2net numeric not null check (m2net between 10 and 5000),
  fiyat numeric not null check (fiyat > 0),
  olusturma timestamptz not null default now()
);
create index if not exists kullanici_emsal_yer on public.kullanici_emsal (il, ilce, islem, olusturma desc);
alter table public.kullanici_emsal enable row level security;
drop policy if exists "emsal herkese açık" on public.kullanici_emsal;
create policy "emsal herkese açık" on public.kullanici_emsal for select using (true);
drop policy if exists "üye emsal ekler" on public.kullanici_emsal;
create policy "üye emsal ekler" on public.kullanici_emsal for insert to authenticated with check (true);
drop policy if exists "yönetici emsal siler" on public.kullanici_emsal;
create policy "yönetici emsal siler" on public.kullanici_emsal for delete to authenticated using (public.yonetici());
