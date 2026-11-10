update public.ilanlar set alanlar = alanlar || '{"enlem":36.622115,"boylam":29.115338}'::jsonb where durum='yayinda' and ana='vasita' and il='Muğla' and ilce='Fethiye' and not (alanlar ? 'enlem');
