-- Tanıtım ödülleri: (1) davet kodu ile üye getirene ve gelen üyeye kredi, (2) sosyal medya tanıtım görevine yönetici onaylı kredi.
-- Kredi yalnız bu sunucu fonksiyonlarıyla verilir; her hareket kredi_hareketleri'ne yazılır.

-- 1) Ayarlar
create table if not exists public.odul_ayar (
  id int primary key default 1 check (id = 1),
  davet_eden_kredi int not null default 3 check (davet_eden_kredi between 0 and 50),
  davetli_kredi int not null default 2 check (davetli_kredi between 0 and 50),
  davet_aylik_limit int not null default 20 check (davet_aylik_limit between 0 and 500),
  davet_kod_gun int not null default 14 check (davet_kod_gun between 1 and 90),   -- üyelikten sonra kod girme süresi
  gorev_kredi int not null default 2 check (gorev_kredi between 0 and 50),
  gorev_aylik_limit int not null default 4 check (gorev_aylik_limit between 0 and 50),
  acik boolean not null default true,
  guncelleme timestamptz not null default now()
);
insert into public.odul_ayar (id) values (1) on conflict (id) do nothing;
alter table public.odul_ayar enable row level security;
drop policy if exists "odul ayar okunur" on public.odul_ayar;
create policy "odul ayar okunur" on public.odul_ayar for select using (true);
drop policy if exists "odul ayar yonetici" on public.odul_ayar;
create policy "odul ayar yonetici" on public.odul_ayar for update to authenticated using (public.yonetici()) with check (public.yonetici());

-- 2) Davetler: mevcut sistem (kod = davet edenin kimliğinin ilk 8 karakteri) korunur, ödül artık doğrulamaya bağlı.
--    Koşul (odul_ayar.davet_kosul): 'eposta' (davetli e-postasını doğruladı) | 'telefon' (SMS ile doğruladı) | 'ilan' (ilk ilanı yayında)
alter table public.odul_ayar add column if not exists davet_kosul text not null default 'eposta' check (davet_kosul in ('eposta', 'telefon', 'ilan'));
update public.odul_ayar set davet_eden_kredi = 3, davetli_kredi = 3, davet_aylik_limit = 10, davet_kod_gun = 7 where id = 1;
alter table public.davetler add column if not exists durum text not null default 'bekliyor';
alter table public.davetler drop constraint if exists davetler_durum_check;
alter table public.davetler add constraint davetler_durum_check check (durum in ('bekliyor', 'odullendi', 'red'));
alter table public.davetler add column if not exists odul_zamani timestamptz;
alter table public.davetler add column if not exists not_ text;

-- İç yardımcı: kredi ver + hareket + bildirim
create or replace function public.odul_kredi_ver(p_uye uuid, p_miktar int, p_aciklama text, p_baslik text, p_link text default '#/tanitim') returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_miktar, 0) <= 0 then return; end if;
  update public.profil_ozel set kredi = kredi + p_miktar where id = p_uye;
  insert into public.kredi_hareketleri (kullanici, miktar, aciklama) values (p_uye, p_miktar, left(p_aciklama, 140));
  insert into public.bildirimler (alici, tur, baslik, metin, link) values (p_uye, 'odul', p_baslik, p_miktar || ' kredi hesabına yüklendi. ' || p_aciklama, p_link);
end $$;
revoke all on function public.odul_kredi_ver(uuid, int, text, text, text) from public, anon, authenticated;

-- Davetli doğrulama koşulunu sağladıysa ve davet eden aylık sınırı aşmadıysa iki tarafa kredi
create or replace function public.davet_odul_kontrol(p_davetli uuid) returns text language plpgsql security definer set search_path = public, auth as $$
declare d public.davetler; a public.odul_ayar; n int; tamam boolean;
begin
  select * into d from public.davetler where davet_edilen = p_davetli for update;
  if d is null then return 'yok'; end if;
  if d.durum <> 'bekliyor' then return d.durum; end if;
  select * into a from public.odul_ayar where id = 1;
  if not a.acik then return 'bekliyor'; end if;
  if a.davet_kosul = 'eposta' then select email_confirmed_at is not null into tamam from auth.users where id = p_davetli;
  elsif a.davet_kosul = 'telefon' then select phone_confirmed_at is not null into tamam from auth.users where id = p_davetli;
  else select exists (select 1 from public.ilanlar where sahip = p_davetli and durum = 'yayinda' and not ornek) into tamam; end if;
  if not coalesce(tamam, false) then return 'bekliyor'; end if;
  select count(*) into n from public.davetler where davet_eden = d.davet_eden and durum = 'odullendi' and odul_zamani >= date_trunc('month', now());
  if n >= a.davet_aylik_limit then return 'bekliyor'; end if;
  update public.davetler set durum = 'odullendi', odul_zamani = now() where davet_edilen = p_davetli;
  perform public.odul_kredi_ver(d.davet_eden, a.davet_eden_kredi, 'Davet ödülü: davet ettiğin kişi katıldı ve doğrulandı', 'Davet Ödülün Geldi');
  perform public.odul_kredi_ver(p_davetli, a.davetli_kredi, 'Davetle katılım hediyesi', 'Hoş Geldin Hediyesi');
  return 'odullendi';
