-- 14.4: MülkümVideo çok odalı tur. Tek iş satırı (tur='tur'), klipler parcalar sütununda: [{foto, is_no, model, url}]
alter table public.video_isleri drop constraint if exists video_isleri_tur_check;
alter table public.video_isleri add constraint video_isleri_tur_check check (tur in ('drone', 'video', 'tur'));
alter table public.video_isleri add column if not exists parcalar jsonb;
