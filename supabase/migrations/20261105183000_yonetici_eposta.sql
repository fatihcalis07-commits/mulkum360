-- Kullanıcı isteği: yönetici adresi e-posta/şifre ile de girebilsin.
drop trigger if exists ayrilmis_eposta_tetik on auth.users;
drop function if exists public.ayrilmis_eposta();
create or replace function public.yonetici() returns boolean language sql stable as $$
  select lower(coalesce(auth.jwt()->>'email', '')) = 'fatihcalis07@gmail.com';
$$;
