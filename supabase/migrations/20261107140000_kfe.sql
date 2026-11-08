-- TCMB Konut Fiyat Endeksi (aylık, 2017=100): Türkiye (TR) ve 26 İBBS-2 bölgesi. Herkes okur.
create table if not exists public.kfe (
  bolge text not null,
  donem date not null,
  deger numeric(10,2) not null,
  primary key (bolge, donem)
);
alter table public.kfe enable row level security;
drop policy if exists "kfe herkes okur" on public.kfe;
create policy "kfe herkes okur" on public.kfe for select using (true);
-- Her ayın 22'si 06:30 UTC (TCMB KFE ayın üçüncü haftası yayımlanır)
select cron.unschedule('evds-kfe') where exists (select 1 from cron.job where jobname = 'evds-kfe');
select cron.schedule('evds-kfe', '30 6 22 * *', $$select net.http_post(url := 'https://klnabwqduyavaqmbzxpo.supabase.co/functions/v1/evds-kfe', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 120000)$$);
