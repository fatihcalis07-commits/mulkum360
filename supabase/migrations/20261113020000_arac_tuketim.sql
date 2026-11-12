-- Araç yakıt tüketimi: Avrupa Çevre Ajansı (EEA) yeni araç CO2 izleme veri seti, CC BY 4.0
-- tur: 'olcum' = resmî WLTP tüketim değeri; 'wltp-co2' / 'nedc-co2' = resmî CO2 değerinden standart katsayıyla hesaplanan
create table if not exists public.arac_tuketim (
  marka text not null,
  model text not null,
  yakit text not null,
  motor text not null,
  yil smallint not null,
  tuketim numeric(4,1) not null check (tuketim > 0 and tuketim < 40),
  en numeric(4,1),
  ek numeric(4,1),
  tur text not null default 'olcum',
  n integer not null default 1,
  primary key (marka, model, yakit, motor, yil)
);
create index if not exists arac_tuketim_ara on public.arac_tuketim (marka, model, yil);
alter table public.arac_tuketim enable row level security;
drop policy if exists "tüketim herkese açık" on public.arac_tuketim;
create policy "tüketim herkese açık" on public.arac_tuketim for select using (true);
