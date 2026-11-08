# MODÜL 12–16: FİZİBİLİTE ANALİZİ VE GELİŞTİRME PLANI (09.11.2026)

> Kural: önce analiz. Bu dosya, beş yeni modülün MEVCUT altyapıya uygunluk analizidir (koddan ve
> canlı DB'den doğrulanmış) + uygulanabilir sıra. Uygulamaya geçmeden migration'lar onaya sunulur.

## Mevcut altyapı envanteri (doğrulandı)
| Yetenek | Durum | Kanıt |
|---|---|---|
| Ödeme (Google Play Billing, **sunucu doğrulamalı**) | ✅ ÇALIŞIYOR | satis.js CdvPurchase + `play-odeme` edge → token Google'da doğrulanıp kredi öyle yükleniyor; Modül 16'nın "ödeme onayı sunucuda doğrulanmadan aktif edilmesin" kuralı zaten mimaride |
| Yönetimden fiyatlandırılabilir paketler | ✅ | `kredi_paketleri` (fiyat/kredi/rozet/aktif/sıra) + Yönetim›Kredi Satışları düzenleme formu — doping paketleri için birebir şablon |
| Satın alma geçmişi + onay kuyruğu | ✅ | `kredi_satislari` (bekliyor/onaylandi/iptal) + `kredi_satis_karar` RPC |
| Kredi cüzdanı | ✅ | krediler + `kredi_hareketleri` (doping düşmede yeniden kullanılır) |
| Gösterim sayacı | ✅ | `ilanlar.goruntulenme` (doping performans raporu ham verisi hazır) |
| Favori | ✅ | `favoriler` tablosu |
| Otomatik süre sonlandırma | ✅ altyapı | pg_cron kurulu (ingestion-log-temizlik örneği) — doping bitişi cron'u aynı kalıp |
| Bildirim | ✅ | LocalNotifications (ajanda kullanıyor) + `bildirimler` kenar; doping bitiş bildirimi yerel + push altyapısı mevcut |
| Çeviri motoru | ✅ | `cevir` edge + `ceviri` cache tablosu (TR→EN/RU); DOM çevirisi dil.js'te; ilan metinleri de çevriliyor, orijinal DOM'da korunuyor |
| Harita çizim | ✅ (kısıtlı) | Leaflet YOK; OSM karoları elle çiziliyor (belge.js/rapor.js) — harita modülü bu çiziciyi genişletir |
| Konum verisi | ⚠️ EKSİK | **ilanlar'da enlem/boylam kolonu yok** (DB doğrulandı) — harita modülünün ön koşulu: ilan sırasında Photon/parsel koordinatını `alanlar.enlem/boylam` jsonb'ye yaz + mevcut ilanlara toplu backfill (migration gerekmez) |
| Fiyat geçmişi | ❌ | "Fiyatı düşen" vitrini için tarihçe yok — tek yeni tabo gerekli (`ilan_fiyat_log`) |
| Doping | ❌ | Hiç yok — ama 4 tablo + play-odeme genişletme + sıralama enjeksiyonu ile tamamlanır |
| AR/pusula | ❌ | Sensör kodu yok |

## MODÜL 12+16 — DOPİNG SİSTEMİ + YÖNETİM PANELİ (FAZ 4)
**Uygunluk: YÜKSEK** — ödeme, fiyatlandırma, geçmiş, cron, bildirim, istatistik altyapıları hazır.
- Yeni tablolar (migration paketi `2026xxxx_doping.sql`, onaylanınca):
  1. `doping_turleri(ad, kod, aciklama, ikon, sira, aktif)` — 6 tür: guncel, vitrin-arama, vitrin-anasayfa, ust-sira, vitrin-kategori, acil
  2. `doping_paketleri(tur, gun, fiyat, play_urun, aktif, sira)` — 1/7/30 gün; **fiyat sabit kod YOK** (kredi_paketleri kalıbı)
  3. `ilan_doping(ilan, tur, paket, baslangic, bitiş, durum)` — aktiflik aralık sorgusuyla
  4. `doping_satislari(kullanici, paket, fiyat, play_token, siparis, durum, onay_zamani)` — kredi_satislari kalıbı
  5. `ilan_fiyat_log(ilan, fiyat, tarih)` — "Fiyatı düşen" + doping öncesi/sonrası karşılaştırma
  6. kampanya: `doping_paketleri.indirim_orani + gecerlilik` kolonları (ayrı tablo yok — basit tutulur)
- **Ödeme**: Google Play ürünleri Play Console'da oluşturulur (kullanıcı adımı); `play-odeme` edge
  ürün→paket eşlemesiyle doping aktifleştirir (sunucu doğrulama ✓). Play dışı (web): talebe düşer, yönetici onaylar (mevcut kredi akışı kalıbı). iyzico/yerli sağlayıcı = ayrı karar, FAZ 4'te tartışılır.
- **Sıralama şeffaflığı**: `karmalastir()`/kesfet sıralamasına doping ağırlığı tek fonksiyondan enjekte;
  kartta "Sponsorlu"/"Acil" rozeti ZORUNLU etiket (reklam mevzuatı: açıkça belirtilir ✓ kullanıcı kuralı).
- **Performans**: mevcut `goruntulenme` + favori sayacı + ilan detay tıklaması doping başlangıç/önce
  anlık görüntüsüyle (`ilan_fiyat_log` benzeri `doping_anlik` kolonu ilan_doping'te) karşılaştırılır.
- **Süre bitişi**: pg_cron `doping-bitis` (durum güncelleme) + yerel bildirim (uygulama açıkken) —
  push (FCM) yok, dürüst sınırlama raporda.

## MODÜL 13 — HARİTA + KAMERA (FAZ 5)
**Harita modu: UYGULANABİLİR** (ön koşul: koordinat). Adımlar:
1. İlan kayıt/güncellemede Photon/parsel koordinatı `alanlar.enlem/boylam`e yazılır; mevcut 702+ ilana
   toplu backfill (edge batch, sahibinden scrape YOK — ilan kendi verisinden).
2. `#/harita`: mevcut OSM karo çizici genişletilir (yeni kütüphane YOK — Leaflet eklentisi boyut/izin
   yükü; kendi çizicimiz marker+küme+iade testli). 250m–5km yarıçap, mesafe = Haversine, fiyat
   etiketli marker, dokun→ilan kartı, satılık/kiralık/arsa/ticari filtre, fiyat/mesafe sıralama,
   harita kaydır→komsu karoları yenile.
3. Konum izni: Capacitor Geolocation; **reddedilirse il/ilçe seçimli harita çalışmaya devam eder** ✓.
   Koordinat cihazda saklanmaz (kural: gereksiz saklama yok — yalnız o anki arama merkezi bellekte).
**Kamera/AR modu — ARAŞTIRMA SONUCU (dürüst değerlendirme):**
- Piyasa seçenekleri: AR.js (marker/lokasyon-tabanlı, lokasyon modu GPS hassasiyetiyle zayıf),
  8th Wall/Zappar (ticari lisans, aylık ücret), native ARCore (Capacitor köprüsü + Kotlin işçiliği,
  SDK boyutu), MapLibre GL+pitch (harita-AR melezi). Hiçbiri "binaya tut→ilanın hologramı" fantastik
  seviyesini tek kişilik kod tabanıyla makul sürede vermez.
- **Öneri: HASSAS PUSULA-AR (melekz)**: Capacitor `CapacitorHttp` yok; kamera akışı için
  `getUserMedia` (WebView'de kamera izni Capacitor Android'de çalışır — test edilecek ilk spike) +
  `DeviceOrientationEvent` (Android WebView'de secure context'te çalışır) + GPS → **gerçek** yön/
  mesafe matematiğiyle kamera görüntüsü ÜZERİNDE ilan etiketleri (yön açısına göre yatay kayan bant).
  SLAM yok, sanal obje yok; ama veri GERÇEK: kullanıcı binaya tuttuğunda o yöndeki ilanları görür.
  Bu "sahte AR" değil, konum-pusula artırmalı görünümdür ve kurala uygundur. Spike başarısız olursa
  (kamera WebView'de izin vermezse) tam ekran pusula bandına düşülür (kamerasız AR şeridi).
- FAZ 5 başında 1 günlük **spike** zorunlu: getUserMedia+DeviceOrientation Capacitor APK'da test.

## MODÜL 14 — ÇOK DİLLİ (FAZ 3)
**Uygunluk: ÇOK YÜKSEK** — sistem mevcut, ekleme işi:
1. `cevir` edge: `DIL` sözlüğüne `de:'German', ar:'Arabic'` (2 satır) — cache tablosu şema değişmez.
2. `dil.js` DILLER'e Almanca + العربية; otomatik algılama `navigator.language` eşleşmesi (mevcut
   tercihte yok → eklenir, ilk kurulumda bir kez).
3. **RTL**: `document.dir = 'rtl'` + `tema.css` sonuna ~30 satır `[dir=rtl]` katmanı (flex yönleri,
   oklar, arama ikonu) — app.css RTL-agnostik yazıldı, risk düşük.
4. Üst bar: bayraksız dil menüsü (Ayarlar'daki "Dil" satığı üst bara taşınır — logo|bildirim|dil).
5. İlan çevirisi zaten çalışıyor; "orijinali göster" düğmesi çevrilen ilan başlık/açıklamasına eklenir
   (DOM'da `[__ham]` saklı — göster/gizle). Kural "çeviriler ayrı alanlarda" → cache tablosu ayrı;
   ilanın kendisi TR kalır ✓.
6. **Video seslendirme (dublaj)**: mevcut MülkümVideo pipeline'ına ses eklentisi = ayrı araştırma
   (TTS sağlayıcı kararı + maliyet) — FAZ 3 kapsamı DIŞINDA, backlog'a; sahte çözüm konulmaz.

## MODÜL 15 — YENİ ANA SAYFA (FAZ 3)
**Uygunluk: YÜKSEK** — hepsi mevcut veriyle kurulan vitrinler:
- Sıra: üst bar (logo|bildirim|dil) → akıll arama → kısayol ızgarası (Satılık, Kiralık, Sezonluk,
  Projeler, Haritada Ara, Danışman Bul, MülkümAI, Konut Değerleme) → Öne çıkanlar → Fırsat →
  Yeni → Fiyatı düşen → Proje vitrini.
- **Sezonluk kiralık**: `islem` serbest metin → 'Sezonluk' seçeneği forma eklenir (migration YOK);
  filtre uyumu kontrol edilir.
- **Projeler**: proje-ilan ilişkisi = `alanlar.proje` ad + ileride `projeler` tablosu; FAZ 3'te
  `alanlar.projeAd` jsonb etiketiyle vitrin kurulur (bağımsız tablo FAZ 6 kararına bırakılır).
- **Danışman bul**: ofis sahiplerinin `profiller` kaydı + yayında ilan sayısı (mevcut rozet/
  dogrulanmis verisi) — yeni ekran `#/danisman`.
- **Fiyatı düşen**: `ilan_fiyat_log` (Modül 12 migration paketine dahil) + "son 7 günde ≥%5 düşüm".
- **Yönetimden sıralanabilir vitrinler**: `panel_ayarlar` jsonb (var olan panel_kayit kalıbı) —
  vitrin anahtarları + sıra + aktif; yönetim sekmesi 'Ana Sayfa Vitrinleri'.
- Alt navigasyon: ARA · FAVORİLER · İLAN VER · KEŞFET · HESAP — mevcut `navCiz` 5'li yapıya çıkarılır
  (Mesajlar → Hesabım içine; mevcut davranış bozulmaz, erişilebilir kalır).

## GELİŞTİRME SIRASI (mevcut plana işlenir)
- **FAZ 3** (önce UI+erişilebilirlik, migration hafif): ① Çoklu dil (de/ar+RTL) → ② Yeni ana sayfa
  (+ilan_fiyat_log migration tek pakette) → ③ Uye profili ✅ bitti (09.11).
- **FAZ 4**: Doping sistemi + panel (6 tablo migration + play-odeme genişletme + Play Console ürünleri).
  Kullanıcı adımları: Play Console'da 18 ürün oluştur, ürün id'leri paneli gir.
- **FAZ 5**: ① Koordinat backfill + Harita modu → ② Pusula-AR spike → kamera modu (spike geçerse).
- **FAZ 6/7**: mevcut plan aynen (AI avatar, dekorasyon; EİDS/TAKPAS — TAPU-DOGRULAMA.md).
- Veri motoru FAZ 1 kalanı (TÜİK) paralel sürüyor.

## Riskler ve dürüst sınırlar
1. Push bildirim yok (FCM kurulmadı) → doping bitiş bildirimi uygulama içi; FAZ 4'te FCM ayrı karar.
2. Play Console ürün oluşturma + yayın kanalı = kullanıcı hesabı adımı (biz üretemeyiz).
3. Kamera izni WebView davranışı cihazdan cihaza değişir → spike ile kanıtlanmadan "yapıldı" denmez.
4. Arapça çeviri kalitesi (i18n) + RTL düzeltmeleri ayrı QA turu ister.
5. Doping sıralama ağırlığı yanlılık algısı yaratmasın: şeffaf kural metni Yardım'a yazılır.
6. Tüm migration'lar ayrı dosya + `supabase db push` ONAYI ile; geri alma scriptleri dosyada.
