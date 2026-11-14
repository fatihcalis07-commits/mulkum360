-- 14.11: uzaydan konuma iniş videosu (telefonda üretilir, 1 kredi). İş satırı yalnız kredi kaydı içindir.
alter table public.video_isleri drop constraint if exists video_isleri_tur_check;
alter table public.video_isleri add constraint video_isleri_tur_check check (tur in ('drone', 'video', 'tur', 'inis'));
