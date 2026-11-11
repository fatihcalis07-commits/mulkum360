-- Yayınlanmış (kamuya açık) piyasa raporlarından seriler + kendi ilan özetimizin haftalık birikmesi.
insert into public.endeks_seri (kod, kategori, ad, birim, siklik, kaynak, il_bazli) values
  ('BETAM.SATILIK.M2', 'emlak', 'Satılık konut ilan m² fiyatı (sahibindex)', 'TL/m²', 'aylık', 'sahibindex / Betam (Bahçeşehir Üniv.) Konut Piyasası Görünümü', true),
  ('BETAM.KIRALIK.M2', 'emlak', 'Kiralık konut ilan m² kirası (sahibindex)', 'TL/m²/ay', 'aylık', 'sahibindex / Betam (Bahçeşehir Üniv.) Konut Piyasası Görünümü', true),
  ('ENDEKSA.M2', 'emlak', 'Ortalama konut m² satış fiyatı (Emlakjet & Endeksa)', 'TL/m²', 'aylık', 'Emlakjet & Endeksa Konut Değer Raporu (basın bültenleri)', true)
on conflict (kod) do update set ad = excluded.ad, kaynak = excluded.kaynak, il_bazli = excluded.il_bazli;

-- Emlakjet & Endeksa Konut Değer Raporu, basına yansıyan rakamlar (2026)
insert into public.endeks_veri (kod, bolge, donem, deger) values
  ('ENDEKSA.M2', 'TR', '2026-05-01', 40486), ('ENDEKSA.M2', 'TR', '2026-06-01', 40944), ('ENDEKSA.M2', 'TR', '2026-07-01', 41703),
  ('ENDEKSA.M2', 'TR', '2026-08-01', 42488), ('ENDEKSA.M2', 'TR', '2026-09-01', 43300),
  ('ENDEKSA.M2', 'İstanbul', '2026-07-01', 65078), ('ENDEKSA.M2', 'Antalya', '2026-07-01', 55495), ('ENDEKSA.M2', 'İzmir', '2026-07-01', 53974),
  ('ENDEKSA.M2', 'Ankara', '2026-07-01', 38674), ('ENDEKSA.M2', 'Bursa', '2026-07-01', 36083), ('ENDEKSA.M2', 'Muğla', '2026-07-01', 87244)
on conflict (kod, bolge, donem) do update set deger = excluded.deger;

insert into public.veri_kaynaklari (kod, ad, url, siklik, lisans) values
  ('betam-rapor', 'sahibindex / Betam Satılık ve Kiralık Konut Piyasası Görünümü (aylık rapor, TR + 3 büyükşehir)', 'https://betam.bahcesehir.edu.tr/', 'aylık', 'Kamuya açık yayın; rakamlar kaynak gösterilerek alıntılanır'),
  ('endeksa-rapor', 'Emlakjet & Endeksa Konut Değer Raporu (basın bültenleri)', 'https://www.emlakjet.com/', 'aylık', 'Kamuya açık yayın; rakamlar kaynak gösterilerek alıntılanır')
on conflict (kod) do nothing;

-- Kendi verimiz: ilan özeti her pazartesi (ayın değeri güncellenir, geçmiş ayları biriktirir)
select cron.unschedule('endeks-ilan-ozeti') where exists (select 1 from cron.job where jobname = 'endeks-ilan-ozeti');
select cron.schedule('endeks-ilan-ozeti', '20 3 * * 1', $$select public.endeks_ilan_ozeti()$$);
