-- MülkümAI (Gemini) kullanım sayacı: kişi başı günlük sınır, ücretsiz kotayı korur.
create table public.ai_kullanim (
  kullanici uuid not null references auth.users on delete cascade,
  gun date not null default (now() at time zone 'Europe/Istanbul')::date,
  sayi int not null default 0,
  primary key (kullanici, gun)
);
alter table public.ai_kullanim enable row level security;
create policy "kullanım sahibi okur" on public.ai_kullanim for select to authenticated using (kullanici = auth.uid());

-- Sınır aşılmadıysa sayacı artırır ve true döner (Edge Function kullanıcı adına çağırır)
create or replace function public.ai_hak_kullan(p_sinir int default 30) returns boolean language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if auth.uid() is null then return false; end if;
  insert into public.ai_kullanim (kullanici) values (auth.uid()) on conflict do nothing;
  update public.ai_kullanim set sayi = sayi + 1
   where kullanici = auth.uid() and gun = (now() at time zone 'Europe/Istanbul')::date and sayi < p_sinir
   returning sayi into v;
  return v is not null;
end $$;
revoke all on function public.ai_hak_kullan(int) from public, anon;
grant execute on function public.ai_hak_kullan(int) to authenticated;
