-- EİDS taşıt ilanları (İkinci El Motorlu Kara Taşıtlarının Ticareti Hakkında Yönetmelik; yetki doğrulaması 16.06.2025'ten beri tüm taşıt ilanlarında zorunlu).
-- Manuel faz: üye plaka (+ isteğe bağlı şasi) ve yöntem bildirir, yönetici resmî kayıttan kontrol edip onaylar.
alter table public.ilan_dogrulama add column if not exists plaka text check (plaka is null or plaka ~ '^[0-9]{2}[A-Z]{1,3}[0-9]{2,4}$');
alter table public.ilan_dogrulama add column if not exists sasi text check (sasi is null or sasi ~ '^[A-HJ-NPR-Z0-9]{17}$');
alter table public.ilan_dogrulama alter column tasinmaz_no drop not null;
alter table public.ilan_dogrulama drop constraint if exists ilan_dogrulama_tasinmaz_no_check;
alter table public.ilan_dogrulama drop constraint if exists ilan_dogrulama_belirtec;
alter table public.ilan_dogrulama add constraint ilan_dogrulama_belirtec check ((tasinmaz_no is not null and tasinmaz_no ~ '^[0-9]{8,20}$') or plaka is not null);

create or replace function public.eids_iste_tasit(p_ilan uuid, p_yontem text, p_plaka text, p_sasi text default null, p_yetki_belge_no text default null) returns void language plpgsql security definer set search_path = public as $$
declare ht text; v_plaka text := upper(regexp_replace(coalesce(p_plaka, ''), '\s', '', 'g')); v_sasi text := nullif(upper(regexp_replace(coalesce(p_sasi, ''), '\s', '', 'g')), '');
begin
  if not exists (select 1 from public.ilanlar where id = p_ilan and sahip = auth.uid() and ana = 'vasita') then raise exception 'kendi araç ilanın değil'; end if;
  if v_plaka !~ '^[0-9]{2}[A-Z]{1,3}[0-9]{2,4}$' then raise exception 'plaka geçersiz (ör. 34ABC123)'; end if;
  if v_sasi is not null and v_sasi !~ '^[A-HJ-NPR-Z0-9]{17}$' then raise exception 'şasi numarası 17 karakter olmalı'; end if;
  if p_yontem not in ('sahibim', 'hisim', 'yetkili') then raise exception 'geçersiz yöntem'; end if;
  select hesap_turu into ht from public.profiller where id = auth.uid();
  if p_yontem = 'yetkili' then
    if ht <> 'ofis' then raise exception 'yalnız yetki belgeli galeri yetkili ilan verebilir'; end if;
    if p_yetki_belge_no is null or char_length(trim(p_yetki_belge_no)) < 6 then raise exception 'yetki belge no girilmeli'; end if;
  end if;
  insert into public.ilan_dogrulama (ilan, sahip, yontem, plaka, sasi, yetki_belge_no)
  values (p_ilan, auth.uid(), p_yontem, v_plaka, v_sasi, nullif(trim(coalesce(p_yetki_belge_no, '')), ''))
  on conflict (ilan) do update set yontem = excluded.yontem, plaka = excluded.plaka, sasi = excluded.sasi, tasinmaz_no = null,
    yetki_belge_no = excluded.yetki_belge_no, sonuc = 'bekliyor', karar_notu = null, karar_veren = null, guncelleme = now();
  update public.ilanlar set durum = 'onayda' where id = p_ilan;
end $$;
revoke all on function public.eids_iste_tasit(uuid, text, text, text, text) from public, anon;
grant execute on function public.eids_iste_tasit(uuid, text, text, text, text) to authenticated;

-- Yayın kapısı artık taşıt ilanlarını da kapsar (yalnız yeni kayıt ve durum yazımında; mevcut yayındaki ilanlar etkilenmez)
create or replace function public.ilan_eids_kapisi() returns trigger language plpgsql security definer set search_path = public as $$
declare v_faz text; v_s text;
begin
  select faz into v_faz from public.eids_ayar where id = 1;
  if coalesce(v_faz, 'kapali') = 'kapali' or public.yonetici() or new.ana not in ('emlak', 'vasita') then return new; end if;
  if new.durum = 'yayinda' then
    select sonuc into v_s from public.ilan_dogrulama where ilan = new.id;
    if v_s is distinct from 'onayli' then new.durum := 'onayda'; end if;
  end if;
  return new;
end $$;
select faz from public.eids_ayar;
