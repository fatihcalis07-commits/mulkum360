-- MülkümVideo (ücretli): ilan fotoğrafından yapay zekâ ile drone görünümlü video ya da hareketli tanıtım videosu.
-- Eski "ücretsiz drone çekimi talebi" kaldırıldı; drone_talepleri tablosu boşsa silinir.
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'drone_talepleri')
     and not exists (select 1 from public.drone_talepleri) then drop table public.drone_talepleri; end if;
end $$;

-- Üretim işleri: krediyi edge fonksiyonu (service role) düşer ve iade eder; kullanıcı yalnız kendi işlerini okur.
create table if not exists public.video_isleri (
  id uuid primary key default gen_random_uuid(),
  sahip uuid not null references auth.users on delete cascade,
  ilan uuid references public.ilanlar on delete set null,
  tur text not null check (tur in ('drone', 'video')),
  kaynak text not null,
  is_no text,
  model text,
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'hazir', 'hata')),
  url text,
  kredi int not null,
  iade boolean not null default false,
  hata text,
  olusturma timestamptz not null default now(),
  guncelleme timestamptz not null default now()
);
create index if not exists video_isleri_sahip on public.video_isleri (sahip, olusturma desc);
alter table public.video_isleri enable row level security;
drop policy if exists "video sahip gorur" on public.video_isleri;
create policy "video sahip gorur" on public.video_isleri for select using (sahip = auth.uid() or public.yonetici());

-- Kredi düş / iade et (yalnız service role çağırır)
create or replace function public.video_kredi(p_kullanici uuid, p_miktar int, p_aciklama text) returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  select kredi into v from public.profil_ozel where id = p_kullanici for update;
  if p_miktar < 0 and coalesce(v, 0) < -p_miktar then raise exception 'yetersiz kredi'; end if;
  update public.profil_ozel set kredi = kredi + p_miktar where id = p_kullanici returning kredi into v;
  insert into public.kredi_hareketleri (kullanici, miktar, aciklama) values (p_kullanici, p_miktar, p_aciklama);
  return v;
end $$;
revoke all on function public.video_kredi(uuid, int, text) from public, anon, authenticated;
grant execute on function public.video_kredi(uuid, int, text) to service_role;

-- Videolar ayrı, herkese açık depoda (en çok 30 MB, yalnız mp4)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ilan-videolari', 'ilan-videolari', true, 31457280, array['video/mp4'])
on conflict (id) do update set public = true, file_size_limit = 31457280, allowed_mime_types = array['video/mp4'];

-- Video sahibi kendi klasöründeki videoları silebilir (ilan silinince)
drop policy if exists "video sahibi siler" on storage.objects;
create policy "video sahibi siler" on storage.objects for delete to authenticated using (bucket_id = 'ilan-videolari' and (storage.foldername(name))[1] = auth.uid()::text);
