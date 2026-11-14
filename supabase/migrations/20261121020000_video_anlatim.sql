-- 14.5: çok odalı tur için sesli anlatım. ses = WAV dosyasının adresi; ses_durum = 'hazir' | 'hata' (bir kez denenir).
alter table public.video_isleri add column if not exists anlatim boolean not null default false;
alter table public.video_isleri add column if not exists ses text;
alter table public.video_isleri add column if not exists ses_durum text;
update storage.buckets set allowed_mime_types = array['video/mp4', 'audio/wav'] where id = 'ilan-videolari';
