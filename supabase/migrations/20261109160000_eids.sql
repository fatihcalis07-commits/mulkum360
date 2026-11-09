-- EİDS UYUMLU İLAN DOĞRULAMA KAPISI — TASLAK (09.11.2026)
-- ⚠ UYGULANMADI — kullanıcı onayı bekleniyor (şema değişikliği onay kuralı). Belgeler: docs/EIDS.md · TAPU-DOGRULAMA.md
-- Kural (Taşınmaz Ticareti Yönetmeliği md. 12/2-ç): kimlik + mülkiyet/yetki doğrulanmadan emlak ilanı YAYINLANAMAZ.
-- faz='kapali' iken bugünkü davranış birebir korunur (geriye dönük uyumlu).

-- 0) Faz anahtarı: kapali | manuel (yönetici, resmî sorgu ekranlarıyla onaylar — BUGÜNKÜ GERÇEK) | canli (resmî EİDS API erişimi gelince)
create table if not exists public.eids_ayar (
  id int primary key default 1 check (id = 1),
  faz text not null default 'kapali' check (faz in ('kapali', 'manuel', 'canli')),
  guncelleme timestamptz not null default now()
);
insert into public.eids_ayar (id, faz) values (1, 'kapali') on conflict (id) do nothing;
alter table public.eids_ayar enable row level security;
drop policy if exists "eids faz herkese okunur" on public.eids_ayar;
create policy "eids faz herkese okunur" on public.eids_ayar for select using (true);
-- yazma yalnız service role ile (policy yok)

-- 1) ilan durumuna 'onayda' eklendi
alter table public.ilanlar drop constraint if exists ilanlar_durum_check;
alter table public.ilanlar add constraint ilanlar_durum_check check (durum in ('onayda', 'yayinda', 'satildi', 'kaldirildi'));

-- 2) İlan doğrulama kaydı (ilan başına tek; resmî bağlantı gelince eids_ref dolar)
create table if not exists public.ilan_dogrulama (
  ilan uuid primary key references public.ilanlar on delete cascade,
  sahip uuid not null references auth.users on delete cascade,
  yontem text not null check (yontem in ('sahibim', 'hisim', 'yetkili')),
  tasinmaz_no text not null check (tasinmaz_no ~ '^[0-9]{8,20}$'),
  yetki_belge_no text check (yetki_belge_no is null or char_length(yetki_belge_no) between 6 and 20),
  sonuc text not null default 'bekliyor' check (sonuc in ('bekliyor', 'onayli', 'red')),
  eids_ref text,
  karar_notu text check (char_length(karar_notu) <= 500),
  karar_veren uuid references auth.users,
  olusturma timestamptz not null default now(),
  guncelleme timestamptz not null default now()
);
create index if not exists ilan_dogrulama_kuyruk on public.ilan_dogrulama (sonuc, olusturma) where sonuc = 'bekliyor';
alter table public.ilan_dogrulama enable row level security;
drop policy if exists "eids kayıt sahibi ve yönetici okur" on public.ilan_dogrulama;
create policy "eids kayıt sahibi ve yönetici okur" on public.ilan_dogrulama for select using (sahip = auth.uid() or public.yonetici());
-- yazma yok: yalnız eids_iste / eids_karar RPC'leri (security definer)

-- 3) Yönetici, onay kuyruğu için onaydaki ilanları da görebilir
drop policy if exists "eids yönetici onaydakini görür" on public.ilanlar;
create policy "eids yönetici onaydakini görür" on public.ilanlar for select to authenticated using (public.yonetici());

-- 4) YAYIN KAPISI: emlak ilanı, doğrulaması onaylıysa yayına çıkabilir (yönetici müdahalesi ve vasita hariç)
create or replace function public.ilan_eids_kapisi() returns trigger language plpgsql security definer set search_path = public as $$
declare faz text; s text;
begin
  select faz into faz from public.eids_ayar where id = 1;
  if coalesce(faz, 'kapali') = 'kapali' or public.yonetici() or new.ana <> 'emlak' then return new; end if;
  if new.durum = 'yayinda' then
    select sonuc into s from public.ilan_dogrulama where ilan = new.id;
    if s is distinct from 'onayli' then new.durum := 'onayda'; end if;
  end if;
  return new;
end $$;
drop trigger if exists ilanlar_eids_kapisi on public.ilanlar;
create trigger ilanlar_eids_kapisi before insert or update on public.ilanlar for each row execute function public.ilan_eids_kapisi();

-- 5) Üye doğrulama talebi açar / yeniler → ilan 'onayda'ya çekilir
create or replace function public.eids_iste(p_ilan uuid, p_yontem text, p_tasinmaz_no text, p_yetki_belge_no text default null) returns void language plpgsql security definer set search_path = public as $$
declare ht text;
begin
  if not exists (select 1 from public.ilanlar where id = p_ilan and sahip = auth.uid()) then raise exception 'kendi ilanın değil'; end if;
  if p_tasinmaz_no !~ '^[0-9]{8,20}$' then raise exception 'taşınmaz numarası 8-20 hane rakam olmalı'; end if;
  if p_yontem not in ('sahibim', 'hisim', 'yetkili') then raise exception 'geçersiz yöntem'; end if;
  select hesap_turu into ht from public.profiller where id = auth.uid();
  if p_yontem = 'yetkili' then
    if ht <> 'ofis' then raise exception 'yalnız emlak işletmesi yetkili ilan verebilir'; end if;
    if p_yetki_belge_no is null or char_length(p_yetki_belge_no) < 6 then raise exception 'yetki belge no girilmeli'; end if;
  end if;
  insert into public.ilan_dogrulama (ilan, sahip, yontem, tasinmaz_no, yetki_belge_no)
  values (p_ilan, auth.uid(), p_yontem, p_tasinmaz_no, nullif(trim(coalesce(p_yetki_belge_no, '')), ''))
  on conflict (ilan) do update set yontem = excluded.yontem, tasinmaz_no = excluded.tasinmaz_no,
    yetki_belge_no = excluded.yetki_belge_no, sonuc = 'bekliyor', karar_notu = null, karar_veren = null, guncelleme = now();
  update public.ilanlar set durum = 'onayda' where id = p_ilan;
end $$;
revoke all on function public.eids_iste(uuid, text, text, text) from public, anon;
grant execute on function public.eids_iste(uuid, text, text, text) to authenticated;

-- 6) Yönetici kararı: onay → ilan yayına çıkar; red → kaldırılır (üye düzenleyip yeniden talep açabilir)
--    faz='canli' olduğu gün aynı imzaya EİDS API yanıtı bağlanacak (eids_ref dolu ise kaynak EİDS).
create or replace function public.eids_karar(p_ilan uuid, p_onay boolean, p_not text default null, p_ref text default null) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.yonetici() then raise exception 'yetki yok'; end if;
  update public.ilan_dogrulama set sonuc = case when p_onay then 'onayli' else 'red' end,
    karar_notu = left(nullif(trim(coalesce(p_not, '')), ''), 500), eids_ref = coalesce(nullif(trim(coalesce(p_ref, '')), ''), eids_ref),
    karar_veren = auth.uid(), guncelleme = now()
  where ilan = p_ilan;
  if not found then raise exception 'doğrulama kaydı yok'; end if;
  update public.ilanlar set durum = case when p_onay then 'yayinda' else 'kaldirildi' end, dogrulanmis = p_onay where id = p_ilan;
end $$;
revoke all on function public.eids_karar(uuid, boolean, text, text) from public, anon;
grant execute on function public.eids_karar(uuid, boolean, text, text) to authenticated;
