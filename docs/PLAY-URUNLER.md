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

## 5. Business Partner abonelikleri (İş Ortaklığı, 13.11.2026)

Kaynak: `uyelik_paket` tablosu. Play Console → **Ürünler → Abonelikler**. Her paket ayrı bir abonelik ürünü, içinde tek bir temel plan (otomatik yenilenen).

| Abonelik ürün kimliği | Ad | Temel plan süresi | Fiyat (KDV dahil) |
|---|---|---|---|
| `ortak_emlak_aylik` | Business Partner Emlak Aylık | 1 ay (P1M) | 1.500 ₺ |
| `ortak_emlak_3ay` | Business Partner Emlak 3 Aylık | 3 ay (P3M) | 3.990 ₺ |
| `ortak_emlak_yillik` | Business Partner Emlak Yıllık | 1 yıl (P1Y) | 14.400 ₺ |
| `ortak_galeri_aylik` | Business Partner Galeri Aylık | 1 ay (P1M) | 1.000 ₺ |
| `ortak_galeri_3ay` | Business Partner Galeri 3 Aylık | 3 ay (P3M) | 2.690 ₺ |
| `ortak_galeri_yillik` | Business Partner Galeri Yıllık | 1 yıl (P1Y) | 9.600 ₺ |

- **Ücretsiz deneme teklifi EKLEME.** İlk 3 ay ücretsiz dönem bizim sistemimizde (kart istenmez). Paket seçimi ücretsiz dönemin son 7 gününde açılır.
- Ek süre (grace period) önerisi: 7 gün; hesap askıya alma (account hold): varsayılan. Ek süre boyunca ilanlar yayında kalır, askıda kalınca beklemeye alınır.
- Fiyatı Play Console'da değiştirirsen Yönetim → İş Ortakları → Business Partner Paketleri'ndeki fiyatı da aynı yap (Play fiyatı yüklenemezse o gösterilir).

### Kurulum
1. Hizmet hesabı JSON'u (`GOOGLE_PLAY_SA_JSON`) kredi satışı için girildiyse aynısı kullanılır.
2. **Gerçek zamanlı geliştirici bildirimleri (RTDN):**
   - Google Cloud → Pub/Sub → konu oluştur (ör. `play-bildirim`), konuya `google-play-developer-notifications@system.gserviceaccount.com` için **Pub/Sub Yayıncısı** rolü ver.
   - Konuya **push** aboneliği: uç nokta `https://klnabwqduyavaqmbzxpo.supabase.co/functions/v1/play-abonelik?anahtar=<GİZLİ>`
   - Aynı gizli değeri Supabase sırrı yap: `supabase secrets set PLAY_RTDN_ANAHTAR='<GİZLİ>'` (sohbete yazma).
   - Play Console → Para kazanma kurulumu → Gerçek zamanlı bildirimler → konu adı `projects/<proje>/topics/play-bildirim` → "Test bildirimi gönder".
3. `play-abonelik` canlıda (`--no-verify-jwt`; uygulama girişi JWT'yi kendisi doğrular). SA JSON yoksa dürüst 503 verir.
4. Lisans test hesabıyla kapalı testte: abone ol → İş Ortaklığı ekranında "Aboneliğin: Aktif" → Play'den iptal → "Yenilenmeyecek" → test aboneliği bitince ilanlar beklemede.

### Davranış
- Uygulama satın almadan sonra `play-abonelik`'e gider; sunucu Google `subscriptionsv2` ile doğrular, onaylar (acknowledge), `play_abonelik_isle` ile ortaklığı günceller.
- Abonelik Google'da kullanıcı kimliğiyle (Supabase UUID, `obfuscatedExternalAccountId`) eşleşir; RTDN bildirimleri hesabı böyle bulur.
- Geçerli: aktif, ek süre, iptal edilmiş ama süresi dolmamış. Askıya alma: ödeme alınamadı (on hold), duraklatıldı, süresi doldu. Günlük iş (06:10) 2 gün payla yedek kontrol yapar.
- Havale: yalnız yöneticinin "Havaleye Geçir" dediği faturalı ortaklar; uygulamada IBAN gösterilmez (Play politikası), ödeme bilgisi e-postayla gider. Web'de gösterilir.
