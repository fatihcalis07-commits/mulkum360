-- MülkümDeko ücretli: her görsel 1 kredi. Kredi görsel üretilmeden önce düşer; üretim başarısız olursa iade edilir.
create or replace function public.deko_kredi_kullan() returns int language plpgsql security definer set search_path = public as $$
declare v_bakiye int;
begin
  if auth.uid() is null then raise exception 'giriş gerekli'; end if;
  select kredi into v_bakiye from public.profil_ozel where id = auth.uid() for update;
  if coalesce(v_bakiye, 0) < 1 then raise exception 'yetersiz kredi'; end if;
  update public.profil_ozel set kredi = kredi - 1 where id = auth.uid() returning kredi into v_bakiye;
  insert into public.kredi_hareketleri (kullanici, miktar, aciklama) values (auth.uid(), -1, 'MülkümDeko görseli');
  return v_bakiye;
end $$;

-- İade: yalnız son 10 dakikada düşülmüş ve henüz iade edilmemiş bir MülkümDeko kredisi için
create or replace function public.deko_kredi_iade() returns int language plpgsql security definer set search_path = public as $$
declare v_dus int; v_iade int; v_bakiye int;
begin
  if auth.uid() is null then raise exception 'giriş gerekli'; end if;
  select count(*) into v_dus from public.kredi_hareketleri where kullanici = auth.uid() and aciklama = 'MülkümDeko görseli' and zaman > now() - interval '10 minutes';
  select count(*) into v_iade from public.kredi_hareketleri where kullanici = auth.uid() and aciklama = 'MülkümDeko iadesi (görsel oluşturulamadı)' and zaman > now() - interval '10 minutes';
  if v_dus <= v_iade then return null; end if;
  update public.profil_ozel set kredi = kredi + 1 where id = auth.uid() returning kredi into v_bakiye;
  insert into public.kredi_hareketleri (kullanici, miktar, aciklama) values (auth.uid(), 1, 'MülkümDeko iadesi (görsel oluşturulamadı)');
  return v_bakiye;
end $$;
revoke all on function public.deko_kredi_kullan() from public, anon;
revoke all on function public.deko_kredi_iade() from public, anon;
grant execute on function public.deko_kredi_kullan() to authenticated;
grant execute on function public.deko_kredi_iade() to authenticated;
