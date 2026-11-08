-- Görüntülenme sayacı: güncelleme tetikleyicisi sayacı geri alıyordu; yalnız sayaç fonksiyonu değiştirebilsin.
create or replace function public.ilan_guncelleme() returns trigger language plpgsql as $$
begin
  new.no := old.no; new.sahip := old.sahip; new.olusturma := old.olusturma;
  if coalesce(current_setting('m360.sayac', true), '') = '1' then return new; end if;
  new.goruntulenme := old.goruntulenme; new.guncelleme := now();
  return new;
end $$;

create or replace function public.ilan_goruntule(p_ilan uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('m360.sayac', '1', true);
  update public.ilanlar set goruntulenme = goruntulenme + 1
  where id = p_ilan and durum = 'yayinda' and sahip is distinct from auth.uid();
  perform set_config('m360.sayac', '', true);
end $$;

-- Teklif tutarı Türkçe biçimde (4.500.000 TL)
create or replace function public.teklif_yanitla(p_mesaj uuid, p_kabul boolean) returns void language plpgsql security definer set search_path = public as $$
declare m public.mesajlar; s public.sohbetler;
begin
  select * into m from public.mesajlar where id = p_mesaj for update;
  select * into s from public.sohbetler where id = m.sohbet;
  if m.id is null or s.satici <> auth.uid() or m.tur <> 'teklif' or m.durum <> 'bekliyor' or m.zaman < now() - interval '48 hours' then
    raise exception 'teklif yanıtlanamaz';
  end if;
  update public.mesajlar set durum = case when p_kabul then 'kabul' else 'red' end where id = p_mesaj;
  insert into public.mesajlar (sohbet, kimden, tur, metin) values (m.sohbet, auth.uid(), 'sistem',
    replace(to_char(m.tutar, 'FM999,999,999,999'), ',', '.') || ' TL teklif ' || case when p_kabul then 'kabul edildi. Görüşme ve teslim için buradan konuşun.' else 'reddedildi.' end);
end $$;
revoke all on function public.ilan_goruntule(uuid), public.teklif_yanitla(uuid, boolean) from public, anon;
grant execute on function public.ilan_goruntule(uuid) to anon, authenticated;
grant execute on function public.teklif_yanitla(uuid, boolean) to authenticated;
