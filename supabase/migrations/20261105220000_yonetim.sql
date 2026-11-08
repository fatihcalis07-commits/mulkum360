-- Yönetim: üye listesi, üye hareketleri, kimliğe göre kredi tanımlama. Hepsi yalnız yönetici.
create or replace function public.yonetim_uyeler(p_arama text default '') returns table (
  id uuid, eposta text, ad text, kayit timestamptz, son_giris timestamptz, saglayici text, kredi int,
  ilan int, yayinda int, rapor int, mesaj int, favori int
) language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.yonetici() then raise exception 'yetki yok'; end if;
  return query
  select u.id, u.email::text, p.ad, u.created_at, u.last_sign_in_at, coalesce(u.raw_app_meta_data->>'provider', 'email'), coalesce(o.kredi, 0),
    (select count(*)::int from public.ilanlar i where i.sahip = u.id),
    (select count(*)::int from public.ilanlar i where i.sahip = u.id and i.durum = 'yayinda'),
    (select count(*)::int from public.raporlar r where r.sahip = u.id),
    (select count(*)::int from public.mesajlar m where m.kimden = u.id),
    (select count(*)::int from public.favoriler f where f.kullanici = u.id)
  from auth.users u left join public.profiller p on p.id = u.id left join public.profil_ozel o on o.id = u.id
  where coalesce(p_arama, '') = '' or u.email ilike '%' || p_arama || '%' or p.ad ilike '%' || p_arama || '%'
  order by u.created_at desc limit 200;
end $$;

-- Üyenin zaman çizelgesi: kayıt, son giriş, ilanlar, raporlar, kredi hareketleri, mesaj ve şikayet özetleri
create or replace function public.yonetim_hareketler(p_uye uuid) returns table (zaman timestamptz, tur text, aciklama text, miktar int)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.yonetici() then raise exception 'yetki yok'; end if;
  return query
  select * from (
    select u.created_at, 'kayit'::text, 'Üye oldu (' || coalesce(u.raw_app_meta_data->>'provider', 'email') || ')', null::int from auth.users u where u.id = p_uye
    union all select u.last_sign_in_at, 'giris', 'Son giriş', null from auth.users u where u.id = p_uye and u.last_sign_in_at is not null
    union all select i.olusturma, 'ilan', 'İlan verdi: ' || i.baslik || ' (' || i.durum || ')', i.fiyat::int from public.ilanlar i where i.sahip = p_uye
    union all select r.zaman, 'rapor', 'Değer raporu aldı: ' || r.no, null from public.raporlar r where r.sahip = p_uye
    union all select k.zaman, 'kredi', k.aciklama, k.miktar from public.kredi_hareketleri k where k.kullanici = p_uye
    union all select max(m.zaman), 'mesaj', count(*) || ' mesaj gönderdi (son mesaj)', null from public.mesajlar m where m.kimden = p_uye having count(*) > 0
    union all select s.zaman, 'sikayet', 'Şikayet etti: ' || s.neden, null from public.sikayetler s where s.kim = p_uye
    union all select max(a.gun)::timestamptz, 'ai', 'MülkümAI: toplam ' || sum(a.sayi) || ' soru', null from public.ai_kullanim a where a.kullanici = p_uye having count(*) > 0
  ) t order by 1 desc nulls last limit 200;
end $$;

create or replace function public.kredi_yukle_id(p_uye uuid, p_miktar int, p_aciklama text default 'Yönetici yüklemesi') returns int language plpgsql security definer set search_path = public, auth as $$
declare v_yeni int; v_yon text;
begin
  if not public.yonetici() then raise exception 'yetki yok'; end if;
  if p_miktar = 0 or abs(p_miktar) > 1000 then raise exception 'geçersiz miktar'; end if;
  select email into v_yon from auth.users where id = auth.uid();
  update public.profil_ozel set kredi = greatest(0, kredi + p_miktar) where id = p_uye returning kredi into v_yeni;
  if v_yeni is null then raise exception 'üye bulunamadı'; end if;
  insert into public.kredi_hareketleri (kullanici, miktar, aciklama) values (p_uye, p_miktar, left(coalesce(nullif(trim(p_aciklama), ''), 'Yönetici yüklemesi') || ' · ' || coalesce(v_yon, 'yönetici'), 140));
  return v_yeni;
end $$;

revoke all on function public.yonetim_uyeler(text), public.yonetim_hareketler(uuid), public.kredi_yukle_id(uuid, int, text) from public, anon;
grant execute on function public.yonetim_uyeler(text), public.yonetim_hareketler(uuid), public.kredi_yukle_id(uuid, int, text) to authenticated;
