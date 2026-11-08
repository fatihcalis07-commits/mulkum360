-- Mülküm360 ilk şema: üyeler, ilanlar, favoriler, mesajlaşma, kayıtlı arama, raporlar, şikayet, fotoğraf deposu.
-- Tüm tablolarda RLS açık; herkesin görebildiği yalnız yayındaki ilanlar ve üyelerin görünen adı.

-- Görünen profil (herkese açık: ad ve üyelik tarihi)
create table public.profiller (
  id uuid primary key references auth.users on delete cascade,
  ad text not null check (char_length(ad) between 3 and 80),
  olusturma timestamptz not null default now()
);
-- Özel bilgiler (yalnız sahibi)
create table public.profil_ozel (
  id uuid primary key references auth.users on delete cascade,
  tel text check (tel ~ '^05[0-9]{9}$'),
  ileti boolean not null default false
);

create table public.ilanlar (
  id uuid primary key default gen_random_uuid(),
  no bigint generated always as identity (start with 100001),
  sahip uuid not null references auth.users on delete cascade default auth.uid(),
  ana text not null check (ana in ('emlak', 'vasita')),
  alt text not null check (alt in ('konut', 'arsa', 'isyeri', 'yazlik', 'otomobil', 'suv', 'motor', 'ticari')),
  baslik text not null check (char_length(baslik) between 10 and 80),
  aciklama text check (char_length(aciklama) <= 3000),
  fiyat bigint not null check (fiyat > 0 and fiyat < 1000000000000),
  il text not null,
  ilce text,
  alanlar jsonb not null default '{}'::jsonb,
  fotolar text[] not null default '{}' check (cardinality(fotolar) <= 15),
  durum text not null default 'yayinda' check (durum in ('yayinda', 'satildi', 'kaldirildi')),
  goruntulenme int not null default 0,
  olusturma timestamptz not null default now(),
  guncelleme timestamptz not null default now()
);
create index ilanlar_liste on public.ilanlar (durum, olusturma desc);
create index ilanlar_sahip on public.ilanlar (sahip);

create table public.favoriler (
  kullanici uuid not null references auth.users on delete cascade default auth.uid(),
  ilan uuid not null references public.ilanlar on delete cascade,
  olusturma timestamptz not null default now(),
  primary key (kullanici, ilan)
);

create table public.sohbetler (
  id uuid primary key default gen_random_uuid(),
  ilan uuid not null references public.ilanlar on delete cascade,
  alici uuid not null references auth.users on delete cascade default auth.uid(),
  satici uuid not null references auth.users on delete cascade,
  olusturma timestamptz not null default now(),
  unique (ilan, alici),
  check (alici <> satici)
);

create table public.mesajlar (
  id uuid primary key default gen_random_uuid(),
  sohbet uuid not null references public.sohbetler on delete cascade,
  kimden uuid not null references auth.users on delete cascade default auth.uid(),
  tur text not null default 'metin' check (tur in ('metin', 'teklif', 'sistem')),
  metin text check (char_length(metin) <= 1000),
  tutar bigint check (tutar > 0),
  durum text check (durum in ('bekliyor', 'kabul', 'red')),
  zaman timestamptz not null default now()
);
create index mesajlar_sohbet on public.mesajlar (sohbet, zaman);

create table public.okundu (
  sohbet uuid not null references public.sohbetler on delete cascade,
  kullanici uuid not null references auth.users on delete cascade default auth.uid(),
  zaman timestamptz not null default now(),
  primary key (sohbet, kullanici)
);

create table public.kayitli_aramalar (
  id uuid primary key default gen_random_uuid(),
  sahip uuid not null references auth.users on delete cascade default auth.uid(),
  q text not null check (char_length(q) <= 500),
  ad text not null check (char_length(ad) <= 200),
  son timestamptz not null default now()
);

create table public.raporlar (
  id uuid primary key default gen_random_uuid(),
  sahip uuid not null references auth.users on delete cascade default auth.uid(),
  no text not null,
  form jsonb not null,
  sonuc jsonb not null,
  zaman timestamptz not null default now()
);

create table public.sikayetler (
  id uuid primary key default gen_random_uuid(),
  ilan uuid not null references public.ilanlar on delete cascade,
  kim uuid not null references auth.users on delete cascade default auth.uid(),
  neden text not null check (char_length(neden) <= 100),
  zaman timestamptz not null default now(),
  unique (ilan, kim)
);

-- ---------- RLS ----------
alter table public.profiller enable row level security;
alter table public.profil_ozel enable row level security;
alter table public.ilanlar enable row level security;
alter table public.favoriler enable row level security;
alter table public.sohbetler enable row level security;
alter table public.mesajlar enable row level security;
alter table public.okundu enable row level security;
alter table public.kayitli_aramalar enable row level security;
alter table public.raporlar enable row level security;
alter table public.sikayetler enable row level security;

create policy "profil herkese açık" on public.profiller for select using (true);
create policy "profil kendisi günceller" on public.profiller for update using (id = auth.uid()) with check (id = auth.uid());

create policy "özel bilgi sahibi okur" on public.profil_ozel for select using (id = auth.uid());
create policy "özel bilgi sahibi günceller" on public.profil_ozel for update using (id = auth.uid()) with check (id = auth.uid());

create policy "yayındaki ilanlar herkese, kendi ilanların sana" on public.ilanlar for select using (durum = 'yayinda' or durum = 'satildi' or sahip = auth.uid());
create policy "ilan ekle" on public.ilanlar for insert to authenticated with check (sahip = auth.uid());
create policy "ilan güncelle" on public.ilanlar for update to authenticated using (sahip = auth.uid()) with check (sahip = auth.uid());
create policy "ilan sil" on public.ilanlar for delete to authenticated using (sahip = auth.uid());

