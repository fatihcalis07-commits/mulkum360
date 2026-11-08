-- Gerçekleşen satış fiyatı (satıcı "satıldı" derken isteğe bağlı girer) ve resmî bölge göstergeleri.
alter table public.ilanlar add column if not exists satis_fiyati bigint check (satis_fiyati > 0);

create table public.bolge_gostergeleri (
  id uuid primary key default gen_random_uuid(),
  il text not null,
  ilce text not null default '',
  donem text not null check (char_length(donem) between 4 and 20),
  gosterge text not null check (char_length(gosterge) between 3 and 80),
  deger numeric not null,
  birim text check (char_length(birim) <= 20),
  kaynak text not null check (char_length(kaynak) between 2 and 120),
  guncelleme timestamptz not null default now(),
  unique (il, ilce, donem, gosterge)
);
alter table public.bolge_gostergeleri enable row level security;
create policy "gösterge herkese açık" on public.bolge_gostergeleri for select using (true);
create policy "yönetici gösterge yazar" on public.bolge_gostergeleri for all to authenticated using (public.yonetici()) with check (public.yonetici());
