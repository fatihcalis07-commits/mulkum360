-- Onay akışı bildirimleri: doğrulama talebi gelince yöneticiye; karar verilince ilan sahibine (onay bildirimi ilanlar tetikleyicisinde)
create or replace function public.yonetici_idler() returns setof uuid language sql stable security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = 'fatihcalis07@gmail.com'
$$;
revoke all on function public.yonetici_idler() from public, anon, authenticated;

create or replace function public.dogrulama_bildirimi() returns trigger language plpgsql security definer set search_path = public as $$
declare v_baslik text; v_ana text; v_ad text;
begin
  select baslik, ana into v_baslik, v_ana from public.ilanlar where id = new.ilan;
  if new.sonuc = 'bekliyor' and (tg_op = 'INSERT' or old.sonuc is distinct from 'bekliyor' or old.guncelleme is distinct from new.guncelleme) then
    select ad into v_ad from public.profiller where id = new.sahip;
    insert into public.bildirimler (alici, tur, baslik, metin, link)
    select y, 'onay_bekliyor', 'Onay Bekleyen İlan',
      coalesce(v_ad, 'Bir üye') || ' · ' || left(coalesce(v_baslik, 'İlan'), 60) || case when new.plaka is not null then ' · plaka ' || new.plaka else ' · taşınmaz no ' || coalesce(new.tasinmaz_no, '') end,
      '#/yonetim/dogrulama'
    from public.yonetici_idler() y where y <> new.sahip;
  elsif new.sonuc = 'red' and old.sonuc is distinct from 'red' then
    insert into public.bildirimler (alici, tur, baslik, metin, link)
    values (new.sahip, 'ilan_red', 'İlanın Onaylanmadı',
      '"' || left(coalesce(v_baslik, 'İlanın'), 60) || '" doğrulanamadı' || coalesce(': ' || new.karar_notu || '.', '.') || ' Bilgileri düzeltip yeniden gönderebilirsin.',
      '#/ilan/' || new.ilan);
  end if;
  return new;
end $$;
drop trigger if exists ilan_dogrulama_bildirim on public.ilan_dogrulama;
create trigger ilan_dogrulama_bildirim after insert or update on public.ilan_dogrulama for each row execute function public.dogrulama_bildirimi();
