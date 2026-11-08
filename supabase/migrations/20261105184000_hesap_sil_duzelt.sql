-- Depo tablosundan doğrudan silme yasak; fotoğrafları uygulama Storage API ile siler, bu fonksiyon yalnız hesabı siler.
create or replace function public.hesabimi_sil() returns void language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.hesabimi_sil() from public, anon;
grant execute on function public.hesabimi_sil() to authenticated;
