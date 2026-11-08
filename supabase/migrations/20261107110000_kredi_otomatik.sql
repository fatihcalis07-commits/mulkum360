-- Otomatik (Gemini + Google Arama) teklifler elle girilenlerden ayrılır. Her gün 09:00 TR.
alter table public.banka_teklifleri add column if not exists otomatik boolean not null default false;
select cron.unschedule('kredi-guncelle') where exists (select 1 from cron.job where jobname = 'kredi-guncelle');
select cron.schedule('kredi-guncelle', '0 6 * * *', $$select net.http_post(url := 'https://klnabwqduyavaqmbzxpo.supabase.co/functions/v1/kredi-guncelle', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 300000)$$);
