# TÜİK VERİ API — keşif raporu (09.11 sabah, canlı doğrulanmış)

> Bu dosya VERİ MOTORU'nun resmî veri kaynağı sözleşmesidir. Tüm uçlar **bugün canlı test edildi**.
> Yöntem: headless Chrome + CDP ağ yakalama (Chrome-ctrl yardımcıları: tuik-gece3/4, tuik-db2).

## 1. Keşif sonucu (kritik)
- Eski `data.tuik.gov.tr` → **`veriportali.tuik.gov.tr`** SPA'sına yönlendiriyor (JSONStat devri bitti).
- `veriportali.tuik.gov.tr/api/...` → GET uçları **User-Agent + Accept + Referer başlıklarıyla sunucudan açılıyor**; POST'lar DataDome imzası istiyor (tarayıcıda sayfa içi fetch çalışır).
- **Asıl hazine:** `databrowser2.tuik.gov.tr` (Fusion viewer) — **tamamen açık**: GET ve POST **doğrudan sunucudan** (Deno edge / pg_cron) çalışıyor. Kimlik, anahtar, tarama yok. ✅ Resmî API.

## 2. Kullanılacak uçlar (doğrulanmış)
### A) Akış keşfi (ara) — tarayıcı-gerekli (POST DataDome); yalnız geliştirme sırasında kullan, runtime'da GEREKMEZ (flow ID'ler sabit, aşağıda)
`POST https://veriportali.tuik.gov.tr/api/tr/data/search` — gövde `{text,page,typeIds:[2=tablo],categoryIds:[],subCategoryIds:[],years:[],levels:[],archive:false,autoFilter:false}`
Ayrıca: `GET /api/tr/indicators` (ana göstergeler, UA ile direkt ✓), `GET /api/tr/data/statistical-themes` (tema ağacı, direkt ✓), `GET /api/tr/press/latest` (yayın takvimi, direkt ✓).

### B) Veri küpü — SUNUCUDAN DOĞRUDAN ✓ (runtime buradan beslenecek)
- **Yapı:** `GET https://databrowser2.tuik.gov.tr/api/core/nodes/1/datasets/{AKIS_ID}/structure`
  → boyut tanımları (`criteria[]`, kod listesi referansları).
- **Veri:** `POST .../api/core/nodes/1/datasets/{AKIS_ID}/data` — gövde `[]` = FİLTRESİZ TÜM KÜP.
  Yanıt SDMX-JSON 2.0 küp: `{id:[boyutlar], size:[...], role:{time,geo}, value:{"<kayıtIndeks>":"<değer>"}, dimensions:{...}}`.
  **Boyut etiketleri + zaman dizesi yanıttaki `dimensions` içinde gelir** (ek koda-listesi isteği gerekmez).
  Doğrulama: TR,DF_SATIS_SEKLI_SATIS_DURUMU_V3,1.0 → 81.911 bayt, 19.414+ değer, 2011-01…2026-09.

## 3. Hedef akış ID'leri (keşfedilenler)
| Veri | Akış ID | Not |
|---|---|---|
| Konut+işyeri satış (Türkiye) | `TR,DF_SATIS_SEKLI_SATIS_DURUMU_V3,1.0` | boyutlar: FREQ, SATIS_TURU, REF_AREA(TR), KONUT_ISYERI_GSTERGE, SATIS_ADET_PAY, INDICATOR, TIME |
| **Konut satış (İL/İLÇE)** ⭐ | `TR,DF_SATIS_SEKLI_DURUMU_ILILCE_V3,1.0` | REF_AREA = TR+CL_IBBS (İBBS il kodları) — yatırım endeksi için ana veri |
| Tüketici fiyat endeksi | `TR,DF_TUFE_SDMX_TT10,1.0` (+`DF_TUFE_SDMX_2003`) | reel endeks hesabı için |
| İnşaat maliyet endeksi | `TR,DF_UFE_INSAAT_V1,1.0` | 2015=100 |
| Yapı izin (bina daire/alan) | aranacak: veri/search "yapı kullanma/amaci" tip2 → çoğu ISTANBUL tablosu (encoded `downloads?t=i&p=`); databrowser2 akışı için katalog taraması yapılacak | `kfe` tablosu zaten DB'de var (eski kaynaktan) |
İpucu: eksik akışlar için `GET /api/core/nodes/1/catalog` (kategori ağacı, direkt ✓).

## 4. Entegrasyon planı (onaylanırsa FAZ 1 sonu / FAZ 2)
1. Edge `tuik-cek` (Deno, pg_cron'lu mevcut iskeletle): ayda 1 (TÜİK yayın takvimi: satış ay+17. gün, endeksler ay+3) küpleri çek → çöz → `bolge_gostergeleri`/`kfe` + yeni `tuik_ay_veri` (il kodu, gösterge, ay, değer; RLS public-read) tablolarına UPSERT. **Migration gerekir (onaya sunulacak).**
2. `bolge_verileri`/endeks ekranları bu tabloları okur (kendi ilan medyanlarımızla harmanlanmış "yatırım endeksi" = FAZ 2).
3. Nazik kullanım: ayda 2–4 istek, UA `mulkum360-ingest/1.0 (+iletisim e-posta)`, 429/5xx → üstel geri çekilme; veri lisansı: TÜİK verisi atıfla serbest (veri portalı kullanım koşulları).
4. Yasaklar aynı kalır: sahibinden/Hepsiemlak taraması YOK.

## 5. Test izleri (yeniden üretme)
`chrome-ctrl/tuik-gece3.js` (doğrulama: autocomplete+search+themes 200), `tuik-db2.js` (küp POST `[]` → 200, 81KB), pwsh direkt test: structure+data 200 (09.11 07:3x). Cihaz/oturum bağımsız.
