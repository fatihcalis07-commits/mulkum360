-- Kişi başı GSYH 2025: Türkiye resmî (TÜİK Yıllık GSYH 2025, güncel: 714.682 TL / 18.103 $).
-- İller: TÜİK il verisi 2025 henüz yok (Aralık 2026 bekleniyor) → 2024 il değeri × (TR 2025 / TR 2024) TAHMİNİ.
insert into public.endeks_seri (kod,kategori,ad,birim,siklik,kaynak,il_bazli) values
 ('TUIK.GSYH.KISI.TL.TAHMIN','genel','Kişi başı GSYH (tahmini)','TL','yıllık','Mülküm360 tahmini: TÜİK il 2024 × ulusal 2025 artışı',true),
 ('TUIK.GSYH.KISI.USD.TAHMIN','genel','Kişi başı GSYH (tahmini)','USD','yıllık','Mülküm360 tahmini: TÜİK il 2024 × ulusal 2025 artışı',true)
on conflict (kod) do nothing;
insert into public.endeks_veri (kod,bolge,donem,deger) values ('TUIK.GSYH.KISI.TL','TR','2025-01-01',714682),('TUIK.GSYH.KISI.USD','TR','2025-01-01',18103)
on conflict (kod,bolge,donem) do update set deger=excluded.deger;
insert into public.endeks_veri (kod,bolge,donem,deger)
select kod || '.TAHMIN', bolge, '2025-01-01', round(deger * case when kod='TUIK.GSYH.KISI.TL' then 714682.0/503075.557 else 18103.0/15325.126 end, 2)
from public.endeks_veri where kod in ('TUIK.GSYH.KISI.TL','TUIK.GSYH.KISI.USD') and donem='2024-01-01' and bolge <> 'TR'
on conflict (kod,bolge,donem) do update set deger=excluded.deger;
select bolge, deger from public.endeks_veri where kod='TUIK.GSYH.KISI.TL.TAHMIN' and bolge in ('İstanbul','Antalya') ;
