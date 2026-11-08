-- Yönetici: fatihcalis07@gmail.com, yalnız Google ile girildiğinde (Google e-postayı doğrular).
-- Bu adres e-posta/şifre ile kaydedilemez; böylece başkası adresi alıp yönetici olamaz.
create or replace function public.yonetici() returns boolean language sql stable as $$
  select lower(coalesce(auth.jwt()->>'email', '')) = 'fatihcalis07@gmail.com'
     and coalesce((auth.jwt()->'app_metadata'->'providers') ? 'google', false);
$$;
grant execute on function public.yonetici() to anon, authenticated;

create or replace function public.ayrilmis_eposta() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(coalesce(new.email, '')) = 'fatihcalis07@gmail.com' and coalesce(new.raw_app_meta_data->>'provider', 'email') <> 'google' then
    raise exception 'Bu e-posta yalnız Google ile kullanılabilir';
  end if;
  return new;
end $$;
create trigger ayrilmis_eposta_tetik before insert on auth.users for each row execute function public.ayrilmis_eposta();

-- Google kullanıcısının adı metadata'da full_name/name olarak gelir
create or replace function public.yeni_uye() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiller (id, ad) values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'ad'), ''), nullif(trim(new.raw_user_meta_data->>'full_name'), ''), nullif(trim(new.raw_user_meta_data->>'name'), ''), 'Üye'), 80));
  insert into public.profil_ozel (id, tel, ileti) values (new.id, nullif(new.raw_user_meta_data->>'tel', ''), coalesce((new.raw_user_meta_data->>'ileti')::boolean, false));
  return new;
end $$;

create policy "yönetici tüm ilanları görür" on public.ilanlar for select to authenticated using (public.yonetici());
create policy "yönetici ilan durumunu değiştirir" on public.ilanlar for update to authenticated using (public.yonetici()) with check (public.yonetici());
create policy "yönetici şikayetleri görür" on public.sikayetler for select to authenticated using (public.yonetici());
create policy "yönetici şikayet kapatır" on public.sikayetler for delete to authenticated using (public.yonetici());
create policy "yönetici profilleri görür" on public.profil_ozel for select to authenticated using (public.yonetici());
