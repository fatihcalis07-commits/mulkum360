-- Üyelik türü: bireysel (sahibinden) ya da emlak ofisi; ilanlarda "Kimden" etiketi ve filtresi buna göre
alter table public.profiller add column if not exists hesap_turu text not null default 'bireysel' check (hesap_turu in ('bireysel', 'ofis'));
-- Daha önce firma ya da yetki belgesi girmiş üyeler emlak ofisi sayılır
update public.profiller set hesap_turu = 'ofis' where hesap_turu = 'bireysel' and (coalesce(firma, '') <> '' or coalesce(yetki_no, '') <> '');
