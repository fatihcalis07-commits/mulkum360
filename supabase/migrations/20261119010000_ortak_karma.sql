-- Business Partner Emlak + Galeri (karma) ortaklık türü ve paketleri.
-- Karma ortak iki yetki belgesi taşır: taşınmaz ticareti (yetki_belge_no) + ikinci el taşıt ticareti (yetki_belge_no2).

alter table public.is_ortagi drop constraint if exists is_ortagi_tur_check;
alter table public.is_ortagi add constraint is_ortagi_tur_check check (tur in ('emlak', 'galeri', 'karma'));
alter table public.is_ortagi add column if not exists yetki_belge_no2 text;
alter table public.is_ortagi add column if not exists karma_talep boolean not null default false;  -- aktif tek türlü ortak karmaya geçmek istiyor
alter table public.is_ortagi drop constraint if exists is_ortagi_karma_belge;
alter table public.is_ortagi add constraint is_ortagi_karma_belge check (tur <> 'karma' or char_length(coalesce(yetki_belge_no2, '')) between 4 and 30);

alter table public.uyelik_ayar add column if not exists karma_aylik numeric(12,2) not null default 2999.99;

alter table public.uyelik_paket drop constraint if exists uyelik_paket_tur_check;
alter table public.uyelik_paket add constraint uyelik_paket_tur_check check (tur in ('emlak', 'galeri', 'karma'));
insert into public.uyelik_paket (id, tur, ad, ay, fiyat, sira) values
  ('ortak_karma_aylik', 'karma', 'Business Partner Emlak + Galeri Aylık', 1, 2999.99, 7),
  ('ortak_karma_3ay', 'karma', 'Business Partner Emlak + Galeri 3 Aylık', 3, 5999.99, 8),
  ('ortak_karma_yillik', 'karma', 'Business Partner Emlak + Galeri Yıllık', 12, 21999.99, 9)
on conflict (id) do nothing;

-- Tür bazlı aylık havale bedeli
create or replace function public.ortak_tur_aylik(p_tur text) returns numeric language sql stable set search_path = public as $$
  select case p_tur when 'galeri' then galeri_aylik when 'karma' then karma_aylik else emlak_aylik end from public.uyelik_ayar where id = 1
$$;

-- Başvuru: karma için ikinci belge
drop function if exists public.ortak_basvur(text, text, text, text, text);
create or replace function public.ortak_basvur(p_tur text, p_unvan text, p_vergi text, p_yetki text, p_surum text, p_yetki2 text default null) returns void language plpgsql security definer set search_path = public as $$
declare d text;
begin
  if auth.uid() is null then raise exception 'oturum gerekli'; end if;
  if p_tur not in ('emlak', 'galeri', 'karma') then raise exception 'geçersiz tür'; end if;
  if p_tur = 'karma' and char_length(trim(coalesce(p_yetki2, ''))) < 4 then raise exception 'taşıt ticareti yetki belgesi gerekli'; end if;
  select durum into d from public.is_ortagi where kullanici = auth.uid();
  if d in ('aktif', 'askida') then raise exception 'zaten iş ortağısın'; end if;
  insert into public.is_ortagi (kullanici, tur, unvan, vergi_no, yetki_belge_no, yetki_belge_no2, sozlesme_surum, durum, sozlesme_onay)
  values (auth.uid(), p_tur, trim(p_unvan), regexp_replace(p_vergi, '\D', '', 'g'), trim(p_yetki), nullif(trim(coalesce(p_yetki2, '')), ''), p_surum, 'basvuru', now())
  on conflict (kullanici) do update set tur = excluded.tur, unvan = excluded.unvan, vergi_no = excluded.vergi_no, yetki_belge_no = excluded.yetki_belge_no,
    yetki_belge_no2 = excluded.yetki_belge_no2, sozlesme_surum = excluded.sozlesme_surum, sozlesme_onay = now(), durum = 'basvuru', karar_notu = null, karma_talep = false, guncelleme = now();
