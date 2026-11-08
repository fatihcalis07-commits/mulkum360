-- Emlakçı paneli: müşteri talepleri, görev/randevu ve notlar. Yalnız sahibi görür (RLS).
create table if not exists public.panel_kayit (
  id uuid primary key default gen_random_uuid(),
  sahip uuid not null references auth.users on delete cascade default auth.uid(),
  tur text not null check (tur in ('musteri', 'gorev', 'not')),
  veri jsonb not null default '{}'::jsonb check (pg_column_size(veri) < 20000),
  tarih timestamptz,
  tamam boolean not null default false,
  olusturma timestamptz not null default now()
);
create index if not exists panel_kayit_sahip on public.panel_kayit (sahip, tur);
alter table public.panel_kayit enable row level security;
drop policy if exists "panel sahibi" on public.panel_kayit;
create policy "panel sahibi" on public.panel_kayit for all to authenticated using (sahip = auth.uid()) with check (sahip = auth.uid());
