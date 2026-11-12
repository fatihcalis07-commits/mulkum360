-- Anlaşmalı İş Ortaklığı (emlak ofisi / oto galeri): ilk N ay ücretsiz, sonra aylık üyelik.
-- Tahakkuk her ayın 1'inde; vade geçerse ortağın yayındaki ilanları beklemeye alınır, ödeme onaylanınca geri açılır.

-- 1) Ayarlar (tek satır; yönetici panelden değiştirir)
create table if not exists public.uyelik_ayar (
  id int primary key default 1 check (id = 1),
  emlak_aylik numeric(12,2) not null default 1500,
  galeri_aylik numeric(12,2) not null default 1000,
  ucretsiz_ay int not null default 3 check (ucretsiz_ay between 0 and 24),
  vade_gun int not null default 15 check (vade_gun between 1 and 60),
  iban text, alici_unvan text,
  guncelleme timestamptz not null default now()
);
insert into public.uyelik_ayar (id) values (1) on conflict (id) do nothing;
alter table public.uyelik_ayar enable row level security;
drop policy if exists "uyelik ayar okunur" on public.uyelik_ayar;
create policy "uyelik ayar okunur" on public.uyelik_ayar for select using (true);
drop policy if exists "uyelik ayar yonetici" on public.uyelik_ayar;
create policy "uyelik ayar yonetici" on public.uyelik_ayar for update to authenticated using (public.yonetici()) with check (public.yonetici());

-- 2) İş ortakları
create table if not exists public.is_ortagi (
  kullanici uuid primary key references auth.users(id) on delete cascade,
  tur text not null check (tur in ('emlak', 'galeri')),
  unvan text not null check (char_length(unvan) between 3 and 160),
  vergi_no text not null check (vergi_no ~ '^[0-9]{10,11}$'),
  yetki_belge_no text not null check (char_length(yetki_belge_no) between 4 and 30),
  durum text not null default 'basvuru' check (durum in ('basvuru', 'aktif', 'askida', 'red', 'iptal')),
  sozlesme_surum text not null,
  sozlesme_onay timestamptz not null default now(),
  baslangic date, ucretsiz_bitis date,
  aylik_ucret numeric(12,2),
  karar_notu text,
  olusturma timestamptz not null default now(),
  guncelleme timestamptz not null default now()
);
alter table public.is_ortagi enable row level security;
drop policy if exists "ortak kendini görür" on public.is_ortagi;
create policy "ortak kendini görür" on public.is_ortagi for select to authenticated using (kullanici = auth.uid() or public.yonetici());
-- yazma yalnız RPC'lerle

-- 3) Aylık tahakkuklar
create table if not exists public.uyelik_tahakkuk (
  id uuid primary key default gen_random_uuid(),
  ortak uuid not null references public.is_ortagi(kullanici) on delete cascade,
  donem date not null,                       -- ayın 1'i
  tutar numeric(12,2) not null,
  vade date not null,
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'odendi', 'gecikti', 'iptal')),
  odeme_tarihi timestamptz, fatura_no text, aciklama text,
  olusturma timestamptz not null default now(),
  unique (ortak, donem)
);
alter table public.uyelik_tahakkuk enable row level security;
drop policy if exists "tahakkuk sahibi görür" on public.uyelik_tahakkuk;
create policy "tahakkuk sahibi görür" on public.uyelik_tahakkuk for select to authenticated using (ortak = auth.uid() or public.yonetici());

-- 4) Herkese açık rozet: profiller.anlasmali ('emlak' | 'galeri' | null)
alter table public.profiller add column if not exists anlasmali text;
create or replace function public.ortak_rozet_esle() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then update public.profiller set anlasmali = null where id = old.kullanici; return old; end if;
  update public.profiller set anlasmali = case when new.durum in ('aktif', 'askida') then new.tur end where id = new.kullanici;
  return new;
end $$;
drop trigger if exists is_ortagi_rozet on public.is_ortagi;
create trigger is_ortagi_rozet after insert or update of durum, tur or delete on public.is_ortagi for each row execute function public.ortak_rozet_esle();
-- Üye anlasmali alanını kendisi yazamaz
create or replace function public.profil_anlasmali_koru() returns trigger language plpgsql as $$
begin
  if new.anlasmali is distinct from old.anlasmali and coalesce(current_setting('mulkum.ortak', true), '') <> '1' and coalesce(auth.role(), '') <> 'service_role' then new.anlasmali := old.anlasmali; end if;
  return new;
