-- Kredi satışı: paketler (yönetici düzenler, herkes okur) ve satın alma kayıtları.
-- Google Play Billing bağlanana kadar satın alma "talep" olarak düşer; yönetici ödemeyi alınca onaylar, kredi otomatik yüklenir.
create table if not exists public.kredi_paketleri (
  id text primary key,
  ad text not null,
  kredi int not null check (kredi > 0),
  fiyat numeric(10, 2) not null check (fiyat > 0), -- TL, KDV dahil
  rozet text,
  play_urun text, -- Google Play ürün kimliği (ileride)
  sira int not null default 0,
  aktif boolean not null default true
);
alter table public.kredi_paketleri enable row level security;
drop policy if exists "paket herkes okur" on public.kredi_paketleri;
create policy "paket herkes okur" on public.kredi_paketleri for select using (true);
drop policy if exists "paket yonetici yazar" on public.kredi_paketleri;
create policy "paket yonetici yazar" on public.kredi_paketleri for all using (public.yonetici()) with check (public.yonetici());

insert into public.kredi_paketleri (id, ad, kredi, fiyat, rozet, play_urun, sira) values
  ('baslangic', 'Başlangıç', 5, 149.99, null, 'kredi_5', 1),
  ('standart', 'Standart', 15, 349.99, 'En çok tercih edilen', 'kredi_15', 2),
  ('emlakci', 'Emlakçı', 40, 749.99, null, 'kredi_40', 3),
  ('ofis', 'Ofis', 100, 1499.99, 'En uygun kredi fiyatı', 'kredi_100', 4)
on conflict (id) do nothing;

create table if not exists public.kredi_satislari (
  id uuid primary key default gen_random_uuid(),
  kullanici uuid not null default auth.uid() references auth.users on delete cascade,
  paket text not null references public.kredi_paketleri,
  kredi int not null,
  tutar numeric(10, 2) not null,
  yontem text not null default 'talep' check (yontem in ('talep', 'play')),
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'onaylandi', 'iptal')),
  siparis_no text unique,
  not_ text check (char_length(not_) <= 300),
  olusturma timestamptz not null default now(),
  onay_zamani timestamptz
);
create index if not exists kredi_satislari_kullanici on public.kredi_satislari (kullanici, olusturma desc);
alter table public.kredi_satislari enable row level security;
drop policy if exists "satis sahip gorur" on public.kredi_satislari;
create policy "satis sahip gorur" on public.kredi_satislari for select using (kullanici = auth.uid() or public.yonetici());

-- Satın alma talebi: paket bilgisi sunucudan alınır (fiyat istemciden gelmez); bekleyen talep varsa yenisi açılmaz
create or replace function public.kredi_talep(p_paket text) returns uuid language plpgsql security definer set search_path = public as $$
declare p public.kredi_paketleri; v uuid;
begin
  if auth.uid() is null then raise exception 'giriş gerekli'; end if;
  select * into p from public.kredi_paketleri where id = p_paket and aktif;
  if p.id is null then raise exception 'paket yok'; end if;
  if exists (select 1 from public.kredi_satislari where kullanici = auth.uid() and durum = 'bekliyor' and yontem = 'talep') then raise exception 'bekleyen talep var'; end if;
  insert into public.kredi_satislari (kullanici, paket, kredi, tutar) values (auth.uid(), p.id, p.kredi, p.fiyat) returning id into v;
  return v;
end $$;
revoke all on function public.kredi_talep(text) from public, anon;
grant execute on function public.kredi_talep(text) to authenticated;

-- Kullanıcı kendi bekleyen talebini iptal eder
create or replace function public.kredi_talep_iptal(p_id uuid) returns void language sql security definer set search_path = public as $$
  update public.kredi_satislari set durum = 'iptal' where id = p_id and kullanici = auth.uid() and durum = 'bekliyor';
$$;
revoke all on function public.kredi_talep_iptal(uuid) from public, anon;
grant execute on function public.kredi_talep_iptal(uuid) to authenticated;

-- Yönetici: ödemesi alınan talebi onaylar (kredi yüklenir) ya da iptal eder
create or replace function public.kredi_satis_karar(p_id uuid, p_onay boolean, p_not text default null) returns void language plpgsql security definer set search_path = public as $$
declare s public.kredi_satislari;
begin
  if not public.yonetici() then raise exception 'yetki yok'; end if;
  select * into s from public.kredi_satislari where id = p_id and durum = 'bekliyor' for update;
  if s.id is null then raise exception 'talep bulunamadı'; end if;
  if p_onay then
    update public.profil_ozel set kredi = kredi + s.kredi where id = s.kullanici;
    insert into public.kredi_hareketleri (kullanici, miktar, aciklama)
      values (s.kullanici, s.kredi, 'Kredi paketi: ' || (select ad from public.kredi_paketleri where id = s.paket) || ' (' || replace(to_char(s.tutar, 'FM999990.00'), '.', ',') || ' TL)');
  end if;
  update public.kredi_satislari set durum = case when p_onay then 'onaylandi' else 'iptal' end, onay_zamani = now(), not_ = coalesce(p_not, not_) where id = p_id;
end $$;
revoke all on function public.kredi_satis_karar(uuid, boolean, text) from public, anon;
grant execute on function public.kredi_satis_karar(uuid, boolean, text) to authenticated;
