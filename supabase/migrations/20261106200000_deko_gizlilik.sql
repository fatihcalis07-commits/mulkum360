-- MülkümDeko günlük sayacı (görsel üretimi metin sohbetinden ayrı sınırlanır)
alter table public.ai_kullanim add column if not exists deko_sayi int not null default 0;
create or replace function public.deko_hak_kullan(p_sinir int default 12) returns boolean language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if auth.uid() is null then return false; end if;
  insert into public.ai_kullanim (kullanici) values (auth.uid()) on conflict do nothing;
  update public.ai_kullanim set deko_sayi = deko_sayi + 1
   where kullanici = auth.uid() and gun = (now() at time zone 'Europe/Istanbul')::date and deko_sayi < p_sinir
   returning deko_sayi into v;
  return v is not null;
end $$;
revoke all on function public.deko_hak_kullan(int) from public, anon;
grant execute on function public.deko_hak_kullan(int) to authenticated;

-- Profil gizliliği: soyadı yalnız baş harfiyle görünsün mü; telefon herkese açık gösterilsin mi
alter table public.profiller add column if not exists soyad_gizle boolean not null default false;
alter table public.profiller add column if not exists acik_tel text check (acik_tel ~ '^05[0-9]{9}$');
