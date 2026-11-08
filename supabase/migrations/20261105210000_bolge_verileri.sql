-- Bölge demografik/sosyal verileri (resmî kaynaktan, örn. TÜİK ADNKS). Herkes okur, yalnız yönetici yazar.
create table public.bolge_verileri (
  id uuid primary key default gen_random_uuid(),
  il text not null,
  ilce text not null default '',
  yil int not null check (yil between 2000 and 2100),
  kaynak text not null check (char_length(kaynak) between 3 and 200),
  nufus int check (nufus >= 0),
  yas_ortanca numeric(4,1),
  hane_buyuklugu numeric(3,1),
  erkek_orani numeric(4,1),
  universite_orani numeric(4,1),
  okuryazar_orani numeric(4,1),
  nufus_artisi numeric(5,1),
  notlar text check (char_length(notlar) <= 500),
  guncelleme timestamptz not null default now(),
  unique (il, ilce, yil)
);
alter table public.bolge_verileri enable row level security;
create policy "bölge verisi herkese açık" on public.bolge_verileri for select using (true);
create policy "yönetici bölge verisi ekler" on public.bolge_verileri for insert to authenticated with check (public.yonetici());
create policy "yönetici bölge verisi günceller" on public.bolge_verileri for update to authenticated using (public.yonetici()) with check (public.yonetici());
create policy "yönetici bölge verisi siler" on public.bolge_verileri for delete to authenticated using (public.yonetici());
