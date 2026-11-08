-- Kategori ağacı genişledi: emlak ve vasıta alt kategorileri.
alter table public.ilanlar drop constraint if exists ilanlar_alt_check;
alter table public.ilanlar add constraint ilanlar_alt_check check (alt in (
  'konut', 'isyeri', 'arsa', 'proje', 'bina', 'devremulk', 'turistik', 'yazlik',
  'otomobil', 'suv', 'elektrikli', 'motor', 'minivan', 'ticari', 'kiralik', 'deniz', 'hasarli', 'karavan', 'klasik'));