end $$;
drop trigger if exists profiller_anlasmali_koru on public.profiller;
create trigger profiller_anlasmali_koru before update of anlasmali on public.profiller for each row execute function public.profil_anlasmali_koru();
-- ortak_rozet_esle içindeki güncelleme koruyucuyu geçebilsin
create or replace function public.ortak_rozet_esle() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('mulkum.ortak', '1', true);
  if tg_op = 'DELETE' then update public.profiller set anlasmali = null where id = old.kullanici; perform set_config('mulkum.ortak', '', true); return old; end if;
  update public.profiller set anlasmali = case when new.durum in ('aktif', 'askida') then new.tur end where id = new.kullanici;
  perform set_config('mulkum.ortak', '', true);
  return new;
end $$;

-- 5) Başvuru (üye)
create or replace function public.ortak_basvur(p_tur text, p_unvan text, p_vergi text, p_yetki text, p_surum text) returns void language plpgsql security definer set search_path = public as $$
declare d text;
begin
  if auth.uid() is null then raise exception 'oturum gerekli'; end if;
  select durum into d from public.is_ortagi where kullanici = auth.uid();
  if d in ('aktif', 'askida') then raise exception 'zaten iş ortağısın'; end if;
  insert into public.is_ortagi (kullanici, tur, unvan, vergi_no, yetki_belge_no, sozlesme_surum, durum, sozlesme_onay)
  values (auth.uid(), p_tur, trim(p_unvan), regexp_replace(p_vergi, '\D', '', 'g'), trim(p_yetki), p_surum, 'basvuru', now())
  on conflict (kullanici) do update set tur = excluded.tur, unvan = excluded.unvan, vergi_no = excluded.vergi_no, yetki_belge_no = excluded.yetki_belge_no,
    sozlesme_surum = excluded.sozlesme_surum, sozlesme_onay = now(), durum = 'basvuru', karar_notu = null, guncelleme = now();
end $$;
revoke all on function public.ortak_basvur(text, text, text, text, text) from public, anon;
grant execute on function public.ortak_basvur(text, text, text, text, text) to authenticated;

-- 6) Yönetici kararı: onayla (ücretsiz süre bugünden başlar) / reddet / iptal
create or replace function public.ortak_karar(p_kullanici uuid, p_karar text, p_aylik numeric default null, p_not text default null) returns void language plpgsql security definer set search_path = public as $$
declare a public.uyelik_ayar; o public.is_ortagi;
begin
  if not public.yonetici() then raise exception 'yetkisiz'; end if;
  select * into a from public.uyelik_ayar where id = 1;
  select * into o from public.is_ortagi where kullanici = p_kullanici;
  if o is null then raise exception 'başvuru yok'; end if;
  if p_karar = 'onay' then
    update public.is_ortagi set durum = 'aktif', baslangic = coalesce(baslangic, current_date),
      ucretsiz_bitis = coalesce(ucretsiz_bitis, (current_date + make_interval(months => a.ucretsiz_ay))::date),
      aylik_ucret = coalesce(p_aylik, aylik_ucret, case when o.tur = 'galeri' then a.galeri_aylik else a.emlak_aylik end),
      karar_notu = p_not, guncelleme = now() where kullanici = p_kullanici;
    insert into public.bildirimler (alici, tur, baslik, metin, link) values (p_kullanici, 'ortaklik', 'İş Ortaklığın Onaylandı',
      'İlk ' || a.ucretsiz_ay || ' ay ücretsiz. Ayrıntılar Hesabım → İş Ortaklığı bölümünde.', '#/ortaklik');
  elsif p_karar in ('red', 'iptal') then
    update public.is_ortagi set durum = p_karar, karar_notu = p_not, guncelleme = now() where kullanici = p_kullanici;
    if p_karar = 'red' then insert into public.bildirimler (alici, tur, baslik, metin, link) values (p_kullanici, 'ortaklik', 'İş Ortaklığı Başvurun Hakkında', coalesce(p_not, 'Başvurun şu an onaylanamadı.'), '#/ortaklik'); end if;
  else raise exception 'geçersiz karar'; end if;
