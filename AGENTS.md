# Mülküm360 — Yapay zeka ajanı için devir belgesi

Bu belge, projeyi devralan kodlama ajanının (DeepSeek harness vb.) ilk okuması gereken dosyadır. Ayrıntılı geçmiş: `DEVIR.md`.

## 1. Ürün
- **Mülküm360**: Türkiye için emlak + vasıta ilan uygulaması (Sahibinden benzeri) ve **MülkümAI** değerleme/PDF rapor (Endeksa benzeri).
- Slogan: **"Hayalindekine bir adım."** Dil: **Türkçe** (arayüz ve kullanıcıyla iletişim).
- Sahibi / yönetici: fatihcalis07@gmail.com (uygulamada `public.yonetici()` bu e-postayı yönetici sayar).

## 2. Teknoloji
- Tek sayfa web uygulaması, **vanilla JS** (çatı yok), **Capacitor 8** ile Android APK.
- Arka uç: **Supabase** (Postgres + RLS, Auth, Storage, Realtime, Edge Functions). Proje ref: `klnabwqduyavaqmbzxpo` (Frankfurt).
- Yazı tipi: Tektur (gömülü, `www/fonts`). Simgeler: Lucide (`www/simgeler.js`, `assets/simgeler.mjs` ile üretilir).
- Palet A: gece mavisi `#0B1B33`, altın `#D4A24C` (metinde koyu altın `#8A6516`, açık krem `#F5EEDF`). Altın düğmede yazı gece mavisi (`--vurgu-yazi`).

## 3. Klasör yapısı
```
www/                 uygulama (Capacitor webDir)
  index.html         betik sırası: html2canvas, jspdf, supabase, sb-ayar, veri, simgeler, sb, app, yonetim, qrcode, rapor, rapor2
  app.css            tüm stiller (sonunda katmanlar: premium, palet A, rapor r-*)
  veri.js            sabitler (İLLER, ANA/ALT kategori ağacı, ALANLAR), IKON, yardımcılar, sorguCoz() akıllı arama, yerel tercihler (IndexedDB)
  sb.js              Supabase katmanı: veriYukle, üyelik, ilan, mesaj, kredi, rapor, yönetim, bölge/seçim/gösterge fonksiyonları
  app.js             ekranlar (EKRAN.*), yönlendirme ciz(), değerleme hesapla()/emsaller(), MülkümAI sohbet, krediler
  yonetim.js         Yönetim (Özet, Kullanıcılar, Kredi Tanımla, Şikayetler, Bölge Verisi, Seçim, Göstergeler)
  rapor.js           çok sayfalı A4 PDF rapor (kapak, danışman, değer analizi, emsaller, konum, bölge, seçim, yöntem) + pdfOlustur
  rapor2.js          toplu taşıma, ulaşım süreleri, çevre, rakım/güneş, trend, piyasa, resmî göstergeler, beyan, kredi, imar, rayiç, saha görüntüleri
  sb-ayar.js         SUPABASE URL + publishable (herkese açık) anahtar
  lib/               supabase.js, jspdf, html2canvas, qrcode (yerel kopyalar)
supabase/
  migrations/        şema geçmişi (sırayla uygulanır)
  functions/mulkum-ai/index.ts   Gemini 2.5 Flash ile MülkümAI (sohbet, ilan açıklaması, ilan değerlendirme), günlük 30 sınır
  config.toml        auth ayarları (e-posta doğrulaması KAPALI, Google sağlayıcı açık)
assets/              logo.svg (E · 360 halka), ikon/simge/palet üretim betikleri
test/                uctan_uca.mjs (30 kontrollü sunucu testi), temizle.mjs, test_ilanlari.mjs (46 test ilanı)
android/             Capacitor Android projesi (derin bağlantı com.mulkum360.prototip://giris)
```

## 4. Komutlar (vitrin-app klasöründe)
- Şema uygula: `npx supabase@2.121.0 db push --linked -p <DB_ŞİFRESİ>`
- Önce bağla: `npx supabase@2.121.0 link --project-ref klnabwqduyavaqmbzxpo -p <DB_ŞİFRESİ>`
- Edge function: `npx supabase@2.121.0 functions deploy mulkum-ai --project-ref klnabwqduyavaqmbzxpo --use-api`
- Auth ayarı: `npx supabase@2.121.0 config push --project-ref klnabwqduyavaqmbzxpo` (Google gizli anahtarı env: `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`)
- APK: `npx cap sync android` → `cd android && gradlew.bat assembleDebug` (JAVA_HOME = Android Studio JBR, ör. `D:\Program Files\Android\Android Studio\jbr`) → `android/app/build/outputs/apk/debug/app-debug.apk`
- Simgeler/ikon: `node assets/simgeler.mjs`, `node assets/ikon.mjs` + `npx capacitor-assets generate --android --iconBackgroundColor '#0B1B33' --splashBackgroundColor '#0B1B33'`
- Sunucu testi: `SB_GIZLI=<service_role anahtarı> node test/uctan_uca.mjs` (sonra `node test/temizle.mjs`)
- Test ilanları: `SB_GIZLI=... node test/test_ilanlari.mjs` (ekle) / `... sil` (YAYINDAN ÖNCE MUTLAKA SİL)
- Yerel önizleme: `npx http-server www -p 5180 -c-1`