end $$;
revoke all on function public.ortak_basvur(text, text, text, text, text, text) from public, anon;
grant execute on function public.ortak_basvur(text, text, text, text, text, text) to authenticated;

-- Aktif tek türlü ortak: karmaya geçiş talebi (eksik belgeyi ekler, yönetici onaylar)
create or replace function public.ortak_karma_talep(p_yetki2 text) returns void language plpgsql security definer set search_path = public as $$
declare o public.is_ortagi;
begin
  select * into o from public.is_ortagi where kullanici = auth.uid() for update;
  if o is null or o.durum not in ('aktif', 'askida') then raise exception 'onaylı iş ortaklığı yok'; end if;
  if o.tur = 'karma' then raise exception 'zaten emlak + galeri ortağısın'; end if;
  if char_length(trim(coalesce(p_yetki2, ''))) < 4 then raise exception 'yetki belgesi no gerekli'; end if;
  update public.is_ortagi set yetki_belge_no2 = trim(p_yetki2), karma_talep = true, guncelleme = now() where kullanici = auth.uid();
end $$;
revoke all on function public.ortak_karma_talep(text) from public, anon;
grant execute on function public.ortak_karma_talep(text) to authenticated;

-- Yönetici kararı: 'karma' = geçiş talebini onayla, 'karma_red' = reddet. Diğerleri eskisi gibi.
create or replace function public.ortak_karar(p_kullanici uuid, p_karar text, p_aylik numeric default null, p_not text default null) returns void language plpgsql security definer set search_path = public as $$
declare a public.uyelik_ayar; o public.is_ortagi;
begin
  if not public.yonetici() then raise exception 'yetkisiz'; end if;
  select * into a from public.uyelik_ayar where id = 1;
  select * into o from public.is_ortagi where kullanici = p_kullanici;
  if o is null then raise exception 'başvuru yok'; end if;
  if p_karar = 'karma' then
    if not o.karma_talep then raise exception 'geçiş talebi yok'; end if;
    -- Tek türlü Play aboneliği karma ile uyuşmaz: abonelik alanları korunur ama paket türü farklı olduğu için yeni paket seçmesi gerekir
    update public.is_ortagi set tur = 'karma', karma_talep = false, aylik_ucret = coalesce(p_aylik, a.karma_aylik), karar_notu = p_not, guncelleme = now() where kullanici = p_kullanici;
    insert into public.bildirimler (alici, tur, baslik, metin, link) values (p_kullanici, 'ortaklik', 'Emlak + Galeri Ortaklığın Onaylandı',
      'Artık emlak ve vasıta ilanlarında tek ortaklıkla yayındasın. Business Partner Emlak + Galeri paketlerinden birini seçebilirsin.', '#/ortaklik');
  elsif p_karar = 'karma_red' then
    update public.is_ortagi set karma_talep = false, yetki_belge_no2 = case when tur = 'karma' then yetki_belge_no2 end, guncelleme = now() where kullanici = p_kullanici;
    insert into public.bildirimler (alici, tur, baslik, metin, link) values (p_kullanici, 'ortaklik', 'Emlak + Galeri Geçiş Talebin Hakkında', coalesce(p_not, 'Geçiş talebin şu an onaylanamadı.'), '#/ortaklik');
  elsif p_karar = 'onay' and o.durum in ('aktif', 'askida') then
    update public.is_ortagi set aylik_ucret = coalesce(p_aylik, aylik_ucret), guncelleme = now() where kullanici = p_kullanici;
  elsif p_karar = 'onay' then
    update public.is_ortagi set durum = 'aktif', baslangic = current_date,
      ucretsiz_bitis = (current_date + make_interval(months => a.ucretsiz_ay))::date,
      aylik_ucret = coalesce(p_aylik, public.ortak_tur_aylik(o.tur)),
      karar_notu = p_not, guncelleme = now() where kullanici = p_kullanici;
    insert into public.bildirimler (alici, tur, baslik, metin, link) values (p_kullanici, 'ortaklik', 'İş Ortaklığın Onaylandı',
      'İlk ' || a.ucretsiz_ay || ' ay ücretsiz. Ayrıntılar Hesabım → İş Ortaklığı bölümünde.', '#/ortaklik');
  elsif p_karar in ('red', 'iptal') then
    if o.durum = 'askida' then perform public.ortak_ilanlari(p_kullanici, false); end if;
    update public.is_ortagi set durum = p_karar, karar_notu = p_not, guncelleme = now() where kullanici = p_kullanici;
    insert into public.bildirimler (alici, tur, baslik, metin, link) values (p_kullanici, 'ortaklik', case when p_karar = 'red' then 'İş Ortaklığı Başvurun Hakkında' else 'İş Ortaklığın Sona Erdi' end, coalesce(p_not, case when p_karar = 'red' then 'Başvurun şu an onaylanamadı.' else 'İş ortaklığın sona erdi.' end), '#/ortaklik');
  else raise exception 'geçersiz karar'; end if;