end $$;
revoke all on function public.davet_odul_kontrol(uuid) from public, anon, authenticated;

-- Üye kodu girer (kayıtta ya da üyeliğin ilk günlerinde). Kredi doğrulama koşulu sağlanınca yüklenir.
drop function if exists public.davet_kullan(text);
create or replace function public.davet_kullan(p_kod text) returns json language plpgsql security definer set search_path = public, auth as $$
declare v_eden uuid; v_ben uuid := auth.uid(); v_olusturma timestamptz; a public.odul_ayar; v_durum text; v_kredi int;
begin
  if v_ben is null then raise exception 'giriş gerekli'; end if;
  select * into a from public.odul_ayar where id = 1;
  if not a.acik then raise exception 'davet ödülleri şu an kapalı'; end if;
  if exists (select 1 from public.davetler where davet_edilen = v_ben) then raise exception 'davet kodu zaten kullanıldı'; end if;
  select olusturma into v_olusturma from public.profiller where id = v_ben;
  if v_olusturma < now() - make_interval(days => a.davet_kod_gun) then raise exception 'davet kodu yalnız üyeliğin ilk % gününde kullanılabilir', a.davet_kod_gun; end if;
  select id into v_eden from auth.users where upper(left(id::text, 8)) = upper(trim(p_kod)) limit 1;
  if v_eden is null then raise exception 'davet kodu bulunamadı'; end if;
  if v_eden = v_ben then raise exception 'kendi kodunu kullanamazsın'; end if;
  insert into public.davetler (davet_edilen, davet_eden) values (v_ben, v_eden);
  v_durum := public.davet_odul_kontrol(v_ben);
  select kredi into v_kredi from public.profil_ozel where id = v_ben;
  return json_build_object('durum', v_durum, 'kredi', v_kredi, 'kosul', a.davet_kosul, 'miktar', a.davetli_kredi);
end $$;
revoke all on function public.davet_kullan(text) from public, anon;
grant execute on function public.davet_kullan(text) to authenticated;

-- Doğrulama olayları: e-posta / telefon onayı, ilk ilanın yayına çıkması
create or replace function public.davet_auth_onay() returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if (new.email_confirmed_at is not null and old.email_confirmed_at is null) or (new.phone_confirmed_at is not null and old.phone_confirmed_at is null) then
    begin perform public.davet_odul_kontrol(new.id); exception when others then null; end;
  end if;
  return new;
end $$;
drop trigger if exists davet_auth_onay on auth.users;
create trigger davet_auth_onay after update of email_confirmed_at, phone_confirmed_at on auth.users for each row execute function public.davet_auth_onay();
create or replace function public.davet_ilan_onay() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.durum = 'yayinda' and exists (select 1 from public.davetler where davet_edilen = new.sahip and durum = 'bekliyor') then
    begin perform public.davet_odul_kontrol(new.sahip); exception when others then null; end;
  end if;
  return new;
end $$;
drop trigger if exists ilanlar_davet_onay on public.ilanlar;
create trigger ilanlar_davet_onay after insert or update of durum on public.ilanlar for each row execute function public.davet_ilan_onay();

-- Yönetici: bekleyen daveti onayla (sınır aşımı vb.) ya da reddet
create or replace function public.davet_karar(p_davetli uuid, p_onay boolean, p_not text default null) returns void language plpgsql security definer set search_path = public as $$
declare d public.davetler; a public.odul_ayar;
begin
  if not public.yonetici() then raise exception 'yetkisiz'; end if;
  select * into d from public.davetler where davet_edilen = p_davetli for update;
  if d is null or d.durum <> 'bekliyor' then raise exception 'bekleyen davet yok'; end if;
  select * into a from public.odul_ayar where id = 1;
  if p_onay then
    update public.davetler set durum = 'odullendi', odul_zamani = now(), not_ = p_not where davet_edilen = p_davetli;
    perform public.odul_kredi_ver(d.davet_eden, a.davet_eden_kredi, 'Davet ödülü: davet ettiğin kişi katıldı', 'Davet Ödülün Geldi');
    perform public.odul_kredi_ver(p_davetli, a.davetli_kredi, 'Davetle katılım hediyesi', 'Hoş Geldin Hediyesi');
  else
    update public.davetler set durum = 'red', not_ = p_not where davet_edilen = p_davetli;
  end if;
end $$;
revoke all on function public.davet_karar(uuid, boolean, text) from public, anon;
grant execute on function public.davet_karar(uuid, boolean, text) to authenticated;

