-- Aylık "Konut Trend Analizi" bildirimi (TCMB konut fiyat endeksi + değerleme birim fiyatı). Her dönem için üye başına bir kez.
create or replace function public.piyasa_bildirimi_gonder(p_yalniz uuid default null) returns int language plpgsql security definer set search_path = public as $$
declare s record; o record; y record; m record; v_ay numeric; v_yil numeric; v_metin text; v_link text; v_n int;
  ay text[] := array['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
begin
  select donem, deger into s from public.kfe where bolge = 'TR' order by donem desc limit 1;
  if s is null then return 0; end if;
  select deger into o from public.kfe where bolge = 'TR' and donem = (s.donem - interval '1 month')::date;
  select deger into y from public.kfe where bolge = 'TR' and donem = (s.donem - interval '1 year')::date;
  select deger into m from public.endeks_veri where kod = 'BIRIMFIYAT' and bolge = 'TR' order by donem desc limit 1;
  v_ay := round((s.deger / o.deger - 1) * 100, 2); v_yil := round((s.deger / y.deger - 1) * 100, 2);
  v_metin := 'Türkiye genelinde konut fiyatları ' || ay[extract(month from s.donem)::int] || ' ' || extract(year from s.donem) || ' itibarıyla aylık %' || replace(v_ay::text, '.', ',')
    || ', yıllık %' || replace(v_yil::text, '.', ',') || ' arttı.'
    || coalesce(' Ortalama m² ' || to_char(round(m.deger), 'FM999G999G999') || ' TL; 100 m² daire yaklaşık ' || replace(round(m.deger * 100 / 1e6, 1)::text, '.', ',') || ' milyon TL.', '');
  v_metin := regexp_replace(v_metin, '(\d),(\d{3})', '\1.\2', 'g');
  v_link := '#/endeksler?d=' || to_char(s.donem, 'YYYY-MM');
  insert into public.bildirimler (alici, tur, baslik, metin, link)
  select p.id, 'piyasa', 'Konut Trend Analizi 🏡', v_metin, v_link
  from public.profiller p
  where (p_yalniz is null or p.id = p_yalniz)
    and not exists (select 1 from public.bildirimler b where b.alici = p.id and b.tur = 'piyasa' and b.link = v_link);
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.piyasa_bildirimi_gonder(uuid) from public, anon, authenticated;
-- Her ayın 20'si 10:30 (TCMB endeksi ayın 17-18'inde yayımlanır, endeks-topla sonrası)
select cron.unschedule('piyasa-bildirimi') where exists (select 1 from cron.job where jobname = 'piyasa-bildirimi');
select cron.schedule('piyasa-bildirimi', '30 7 20 * *', $$select public.piyasa_bildirimi_gonder()$$);
-- Örnek: yalnız yöneticiye
select public.piyasa_bildirimi_gonder((select y from public.yonetici_idler() y limit 1)) as gonderilen;
select metin from public.bildirimler where tur = 'piyasa' order by olusturma desc limit 1;