end $$;
revoke all on function public.ortak_karar(uuid, text, numeric, text) from public, anon;
grant execute on function public.ortak_karar(uuid, text, numeric, text) to authenticated;

-- Play aboneliği: tek türlü paketten karmaya yükselen ortağın eski aboneliğinin bildirimleri tür hatasına düşmesin
create or replace function public.play_abonelik_isle(p_kullanici uuid, p_urun text, p_token text, p_durum text, p_bitis timestamptz, p_yenileme boolean, p_kaynak text, p_ham jsonb default null)
returns json language plpgsql security definer set search_path = public as $$
declare o public.is_ortagi; pk public.uyelik_paket; gecerli boolean;
begin
  select * into pk from public.uyelik_paket where id = p_urun;
  if pk is null then raise exception 'paket yok'; end if;
  select * into o from public.is_ortagi where kullanici = p_kullanici for update;
  if o is null or o.durum not in ('aktif', 'askida') then raise exception 'onaylı iş ortaklığı yok'; end if;
  if o.tur <> pk.tur and not (o.tur = 'karma' and coalesce(o.play_token = p_token, false)) then raise exception 'paket türü uyuşmuyor'; end if;
  if exists (select 1 from public.is_ortagi where play_token = p_token and kullanici <> p_kullanici) then raise exception 'abonelik başka hesaba bağlı'; end if;
  insert into public.play_abonelik_olay (kullanici, urun, token_son, kaynak, durum, bitis, ham) values (p_kullanici, p_urun, right(p_token, 12), p_kaynak, p_durum, p_bitis, p_ham);
  if o.play_token is not null and o.play_token <> p_token and public.ortak_abonelik_gecerli(o) and p_durum not in ('aktif', 'ek_sure') then
    return json_build_object('durum', o.abonelik_durum, 'yoksayildi', true);
  end if;
  update public.is_ortagi set odeme_yontemi = 'play', play_urun = p_urun, play_token = p_token, abonelik_durum = p_durum,
    abonelik_bitis = p_bitis, otomatik_yenileme = p_yenileme, guncelleme = now() where kullanici = p_kullanici returning * into o;
  gecerli := public.ortak_abonelik_gecerli(o);
  if gecerli then
    update public.uyelik_tahakkuk set durum = 'iptal', aciklama = 'Google Play aboneliğine geçildi' where ortak = p_kullanici and durum in ('bekliyor', 'gecikti');
    if o.durum = 'askida' then
      perform public.ortak_ilanlari(p_kullanici, false);
      insert into public.bildirimler (alici, tur, baslik, metin, link) values (p_kullanici, 'ortaklik', 'Aboneliğin Aktif', pk.ad || ' aboneliğin başladı; ilanların yeniden yayında.', '#/ortaklik');
    end if;
  elsif p_durum in ('beklemede', 'duraklatildi', 'sona_erdi') and o.durum = 'aktif' and current_date > o.ucretsiz_bitis then
    perform public.ortak_ilanlari(p_kullanici, true);
    insert into public.bildirimler (alici, tur, baslik, metin, link) values (p_kullanici, 'ortaklik',
      case when p_durum = 'beklemede' then 'Abonelik Ödemesi Alınamadı' else 'Aboneliğin Sona Erdi' end,
      case when p_durum = 'beklemede' then 'Google Play yenileme ödemesini alamadı; ilanların beklemeye alındı. Ödeme yöntemini Google Play''de güncelleyince otomatik yayına döner.'
           else 'Business Partner aboneliğin sona erdi; ilanların beklemeye alındı. Yeniden abone olunca otomatik yayına döner.' end, '#/ortaklik');
  end if;
  return json_build_object('durum', p_durum, 'gecerli', gecerli, 'bitis', p_bitis, 'paket', pk.ad);