end $$;
revoke all on function public.ortak_karar(uuid, text, numeric, text) from public, anon;
grant execute on function public.ortak_karar(uuid, text, numeric, text) to authenticated;

-- 7) Askıya alma / geri açma (ilanlar: alanlar.uyelikAskida işareti ile)
create or replace function public.ortak_ilanlari(p_ortak uuid, p_askiya boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_askiya then
    update public.ilanlar set durum = 'kaldirildi', alanlar = coalesce(alanlar, '{}'::jsonb) || '{"uyelikAskida": true}' where sahip = p_ortak and durum = 'yayinda';
    update public.is_ortagi set durum = 'askida', guncelleme = now() where kullanici = p_ortak and durum = 'aktif';
  else
    update public.ilanlar set durum = 'yayinda', alanlar = alanlar - 'uyelikAskida' where sahip = p_ortak and alanlar ? 'uyelikAskida';
    update public.is_ortagi set durum = 'aktif', guncelleme = now() where kullanici = p_ortak and durum = 'askida';
  end if;
end $$;
revoke all on function public.ortak_ilanlari(uuid, boolean) from public, anon, authenticated;

-- 8) Ödeme onayı (yönetici)
create or replace function public.tahakkuk_odendi(p_id uuid, p_fatura text default null) returns void language plpgsql security definer set search_path = public as $$
declare t public.uyelik_tahakkuk;
begin
  if not public.yonetici() then raise exception 'yetkisiz'; end if;
  update public.uyelik_tahakkuk set durum = 'odendi', odeme_tarihi = now(), fatura_no = nullif(trim(coalesce(p_fatura, '')), '') where id = p_id returning * into t;
  if t is null then raise exception 'tahakkuk yok'; end if;
  if not exists (select 1 from public.uyelik_tahakkuk where ortak = t.ortak and durum = 'gecikti') then perform public.ortak_ilanlari(t.ortak, false); end if;
  insert into public.bildirimler (alici, tur, baslik, metin, link) values (t.ortak, 'ortaklik', 'Ödemen Alındı',
    to_char(t.donem, 'MM.YYYY') || ' dönemi üyelik ödemen onaylandı. Teşekkürler.', '#/ortaklik');
end $$;
revoke all on function public.tahakkuk_odendi(uuid, text) from public, anon;
grant execute on function public.tahakkuk_odendi(uuid, text) to authenticated;

create or replace function public.tahakkuk_iptal(p_id uuid, p_not text default null) returns void language plpgsql security definer set search_path = public as $$
declare t public.uyelik_tahakkuk;
begin
  if not public.yonetici() then raise exception 'yetkisiz'; end if;
  update public.uyelik_tahakkuk set durum = 'iptal', aciklama = p_not where id = p_id returning * into t;
  if t is not null and not exists (select 1 from public.uyelik_tahakkuk where ortak = t.ortak and durum = 'gecikti') then perform public.ortak_ilanlari(t.ortak, false); end if;
end $$;
revoke all on function public.tahakkuk_iptal(uuid, text) from public, anon;
grant execute on function public.tahakkuk_iptal(uuid, text) to authenticated;

-- 9) Günlük iş: tahakkuk oluştur, gecikeni işaretle, askıya al
--    İlk ücretli dönem: ücretsiz sürenin bittiği günden sonraki ilk ayın 1'i.
create or replace function public.uyelik_gunluk() returns void language plpgsql security definer set search_path = public as $$
declare a public.uyelik_ayar; o record; v_donem date := date_trunc('month', current_date)::date;
begin
  select * into a from public.uyelik_ayar where id = 1;
  for o in select * from public.is_ortagi where durum in ('aktif', 'askida') and ucretsiz_bitis is not null loop
    if v_donem >= (date_trunc('month', o.ucretsiz_bitis - 1) + interval '1 month')::date then
      insert into public.uyelik_tahakkuk (ortak, donem, tutar, vade)
      values (o.kullanici, v_donem, coalesce(o.aylik_ucret, case when o.tur = 'galeri' then a.galeri_aylik else a.emlak_aylik end), v_donem + a.vade_gun)
      on conflict (ortak, donem) do nothing;
      if found then
        insert into public.bildirimler (alici, tur, baslik, metin, link) values (o.kullanici, 'ortaklik', 'Aylık Üyelik Bedeli',
          to_char(v_donem, 'MM.YYYY') || ' dönemi üyelik bedelin oluştu. Son ödeme: ' || to_char(v_donem + a.vade_gun, 'DD.MM.YYYY') || '.', '#/ortaklik');
      end if;
    end if;
  end loop;
  -- vadesi geçenler
  for o in update public.uyelik_tahakkuk set durum = 'gecikti' where durum = 'bekliyor' and vade < current_date returning ortak, donem loop
    insert into public.bildirimler (alici, tur, baslik, metin, link) values (o.ortak, 'ortaklik', 'Üyelik Ödemen Gecikti',
      to_char(o.donem, 'MM.YYYY') || ' dönemi ödemesi gecikti; ilanların beklemeye alındı. Ödeme onaylanınca otomatik yayına döner.', '#/ortaklik');
    perform public.ortak_ilanlari(o.ortak, true);
  end loop;
