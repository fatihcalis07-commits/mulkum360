-- Bildirim başlıkları: her kelimenin baş harfi büyük (bağlaçlar dahil). Türkçe i → İ, ı → I. Kelimenin geri kalanına dokunulmaz.
create or replace function public.baslik_buyut(t text) returns text language plpgsql immutable as $$
declare w text; s text := '';
begin
  if t is null then return null; end if;
  foreach w in array regexp_split_to_array(t, ' ') loop
    if w <> '' then
      w := case left(w, 1) when 'i' then 'İ' when 'ı' then 'I' when 'ş' then 'Ş' when 'ğ' then 'Ğ' when 'ü' then 'Ü' when 'ö' then 'Ö' when 'ç' then 'Ç' else upper(left(w, 1)) end || substr(w, 2);
    end if;
    s := s || case when s = '' then '' else ' ' end || w;
  end loop;
  return s;
end $$;
create or replace function public.bildirim_baslik_duzelt() returns trigger language plpgsql as $$
begin new.baslik := public.baslik_buyut(new.baslik); return new; end $$;
drop trigger if exists bildirimler_baslik on public.bildirimler;
create trigger bildirimler_baslik before insert or update of baslik on public.bildirimler for each row execute function public.bildirim_baslik_duzelt();
update public.bildirimler set baslik = baslik where baslik <> public.baslik_buyut(baslik);
select public.baslik_buyut('İlanın Onaylandı ve Yayında') a, public.baslik_buyut('"Kadıköy 3+1" aramana 2 yeni ilan') b;
