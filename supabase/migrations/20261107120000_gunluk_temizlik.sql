-- Her gece 03:30 TR: biriken geçici kayıtları siler (iş verisine dokunmaz).
-- cron geçmişi 7 gün, süresi dolmuş çevre önbelleği (30 gün), eski AI kullanım sayaçları (60 gün), 2 yıldan eski EVDS ortalamaları.
select cron.unschedule('gunluk-temizlik') where exists (select 1 from cron.job where jobname = 'gunluk-temizlik');
select cron.schedule('gunluk-temizlik', '30 0 * * *', $$
  delete from cron.job_run_details where end_time < now() - interval '7 days';
  delete from public.cevre_onbellek where olusturma < now() - interval '30 days';
  delete from public.ai_kullanim where gun < current_date - 60;
  delete from public.kredi_ortalama where donem < current_date - 730;
$$);
