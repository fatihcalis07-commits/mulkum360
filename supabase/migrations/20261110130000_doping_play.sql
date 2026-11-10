-- Doping satışı Google Play'den (play-odeme doping dalı): kredi_satislari kalıbı.
-- ONAY BEKLEYEN ŞEMA DEĞİŞİKLİĞİ — uygulanmadı. Uygulama sırası: bu migration → functions deploy play-odeme → doping_paketleri fiyat/aktif.
-- Tek doğruluk: play_token benzersiz (partial unique; eski talep kayıtlarında NULL kalabilir, NULL'lar çakışmaz).

create unique index if not exists doping_satislari_play_token_uk on public.doping_satislari (play_token) where play_token is not null;

create or replace function public.play_doping_baslat(p_kullanici uuid, p_urun text, p_token text, p_ilan uuid, p_order text) returns json
language plpgsql security definer set search_path = public as $$
declare d public.doping_paketleri; v_ilan public.ilanlar; v_id uuid;
begin
  select * into d from public.doping_paketleri where play_urun = p_urun and aktif;
  if d.id is null then raise exception 'urun yok veya satista degil'; end if;
  select * into v_ilan from public.ilanlar where id = p_ilan and sahip = p_kullanici and durum in ('yayinda','onayda');
  if v_ilan.id is null then raise exception 'ilan bulunamadi veya sana ait degil'; end if;
  insert into public.doping_satislari (kullanici, ilan, paket, tutar, yontem, durum, siparis_no, play_token, onay_zamani)
  values (p_kullanici, p_ilan, d.id, d.fiyat, 'play', 'onaylandi', p_order, p_token, now())
  on conflict (play_token) where play_token is not null do nothing returning id into v_id;
  if v_id is null then
    return json_build_object('yeni', false, 'mesaj', 'Bu satin alma zaten islenmisti.');
  end if;
  insert into public.ilan_doping (ilan, tur, paket, bitis, anlik)
  values (p_ilan, d.tur, d.id, now() + d.gun * interval '1 day', json_build_object('g', coalesce(v_ilan.goruntulenme, 0), 'kaynak', 'play'));
  return json_build_object('yeni', true, 'tur', d.tur, 'gun', d.gun);
end $$;
revoke all on function public.play_doping_baslat(uuid, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.play_doping_baslat(uuid, text, text, uuid, text) to service_role;
