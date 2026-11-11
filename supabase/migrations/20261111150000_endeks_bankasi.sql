-- Mülküm360 Endeks Bankası: emlak ve otomobil için son 10 yıl (2016+) aylık/çeyreklik seriler.
-- Kaynak: TCMB EVDS (KFE, YKFE, YOKFE, konut birim fiyat ve kira, TÜFE alt kalemleri, döviz) + kendi ilanlarımızın aylık özeti.
-- endeks-topla edge fonksiyonu yazar (service role); herkes okur.
create table if not exists public.endeks_seri (
  kod text primary key,
  kategori text not null check (kategori in ('emlak', 'otomobil', 'genel')),
  ad text not null,
  birim text,               -- 'endeks', 'TL/m²', 'TL/m²/ay', 'adet', 'TL'
  siklik text not null default 'aylık',
  kaynak text not null,
  il_bazli boolean not null default false
);
create table if not exists public.endeks_veri (
  kod text not null references public.endeks_seri on delete cascade,
  bolge text not null default 'TR',   -- 'TR' ya da il adı
  donem date not null,                -- ayın / çeyreğin ilk günü
  deger numeric not null,
  primary key (kod, bolge, donem)
);
create index if not exists endeks_veri_bolge on public.endeks_veri (bolge, kod, donem);
alter table public.endeks_seri enable row level security;
alter table public.endeks_veri enable row level security;
drop policy if exists "endeks seri herkes okur" on public.endeks_seri;
create policy "endeks seri herkes okur" on public.endeks_seri for select using (true);
drop policy if exists "endeks veri herkes okur" on public.endeks_veri;
create policy "endeks veri herkes okur" on public.endeks_veri for select using (true);

insert into public.endeks_seri (kod, kategori, ad, birim, siklik, kaynak, il_bazli) values
  ('TP.KFE.TR', 'emlak', 'Konut fiyat endeksi', 'endeks', 'aylık', 'TCMB', false),
  ('TP.YKFE.TR', 'emlak', 'Yeni konutlar fiyat endeksi', 'endeks', 'aylık', 'TCMB', false),
  ('TP.YOKFEND.TR', 'emlak', 'Yeni olmayan konutlar fiyat endeksi', 'endeks', 'aylık', 'TCMB', false),
  ('BIRIMFIYAT', 'emlak', 'Konut birim fiyatı', 'TL/m²', 'çeyreklik', 'TCMB değerleme raporları', true),
  ('BK', 'emlak', 'Konut birim kirası', 'TL/m²/ay', 'çeyreklik', 'TCMB değerleme raporları', true),
  ('TP.TUKFIY2025.04110', 'emlak', 'Kira fiyatları (TÜFE)', 'endeks', 'aylık', 'TÜİK / TCMB', false),
  ('TP.AKONUTSAT1.KTRTOPLAM', 'emlak', 'Konut satışları', 'adet', 'aylık', 'TÜİK / TCMB', false),
  ('TP.TUKFIY2025.07111', 'otomobil', 'Sıfır motorlu taşıt fiyatları', 'endeks', 'aylık', 'TÜİK / TCMB', false),
  ('TP.TUKFIY2025.071', 'otomobil', 'Araç satın alma fiyatları', 'endeks', 'aylık', 'TÜİK / TCMB', false),
  ('TP.TUKFIY2025.0722', 'otomobil', 'Akaryakıt ve yağ fiyatları', 'endeks', 'aylık', 'TÜİK / TCMB', false),
  ('TP.TUKFIY2025.0723', 'otomobil', 'Bakım ve onarım fiyatları', 'endeks', 'aylık', 'TÜİK / TCMB', false),
  ('TP.TUKFIY2025.07211', 'otomobil', 'Lastik fiyatları', 'endeks', 'aylık', 'TÜİK / TCMB', false),
  ('TP.TUKFIY2025.07244', 'otomobil', 'Araç kiralama fiyatları', 'endeks', 'aylık', 'TÜİK / TCMB', false),
  ('TP.TUKFIY2025.GENEL', 'genel', 'Tüketici fiyat endeksi (genel)', 'endeks', 'aylık', 'TÜİK / TCMB', false),
  ('TP.DK.USD.S.YTL', 'genel', 'ABD doları (aylık ortalama)', 'TL', 'aylık', 'TCMB', false),
  ('TP.DK.EUR.S.YTL', 'genel', 'Euro (aylık ortalama)', 'TL', 'aylık', 'TCMB', false),
  ('M360.KONUT.M2', 'emlak', 'Mülküm360 satılık konut m² ortancası', 'TL/m²', 'aylık', 'Mülküm360 ilanları', true),
  ('M360.KONUT.KIRA.M2', 'emlak', 'Mülküm360 kiralık konut m² ortancası', 'TL/m²/ay', 'aylık', 'Mülküm360 ilanları', true),
  ('M360.OTOMOBIL.FIYAT', 'otomobil', 'Mülküm360 otomobil ilan fiyatı ortancası', 'TL', 'aylık', 'Mülküm360 ilanları', false)
