-- Üyeye uygulama içi bildirim (ilan onaylandı vb.). İstemci canlı dinler, telefonda yerel bildirim gösterir.
create table if not exists public.bildirimler (
  id uuid primary key default gen_random_uuid(),
  alici uuid not null references auth.users(id) on delete cascade,
  tur text not null default 'genel',
  baslik text not null,
  metin text,
  link text,
  okundu boolean not null default false,
  olusturma timestamptz not null default now()
);
create index if not exists bildirimler_alici on public.bildirimler (alici, okundu, olusturma desc);
alter table public.bildirimler enable row level security;
drop policy if exists "kendi bildirimini görür" on public.bildirimler;
create policy "kendi bildirimini görür" on public.bildirimler for select to authenticated using (alici = auth.uid());
drop policy if exists "kendi bildirimini okur" on public.bildirimler;
create policy "kendi bildirimini okur" on public.bildirimler for update to authenticated using (alici = auth.uid()) with check (alici = auth.uid());

-- İlan onaydan (ya da kaldırılmışken) yayına geçince sahibine bildirim
create or replace function public.ilan_yayin_bildirimi() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.durum = 'yayinda' and old.durum is distinct from 'yayinda' and old.durum in ('onayda', 'kaldirildi') then
    insert into public.bildirimler (alici, tur, baslik, metin, link)
    values (new.sahip, 'ilan_onay', 'İlanın Onaylandı ve Yayında',
      '"' || left(coalesce(new.baslik, 'İlanın'), 60) || '" artık aramalarda görünüyor.', '#/ilan/' || new.id);
  end if;
  return new;
end $$;
drop trigger if exists ilanlar_yayin_bildirimi on public.ilanlar;
create trigger ilanlar_yayin_bildirimi after update of durum on public.ilanlar for each row execute function public.ilan_yayin_bildirimi();

do $$ begin alter publication supabase_realtime add table public.bildirimler; exception when duplicate_object then null; end $$;
