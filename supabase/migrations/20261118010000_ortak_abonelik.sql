-- İş Ortaklığı: Google Play abonelikleri (Business Partner paketleri: aylık / 3 aylık / yıllık).
-- Ücretsiz dönem bizim sistemimizde kalır (kart istenmez). Ücretsiz dönem bitince geçerli Play aboneliği yoksa ilanlar beklemeye alınır.
-- Havale yalnız yöneticinin elle tanımladığı ortaklar içindir (odeme_yontemi = 'havale'); onlarda aylık tahakkuk sistemi sürer.

-- 1) Paketler (id = Play Console abonelik ürün kimliği; fiyat Play'de belirlenir, buradaki fiyat gösterim ve yedek içindir)
create table if not exists public.uyelik_paket (
  id text primary key check (id ~ '^[a-z0-9_.]{1,100}$'),
  tur text not null check (tur in ('emlak', 'galeri')),
  ad text not null,
  ay int not null check (ay in (1, 3, 6, 12)),
  fiyat numeric(12,2) not null check (fiyat > 0),
  sira int not null default 0,
  aktif boolean not null default true
);
insert into public.uyelik_paket (id, tur, ad, ay, fiyat, sira) values
  ('ortak_emlak_aylik', 'emlak', 'Business Partner Emlak Aylık', 1, 1500, 1),
  ('ortak_emlak_3ay', 'emlak', 'Business Partner Emlak 3 Aylık', 3, 3990, 2),
  ('ortak_emlak_yillik', 'emlak', 'Business Partner Emlak Yıllık', 12, 14400, 3),
  ('ortak_galeri_aylik', 'galeri', 'Business Partner Galeri Aylık', 1, 1000, 4),
  ('ortak_galeri_3ay', 'galeri', 'Business Partner Galeri 3 Aylık', 3, 2690, 5),
  ('ortak_galeri_yillik', 'galeri', 'Business Partner Galeri Yıllık', 12, 9600, 6)
on conflict (id) do nothing;
alter table public.uyelik_paket enable row level security;
drop policy if exists "paket okunur" on public.uyelik_paket;
create policy "paket okunur" on public.uyelik_paket for select using (true);
drop policy if exists "paket yonetici" on public.uyelik_paket;
create policy "paket yonetici" on public.uyelik_paket for update to authenticated using (public.yonetici()) with check (public.yonetici());

-- 2) Ortak üzerinde abonelik alanları
alter table public.is_ortagi add column if not exists odeme_yontemi text not null default 'play';
alter table public.is_ortagi drop constraint if exists is_ortagi_odeme_yontemi_check;
alter table public.is_ortagi add constraint is_ortagi_odeme_yontemi_check check (odeme_yontemi in ('play', 'havale'));
alter table public.is_ortagi add column if not exists play_urun text;
alter table public.is_ortagi add column if not exists play_token text;
alter table public.is_ortagi add column if not exists abonelik_durum text;   -- aktif | ek_sure | iptal_edildi | beklemede | duraklatildi | sona_erdi | odeme_bekliyor
alter table public.is_ortagi add column if not exists abonelik_bitis timestamptz;
alter table public.is_ortagi add column if not exists otomatik_yenileme boolean;
alter table public.is_ortagi add column if not exists hatirlatma date;      -- ücretsiz dönem sonu hatırlatmasının son günü (tekrar etmesin)
create unique index if not exists is_ortagi_play_token on public.is_ortagi (play_token) where play_token is not null;

-- 3) Olay günlüğü (Google bildirimleri + doğrulamalar)
create table if not exists public.play_abonelik_olay (
  id bigint generated always as identity primary key,
  kullanici uuid, urun text, token_son text, kaynak text, durum text, bitis timestamptz, ham jsonb,
  zaman timestamptz not null default now()
);
alter table public.play_abonelik_olay enable row level security;
drop policy if exists "olay yonetici" on public.play_abonelik_olay;
create policy "olay yonetici" on public.play_abonelik_olay for select to authenticated using (public.yonetici());

-- 4) Abonelik geçerli mi (Play ek süresi ve iptal edilmiş ama süresi dolmamış dahil)
create or replace function public.ortak_abonelik_gecerli(o public.is_ortagi, p_pay interval default interval '0') returns boolean language sql stable as $$
  select coalesce(o.abonelik_durum in ('aktif', 'ek_sure', 'iptal_edildi') and o.abonelik_bitis > now() - p_pay, false)
$$;

