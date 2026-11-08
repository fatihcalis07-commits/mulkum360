-- Seçim sonuçları (YSK, resmî) ve yaş grupları (TÜİK). Herkes okur, yalnız yönetici yazar.
create table public.secim_sonuclari (
  id uuid primary key default gen_random_uuid(),
  il text not null,
  ilce text not null default '',
  yil int not null check (yil between 1990 and 2100),
  tur text not null check (tur in ('Belediye Başkanlığı', 'Belediye Meclis Üyeliği', 'Milletvekili', 'Cumhurbaşkanlığı')),
  parti text not null check (char_length(parti) between 1 and 60),
  oy_orani numeric(5,2) not null check (oy_orani between 0 and 100),
  kaynak text not null default 'YSK',
  unique (il, ilce, yil, tur, parti)
);
alter table public.secim_sonuclari enable row level security;
create policy "seçim herkese açık" on public.secim_sonuclari for select using (true);
create policy "yönetici seçim yazar" on public.secim_sonuclari for all to authenticated using (public.yonetici()) with check (public.yonetici());

alter table public.bolge_verileri add column if not exists yas_0_19 numeric(4,1);
alter table public.bolge_verileri add column if not exists yas_20_39 numeric(4,1);
alter table public.bolge_verileri add column if not exists yas_40_59 numeric(4,1);
alter table public.bolge_verileri add column if not exists yas_60 numeric(4,1);
