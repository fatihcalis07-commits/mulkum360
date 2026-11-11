create or replace function public.baslik_buyut(t text) returns text language plpgsql immutable as $$
declare w text; s text := ''; on_ek text; h text;
begin
  if t is null then return null; end if;
  foreach w in array regexp_split_to_array(t, ' ') loop
    on_ek := coalesce(substring(w from '^[^[:alpha:][:digit:]]*'), '');
    h := substr(w, length(on_ek) + 1, 1);
    if h <> '' then
      w := on_ek || case h when 'i' then 'İ' when 'ı' then 'I' when 'ş' then 'Ş' when 'ğ' then 'Ğ' when 'ü' then 'Ü' when 'ö' then 'Ö' when 'ç' then 'Ç' else upper(h) end || substr(w, length(on_ek) + 2);
    end if;
    s := s || case when s = '' then '' else ' ' end || w;
  end loop;
  return s;
end $$;
select public.baslik_buyut('"kadıköy 3+1" aramana 2 yeni ilan') b, public.baslik_buyut('İlanın Onaylandı ve Yayında') a;
