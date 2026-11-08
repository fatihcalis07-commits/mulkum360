-- İlan satıldı/kiralandı olduğunda kapanış tarihi (performans ekranı için). Yeniden yayına alınınca silinir.
alter table public.ilanlar add column if not exists kapanis timestamptz;
update public.ilanlar set kapanis = guncelleme where durum = 'satildi' and kapanis is null;

create or replace function public.ilan_kapanis() returns trigger language plpgsql as $$
begin
  if new.durum = 'satildi' and (old.durum is distinct from 'satildi') then new.kapanis := now();
  elsif new.durum <> 'satildi' then new.kapanis := null;
  elsif new.durum = 'satildi' and old.durum = 'satildi' then new.kapanis := old.kapanis;
  end if;
  return new;
end $$;
drop trigger if exists ilan_kapanis_tetik on public.ilanlar;
create trigger ilan_kapanis_tetik before update on public.ilanlar for each row execute function public.ilan_kapanis();
