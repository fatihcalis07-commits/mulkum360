-- Anlık bildirim (FCM) jetonları ve bildirimler → push köprüsü
create table if not exists public.push_jetonlari (
  token text primary key,
  kullanici uuid not null references auth.users on delete cascade,
  platform text not null default 'android',
  guncelleme timestamptz not null default now()
);
create index if not exists push_jetonlari_k on public.push_jetonlari (kullanici);
alter table public.push_jetonlari enable row level security;
drop policy if exists "kendi jetonunu yazar" on public.push_jetonlari;
create policy "kendi jetonunu yazar" on public.push_jetonlari for all to authenticated using (kullanici = auth.uid()) with check (kullanici = auth.uid());
-- Her yeni bildirim push-gonder fonksiyonuna iletilir (FCM anahtarı yoksa fonksiyon sessizce geçer)
create extension if not exists pg_net;
create or replace function public.bildirim_push() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.push_jetonlari where kullanici = new.alici) then
    perform net.http_post(url := 'https://klnabwqduyavaqmbzxpo.supabase.co/functions/v1/push-gonder',
      body := jsonb_build_object('id', new.id), headers := '{"Content-Type":"application/json"}'::jsonb, timeout_milliseconds := 8000);
  end if;
  return new;
end $$;
drop trigger if exists bildirimler_push on public.bildirimler;
create trigger bildirimler_push after insert on public.bildirimler for each row execute function public.bildirim_push();
