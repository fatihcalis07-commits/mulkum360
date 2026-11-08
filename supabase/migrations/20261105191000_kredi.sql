-- MülkümAI değer raporu kredisi: her rapor 1 kredi. Bakiye yalnız sunucu fonksiyonlarıyla değişir.
alter table public.profil_ozel add column if not exists kredi int not null default 1 check (kredi >= 0);

create table public.kredi_hareketleri (
  id uuid primary key default gen_random_uuid(),
  kullanici uuid not null references auth.users on delete cascade,
  miktar int not null,
  aciklama text not null,
  zaman timestamptz not null default now()
);
alter table public.kredi_hareketleri enable row level security;
create policy "hareket sahibi okur" on public.kredi_hareketleri for select to authenticated using (kullanici = auth.uid() or public.yonetici());

-- Kullanıcı bakiyesini kendisi değiştiremesin: yalnız tel ve ileti güncellenebilir
revoke update on public.profil_ozel from authenticated, anon;
grant update (tel, ileti) on public.profil_ozel to authenticated;

-- Raporlar yalnız kredi düşen fonksiyonla eklenir
drop policy if exists "rapor kendi" on public.raporlar;
create policy "rapor sahibi okur" on public.raporlar for select to authenticated using (sahip = auth.uid());
create policy "rapor sahibi siler" on public.raporlar for delete to authenticated using (sahip = auth.uid());

-- Yeni üyeye hoş geldin kredisi hareketi
create or replace function public.yeni_uye() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiller (id, ad) values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'ad'), ''), nullif(trim(new.raw_user_meta_data->>'full_name'), ''), nullif(trim(new.raw_user_meta_data->>'name'), ''), 'Üye'), 80));
  insert into public.profil_ozel (id, tel, ileti, kredi) values (new.id, nullif(new.raw_user_meta_data->>'tel', ''), coalesce((new.raw_user_meta_data->>'ileti')::boolean, false), 1);
  insert into public.kredi_hareketleri (kullanici, miktar, aciklama) values (new.id, 1, 'Hoş geldin kredisi');
  return new;
end $$;

-- Rapor oluştur: bakiye kontrolü + düşüm + kayıt tek işlemde
create or replace function public.rapor_olustur(p_no text, p_form jsonb, p_sonuc jsonb) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_bakiye int;
begin
  if auth.uid() is null then raise exception 'giriş gerekli'; end if;
  select kredi into v_bakiye from public.profil_ozel where id = auth.uid() for update;
  if coalesce(v_bakiye, 0) < 1 then raise exception 'yetersiz kredi'; end if;
  update public.profil_ozel set kredi = kredi - 1 where id = auth.uid();
  insert into public.raporlar (sahip, no, form, sonuc) values (auth.uid(), left(p_no, 40), p_form, p_sonuc) returning id into v_id;
  insert into public.kredi_hareketleri (kullanici, miktar, aciklama) values (auth.uid(), -1, 'Değer raporu ' || left(p_no, 40));
  return v_id;
end $$;

-- Yönetici kredi yükler (ödeme altyapısı gelene kadar elle)
create or replace function public.kredi_yukle(p_eposta text, p_miktar int, p_aciklama text default 'Yönetici yüklemesi') returns int language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid; v_yeni int;
begin
  if not public.yonetici() then raise exception 'yetki yok'; end if;
  if p_miktar = 0 or abs(p_miktar) > 1000 then raise exception 'geçersiz miktar'; end if;
  select id into v_uid from auth.users where lower(email) = lower(trim(p_eposta));
  if v_uid is null then raise exception 'üye bulunamadı'; end if;
  update public.profil_ozel set kredi = greatest(0, kredi + p_miktar) where id = v_uid returning kredi into v_yeni;
  insert into public.kredi_hareketleri (kullanici, miktar, aciklama) values (v_uid, p_miktar, left(p_aciklama, 100));
  return v_yeni;
end $$;

revoke all on function public.rapor_olustur(text, jsonb, jsonb), public.kredi_yukle(text, int, text) from public, anon;
grant execute on function public.rapor_olustur(text, jsonb, jsonb), public.kredi_yukle(text, int, text) to authenticated;
