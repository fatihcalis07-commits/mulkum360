-- Rapordaki danışman sayfası için isteğe bağlı profil alanları (herkese açık profil)
alter table public.profiller add column if not exists firma text check (char_length(firma) <= 80);
alter table public.profiller add column if not exists unvan text check (char_length(unvan) <= 80);
alter table public.profiller add column if not exists hakkinda text check (char_length(hakkinda) <= 1500);
alter table public.profiller add column if not exists slogan text check (char_length(slogan) <= 120);
