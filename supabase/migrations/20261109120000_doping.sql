-- FAZ 4 (MODÜL 12+16): Doping sistemi + yönetim paneli — 6 tablo paketi
-- Durum: ONAY BEKLENİYOR — uygulanmadı. (Yalnız ADD: hiçbir mevcut tablo/sütun silinmez, yeniden adlandirilmez.)
-- Kalıplar mevcut yapıdan alındı: kredi_paketleri (herkese okuma + yonetici() yazma), kredi_satislari (talep/onay),
-- play-odeme edge ürün eşlemesi (play_urun kolonu → doping_paketleri.play_urun ile aynı desen).

-- 1) Doping türleri (6): sıralama/rozet davranışı tek yerden yönetilir
create table if not exists public.doping_turleri (
  kod text primary key,
  ad text not null,
  aciklama text not null default '',
  ikon text not null default 'yildiz',
  sira integer not null default 0,
  aktif boolean not null default true
);

-- 2) Paketler: fiyat VERİTABANINDA, sabit kod yok (kredi_paketleri kalıbı). Kampanya = indirim kolonları (ayrı tablo yok).
-- Fiyatlar 0 ve aktif=false tohumlanır: gerçek fiyatlar panelen girilip aktif edilmeden hiçbir paket satilamaz (dürüst varsayilan).
create table if not exists public.doping_paketleri (
  id text primary key,
  tur text not null references public.doping_turleri(kod),
  gun integer not null check (gun > 0),
  fiyat numeric not null default 0 check (fiyat >= 0),
  indirim_orani numeric check (indirim_orani is null or (indirim_orani >= 0 and indirim_orani < 1)),
  gecerlilik date,
  play_urun text unique,
  aktif boolean not null default false,
  sira integer not null default 0
);

-- 3) İlan-doping etkinliği: aralık sorgusuyla (durum='aktif' and baslangic<=now()<bitis)
-- anlik: başlangıçtaki {goruntulenme, favori} anlık görüntüsü — doping öncesi/sonrası karşılaştırması için
create table if not exists public.ilan_doping (
  id uuid primary key default gen_random_uuid(),
  ilan uuid not null references public.ilanlar(id) on delete cascade,
  tur text not null references public.doping_turleri(kod),
  paket text references public.doping_paketleri(id),
  baslangic timestamptz not null default now(),
  bitis timestamptz not null,
  durum text not null default 'aktif' check (durum in ('aktif','bitti','iptal')),
  anlik jsonb,
  check (bitis > baslangic)
);
create index if not exists ilan_doping_aktif on public.ilan_doping (tur, durum, bitis);
create index if not exists ilan_doping_ilan on public.ilan_doping (ilan, baslangic desc);

-- 4) Satışlar (kredi_satislari kalıbı): Play = otomatik onay (play-odeme genişletmesi), web/Play dışı = talep → panel onayı
create table if not exists public.doping_satislari (
  id uuid primary key default gen_random_uuid(),
  kullanici uuid not null default auth.uid(),
  ilan uuid references public.ilanlar(id) on delete set null,
  paket text references public.doping_paketleri(id),
  tutar numeric,
  yontem text not null default 'talep' check (yontem in ('play','talep')),
  durum text not null default 'bekliyor' check (durum in ('bekliyor','onaylandi','reddedildi')),
  siparis_no text,
  not_ text,
  play_token text,
  olusturma timestamptz not null default now(),
  onay_zamani timestamptz
);

-- 5) Fiyat geçmişi: "Fiyatı düşen" filtresi + doping öncesi/sonrası okuması.
-- Yazma YALNIZ tetikleyiciyle (ilan satis_fiyati değişince); istemci yazma politikası YOK.
create table if not exists public.ilan_fiyat_log (
  id bigint generated always as identity primary key,
  ilan uuid not null references public.ilanlar(id) on delete cascade,
  fiyat numeric not null,
  tarih timestamptz not null default now()
);
create index if not exists ilan_fiyat_log_idx on public.ilan_fiyat_log (ilan, tarih desc);

create or replace function public.ilan_fiyat_kayit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.satis_fiyati is distinct from old.satis_fiyati and new.satis_fiyati is not null then
    insert into ilan_fiyat_log (ilan, fiyat) values (new.id, new.satis_fiyati);
  end if;
  return new;
end $$;

drop trigger if exists ilan_fiyat_kayit on public.ilanlar;
create trigger ilan_fiyat_kayit after update of satis_fiyati on public.ilanlar for each row execute function public.ilan_fiyat_kayit();

