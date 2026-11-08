-- MODÜL 15: uygulama ayarları (vitrin sırası/görünürlüğü, ileride doping tanıtım metinleri)
-- ONAY BEKLİYOR — kullanıcı onayı olmadan push EDİLMEZ. Onay sonrası:
--   move bu dosya → supabase/migrations/20261109XXXXXX_ayarlar.sql && npx supabase@2.121.0 db push
create table if not exists public.ayarlar (
  anahtar text primary key,
  veri jsonb not null,
  guncelleme timestamptz not null default now()
);
alter table public.ayarlar enable row level security;
create policy ayarlar_oku on public.ayarlar for select using (true);
create policy ayarlar_ekle on public.ayarlar for insert with check (public.yonetici());
create policy ayarlar_degis on public.ayarlar for update using (public.yonetici()) with check (public.yonetici());
-- kod bu tablo yokken de çalışır (yerel varsayılan); varken sb.js S.AYARLAR'a yükleyecek (tek satır, onayda eklenir)
