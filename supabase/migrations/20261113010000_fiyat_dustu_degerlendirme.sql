-- 1) Favoriye alınan ilanın fiyatı düşünce favorileyenlere bildirim (uygulama içi + push; push tetikleyicisi bildirimler tablosunda)
create or replace function public.fiyat_dustu_bildirimi() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.durum = 'yayinda' and old.fiyat > 0 and new.fiyat < old.fiyat and (old.fiyat - new.fiyat)::numeric / old.fiyat >= 0.01 then
    insert into public.bildirimler (alici, tur, baslik, metin, link)
    select f.kullanici, 'fiyat_dustu', 'Favorindeki İlanın Fiyatı Düştü',
      '"' || left(coalesce(new.baslik, 'İlan'), 50) || '" · ' || replace(to_char(old.fiyat, 'FM999,999,999,999'), ',', '.') || ' TL → ' || replace(to_char(new.fiyat, 'FM999,999,999,999'), ',', '.') || ' TL',
      '#/ilan/' || new.id
    from public.favoriler f where f.ilan = new.id and f.kullanici <> new.sahip;
  end if;
  return new;
end $$;
drop trigger if exists ilanlar_fiyat_dustu on public.ilanlar;
create trigger ilanlar_fiyat_dustu after update of fiyat on public.ilanlar for each row execute function public.fiyat_dustu_bildirimi();

-- 2) Satıcı değerlendirmeleri: yalnız satıcıyla mesajlaşmış ve yanıt almış alıcı yazabilir; kişi başına satıcıya tek değerlendirme
create table if not exists public.degerlendirmeler (
  satici uuid not null references auth.users(id) on delete cascade,
  yazan uuid not null default auth.uid() references auth.users(id) on delete cascade,
  puan smallint not null check (puan between 1 and 5),
  yorum text check (char_length(yorum) <= 300),
  olusturma timestamptz not null default now(),
  primary key (satici, yazan),
  check (satici <> yazan)
);
alter table public.degerlendirmeler enable row level security;
drop policy if exists "herkes okur" on public.degerlendirmeler;
create policy "herkes okur" on public.degerlendirmeler for select to anon, authenticated using (true);

create or replace function public.degerlendirebilir(p_satici uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.sohbetler s
    where s.alici = auth.uid() and s.satici = p_satici
      and exists (select 1 from public.mesajlar m where m.sohbet = s.id and m.kimden = s.satici)
      and exists (select 1 from public.mesajlar m where m.sohbet = s.id and m.kimden = s.alici));
$$;
grant execute on function public.degerlendirebilir(uuid) to authenticated;

drop policy if exists "konuştuğu satıcıyı değerlendirir" on public.degerlendirmeler;
create policy "konuştuğu satıcıyı değerlendirir" on public.degerlendirmeler for insert to authenticated
  with check (yazan = auth.uid() and public.degerlendirebilir(satici));
drop policy if exists "kendi değerlendirmesini günceller" on public.degerlendirmeler;
create policy "kendi değerlendirmesini günceller" on public.degerlendirmeler for update to authenticated
  using (yazan = auth.uid()) with check (yazan = auth.uid() and public.degerlendirebilir(satici));
drop policy if exists "kendi değerlendirmesini siler" on public.degerlendirmeler;
create policy "kendi değerlendirmesini siler" on public.degerlendirmeler for delete to authenticated
  using (yazan = auth.uid() or public.yonetici());

-- 3) Satıcı özeti: ortalama puan, değerlendirme sayısı, ilk mesaja ortanca yanıt süresi (son 180 gün, en az 3 konuşma)
create or replace function public.satici_ozet(p_id uuid) returns json language sql stable security definer set search_path = public as $$
  with ilk as (
    select s.id, (select min(m.zaman) from public.mesajlar m where m.sohbet = s.id and m.kimden = s.alici) as soru
    from public.sohbetler s where s.satici = p_id and s.olusturma > now() - interval '180 days'
  ), yanit as (
    select extract(epoch from ((select min(m.zaman) from public.mesajlar m where m.sohbet = i.id and m.kimden = p_id and m.zaman > i.soru) - i.soru)) / 60 as dk
    from ilk i where i.soru is not null
  )
  select json_build_object(
    'puan', (select round(avg(puan)::numeric, 1) from public.degerlendirmeler where satici = p_id),
    'sayi', (select count(*) from public.degerlendirmeler where satici = p_id),
    'yanit_dk', (select case when count(dk) >= 3 then round((percentile_cont(0.5) within group (order by dk))::numeric) end from yanit where dk is not null),
    'yanit_oran', (select case when count(*) >= 3 then round(100.0 * count(dk) / count(*)) end from yanit));
$$;
grant execute on function public.satici_ozet(uuid) to anon, authenticated;
