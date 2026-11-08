-- Emlak ofisi rozeti: Taşınmaz Ticareti Yetki Belgesi numarası (üye beyanı, profilde görünür)
alter table public.profiller add column if not exists yetki_no text check (char_length(yetki_no) <= 20);