-- 6) RLS
alter table public.doping_turleri enable row level security;
alter table public.doping_paketleri enable row level security;
alter table public.ilan_doping enable row level security;
alter table public.doping_satislari enable row level security;
alter table public.ilan_fiyat_log enable row level security;

create policy "doping tur herkes okur" on public.doping_turleri for select using (true);
create policy "doping tur yonetici yazar" on public.doping_turleri for all using (yonetici()) with check (yonetici());

create policy "doping paket herkes okur" on public.doping_paketleri for select using (true);
create policy "doping paket yonetici yazar" on public.doping_paketleri for all using (yonetici()) with check (yonetici());

-- Aktif doping herkese görünür: karttaki "Sponsorlu/Acil" rozeti zorunlu etikettir (reklam mevzuati → gizlenmez).
create policy "aktif doping herkese" on public.ilan_doping for select using (durum = 'aktif' or yonetici() or ilan in (select id from public.ilanlar where sahip = auth.uid()));
create policy "doping talep" on public.ilan_doping for insert with check (ilan in (select id from public.ilanlar where sahip = auth.uid()) or yonetici());
create policy "doping yonetici degistirir" on public.ilan_doping for update using (yonetici()) with check (yonetici());

create policy "doping satis sahip gorur" on public.doping_satislari for select using (kullanici = auth.uid() or yonetici());
create policy "doping satis talep" on public.doping_satislari for insert with check (kullanici = auth.uid() and yontem = 'talep');
create policy "doping satis yonetici onaylar" on public.doping_satislari for update using (yonetici()) with check (yonetici());

create policy "fiyat gecmisi herkese" on public.ilan_fiyat_log for select using (true);

-- 7) Tohum veriler (fiyatlar panelen doldurulacak; aktif=false başlar)
insert into public.doping_turleri (kod, ad, aciklama, ikon, sira) values
  ('guncel',          'Güncel Tut',       'İlanın aramada üst sıralarda güncel kalır',            'yildiz',   1),
  ('vitrin-arama',    'Vitrin Arama',     'Arama sonuçlarında vitrin kutusunda öne çıkar',        'vitrin',   2),
  ('vitrin-anasayfa', 'Vitrin Ana Sayfa', 'Ana sayfa vitrininde sergilenir',                      'vitrin',   3),
  ('ust-sira',        'Üst Sıra',         'Kendi kategori sıralamasında en üste taşınır',         'yukari',   4),
  ('vitrin-kategori', 'Vitrin Kategori',  'Kategori sayfası vitrininde yer alır',                 'vitrin',   5),
  ('acil',            'Acil',             'Kartta turuncu "Acil" rozeti + sıralama avantajı',     'zil',      6)
on conflict (kod) do nothing;

insert into public.doping_paketleri (id, tur, gun, sira, play_urun) values
  ('guncel_1','guncel',1,1,'doping_guncel_1'), ('guncel_7','guncel',7,2,'doping_guncel_7'), ('guncel_30','guncel',30,3,'doping_guncel_30'),
  ('vitrin_arama_7','vitrin-arama',7,4,'doping_vitrin_arama_7'), ('vitrin_arama_30','vitrin-arama',30,5,'doping_vitrin_arama_30'),
  ('vitrin_anasayfa_7','vitrin-anasayfa',7,6,'doping_vitrin_anasayfa_7'), ('vitrin_anasayfa_30','vitrin-anasayfa',30,7,'doping_vitrin_anasayfa_30'),
  ('ust_sira_1','ust-sira',1,8,'doping_ust_sira_1'), ('ust_sira_7','ust-sira',7,9,'doping_ust_sira_7'),
  ('vitrin_kategori_7','vitrin-kategori',7,10,'doping_vitrin_kategori_7'), ('vitrin_kategori_30','vitrin-kategori',30,11,'doping_vitrin_kategori_30'),
  ('acil_1','acil',1,12,'doping_acil_1'), ('acil_7','acil',7,13,'doping_acil_7')
on conflict (id) do nothing;

-- 8) Süre bitişi cron'u (uygulanırsa migrationla birlikte girilir; tekrar çalıştırılabilir)
select cron.unschedule('doping-bitis') where exists (select 1 from cron.job where jobname = 'doping-bitis');
select cron.schedule('doping-bitis', '*/30 * * * *',
  $$update public.ilan_doping set durum = 'bitti' where durum = 'aktif' and bitis <= now()$$);
