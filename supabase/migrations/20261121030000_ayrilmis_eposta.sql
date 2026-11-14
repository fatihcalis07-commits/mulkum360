-- 14.6 (kullanıcı onayı 14.11): yönetici adresi e-posta/şifreyle YENİDEN KAYDEDİLEMEZ.
-- Tetik yalnız INSERT'e bakar: mevcut hesap(ler) ve girişler etkilenmez; Google ile kayıt her zaman serbest
-- (Google, posta kutusunun gerçek sahibini doğrular). Amaç: hesap silinirse adresi kapmanın kimse
-- e-posta/şifre kaydıyla yönetici olamasın — Pollinations bütçesi ve Yönetim Paneli koruması.
create or replace function public.ayrilmis_eposta() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(coalesce(new.email, '')) = 'fatihcalis07@gmail.com' and coalesce(new.raw_app_meta_data->>'provider', 'email') <> 'google' then
    raise exception 'Bu e-posta yalnız Google ile kullanılabilir';
  end if;
  return new;
end $$;

drop trigger if exists ayrilmis_eposta_tetik on auth.users;
create trigger ayrilmis_eposta_tetik before insert on auth.users for each row execute function public.ayrilmis_eposta();
