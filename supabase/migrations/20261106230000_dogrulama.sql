-- Doğrulama: emlak ofisi (yetki belgesi) ve ilan (tapu) yönetici onayıyla işaretlenir; üye kendi işaretleyemez.
alter table public.profiller add column if not exists dogrulanmis boolean not null default false;
alter table public.ilanlar add column if not exists dogrulanmis boolean not null default false;

create or replace function public.dogrulama_koru() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.yonetici() then return new; end if;
  if tg_op = 'INSERT' then new.dogrulanmis := false;
  elsif new.dogrulanmis is distinct from old.dogrulanmis then new.dogrulanmis := old.dogrulanmis; end if;
  return new;
end $$;
drop trigger if exists profiller_dogrulama_koru on public.profiller;
create trigger profiller_dogrulama_koru before insert or update on public.profiller for each row execute function public.dogrulama_koru();
drop trigger if exists ilanlar_dogrulama_koru on public.ilanlar;
create trigger ilanlar_dogrulama_koru before insert or update on public.ilanlar for each row execute function public.dogrulama_koru();

create table if not exists public.dogrulama_talepleri (
  id uuid primary key default gen_random_uuid(),
  sahip uuid not null references auth.users on delete cascade default auth.uid(),
  tur text not null check (tur in ('emlakci', 'ilan')),
  ilan uuid references public.ilanlar on delete cascade,
  notu text check (char_length(notu) <= 500),
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'onay', 'red')),
  olusturma timestamptz not null default now()
);
create unique index if not exists dogrulama_tek_bekleyen on public.dogrulama_talepleri (sahip, tur, coalesce(ilan, '00000000-0000-0000-0000-000000000000'::uuid)) where durum = 'bekliyor';
alter table public.dogrulama_talepleri enable row level security;
drop policy if exists "talep sahibi okur" on public.dogrulama_talepleri;
create policy "talep sahibi okur" on public.dogrulama_talepleri for select to authenticated using (sahip = auth.uid() or public.yonetici());
drop policy if exists "talep sahibi açar" on public.dogrulama_talepleri;
create policy "talep sahibi açar" on public.dogrulama_talepleri for insert to authenticated
  with check (sahip = auth.uid() and durum = 'bekliyor' and (ilan is null or exists (select 1 from public.ilanlar i where i.id = ilan and i.sahip = auth.uid())));

-- Yönetici kararı: talebi kapatır ve ilgili işareti koyar/kaldırır
create or replace function public.dogrulama_karar(p_talep uuid, p_onay boolean) returns void language plpgsql security definer set search_path = public as $$
declare t public.dogrulama_talepleri;
begin
  if not public.yonetici() then raise exception 'yetki yok'; end if;
  select * into t from public.dogrulama_talepleri where id = p_talep for update;
  if not found then raise exception 'talep yok'; end if;
  update public.dogrulama_talepleri set durum = case when p_onay then 'onay' else 'red' end where id = p_talep;
  if t.tur = 'emlakci' then update public.profiller set dogrulanmis = p_onay where id = t.sahip;
  else update public.ilanlar set dogrulanmis = p_onay where id = t.ilan; end if;
end $$;
revoke all on function public.dogrulama_karar(uuid, boolean) from public, anon;
grant execute on function public.dogrulama_karar(uuid, boolean) to authenticated;
