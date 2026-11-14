-- 14.14: telefonda üretilen videolar (fotoğraf turu, konuma iniş) "Hazırladığın videolar" listesine kaydedilir;
-- eklenmeyen hazır videolar 30 gün sonra gece temizliğiyle silinir (dosyalar video-temizle fonksiyonuyla).
alter table public.video_isleri drop constraint if exists video_isleri_tur_check;
alter table public.video_isleri add constraint video_isleri_tur_check check (tur in ('drone', 'video', 'tur', 'inis', 'foto'));
update storage.buckets set allowed_mime_types = array['video/mp4', 'video/webm', 'audio/wav'] where id = 'ilan-videolari';
do $$ begin perform cron.unschedule('video-temizle'); exception when others then null; end $$;
select cron.schedule('video-temizle', '10 2 * * *', $c$select net.http_post(url := 'https://klnabwqduyavaqmbzxpo.supabase.co/functions/v1/video-temizle', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 120000)$c$);
