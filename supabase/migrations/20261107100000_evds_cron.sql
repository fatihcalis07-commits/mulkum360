-- Her gün 09:15 (TR, 06:15 UTC) evds-kredi fonksiyonunu çağırır.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('evds-kredi') where exists (select 1 from cron.job where jobname = 'evds-kredi');
select cron.schedule('evds-kredi', '15 6 * * *', $$select net.http_post(url := 'https://klnabwqduyavaqmbzxpo.supabase.co/functions/v1/evds-kredi', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb)$$);
