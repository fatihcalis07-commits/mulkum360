# Google Play Ürün Listesi ve Kurulum Adımları

> Kaynak: canlı `kredi_paketleri` + `doping_paketleri` tabloları (10.11.2026). Play Console'da birebir bu `play_urun` id'leri kullanılmalı — sunucu doğrulaması bu id ile arar (`play-odeme`).

## 1. Ürünler (tümü "Manageable subscription" DEĞİL — tüketilebilir ürün / one-time product)

### Kredi paketleri (4) — fiyatlı, AKTİF
| Play ürün kimliği | Ad | Kredi | Fiyat | Durum |
|---|---|---|---|---|
| `kredi_5` | Başlangıç | 5 | 149,99 ₺ | Play Console'da oluşturulacak |
| `kredi_15` | Standart | 15 | 349,99 ₺ | Play Console'da oluşturulacak |
| `kredi_40` | Emlakçı | 40 | 749,99 ₺ | Play Console'da oluşturulacak |
| `kredi_100` | Ofis | 100 | 1.499,99 ₺ | Play Console'da oluşturulacak |

### Doping paketleri (13) — FİYATLAR GİRİLDİ (10.11, kullanıcı onayıyla)
| Play ürün kimliği | Gün | Fiyat (KDV dahil) | Durum |
|---|---|---|---|
| `doping_guncel_7` | 7 | 99,99 ₺ | **AKTİF** |
| `doping_guncel_30` | 30 | 299,99 ₺ | **AKTİF** |
| `doping_vitrin_anasayfa_7` | 7 | 349,99 ₺ | **AKTİF** |
| `doping_vitrin_anasayfa_30` | 30 | 949,99 ₺ | **AKTİF** |
| `doping_acil_7` | 7 | 74,99 ₺ | **AKTİF** |
| `doping_guncel_1` | 1 | 29,99 ₺ | pasif (ikinci kademe) |
| `doping_ust_sira_1` / `doping_ust_sira_7` | 1 / 7 | 49,99 / 249,99 ₺ | pasif |
| `doping_vitrin_kategori_7` / `doping_vitrin_kategori_30` | 7 / 30 | 149,99 / 399,99 ₺ | pasif |
| `doping_vitrin_arama_7` / `doping_vitrin_arama_30` | 7 / 30 | 199,99 / 549,99 ₺ | pasif |
| `doping_acil_1` | 1 | 19,99 ₺ | pasif |

- RPC davranış testleri canlıda: pasif ürün → `urun yok veya satista degil` ✔ · aktif ürün + sahte ilan → `ilan bulunamadi veya sana ait degil` ✔ (eşikleme sırası doğru, satır yazılmıyor).
- **Sıradaki:** Play Console'da yalnız AKTİF 5 ürün oluşturulacak → hizmet hesabı JSON → `supabase secrets set GOOGLE_PLAY_SA_JSON=...` → `functions deploy play-odeme` → istemci doping-Play yolu (v3.6).

## 2. Kurulum sırası (kredi akışı bugün çalışabilir hâle gelir)

1. **Play Console → Kullanıcılar ve izinler → hizmet hesabı (JSON anahtar).** Anahtar istenmeyen bir yerde tutulmaz; doğrudan Supabase sırrı olur:
   `supabase secrets set GOOGLE_PLAY_SA_JSON='<tek satır JSON>'` (değeri sohbete YAZMA).
2. `PLAY_PAKET_ADI` gerekmez (varsayılan `com.mulkum360.app`).
3. Ürünler: yukarıdaki 4 kimlikle "Ürünler → Ürün içi ürünler → Bir seferlik ürün", fiyatlar tablodaki gibi; **test lisans hesaplarına** izin ver.
4. v3.5 AAB (`android/app/build/outputs/bundle/release/app-release.aab`) kapalı test kanalına; test cihazlarına opt-in.
5. Uçtan uca: uygulama içi satın alma → `play-odeme` Google doğrulaması → `play_kredi_yukle` → kredi bakiyesi. Sunucu tüketimi (consume) edge'te var; istemci `finish()` ile çift tüketim zararsız.

## 3. Doping satışı sunucu adımı (kod hazır, DEPLOY BEKLİYOR)

`supabase/functions/play-odeme` doping dalı hazır (bu repoda, **deploy edilmedi**): kredi paketinde bulunamazsa `doping_paketleri` (yalnız `aktif=true`) aranır; satın alma Google'da doğrulanınca kullanıcının kendi ilanı doğrulanıp doping başlatılır; `doping_satislari` kaydı `onaylandi`/`yontem=play` düşer. Tekrar tüketimi `doping_satislari.play_token` benzersiz indeksiyle engellenir → migration `supabase/migrations/20261110130000_doping_play.sql` **canlıya uygulandı + tescil edildi** (10.11, kullanıcı onayıyla).

**Deploy koşulu:** ~~fiyatlar~~ ✔ (girdildi) + Play ürünleri (aktif 5) + migration ✔ (canlıda) → `supabase functions deploy play-odeme` → istemci doping alım ekranına Play yolu eklenir (bir sonraki APK).

## 4. Bugünkü dürüst durum
- Edge `play-odeme` **CANLIYA DEPLOY EDİLDİ (10.11, doping dallı son kod)**; `GOOGLE_PLAY_SA_JSON` olmadığı için her istekte dürüst 503 ("henüz ayarlanmadı") veriyor — ödeme kabul etmiyor. ✔ kural: yarım entegrasyonu çalışıyormuş gibi gösterme.
- İstemci doping Play yolu v3.6 kodunda (2641b1d): Play kataloğunda ürün görünene kadar sheet **talep** yoluna zarif düşüyor (headless duman ✔).
- **Play Console + hizmet hesabı KULLANICI işi** (Google hesabı + mali yetki): 5 aktif ürünü oluştur, SA JSON indir → `supabase secrets set GOOGLE_PLAY_SA_JSON='...'` (tek satır, sohbete yazma) → uçtan uca kapalı test.
