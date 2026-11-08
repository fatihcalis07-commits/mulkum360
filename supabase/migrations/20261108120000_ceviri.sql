-- Arayüz ve ilan metni çevirileri (Türkçe → İngilizce / Rusça). Herkes okur; yazma yalnız 'cevir' fonksiyonu (service role).
create table if not exists public.ceviri (
  dil text not null check (dil in ('en', 'ru')),
  kaynak text not null check (char_length(kaynak) <= 600),
  hedef text not null,
  olusturma timestamptz not null default now(),
  primary key (dil, kaynak)
);
alter table public.ceviri enable row level security;
drop policy if exists "ceviri herkes okur" on public.ceviri;
create policy "ceviri herkes okur" on public.ceviri for select using (true);
