-- Veri motoru izlenebilirliği: her toplama çalışması bir satır log bırakır; kaynaklar envanterlenir.
-- Logları yalnız service role (edge fonksiyonları) yazar; yönetici ve CLI okur. postgres rolü owner olduğu için RLS'i atlar.
create table if not exists public.ingestion_logs (
  id bigint generated always as identity primary key,
  kaynak text not null check (char_length(kaynak) between 2 and 60),
  baslangic timestamptz not null default now(),
  durum text not null check (durum in ('ok', 'hata')),
  satir int check (satir >= 0),
  ayrinti text check (char_length(ayrinti) <= 1000)
);
create index if not exists ingestion_logs_kaynak on public.ingestion_logs (kaynak, baslangic desc);
alter table public.ingestion_logs enable row level security;
drop policy if exists "log yazilir" on public.ingestion_logs;
create policy "log yazilir" on public.ingestion_logs for insert to authenticated with check (true);
drop policy if exists "log yonetici okur" on public.ingestion_logs;
create policy "log yonetici okur" on public.ingestion_logs for select using (public.yonetici());

-- Kaynak envanteri (küçük): hangi kaynak var, ne sıklıkta, lisansı, son başarılı çalışma.
create table if not exists public.veri_kaynaklari (
  kod text primary key check (char_length(kod) between 2 and 40),
  ad text not null check (char_length(ad) between 3 and 120),
  url text check (url is null or url ~ '^https://'),
  siklik text check (siklik is null or char_length(siklik) <= 20),
  lisans text check (lisans is null or char_length(lisans) <= 200),
  son_calisma timestamptz
);
alter table public.veri_kaynaklari enable row level security;
drop policy if exists "kaynaklar herkese acik" on public.veri_kaynaklari;
create policy "kaynaklar herkese acik" on public.veri_kaynaklari for select using (true);
drop policy if exists "kaynaklari yonetici yazar" on public.veri_kaynaklari;
create policy "kaynaklari yonetici yazar" on public.veri_kaynaklari for all to authenticated using (public.yonetici()) with check (public.yonetici());

insert into public.veri_kaynaklari (kod, ad, url, siklik, lisans) values
  ('evds-kredi', 'TCMB EVDS — kredi faizleri (haftalık)', 'https://evds3.tcmb.gov.tr/igmevdsms-dis/', 'günlük', 'TCMB açık veri; kaynak gösterimi zorunlu'),
  ('evds-kfe', 'TCMB EVDS — Konut Fiyat Endeksi (aylık)', 'https://evds3.tcmb.gov.tr/igmevdsms-dis/', 'aylık', 'TCMB açık veri; kaynak gösterimi zorunlu'),
  ('kredi-guncelle', 'Banka kredi teklifleri (Gemini+arama)', null, 'günlük', 'Kendi derlememiz; teyit uyarısıyla gösterilir'),
  ('tuik-satis', 'TÜİK konut satış istatistikleri (il)', 'https://databrowser2.tuik.gov.tr/', 'aylık', 'TÜİK açık veri; kaynak göster, değiştirme'),
  ('tuik-nufus', 'TÜİK ADNKS nüfus (il/ilçe)', 'https://data.tuik.gov.tr/', 'yıllık', 'TÜİK açık veri; kaynak göster, değiştirme'),
  ('sahibindex', 'sahibindex/Betam aylık konut raporu (30 il)', 'https://betam.bahcesehir.edu.tr/', 'aylık', 'Ücretsiz yayın; kaynak gösterilir; veri seti toplu kullanımı lisans gerektirir'),
  ('osm', 'OpenStreetMap (Photon/Overpass/OSRM runtime)', 'https://www.openstreetmap.org/', 'gerçek zamanlı', 'ODbL — harita gösteriminde © OpenStreetMap katkıcıları'),
  ('tkgm', 'TKGM MEGSİS parsel servisi', 'https://cbsapi.tkgm.gov.tr/megsiswebapi.v3/api', 'gerçek zamanlı', 'Kamu açık servisi'),
  ('ysk', 'YSK seçim sonuçları', 'https://sonuc.ysk.gov.tr/', '5 yılda', 'Kamu açık veri'),
  ('odmd', 'ODMD/OSDD araç satış istatistikleri', null, 'aylık', 'Serbest yayın; elle giriş, kaynak gösterilir')
on conflict (kod) do nothing;

-- Loglar 180 gün tutulur (gece temizliğiyle uyumlu saat).
select cron.unschedule('ingestion-log-temizlik') where exists (select 1 from cron.job where jobname = 'ingestion-log-temizlik');
select cron.schedule('ingestion-log-temizlik', '40 0 * * *', $$delete from public.ingestion_logs where baslangic < now() - interval '180 days'$$);
