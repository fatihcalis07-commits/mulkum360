-- Davet ödülü artık her hesap türüne açık (bireysel, emlak ofisi, galeri): ilk 7 gün, bir kez; davet eden ayda en çok 10 ödül.
create or replace function public.davet_kullan(p_kod text) returns json language plpgsql security definer set search_path = public as $$
declare v_eden uuid; v_ben uuid := auth.uid(); v_olusturma timestamptz; v_ay int; v_kredi int;
begin
  if v_ben is null then raise exception 'giriş gerekli'; end if;
  if exists (select 1 from public.davetler where davet_edilen = v_ben) then raise exception 'davet kodu zaten kullanıldı'; end if;
  select olusturma into v_olusturma from public.profiller where id = v_ben;
  if v_olusturma < now() - interval '7 days' then raise exception 'davet kodu yalnız üyeliğin ilk 7 gününde kullanılabilir'; end if;
  select id into v_eden from auth.users where upper(left(id::text, 8)) = upper(trim(p_kod)) limit 1;
  if v_eden is null then raise exception 'davet kodu bulunamadı'; end if;
  if v_eden = v_ben then raise exception 'kendi kodunu kullanamazsın'; end if;
  insert into public.davetler (davet_edilen, davet_eden) values (v_ben, v_eden);
  update public.profil_ozel set kredi = kredi + 3 where id = v_ben returning kredi into v_kredi;
  insert into public.kredi_hareketleri (kullanici, miktar, aciklama) values (v_ben, 3, 'Davet hediyesi');
  select count(*) into v_ay from public.davetler where davet_eden = v_eden and zaman > now() - interval '30 days';
  if v_ay <= 10 then
    update public.profil_ozel set kredi = kredi + 3 where id = v_eden;
    insert into public.kredi_hareketleri (kullanici, miktar, aciklama) values (v_eden, 3, 'Davet ödülü: davet ettiğin kişi katıldı');
  end if;
  return json_build_object('kredi', v_kredi);
end $$;
revoke all on function public.davet_kullan(text) from public, anon;
grant execute on function public.davet_kullan(text) to authenticated;