-- 5) Google'dan doğrulanmış abonelik durumunu işle (yalnız edge function / service_role)
create or replace function public.play_abonelik_isle(p_kullanici uuid, p_urun text, p_token text, p_durum text, p_bitis timestamptz, p_yenileme boolean, p_kaynak text, p_ham jsonb default null)
returns json language plpgsql security definer set search_path = public as $$
declare o public.is_ortagi; pk public.uyelik_paket; gecerli boolean;
begin
  select * into pk from public.uyelik_paket where id = p_urun;
  if pk is null then raise exception 'paket yok'; end if;
  select * into o from public.is_ortagi where kullanici = p_kullanici for update;
  if o is null or o.durum not in ('aktif', 'askida') then raise exception 'onaylı iş ortaklığı yok'; end if;
  if o.tur <> pk.tur then raise exception 'paket türü uyuşmuyor'; end if;
  if exists (select 1 from public.is_ortagi where play_token = p_token and kullanici <> p_kullanici) then raise exception 'abonelik başka hesaba bağlı'; end if;
  insert into public.play_abonelik_olay (kullanici, urun, token_son, kaynak, durum, bitis, ham) values (p_kullanici, p_urun, right(p_token, 12), p_kaynak, p_durum, p_bitis, p_ham);
  -- Eski bir aboneliğin geç gelen bildirimi geçerli yeni aboneliği ezmesin
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

-- 6) Yönetici: ödeme yöntemini değiştir (havale = faturalı, uygulama dışı ödeme)
create or replace function public.ortak_odeme_yontemi(p_kullanici uuid, p_yontem text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.yonetici() then raise exception 'yetkisiz'; end if;
  if p_yontem not in ('play', 'havale') then raise exception 'geçersiz yöntem'; end if;
  update public.is_ortagi set odeme_yontemi = p_yontem, guncelleme = now() where kullanici = p_kullanici;
  if not found then raise exception 'ortak yok'; end if;
end $$;
revoke all on function public.ortak_odeme_yontemi(uuid, text) from public, anon;
grant execute on function public.ortak_odeme_yontemi(uuid, text) to authenticated;

-- 7) Günlük iş: havale ortaklarına tahakkuk (eskisi gibi); Play ortaklarında ücretsiz dönem sonu hatırlatması ve abonelik kontrolü
create or replace function public.uyelik_gunluk() returns void language plpgsql security definer set search_path = public as $$
declare a public.uyelik_ayar; o public.is_ortagi; r record; v_donem date := date_trunc('month', current_date)::date; kalan int;
begin
  select * into a from public.uyelik_ayar where id = 1;
  for o in select * from public.is_ortagi where durum in ('aktif', 'askida') and ucretsiz_bitis is not null loop
    if o.odeme_yontemi = 'havale' then
      if v_donem >= (date_trunc('month', o.ucretsiz_bitis - 1) + interval '1 month')::date then
        insert into public.uyelik_tahakkuk (ortak, donem, tutar, vade)
        values (o.kullanici, v_donem, coalesce(o.aylik_ucret, case when o.tur = 'galeri' then a.galeri_aylik else a.emlak_aylik end), v_donem + a.vade_gun)
        on conflict (ortak, donem) do nothing;
        if found then
          insert into public.bildirimler (alici, tur, baslik, metin, link) values (o.kullanici, 'ortaklik', 'Aylık Üyelik Bedeli',
            to_char(v_donem, 'MM.YYYY') || ' dönemi üyelik bedelin oluştu. Son ödeme: ' || to_char(v_donem + a.vade_gun, 'DD.MM.YYYY') || '.', '#/ortaklik');
        end if;
      end if;
    elsif not public.ortak_abonelik_gecerli(o, interval '2 days') then   -- 2 gün pay: kaçan Google bildirimi yüzünden haksız askı olmasın
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
  -- havale: vadesi geçenler
  for r in update public.uyelik_tahakkuk set durum = 'gecikti' where durum = 'bekliyor' and vade < current_date returning ortak, donem loop
    insert into public.bildirimler (alici, tur, baslik, metin, link) values (r.ortak, 'ortaklik', 'Üyelik Ödemen Gecikti',
      to_char(r.donem, 'MM.YYYY') || ' dönemi ödemesi gecikti; ilanların beklemeye alındı. Ödeme onaylanınca otomatik yayına döner.', '#/ortaklik');
    perform public.ortak_ilanlari(r.ortak, true);
  end loop;
end $$;
revoke all on function public.uyelik_gunluk() from public, anon, authenticated;
