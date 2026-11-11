-- Kendi veri bankamız: her değerleme isteğinin özeti (kimlik bilgisi tutulmaz)
create table if not exists public.degerleme_kayitlari (
  id bigint generated always as identity primary key,
  zaman timestamptz not null default now(),
  ana text not null check (ana in ('emlak','vasita')),
  alt text, islem text, il text, ilce text, mahalle text,
  m2net numeric check (m2net is null or m2net between 1 and 100000), oda text, kat text, bina_yasi text,
  marka text, model text, yil int check (yil is null or yil between 1950 and 2100), km int check (km is null or km between 0 and 3000000), hasar text,
  emsal_sayi int, sonuc_orta numeric, kasko_orta numeric
);
alter table public.degerleme_kayitlari enable row level security;
drop policy if exists "herkes değerleme kaydı ekler" on public.degerleme_kayitlari;
create policy "herkes değerleme kaydı ekler" on public.degerleme_kayitlari for insert to anon, authenticated with check (true);
drop policy if exists "yönetici değerleme kayıtlarını görür" on public.degerleme_kayitlari;
create policy "yönetici değerleme kayıtlarını görür" on public.degerleme_kayitlari for select to authenticated using (public.yonetici());
create index if not exists degerleme_kayitlari_zaman on public.degerleme_kayitlari (zaman desc);
