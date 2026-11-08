-- Ücretsiz drone çekimi talepleri: ilan sahibi oluşturur, yönetici planlar.
create table if not exists public.drone_talepleri (
  id uuid primary key default gen_random_uuid(),
  sahip uuid not null default auth.uid() references auth.users on delete cascade,
  ilan uuid references public.ilanlar on delete set null,
  il text, ilce text,
  tercih text check (char_length(tercih) <= 200),
  telefon text check (char_length(telefon) <= 30),
  aciklama text check (char_length(aciklama) <= 500),
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'planlandi', 'tamamlandi', 'iptal')),
  plan_tarihi timestamptz,
  yonetici_notu text check (char_length(yonetici_notu) <= 500),
  olusturma timestamptz not null default now()
);
create index if not exists drone_talepleri_sahip on public.drone_talepleri (sahip, olusturma desc);
alter table public.drone_talepleri enable row level security;
drop policy if exists "drone sahip ekler" on public.drone_talepleri;
create policy "drone sahip ekler" on public.drone_talepleri for insert to authenticated with check (sahip = auth.uid() and durum = 'bekliyor');
drop policy if exists "drone sahip gorur" on public.drone_talepleri;
create policy "drone sahip gorur" on public.drone_talepleri for select using (sahip = auth.uid() or public.yonetici());
drop policy if exists "drone yonetici yazar" on public.drone_talepleri;
create policy "drone yonetici yazar" on public.drone_talepleri for update using (public.yonetici()) with check (public.yonetici());
