-- Öne çıkarma / vitrin paketleri kredi ile: 1 kredi ≈ 25 TL (kredi paketlerinin ortalaması). Talepte kredi düşer,
-- yönetici onaylayınca başlar, reddederse kredi iade edilir. Talepte yöneticiye, kararda üyeye bildirim.
alter table public.doping_paketleri add column if not exists kredi int check (kredi is null or kredi > 0);
update public.doping_paketleri set kredi = greatest(1, round(fiyat / 25)::int) where kredi is null;
alter table public.doping_satislari drop constraint if exists doping_satislari_yontem_check;
alter table public.doping_satislari add constraint doping_satislari_yontem_check check (yontem in ('play', 'talep', 'kredi'));
alter table public.doping_satislari add column if not exists kredi int;

create or replace function public.doping_kredi_talep(p_ilan uuid, p_paket text) returns json language plpgsql security definer set search_path = public as $$
declare v_k int; v_aktif boolean; v_bakiye int; v_id uuid;
begin
  if auth.uid() is null then raise exception 'giriş gerekli'; end if;
  if not exists (select 1 from public.ilanlar where id = p_ilan and sahip = auth.uid() and durum = 'yayinda') then raise exception 'yalnız yayındaki kendi ilanını öne çıkarabilirsin'; end if;
  select kredi, aktif into v_k, v_aktif from public.doping_paketleri where id = p_paket;
  if v_k is null or not v_aktif then raise exception 'paket satışta değil'; end if;
  if exists (select 1 from public.doping_satislari where ilan = p_ilan and durum = 'bekliyor') then raise exception 'bu ilan için onay bekleyen bir talebin var'; end if;
  select kredi into v_bakiye from public.profil_ozel where id = auth.uid() for update;
  if coalesce(v_bakiye, 0) < v_k then raise exception 'KREDI_YOK'; end if;
  update public.profil_ozel set kredi = kredi - v_k where id = auth.uid() returning kredi into v_bakiye;
  insert into public.kredi_hareketleri (kullanici, miktar, aciklama) values (auth.uid(), -v_k, 'Öne çıkarma talebi: ' || p_paket);
  insert into public.doping_satislari (kullanici, ilan, paket, tutar, kredi, yontem, durum) values (auth.uid(), p_ilan, p_paket, null, v_k, 'kredi', 'bekliyor') returning id into v_id;
  return json_build_object('id', v_id, 'kredi', v_bakiye);
end $$;
revoke all on function public.doping_kredi_talep(uuid, text) from public, anon;
grant execute on function public.doping_kredi_talep(uuid, text) to authenticated;

-- Bildirimler + red iadesi
create or replace function public.doping_bildirimi() returns trigger language plpgsql security definer set search_path = public as $$
declare v_baslik text; v_tur text; v_gun int; v_ad text;
begin
  select i.baslik into v_baslik from public.ilanlar i where i.id = new.ilan;
  select t.ad, p.gun into v_tur, v_gun from public.doping_paketleri p join public.doping_turleri t on t.kod = p.tur where p.id = new.paket;
  if tg_op = 'INSERT' and new.durum = 'bekliyor' then
    select ad into v_ad from public.profiller where id = new.kullanici;
    insert into public.bildirimler (alici, tur, baslik, metin, link)
    select y, 'doping_talep', 'Öne Çıkarma Talebi', coalesce(v_ad, 'Bir üye') || ' · ' || coalesce(v_tur, new.paket) || ' ' || coalesce(v_gun, 0) || ' gün · ' || left(coalesce(v_baslik, 'İlan'), 50) || coalesce(' · ' || new.kredi || ' kredi', ''), '#/yonetim/doping'
    from public.yonetici_idler() y where y <> new.kullanici;
  elsif tg_op = 'UPDATE' and old.durum = 'bekliyor' and new.durum = 'onaylandi' then
    insert into public.bildirimler (alici, tur, baslik, metin, link)
    values (new.kullanici, 'doping_onay', 'İlanın Öne Çıkarıldı', '"' || left(coalesce(v_baslik, 'İlanın'), 60) || '" ' || coalesce(v_gun, 0) || ' gün boyunca ' || coalesce(v_tur, 'öne çıkarma') || ' ile gösteriliyor.', '#/ilan/' || new.ilan);
  elsif tg_op = 'UPDATE' and old.durum = 'bekliyor' and new.durum = 'reddedildi' then
    if new.yontem = 'kredi' and coalesce(new.kredi, 0) > 0 then
      update public.profil_ozel set kredi = kredi + new.kredi where id = new.kullanici;
      insert into public.kredi_hareketleri (kullanici, miktar, aciklama) values (new.kullanici, new.kredi, 'Öne çıkarma talebi reddedildi, iade');
    end if;
    insert into public.bildirimler (alici, tur, baslik, metin, link)
    values (new.kullanici, 'doping_red', 'Öne Çıkarma Talebin Onaylanmadı', '"' || left(coalesce(v_baslik, 'İlanın'), 60) || '" için talebin onaylanmadı' || case when new.yontem = 'kredi' and coalesce(new.kredi, 0) > 0 then '; ' || new.kredi || ' kredin iade edildi.' else '.' end, '#/ilan/' || new.ilan);
  end if;
  return new;
end $$;
drop trigger if exists doping_satislari_bildirim on public.doping_satislari;
create trigger doping_satislari_bildirim after insert or update of durum on public.doping_satislari for each row execute function public.doping_bildirimi();
select tur, gun, fiyat, kredi from public.doping_paketleri where aktif order by sira;
