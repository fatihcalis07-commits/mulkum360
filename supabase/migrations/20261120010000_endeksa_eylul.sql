-- Emlakjet & Endeksa Eylül 2026 Konut Değer Raporu (19 Ekim 2026 yayını): yıllık/6 aylık değişim, reel değişim, ortalama konut fiyatı
insert into public.endeks_seri (kod, kategori, ad, birim, siklik, kaynak, il_bazli) values
  ('ENDEKSA.YILLIK', 'emlak', 'Konut m² fiyatı yıllık nominal değişim (Emlakjet & Endeksa)', '%', 'aylık', 'Emlakjet & Endeksa Konut Değer Raporu (basın bültenleri)', true),
  ('ENDEKSA.REEL.YILLIK', 'emlak', 'Konut m² fiyatı yıllık reel değişim, enflasyondan arındırılmış (Emlakjet & Endeksa)', '%', 'aylık', 'Emlakjet & Endeksa Konut Değer Raporu (basın bültenleri)', true),
  ('ENDEKSA.ALTIAY', 'emlak', 'Konut m² fiyatı 6 aylık nominal değişim (Emlakjet & Endeksa)', '%', 'aylık', 'Emlakjet & Endeksa Konut Değer Raporu (basın bültenleri)', true),
  ('ENDEKSA.REEL.ALTIAY', 'emlak', 'Konut m² fiyatı 6 aylık reel değişim (Emlakjet & Endeksa)', '%', 'aylık', 'Emlakjet & Endeksa Konut Değer Raporu (basın bültenleri)', true),
  ('ENDEKSA.ORT.FIYAT', 'emlak', 'Ortalama konut satış fiyatı (Emlakjet & Endeksa)', 'TL', 'aylık', 'Emlakjet & Endeksa Konut Değer Raporu (basın bültenleri)', true)
on conflict (kod) do update set ad = excluded.ad, kaynak = excluded.kaynak, il_bazli = excluded.il_bazli;

insert into public.endeks_veri (kod, bolge, donem, deger) values
  ('ENDEKSA.M2', 'TR', '2026-09-01', 43300),
  ('ENDEKSA.ORT.FIYAT', 'TR', '2026-09-01', 5412500),
  ('ENDEKSA.ORT.FIYAT', 'İstanbul', '2026-09-01', 7569430), ('ENDEKSA.ORT.FIYAT', 'İzmir', '2026-09-01', 6668040),
  ('ENDEKSA.ORT.FIYAT', 'Antalya', '2026-09-01', 6174630), ('ENDEKSA.ORT.FIYAT', 'Ankara', '2026-09-01', 5248360),
  ('ENDEKSA.ORT.FIYAT', 'Bursa', '2026-09-01', 4792060),
  ('ENDEKSA.YILLIK', 'TR', '2026-09-01', 22.5),
  ('ENDEKSA.YILLIK', 'İstanbul', '2026-09-01', 28.1), ('ENDEKSA.YILLIK', 'Ankara', '2026-09-01', 27.9),
  ('ENDEKSA.YILLIK', 'Kocaeli', '2026-09-01', 26.5), ('ENDEKSA.YILLIK', 'Adana', '2026-09-01', 24.6),
  ('ENDEKSA.YILLIK', 'Kayseri', '2026-09-01', 23.7), ('ENDEKSA.YILLIK', 'Antalya', '2026-09-01', 23.6),
  ('ENDEKSA.YILLIK', 'Bursa', '2026-09-01', 21.8), ('ENDEKSA.YILLIK', 'İzmir', '2026-09-01', 20.8),
  ('ENDEKSA.REEL.YILLIK', 'TR', '2026-09-01', -6.2),
  ('ENDEKSA.REEL.YILLIK', 'İstanbul', '2026-09-01', -1.9), ('ENDEKSA.REEL.YILLIK', 'Ankara', '2026-09-01', -2.1),
  ('ENDEKSA.REEL.YILLIK', 'Kocaeli', '2026-09-01', -3.1), ('ENDEKSA.REEL.YILLIK', 'Adana', '2026-09-01', -4.6),
  ('ENDEKSA.REEL.YILLIK', 'Kayseri', '2026-09-01', -5.3),
  ('ENDEKSA.ALTIAY', 'TR', '2026-09-01', 7.2), ('ENDEKSA.REEL.ALTIAY', 'TR', '2026-09-01', -5.1)
on conflict (kod, bolge, donem) do update set deger = excluded.deger;

update public.veri_kaynaklari set url = 'https://www.endeksa.com/tr/blog/yazi/konut-fiyatlari-yillik-bazda-yuzde-225-artti-reel-olarak-yuzde-62-dustu' where kod = 'endeksa-rapor';

select kod, count(*) from public.endeks_veri where kod like 'ENDEKSA.%' group by kod order by kod;