## 5. Veritabanı (özet)
profiller (herkese açık ad + danışman alanları), profil_ozel (tel, ileti, kredi — kredi sütununu kullanıcı değiştiremez), ilanlar (ornek=test, satis_fiyati), favoriler, sohbetler, mesajlar (realtime), okundu, kayitli_aramalar, raporlar (yalnız `rapor_olustur` RPC ile, 1 kredi), kredi_hareketleri, sikayetler, ai_kullanim, bolge_verileri (TÜİK), secim_sonuclari (YSK), bolge_gostergeleri (TCMB/TÜİK/AFAD…). Depo: `ilan-fotolari` (kullanıcı kendi klasörüne yazar).
RPC: ilan_goruntule, teklif_yanitla, hesabimi_sil, favori_sayilari, rapor_olustur, kredi_yukle(_id), yonetici, yonetim_uyeler, yonetim_hareketler, ai_hak_kullan.

## 6. Değişmez kurallar (kullanıcının açık talepleri)
1. **Veri uydurma yok.** Fiyat, istatistik, demografi, seçim, yasa maddesi uydurulmaz. Veri yoksa "yetersiz veri / henüz girilmedi" yazılır. Resmî veriler yönetimden kaynak ve dönemle girilir.
2. Herkese açık sunucuya sahte ilan konmaz; test ilanları `ornek=true`, "Test ilanı" etiketli ve silinebilir olmalı.
3. Değer raporu: kademeli emsal (ilçe → il → Türkiye geneli), kapsam ve güven düzeyi açıkça yazılır; "SPK lisanslı değerleme yerine geçmez" uyarısı kalır. Vade fiyatları: kısa 1–2 ay (alt çeyrek), orta ≤6 ay (ortanca), uzun ≤1 yıl (üst çeyrek); süre garanti değildir.
4. Kullanıcı beyanları (imar, rayiç, cephe…) değer hesabına sayısal katılmaz, "beyan" olarak gösterilir.
5. Gizli anahtarlar (DB şifresi, service_role, Google client secret, GEMINI_API_KEY) koda, sohbete ya da depoya yazılmaz.
6. Her değişiklikten sonra APK derlenip kullanıcıya gönderilir; değişiklik `DEVIR.md` sonuna eklenir.
7. Arayüz: tek renk paleti, dokunma alanları ≥44 px, yüzen öğe yok, tekrar eden menü yok.
8. **Değerlemede piyasa verisinin en yükseği alınır** (kullanıcı kararı, 13.11.2026). Satılık konut m² referansı = TCMB değerleme, sahibindex/Betam ve Emlakjet & Endeksa rakamlarından **en yüksek olanı**; ortanca ya da ortalama alınmaz. Gerekçe: raporlar gecikmeli yayımlanır, değerleme zaman olarak piyasanın gerisinde kalmamalı. Her rakam ilin Endeksa yıllık artışıyla (yoksa Türkiye'ninkiyle) bugüne taşınır (`piyasaRef`, app.js). Yeni rapor gelince `endeks_veri`'ye kaynak ve dönemle eklenir.
9. **Fiyat düşürülmeden önce kullanıcıya rapor sunulur.** Test ilanı ya da değerleme yöntemi güncellenirken fiyatı düşecek kayıtlar değiştirilmez; önce kaç kayıt, hangi bölge ve ne kadar düştüğü raporlanır, kullanıcı onay verirse uygulanır. Artışlar uygulanabilir. Toplu fiyat güncellemesinde fiyat düştü bildirimi ve fiyat geçmişi tetikleyicileri işlem süresince kapatılır, sonra açık olduğu kontrol edilir.

## 7. Açık işler (öncelik sırasıyla)
1. **GEMINI_API_KEY** Supabase Edge Functions → Secrets'a eklenmedi (Google AI Studio'da "Mulkum360 MulkumAI" anahtarı hazır). Eklenene kadar MülkümAI sohbeti hata verir.
2. Google ile giriş: Google Cloud projesi `mulkum360-513814` TEST modunda; test kullanıcısı eklenmeli ya da (ana sayfa + gizlilik politikası adresiyle) yayına alınmalı.
3. Telefonda doğrulanmadı: OpenStreetMap çevre/toplu taşıma/ulaşım süreleri (geliştirme makinesinde Overpass/OSRM DNS engelliydi), PDF paylaşımı, Yönetim ekranları gerçek yönetici hesabıyla.
4. Resmî veri girişi: bolge_verileri (TÜİK nüfus/yaş), secim_sonuclari (YSK 2024), bolge_gostergeleri (TCMB endeksi vb.) boş.
5. Kendi SMTP + e-posta doğrulaması + şifre sıfırlama; KVKK yurt dışı aktarım açık rızası; hukukçu onaylı metinler.
6. Google Play Billing ile kredi satışı (paketler "Yakında").
7. Yayın öncesi: test ilanlarını sil, imzalı release APK/AAB, Play Store listesi.
8. Fikir listesi: fotoğraftan durum analizi (Gemini vision), satıcı güven puanı, TKGM Parsel Sorgu bağlantısı, deprem tehlikesi.

## 8. Gizli bilgiler (pakette YOK — sahibinden ayrıca alınmalı)
- Supabase DB şifresi (eski konumu `.gizli/db-sifre.txt`)
- Supabase service_role anahtarı (CLI: `supabase projects api-keys`)
- Google OAuth client secret (eski konumu `.gizli/google-oauth.txt`; client id config.toml'da)
- GEMINI_API_KEY (Google AI Studio)
