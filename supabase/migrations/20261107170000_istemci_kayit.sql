-- Tanılama: telefonda ilan aktarma adımları (yalnız ekleme; okuma yönetici ve CLI). 14 gün tutulur.
create table if not exists public.istemci_kayit (
  id bigserial primary key,
  zaman timestamptz not null default now(),
  kullanici uuid default auth.uid(),
  surum text,
  oturum text,
  olay text not null check (char_length(olay) <= 60),
  ayrinti text check (char_length(ayrinti) <= 500)
);
alter table public.istemci_kayit enable row level security;
drop policy if exists "kayit ekle" on public.istemci_kayit;
create policy "kayit ekle" on public.istemci_kayit for insert to authenticated with check (kullanici = auth.uid());
drop policy if exists "kayit yonetici okur" on public.istemci_kayit;
create policy "kayit yonetici okur" on public.istemci_kayit for select using (public.yonetici());
select cron.schedule('istemci-kayit-temizlik', '50 0 * * *', $$delete from public.istemci_kayit where zaman < now() - interval '14 days'$$);
