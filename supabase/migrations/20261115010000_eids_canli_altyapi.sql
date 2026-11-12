-- EİDS canlı entegrasyon altyapısı (röle sunucusu eids-sunucu/ ile birlikte çalışır)
-- Yalnız ekleme yapar; eids_ayar.faz 'canli' yapılana kadar bugünkü (manuel) akış aynen sürer.

-- 1) e-Devlet ile doğrulanmış üyeler. İstemci okuyamaz/yazamaz; yalnız röle sunucusu (service_role).
--    Yönetmelik: platform doğrulanmış kimlik bilgilerini saklar ve güncel tutar.
create table if not exists public.eids_uye (
  kullanici uuid primary key references auth.users(id) on delete cascade,
  kullanici_kodu uuid not null,          -- EİDS'in ürettiği Guid
  ad text, soyad text,                   -- EİDS'ten dönen, yalnız yasal saklama için
  vergi_no text,                         -- tüzel kişi temsilcisiyse
  gsm text not null,                     -- OTP ile doğrulanmış numara (EİDS'e gönderilen)
  dogrulama timestamptz not null default now()
);
alter table public.eids_uye enable row level security;
-- politika yok: anon/authenticated erişemez

-- Kullanıcı yalnız "doğrulandım mı" bilgisini görür (kimlik bilgisi değil)
create or replace function public.eids_uye_durum() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('dogrulandi', true, 'zaman', dogrulama, 'tuzel', vergi_no is not null) from public.eids_uye where kullanici = auth.uid()), jsonb_build_object('dogrulandi', false));
$$;
revoke all on function public.eids_uye_durum() from public, anon;
grant execute on function public.eids_uye_durum() to authenticated;

-- 2) e-Devlet yönlendirme oturumları (dönüşte hangi üyenin döndüğünü bilmek için, 10 dk geçerli)
create table if not exists public.eids_oturum (
  id uuid primary key default gen_random_uuid(),
  kullanici uuid not null references auth.users(id) on delete cascade,
  vergi_no text,
  olusturma timestamptz not null default now(),
  kullanildi boolean not null default false
);
alter table public.eids_oturum enable row level security;

-- 3) İlan doğrulama kaydına resmî sonuç alanları
alter table public.ilan_dogrulama add column if not exists kaynak text not null default 'manuel'; -- 'manuel' | 'eids'
alter table public.ilan_dogrulama add column if not exists eids_veri jsonb;                       -- { markaAdi, ticariAdi, modelYili } (taşıt)
alter table public.ilan_dogrulama add column if not exists bitis timestamptz;                     -- EİDS yetki/ilan süresi sonu
alter table public.ilan_dogrulama add column if not exists son_sorgu timestamptz;

-- 4) EİDS'ten dönen taşıt bilgisi ilanda değiştirilemez (Motorlu Kara Taşıtlarının Ticareti Hk. Yön. md. 21/1-a)
--    Röle sunucusu ilanlar.alanlar.eids alanını yazar; üye bu alanı ekleyemez, silemez, değiştiremez.
create or replace function public.ilan_eids_kilidi() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then return new; end if;
  if tg_op = 'INSERT' then
    new.alanlar := coalesce(new.alanlar, '{}'::jsonb) - 'eids';
  elsif old.alanlar ? 'eids' then
    new.alanlar := jsonb_set(coalesce(new.alanlar, '{}'::jsonb), '{eids}', old.alanlar->'eids');
    -- marka/model/yıl ilan alanları da EİDS değerine sabitlenir
    if old.alanlar->'eids' ? 'marka' then new.alanlar := jsonb_set(new.alanlar, '{marka}', old.alanlar->'eids'->'marka'); end if;
    if old.alanlar->'eids' ? 'model' then new.alanlar := jsonb_set(new.alanlar, '{model}', old.alanlar->'eids'->'model'); end if;
    if old.alanlar->'eids' ? 'yil' then new.alanlar := jsonb_set(new.alanlar, '{yil}', old.alanlar->'eids'->'yil'); end if;
  else
    new.alanlar := coalesce(new.alanlar, '{}'::jsonb) - 'eids';
  end if;
  return new;
end $$;
drop trigger if exists ilanlar_eids_kilidi on public.ilanlar;
create trigger ilanlar_eids_kilidi before insert or update of alanlar on public.ilanlar for each row execute function public.ilan_eids_kilidi();

-- 5) Dönüş hedefi: 'uygulama' (derin bağlantı) | 'web'
alter table public.eids_oturum add column if not exists donus text not null default 'web';
