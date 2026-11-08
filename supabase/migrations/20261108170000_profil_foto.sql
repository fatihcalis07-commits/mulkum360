alter table public.profiller add column if not exists foto text check (char_length(foto) <= 500);