create policy "favori kendi" on public.favoriler for all to authenticated using (kullanici = auth.uid()) with check (kullanici = auth.uid());

create policy "sohbet taraflar" on public.sohbetler for select to authenticated using (auth.uid() in (alici, satici));
create policy "sohbet başlat" on public.sohbetler for insert to authenticated with check (
  alici = auth.uid() and satici = (select sahip from public.ilanlar where id = ilan));

create policy "mesaj taraflar okur" on public.mesajlar for select to authenticated using (
  exists (select 1 from public.sohbetler s where s.id = sohbet and auth.uid() in (s.alici, s.satici)));
create policy "mesaj gönder" on public.mesajlar for insert to authenticated with check (
  kimden = auth.uid() and tur in ('metin', 'teklif')
  and (tur = 'metin' or (tutar is not null and durum = 'bekliyor'))
  and exists (select 1 from public.sohbetler s where s.id = sohbet and auth.uid() in (s.alici, s.satici)));

create policy "okundu kendi" on public.okundu for all to authenticated using (kullanici = auth.uid()) with check (kullanici = auth.uid());
create policy "kayıtlı arama kendi" on public.kayitli_aramalar for all to authenticated using (sahip = auth.uid()) with check (sahip = auth.uid());
create policy "rapor kendi" on public.raporlar for all to authenticated using (sahip = auth.uid()) with check (sahip = auth.uid());
create policy "şikayet gönder" on public.sikayetler for insert to authenticated with check (kim = auth.uid());

-- ---------- Tetikleyiciler ve fonksiyonlar ----------
-- Yeni üye: profil satırları (ad ve telefon kayıt sırasında metadata ile gelir)
create or replace function public.yeni_uye() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiller (id, ad) values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'ad'), ''), 'Üye'));
  insert into public.profil_ozel (id, tel, ileti) values (new.id, nullif(new.raw_user_meta_data->>'tel', ''), coalesce((new.raw_user_meta_data->>'ileti')::boolean, false));
  return new;
end $$;
create trigger yeni_uye_tetik after insert on auth.users for each row execute function public.yeni_uye();

create or replace function public.ilan_guncelleme() returns trigger language plpgsql as $$
begin
  new.guncelleme := now(); new.no := old.no; new.sahip := old.sahip; new.goruntulenme := old.goruntulenme; new.olusturma := old.olusturma;
  return new;
end $$;
create trigger ilan_guncelleme_tetik before update on public.ilanlar for each row execute function public.ilan_guncelleme();

-- Görüntülenme sayacı (sahibi saymaz)
create or replace function public.ilan_goruntule(p_ilan uuid) returns void language sql security definer set search_path = public as $$
  update public.ilanlar set goruntulenme = goruntulenme + 1
  where id = p_ilan and durum = 'yayinda' and sahip is distinct from auth.uid();
$$;

-- Teklif yanıtı: yalnız satıcı, bekleyen ve 48 saati geçmemiş teklif
create or replace function public.teklif_yanitla(p_mesaj uuid, p_kabul boolean) returns void language plpgsql security definer set search_path = public as $$
declare m public.mesajlar; s public.sohbetler;
begin
  select * into m from public.mesajlar where id = p_mesaj for update;
  select * into s from public.sohbetler where id = m.sohbet;
  if m.id is null or s.satici <> auth.uid() or m.tur <> 'teklif' or m.durum <> 'bekliyor' or m.zaman < now() - interval '48 hours' then
    raise exception 'teklif yanıtlanamaz';
  end if;
  update public.mesajlar set durum = case when p_kabul then 'kabul' else 'red' end where id = p_mesaj;
  insert into public.mesajlar (sohbet, kimden, tur, metin) values (m.sohbet, auth.uid(), 'sistem',
    to_char(m.tutar, 'FM999G999G999G999') || ' TL teklif ' || case when p_kabul then 'kabul edildi. Görüşme ve teslim için buradan konuşun.' else 'reddedildi.' end);
end $$;

-- Hesabı sil (auth kullanıcısı silinince tüm satırlar cascade ile gider)
create or replace function public.hesabimi_sil() returns void language plpgsql security definer set search_path = public, auth as $$
begin
  delete from storage.objects where bucket_id = 'ilan-fotolari' and (storage.foldername(name))[1] = auth.uid()::text;
  delete from auth.users where id = auth.uid();
end $$;

-- Favori sayısı (satıcının istatistiği için, yalnız kendi ilanları)
create or replace function public.favori_sayilari() returns table (ilan uuid, sayi int) language sql security definer set search_path = public as $$
  select f.ilan, count(*)::int from public.favoriler f join public.ilanlar i on i.id = f.ilan where i.sahip = auth.uid() group by f.ilan;
$$;

revoke all on function public.ilan_goruntule(uuid), public.teklif_yanitla(uuid, boolean), public.hesabimi_sil(), public.favori_sayilari() from public, anon;
grant execute on function public.ilan_goruntule(uuid) to anon, authenticated;
grant execute on function public.teklif_yanitla(uuid, boolean), public.hesabimi_sil(), public.favori_sayilari() to authenticated;

-- Canlı mesajlar
alter publication supabase_realtime add table public.mesajlar;

-- ---------- Fotoğraf deposu ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ilan-fotolari', 'ilan-fotolari', true, 3145728, array['image/jpeg', 'image/png', 'image/webp']);
create policy "foto yükle (kendi klasörü)" on storage.objects for insert to authenticated
  with check (bucket_id = 'ilan-fotolari' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "foto sil (kendi klasörü)" on storage.objects for delete to authenticated
  using (bucket_id = 'ilan-fotolari' and (storage.foldername(name))[1] = auth.uid()::text);