end $$;
revoke all on function public.play_abonelik_isle(uuid, text, text, text, timestamptz, boolean, text, jsonb) from public, anon, authenticated;

-- Günlük iş: havale bedeli tür bazlı
create or replace function public.uyelik_gunluk() returns void language plpgsql security definer set search_path = public as $$
declare a public.uyelik_ayar; o public.is_ortagi; r record; v_donem date := date_trunc('month', current_date)::date; kalan int;
begin
  select * into a from public.uyelik_ayar where id = 1;
  for o in select * from public.is_ortagi where durum in ('aktif', 'askida') and ucretsiz_bitis is not null loop
    if o.odeme_yontemi = 'havale' then
      if v_donem >= (date_trunc('month', o.ucretsiz_bitis - 1) + interval '1 month')::date then
        insert into public.uyelik_tahakkuk (ortak, donem, tutar, vade)
        values (o.kullanici, v_donem, coalesce(o.aylik_ucret, public.ortak_tur_aylik(o.tur)), v_donem + a.vade_gun)
        on conflict (ortak, donem) do nothing;
        if found then
          insert into public.bildirimler (alici, tur, baslik, metin, link) values (o.kullanici, 'ortaklik', 'Aylık Üyelik Bedeli',
            to_char(v_donem, 'MM.YYYY') || ' dönemi üyelik bedelin oluştu. Son ödeme: ' || to_char(v_donem + a.vade_gun, 'DD.MM.YYYY') || '.', '#/ortaklik');
        end if;
      end if;
    elsif not public.ortak_abonelik_gecerli(o, interval '2 days') then
      kalan := o.ucretsiz_bitis - current_date;
      if kalan in (7, 1) and o.hatirlatma is distinct from current_date then
        insert into public.bildirimler (alici, tur, baslik, metin, link) values (o.kullanici, 'ortaklik', 'Ücretsiz Dönemin Bitiyor',
          'Ücretsiz dönemin ' || to_char(o.ucretsiz_bitis, 'DD.MM.YYYY') || ' tarihinde bitiyor. İlanların yayında kalsın diye Business Partner paketlerinden birini seç.', '#/ortaklik');
        update public.is_ortagi set hatirlatma = current_date where kullanici = o.kullanici;
      elsif kalan < 0 and o.durum = 'aktif' then
        perform public.ortak_ilanlari(o.kullanici, true);
        insert into public.bildirimler (alici, tur, baslik, metin, link) values (o.kullanici, 'ortaklik', 'İlanların Beklemede',
          'Ücretsiz dönemin bitti ve geçerli bir Business Partner aboneliğin yok. Paket seçince ilanların otomatik yayına döner.', '#/ortaklik');
      end if;
    end if;
  end loop;
  for r in update public.uyelik_tahakkuk set durum = 'gecikti' where durum = 'bekliyor' and vade < current_date returning ortak, donem loop
    insert into public.bildirimler (alici, tur, baslik, metin, link) values (r.ortak, 'ortaklik', 'Üyelik Ödemen Gecikti',
      to_char(r.donem, 'MM.YYYY') || ' dönemi ödemesi gecikti; ilanların beklemeye alındı. Ödeme onaylanınca otomatik yayına döner.', '#/ortaklik');
    perform public.ortak_ilanlari(r.ortak, true);
  end loop;
end $$;
revoke all on function public.uyelik_gunluk() from public, anon, authenticated;