end $$;
revoke all on function public.uyelik_gunluk() from public, anon, authenticated;

select cron.unschedule('uyelik-gunluk') where exists (select 1 from cron.job where jobname = 'uyelik-gunluk');
select cron.schedule('uyelik-gunluk', '10 6 * * *', 'select public.uyelik_gunluk()');

-- 10) Askıdan dönüş, EİDS yayın kapısına takılmaz (ilan zaten yayındaydı; askıya alma kural ihlali değil)
create or replace function public.ilan_eids_kapisi() returns trigger language plpgsql security definer set search_path = public as $$
declare v_faz text; v_s text;
begin
  if coalesce(current_setting('mulkum.askidan_donus', true), '') = '1' then return new; end if;
  select faz into v_faz from public.eids_ayar where id = 1;
  if coalesce(v_faz, 'kapali') = 'kapali' or public.yonetici() or new.ana not in ('emlak', 'vasita') then return new; end if;
  if new.durum = 'yayinda' then
    select sonuc into v_s from public.ilan_dogrulama where ilan = new.id;
    if v_s is distinct from 'onayli' then new.durum := 'onayda'; end if;
  end if;
  return new;
end $$;
create or replace function public.ortak_ilanlari(p_ortak uuid, p_askiya boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_askiya then
    update public.ilanlar set durum = 'kaldirildi', alanlar = coalesce(alanlar, '{}'::jsonb) || '{"uyelikAskida": true}' where sahip = p_ortak and durum = 'yayinda';
    update public.is_ortagi set durum = 'askida', guncelleme = now() where kullanici = p_ortak and durum = 'aktif';
  else
    perform set_config('mulkum.askidan_donus', '1', true);
    update public.ilanlar set durum = 'yayinda', alanlar = alanlar - 'uyelikAskida' where sahip = p_ortak and alanlar ? 'uyelikAskida';
    perform set_config('mulkum.askidan_donus', '', true);
    update public.is_ortagi set durum = 'aktif', guncelleme = now() where kullanici = p_ortak and durum = 'askida';
  end if;
end $$;
revoke all on function public.ortak_ilanlari(uuid, boolean) from public, anon, authenticated;

-- 11) Onay kararı aktif/askıdaki ortakta yalnız aylık bedeli günceller (durumu ve ücretsiz süreyi bozmaz, bildirim tekrarlamaz)
create or replace function public.ortak_karar(p_kullanici uuid, p_karar text, p_aylik numeric default null, p_not text default null) returns void language plpgsql security definer set search_path = public as $$
declare a public.uyelik_ayar; o public.is_ortagi;
begin
  if not public.yonetici() then raise exception 'yetkisiz'; end if;
  select * into a from public.uyelik_ayar where id = 1;
  select * into o from public.is_ortagi where kullanici = p_kullanici;
  if o is null then raise exception 'başvuru yok'; end if;
  if p_karar = 'onay' and o.durum in ('aktif', 'askida') then
    update public.is_ortagi set aylik_ucret = coalesce(p_aylik, aylik_ucret), guncelleme = now() where kullanici = p_kullanici;
  elsif p_karar = 'onay' then
    update public.is_ortagi set durum = 'aktif', baslangic = current_date,
      ucretsiz_bitis = (current_date + make_interval(months => a.ucretsiz_ay))::date,
      aylik_ucret = coalesce(p_aylik, case when o.tur = 'galeri' then a.galeri_aylik else a.emlak_aylik end),
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
