-- Test ilanları: uygulamada "Test ilanı" etiketiyle görünür, tek seferde silinebilir.
alter table public.ilanlar add column if not exists ornek boolean not null default false;