on conflict (kod) do update set ad = excluded.ad, birim = excluded.birim, siklik = excluded.siklik, kaynak = excluded.kaynak, il_bazli = excluded.il_bazli, kategori = excluded.kategori;

-- Kendi ilanlarımızın bu ayki özeti (test ilanları hariç, en az 3 ilan olan iller). Her ay çalışır; geçmişi biriktirir.
create or replace function public.endeks_ilan_ozeti() returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; ay date := date_trunc('month', now())::date;
begin
  with k as (
    select il, (fiyat / nullif((alanlar->>'m2net')::numeric, 0)) as m2, alanlar->>'islem' as islem
    from public.ilanlar where durum = 'yayinda' and not coalesce(ornek, false) and ana = 'emlak' and alt = 'konut'
      and coalesce(alanlar->>'m2net', '') ~ '^[0-9]+(\.[0-9]+)?$' and (alanlar->>'m2net')::numeric between 20 and 1000 and fiyat > 0
  ), o as (
    select case when islem = 'Kiralık' then 'M360.KONUT.KIRA.M2' else 'M360.KONUT.M2' end as kod, il, percentile_cont(0.5) within group (order by m2) as d, count(*) as c
    from k where islem in ('Satılık', 'Kiralık') group by 1, 2 having count(*) >= 3
    union all
    select case when islem = 'Kiralık' then 'M360.KONUT.KIRA.M2' else 'M360.KONUT.M2' end, 'TR', percentile_cont(0.5) within group (order by m2), count(*)
    from k where islem in ('Satılık', 'Kiralık') group by 1 having count(*) >= 3
    union all
    select 'M360.OTOMOBIL.FIYAT', 'TR', percentile_cont(0.5) within group (order by fiyat), count(*)
    from public.ilanlar where durum = 'yayinda' and not coalesce(ornek, false) and ana = 'vasita' and alt in ('otomobil', 'suv', 'elektrikli') and fiyat > 0 having count(*) >= 3
  )
  insert into public.endeks_veri (kod, bolge, donem, deger) select kod, il, ay, round(d::numeric, 2) from o where d is not null
  on conflict (kod, bolge, donem) do update set deger = excluded.deger;
  get diagnostics n = row_count; return n;
end $$;
revoke all on function public.endeks_ilan_ozeti() from public, anon, authenticated;

insert into public.veri_kaynaklari (kod, ad, url, siklik, lisans) values
  ('endeks-topla', 'Mülküm360 Endeks Bankası (TCMB EVDS: KFE/YKFE/YOKFE, konut birim fiyat ve kira, TÜFE araç kalemleri, döviz)', 'https://evds3.tcmb.gov.tr/igmevdsms-dis/', 'aylık', 'TCMB/TÜİK açık veri; kaynak gösterimi zorunlu')
on conflict (kod) do nothing;

-- Aylık toplama: her ayın 23'ü (TCMB/TÜİK yayınlarından sonra) + kendi ilan özetimiz her ayın 1'i ve 15'i
select cron.unschedule('endeks-topla') where exists (select 1 from cron.job where jobname = 'endeks-topla');
select cron.schedule('endeks-topla', '45 6 23 * *', $$select net.http_post(url := 'https://klnabwqduyavaqmbzxpo.supabase.co/functions/v1/endeks-topla', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 150000)$$);
select cron.unschedule('endeks-ilan-ozeti') where exists (select 1 from cron.job where jobname = 'endeks-ilan-ozeti');
select cron.schedule('endeks-ilan-ozeti', '20 3 1,15 * *', $$select public.endeks_ilan_ozeti()$$);