-- 4) Tanıtım görevleri (sosyal medya paylaşımı → yönetici kontrol eder → kredi)
create table if not exists public.tanitim_gonderi (
  id uuid primary key default gen_random_uuid(),
  kullanici uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'tiktok', 'facebook', 'youtube', 'x', 'linkedin', 'blog', 'diger')),
  url text not null check (url ~ '^https://[^\s]{6,}$' and char_length(url) <= 500),
  aciklama text check (char_length(aciklama) <= 300),
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'onay', 'red')),
  kredi int, karar_notu text,
  olusturma timestamptz not null default now(),
  karar_zamani timestamptz
);
create unique index if not exists tanitim_gonderi_url on public.tanitim_gonderi (lower(url));
create index if not exists tanitim_gonderi_kul on public.tanitim_gonderi (kullanici, olusturma desc);
alter table public.tanitim_gonderi enable row level security;
drop policy if exists "tanitim sahibi görür" on public.tanitim_gonderi;
create policy "tanitim sahibi görür" on public.tanitim_gonderi for select to authenticated using (kullanici = auth.uid() or public.yonetici());

create or replace function public.tanitim_gonder(p_platform text, p_url text, p_aciklama text default null) returns uuid language plpgsql security definer set search_path = public as $$
declare a public.odul_ayar; n int; v uuid;
begin
  if auth.uid() is null then raise exception 'oturum gerekli'; end if;
  select * into a from public.odul_ayar where id = 1;
  if not a.acik then raise exception 'tanıtım ödülleri şu an kapalı'; end if;
  select count(*) into n from public.tanitim_gonderi where kullanici = auth.uid() and olusturma >= date_trunc('month', now()) and durum <> 'red';
  if n >= a.gorev_aylik_limit then raise exception 'bu ay en fazla % tanıtım gönderebilirsin', a.gorev_aylik_limit; end if;
  if exists (select 1 from public.tanitim_gonderi where lower(url) = lower(trim(p_url))) then raise exception 'bu bağlantı daha önce gönderildi'; end if;
  insert into public.tanitim_gonderi (kullanici, platform, url, aciklama) values (auth.uid(), p_platform, trim(p_url), nullif(trim(coalesce(p_aciklama, '')), '')) returning id into v;
  return v;
end $$;
revoke all on function public.tanitim_gonder(text, text, text) from public, anon;
grant execute on function public.tanitim_gonder(text, text, text) to authenticated;

create or replace function public.tanitim_karar(p_id uuid, p_onay boolean, p_kredi int default null, p_not text default null) returns void language plpgsql security definer set search_path = public as $$
declare g public.tanitim_gonderi; a public.odul_ayar; k int;
begin
  if not public.yonetici() then raise exception 'yetkisiz'; end if;
  select * into g from public.tanitim_gonderi where id = p_id for update;
  if g is null or g.durum <> 'bekliyor' then raise exception 'bekleyen gönderi yok'; end if;
  select * into a from public.odul_ayar where id = 1;
  if p_onay then
    k := coalesce(p_kredi, a.gorev_kredi);
    if k < 0 or k > 50 then raise exception 'kredi 0-50 arası olmalı'; end if;
    update public.tanitim_gonderi set durum = 'onay', kredi = k, karar_notu = p_not, karar_zamani = now() where id = p_id;
    perform public.odul_kredi_ver(g.kullanici, k, 'Tanıtım ödülü (' || g.platform || ')', 'Tanıtım Ödülün Geldi');
  else
    update public.tanitim_gonderi set durum = 'red', karar_notu = p_not, karar_zamani = now() where id = p_id;
    insert into public.bildirimler (alici, tur, baslik, metin, link) values (g.kullanici, 'odul', 'Tanıtım Gönderin Hakkında', coalesce(p_not, 'Gönderin ödül koşullarını karşılamadı.'), '#/tanitim');
  end if;
end $$;
revoke all on function public.tanitim_karar(uuid, boolean, int, text) from public, anon;
grant execute on function public.tanitim_karar(uuid, boolean, int, text) to authenticated;

drop function if exists public.yonetim_davetler();
-- Yönetici listesi: davetler (ad + e-posta doğrulama durumu ile)
create or replace function public.yonetim_davetler() returns table (davetli uuid, davet_eden uuid, durum text, zaman timestamptz, odul_zamani timestamptz, eposta_onayli boolean, telefon_onayli boolean, davetli_ad text, eden_ad text) language sql stable security definer set search_path = public, auth as $$
  select d.davet_edilen, d.davet_eden, d.durum, d.zaman, d.odul_zamani, u.email_confirmed_at is not null, u.phone_confirmed_at is not null, p1.ad, p2.ad
  from public.davetler d join auth.users u on u.id = d.davet_edilen
  left join public.profiller p1 on p1.id = d.davet_edilen left join public.profiller p2 on p2.id = d.davet_eden
  where public.yonetici() order by d.zaman desc limit 200;
$$;
revoke all on function public.yonetim_davetler() from public, anon;
grant execute on function public.yonetim_davetler() to authenticated;
