-- Kurumsal hesabın alanı: emlak ofisi ya da oto galeri (hesap_turu = 'ofis' olanlar için)
alter table public.profiller add column if not exists sektor text check (sektor in ('emlak', 'galeri'));
update public.profiller set sektor = 'emlak' where hesap_turu = 'ofis' and sektor is null;
