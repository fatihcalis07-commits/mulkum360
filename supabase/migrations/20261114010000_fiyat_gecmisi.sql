-- Fiyat geçmişi ve dürüst indirim kuralı
-- Her fiyat değişikliği sunucuda kaydedilir (satıcı değiştiremez).
-- "Önceki fiyat" (indirim referansı) = son 30 günde uygulanan EN DÜŞÜK fiyat (Ticaret Bakanlığı indirimli satış mantığı).
-- Böylece fiyatı şişirip düşürerek sahte indirim gösterilemez.
create table if not exists public.ilan_fiyat_gecmisi (
  id bigint generated always as identity primary key,
  ilan uuid not null references public.ilanlar(id) on delete cascade,
  fiyat bigint not null,
  zaman timestamptz not null default now()
);
create index if not exists ilan_fiyat_gecmisi_ilan on public.ilan_fiyat_gecmisi (ilan, zaman desc);
alter table public.ilan_fiyat_gecmisi enable row level security;
drop policy if exists "fiyat geçmişi herkese açık" on public.ilan_fiyat_gecmisi;
create policy "fiyat geçmişi herkese açık" on public.ilan_fiyat_gecmisi for select using (true);

-- Başlangıç: mevcut ilanların bugünkü fiyatı geçmişin ilk kaydı
insert into public.ilan_fiyat_gecmisi (ilan, fiyat, zaman)
select i.id, i.fiyat, now() from public.ilanlar i
where not exists (select 1 from public.ilan_fiyat_gecmisi g where g.ilan = i.id);

-- Fiyat değişmeden önce: indirim referansını hesapla ve alanlar.oncekiFiyat'a yaz
create or replace function public.ilan_fiyat_once() returns trigger language plpgsql security definer set search_path = public as $$
declare ref bigint;
begin
  if new.fiyat is distinct from old.fiyat then
    select least(old.fiyat, coalesce(min(g.fiyat), old.fiyat)) into ref
    from public.ilan_fiyat_gecmisi g where g.ilan = new.id and g.zaman > now() - interval '30 days';
    if ref is not null and new.fiyat < ref then
      new.alanlar := coalesce(new.alanlar, '{}'::jsonb) || jsonb_build_object('oncekiFiyat', ref);
    else
      new.alanlar := coalesce(new.alanlar, '{}'::jsonb) - 'oncekiFiyat';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists ilanlar_fiyat_once on public.ilanlar;
create trigger ilanlar_fiyat_once before update of fiyat on public.ilanlar for each row execute function public.ilan_fiyat_once();

-- Fiyat değiştikten / ilan eklendikten sonra: geçmişe yaz
create or replace function public.ilan_fiyat_kaydet() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.fiyat is distinct from old.fiyat then
    insert into public.ilan_fiyat_gecmisi (ilan, fiyat) values (new.id, new.fiyat);
  end if;
  return new;
end $$;
drop trigger if exists ilanlar_fiyat_kaydet on public.ilanlar;
create trigger ilanlar_fiyat_kaydet after insert or update of fiyat on public.ilanlar for each row execute function public.ilan_fiyat_kaydet();

-- Fiyat düşüşü bildirimi: yalnız son 30 günün en düşük fiyatının altına inildiyse (en az %1)
create or replace function public.fiyat_dustu_bildirimi() returns trigger language plpgsql security definer set search_path = public as $$
declare ref numeric := nullif(new.alanlar->>'oncekiFiyat', '')::numeric;
begin
  if new.durum = 'yayinda' and new.fiyat < old.fiyat and ref is not null and ref > 0 and (ref - new.fiyat) / ref >= 0.01 then
    insert into public.bildirimler (alici, tur, baslik, metin, link)
    select f.kullanici, 'fiyat_dustu', 'Favorindeki İlanın Fiyatı Düştü',
      '"' || left(coalesce(new.baslik, 'İlan'), 50) || '" · ' || replace(to_char(ref, 'FM999,999,999,999'), ',', '.') || ' TL → ' || replace(to_char(new.fiyat, 'FM999,999,999,999'), ',', '.') || ' TL',
      '#/ilan/' || new.id
    from public.favoriler f where f.ilan = new.id and f.kullanici <> new.sahip;
  end if;
  return new;
end $$;
