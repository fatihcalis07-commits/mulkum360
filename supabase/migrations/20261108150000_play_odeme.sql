-- Google Play ile kredi satışı: satın alma sunucuda (play-odeme fonksiyonu) Google'dan doğrulanır, sonra kredi yüklenir.
-- Aynı satın alma jetonu ikinci kez kredi yükleyemez (play_token benzersiz).
alter table public.kredi_satislari add column if not exists play_token text unique;

create or replace function public.play_kredi_yukle(p_kullanici uuid, p_urun text, p_token text, p_siparis text) returns json
language plpgsql security definer set search_path = public as $$
declare p public.kredi_paketleri; v_id uuid; v_bakiye int;
begin
  select * into p from public.kredi_paketleri where play_urun = p_urun;
  if p.id is null then raise exception 'urun yok'; end if;
  insert into public.kredi_satislari (kullanici, paket, kredi, tutar, yontem, durum, siparis_no, play_token, onay_zamani)
  values (p_kullanici, p.id, p.kredi, p.fiyat, 'play', 'onaylandi', p_siparis, p_token, now())
  on conflict (play_token) do nothing returning id into v_id;
  if v_id is null then -- daha önce işlendi
    select kredi into v_bakiye from public.profil_ozel where id = p_kullanici;
    return json_build_object('yeni', false, 'kredi', v_bakiye);
  end if;
  update public.profil_ozel set kredi = kredi + p.kredi where id = p_kullanici returning kredi into v_bakiye;
  insert into public.kredi_hareketleri (kullanici, miktar, aciklama) values (p_kullanici, p.kredi, 'Kredi paketi: ' || p.ad || ' (Google Play)');
  return json_build_object('yeni', true, 'kredi', v_bakiye, 'eklenen', p.kredi);
end $$;
revoke all on function public.play_kredi_yukle(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.play_kredi_yukle(uuid, text, text, text) to service_role;
