# Mülküm360 — devir notu (05.11.2026)

Emlak + vasıta ilan uygulaması. Tek sayfa web uygulaması (vanilla JS), Capacitor 8 ile Android APK.

## Klasör
- `www/` uygulama: `index.html`, `app.css` (palet + Tektur), `veri.js` (sabitler, ikonlar, yerel tercihler), `sb.js` (Supabase katmanı), `app.js` (ekranlar), `sb-ayar.js` (URL + publishable anahtar), `fonts/` (Tektur gömülü), `lib/` (supabase-js, jsPDF, html2canvas)
- `supabase/migrations/` şema; `assets/logo.svg` (E logosu) + `ikon.mjs`
- `.gizli/db-sifre.txt` veritabanı şifresi (paylaşma)

## Sunucu
- Supabase projesi `mulkum360`, ref `klnabwqduyavaqmbzxpo`, Frankfurt.
- Tablolar: profiller, profil_ozel (telefon, yalnız sahibi), ilanlar, favoriler, sohbetler, mesajlar (canlı), okundu, kayitli_aramalar, raporlar, sikayetler. Depo: `ilan-fotolari` (herkese açık okuma, kullanıcı kendi klasörüne yazar).
- RPC: ilan_goruntule, teklif_yanitla, hesabimi_sil, favori_sayilari.
- E-posta doğrulaması KAPALI (yerleşik e-posta saatte birkaç ileti sınırlı). Kendi SMTP kurulunca açılmalı; şifre sıfırlama da o zaman.
- Kurallar geri alınan işlemle test edildi (scratchpad `rls_test.sql`): başkası adına ilan, telefon görme, kendi teklifini onaylama engelli; anonim mesaj göremez.

## Komutlar (vitrin-app içinde)
- Şema: `npx supabase@2.121.0 db push --linked -p <şifre>`
- APK: `npx cap sync android` → `android\gradlew.bat assembleDebug` (JAVA_HOME = `D:\Program Files\Android\Android Studio\jbr`) → masaüstüne `Mulkum360.apk`
- Önizleme: launch.json `mulkum360` (http-server, 5180)

## Açık işler
- Gerçek hesapla uçtan uca deneme (kayıt, fotoğraflı ilan, iki hesap arası mesaj) telefonda yapılmadı.
- Kendi SMTP + e-posta doğrulama + şifre sıfırlama; KVKK yurt dışı aktarım açık rızası; hukukçu onaylı metinler.
- Moderasyon paneli (şikayetler tablosu dolacak), bildirimler (FCM), imzalı release APK / Play.

## Google ile giriş (05.11.2026)
- Google Cloud projesi mulkum360-513814 (fatura hesabı bağlı; OAuth ücretsiz). OAuth istemcisi (Web), geri dönüş: Supabase /auth/v1/callback. Kimlik + gizli anahtar .gizli/google-oauth.txt; Supabase'e config push ile verildi (env SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET).
- Uygulama derin bağlantısı com.mulkum360.prototip://giris (AndroidManifest + izinli yönlendirme listesi).
- Google uygulaması TEST modunda: yalnız test kullanıcıları girebilir. Test kullanıcısı ekleme konsolda kaydedilemedi (Chrome çevirisi açıkken form çalışmadı). Yayına almak için Markalama'da ana sayfa + gizlilik politikası adresi gerekiyor.
- Yanlışlıkla ikinci bir Mulkum360 Cloud projesi açıldı (ilk deneme); boş, silinebilir.
- Yönetici: fatihcalis07@gmail.com (e-posta veya Google), public.yonetici(); panel #/yonetim.

## v0.5 (05.11.2026)
- Kategori ağacı: emlak 8, vasıta 11 alt kategori (ANA/ALT veri.js; DB check güncellendi). Keşfet ana kategori satırları, #/kategori/<ana>, ☰ yan menü.
- MülkümAI akıllı arama: sorguCoz() oda/işlem/il/fiyat/yıl/vites/yakıt çözer; 6+ haneli sayı = ilan no. Türkçe harflerde \\b yerine (?=\\s).
- Kredi: profil_ozel.kredi (yeni üyeye 1), kredi_hareketleri; rapor yalnız rapor_olustur RPC ile (1 kredi düşer); yönetici kredi_yukle(e-posta, miktar). Üye kredi sütununu değiştiremez (sütun izni). Ödeme (Google Play Billing) henüz yok.
- Rapora MülkümAI değerlendirmesi: kural tabanlı, yalnız hesaplanan verilerden (LLM değil).
- Boş Google Cloud projesi mulkum360 kapatıldı (30 gün içinde silinir).
- Uçtan uca test 30/30 geçti (test/uctan_uca.mjs, temizlik test/temizle.mjs).

## v0.6 MülkümAI (05.11.2026)
- Edge Function mulkum-ai (Gemini 2.5 Flash, ücretsiz katman): sohbet (#/ai), ilan açıklaması yazma (ilan ver adım 3), ilan değerlendirme (ilan detayı). Kişi başı günlük 30 istek (ai_kullanim + ai_hak_kullan).
- Anahtar: Google AI Studio'da 'Mulkum360 MulkumAI' (Varsayılan Gemini Projesi) oluşturuldu. Supabase sırrı GEMINI_API_KEY HENÜZ EKLENMEDİ: asistan anahtar değerini okuyamadı/giremedi (güvenlik kuralı). Kullanıcı ekleyince yeni APK gerekmez.
- Arayüz: başlıkta kredi hapı, Keşfet'te MülkümAI satırı, yüzen öğe yok, dokunma alanları ≥44px.

## v0.7 premium (05.11.2026)
- Alt menü: Keşfet · Favoriler · + · Mesajlar · Hesabım (Zillow/Rightmove deseni; arama ana sayfada).
- Keşfet: koyu hero, selam, Emlak/Vasıta seçici, MülkümAI arama kutusu + örnek cümleler, kaydırmalı alt kategori kartları, MülkümAI ve Değerleme kartları.
- MülkümAI ekranı: karşılama, 4 eylem kartı, sık sorular, yazıyor animasyonu, avatarlı balonlar.
- Premium katman app.css sonunda (gölge, 20px köşe).

## v0.8 palet A (05.11.2026)
- Gece mavisi #0B1B33 + altın #D4A24C (metin için koyu altın #8A6516, açık #F5EEDF). Altın düğmelerde yazı gece mavisi (--vurgu-yazi). Logo, simgeler, açılış ekranı ve PDF rapor da yeni palette.

- Slogan (05.11.2026): "Hayalindekine bir adım." (ana sayfa başlığı + karşılama; "bir adım" altın).

## v0.9 simgeler (05.11.2026)
- Lucide simge seti (ISC lisansı): www/simgeler.js, assets/simgeler.mjs ile üretilir (lucide-static 0.460.0). Kredi = coins, AI = sparkles.
- Liste simgeleri krem kutuda, alt menüde etkin sekme altın çizgi + zıplama, basınca hafif küçülme; hareket azaltma tercihine uyar. Yan menüde liste sıkışması düzeltildi.

## v1.0 editör turu (05.11.2026)
- Tekrarlar kaldırıldı: yan menüden Anasayfa/İlan ver/Bana özel (alt menüde var); Hesabım'dan Favorilerim (sekme) ve Değer hesapla (Keşfet + yan menü). Hesabım: istatistik (görüntülenme, favori, kredi) + Takip ettiklerim + Ayarlar.
- Yan menü: MülkümAI / Emlak / Vasıta / Yardım bölümleri. Yasal metinler birbirine bağlı.
- Arama: alt kategori düğmeleri yalnız Emlak veya Vasıta seçiliyken. Kredi paketleri 'Yakında' (ödeme yok). Değerleme başlığı 'Değer hesapla'.

## Test ilanları (05.11.2026)
- 3 test satıcısı (test-satici-1..3@example.com), 24 ilan, 48 çizim görsel; ilanlar.ornek = true, uygulamada 'Test ilanı' etiketi.
- Silmek: SB_GIZLI=<service_role> node test/test_ilanlari.mjs sil  (yayına çıkmadan önce MUTLAKA silinmeli)

## Rapor v2 (05.11.2026)
- Vade hedef fiyatları (kullanıcı tanımı): kısa 1–2 ay = alt çeyrek, orta ≤6 ay = ortanca, uzun ≤1 yıl = üst çeyrek; süre garanti değildir notu.
- Bölge fiyat analizleri (uygulama ilanlarından, ilçe <3 ise il): 1 ortalama satış, 2 ortalama kira, 3 brüt kira getirisi + amortisman; oda tipi tablosu.
- Demografik/sosyal yapı: bolge_verileri tablosu (yönetici panelinden TÜİK verisi girilir); veri yoksa raporda açıkça yazar. HİÇ VERİ GİRİLMEDİ.

## Yönetim (05.11.2026)
- 'Yönetim paneli' adı 'Yönetim'. Ayrı dosya www/yonetim.js. Sekmeler: Özet, Kullanıcılar, Kredi Tanımla, Şikayetler, Bölge Verisi; üye ayrıntısı #/yonetim/uye?id=.
- RPC (yalnız yönetici): yonetim_uyeler(arama), yonetim_hareketler(uye), kredi_yukle_id(uye, miktar, not; yönetici e-postası nota eklenir).
- Hareket zaman çizelgesi: kayıt, son giriş, ilanlar, raporlar, kredi hareketleri, mesaj özeti, şikayetler, MülkümAI kullanımı.

## Rapor v3 — Endeksa tarzı (05.11.2026)
- www/rapor.js: çok sayfalı A4 (kapak + QR, danışman, değer analizi + dağılım grafiği + MülkümAI, emsaller + bölge tablosu ilçe/il/platform, konum haritası + önemli konumlar, bölge analizleri + demografi, yöntem/yasal). PDF her sayfayı ayrı render eder.
- Ücretsiz veri: Photon (komoot) / Nominatim adres → koordinat; OSM karo haritası 150/300/600 m; Overpass ile 500/1000/1500 m eğitim, sağlık, ulaşım, alışveriş, park. İstekler zaman sınırlı (9–10 sn).
- Bu bilgisayarda Nominatim/Overpass DNS engelli (sandbox); önemli konumlar telefonda doğrulanmadı.
- Profil: firma, unvan, slogan, hakkımda (danışman sayfası). Rapor öncesi isteğe bağlı: kimin adına, adres, ada/parsel.

- Emsal kademesi (05.11.2026): ilçe → il → Türkiye geneli (aynı tür+işlem); kapsam sonuçta ve raporda yazar, Türkiye geneli ise güven 'Düşük' ve uyarı. İlan sayfasındaki karşılaştırma yalnız bölgesel.
- Test ilanları 46'ya çıktı (işyeri, arsa, bina, yazlık, Kadıköy satılık, Çankaya kiralık eklendi).

- Seçim (05.11.2026): secim_sonuclari tablosu (YSK, yönetici girer; Yönetim > Seçim, 'Parti;oran' satırları). Raporda türe göre çubuk grafik, ilçe yoksa il geneli. bolge_verileri'ne yaş grupları (0–19, 20–39, 40–59, 60+) eklendi; raporda grafik. HİÇ VERİ GİRİLMEDİ.

## Rapor v4 (05.11.2026) — www/rapor2.js
- Toplu taşıma (metro, tramvay, tren, vapur, otobüs durağı/terminal; en yakın + yürüyüş), ulaşım süreleri (OSRM: il merkezi, hastane, havalimanı), çevre (sahil, yeşil alan, otoyol, demiryolu, havalimanı, sanayi, atık, yüksek gerilim, baz istasyonu), rakım (OpenTopoData), güneş (astronomik).
- Fiyat trendi (aylık m² ortancası), piyasa davranışı (satılma süresi, pazarlık payı = satis_fiyati, ilgi endeksi), resmî göstergeler (bolge_gostergeleri; Yönetim > Göstergeler).
- Kullanıcı beyanı (cephe, kat, manzara, otopark, site, tadilat, iskân, aidat) + kredi hesabı; imar (KAKS, TAKS, Hmax → inşaat alanı, taban, kat); belediye rayiç bedeli; saha/dron fotoğrafları (depoya yüklenir).
- 'Satıldı' derken gerçekleşen fiyat sorulur (isteğe bağlı, ilanlar.satis_fiyati).
- Bu bilgisayarda Overpass/OSRM/OpenTopoData erişilemiyor; çevre sayfası telefonda doğrulanmadı.


## 06.11.2026
- MülkümAI: gemini-2.5-flash yeni kullanıcılara kapatılmış (404). Model gemini-3.8-flash yapıldı, fonksiyon yeniden yüklendi. GEMINI_API_KEY eklendi.
- Google girişi: Publish app için Branding (ana sayfa + gizlilik politikası adresi) gerekli; şimdilik test modunda.
- Google OAuth uygulaması YAYINDA (In production). Ana sayfa: https://fatihcalis07-commits.github.io/mulkum360/ , gizlilik: .../gizlilik.html (GitHub deposu fatihcalis07-commits/mulkum360, kaynak vitrin-app/site). Yetkili alan fatihcalis07-commits.github.io eklendi.
- MülkümAI: 503 yoğunluk hatasına karşı yedek modeller (gemini-flash-latest, gemini-flash-lite-latest) ve 25 sn zaman aşımı eklendi. Önceki düzenlemede bozulan Türkçe karakterler onarıldı.
- MülkümAI: cevaplar yarım kalıyordu (maxOutputTokens 800, düşünme adımı da bu sınırdan yiyor). 8192 yapıldı.
- Test ilanları 500'e çıkarıldı (temel 46 + fiyat/m² ±%15, tarih 0–90 gün türetilmiş; görseller paylaşımlı). Hâlâ ornek=true, yayından önce sil.
- Rapor: Overpass cevabı ~20 sn sürüyordu, 10–15 sn sınırda düşüyordu → 3 ayna aynı anda, 45 sn (overpassYaris). Rakım OpenTopoData (CORS engelli) yerine Open-Meteo.
- Resmî veri: veri/nufus_2025.sql (TÜİK ADNKS 2025, 81 il) ve veri/secim_2024.sql (YSK sonuc.ysk.gov.tr API, 31.03.2024 belediye meclisi; 81 il + ilçeler, 4297 satır; Türkiye toplamı YSK ile tutarlı). SQL Editor'de çalıştırılacak.
- Rapor: 'Deprem ve Yapı Güvenliği' sayfası (rapor2.js depremVerisi/yonetmelikDonemi): bina yaşından yönetmelik dönemi (1998 öncesi/1998/2007/TBDY 2018) + USGS kataloğundan 100 km içinde 1976'dan beri M≥5 depremler. AFAD TDTH e-Devlet girişi istediği, AFAD olay API'si boş döndüğü için kullanılamadı.
- Göstergeler yüklendi (veri/gostergeler_2026.sql, 305 satır): TCMB EVDS 2026-3Ç il bazında konut birim fiyatı (76 il) ve birim kirası (74 il, TL/m²/ay), bunlardan hesaplanan brüt kira getirisi, KFE Eylül 2026 yıllık %22,34 (Türkiye geneli). Kaynak sayfası: TCMB KFE-Tablo.pdf içindeki EVDS portlet bağlantıları.
- Rapor hazırlama: toast yerine tam ekran ilerleme (app.js raporIlerleme: 5 adım, geçen süre). raporEkVeri artık paralel: resmî veriler konumla aynı anda, çevre+deprem birlikte, demografi de paralel.
- Çevre verisi önbelleği: cevre_onbellek tablosu (migration 20261106100000), anahtar = lat/lon 3 ondalık (~100 m), 30 gün. rapor2.js cevreVerisi önce önbelleğe bakar, yoksa cevreVerisiCanli.

## 06.11.2026 akşam
- MülkümDeko: ilan sahibi oda fotoğrafını Modern/Klasik/İskandinav/Rustik stilde AI ile döşer (mulkum-ai `gorev: 'deko'`, gemini-2.5-flash-image). Görseller alanlar.deko'da; ilanda önce/sonra kaydırıcı + "mobilya dahil değil" uyarısı. Günlük 12 sınır (deko_hak_kullan).
- Satıcı profili #/uye/:id; soyadı baş harfi gizleme ve açık telefon (profiller.soyad_gizle, acik_tel).
- Bina yaşı grupları filtrede (yasGrubu).
- Migration 20261106200000_deko_gizlilik.sql — SQL Editor'de çalıştırılmalı. İstemci sütunlar yoksa eski alanlarla çalışır.
- Ertelenen: mahalle listesi/filtresi, ilan içe aktarma (Sahibinden vb. otomatik çekme sözleşme gereği yapılmadı).
- Migration 20261106200000 CLI ile uygulandı (db query --linked -f), doğrulandı.
- İl/ilçe/mahalle: www/mahalle/{plaka}.json (turkey-neighbourhoods 4.0.3, MIT, 73.305 mahalle), konumSecBagla(); ilan formu ve filtrede. Mahalle alanlar.mahalle'de.
- İlan içe aktarma: İlan ver 1. adımda metin yapıştır → mulkum-ai `ice_aktar` JSON → taslak. Başka sitelerden otomatik çekme yapılmadı (sözleşme/bot koruması).
- Kullanıcı emsali: değerleme formunda 'Kendi emsallerin' (v.elEmsal) emsaller() havuzuna eklenir, raporda 'Kullanıcının eklediği emsal' etiketiyle. Lisanslı veri talebi taslağı: veri_talebi.md.
- sahibindex/Betam aylık raporları (ücretsiz, betam.bahcesehir.edu.tr): 300 gösterge, 30 il (m² satış/kira, yıllık değişim, ilan kapanma süresi), dönem 2025-12…2026-09. veri/sahibindex_2026.sql. Her ay yeni rapor docx'i indirilip scratchpad betam.mjs ile güncellenebilir.
- TÜİK konut satışları (81 il, 2026-09): aylık adet, yıllık değişim, ilk el payı, ipotekli payı, 2025 yıllık toplam; 405 satır. Kaynak: databrowser2.tuik.gov.tr JSON-stat API (DF_SATIS_SEKLI_DURUMU_ILILCE_V3). Güncelleme: node scratchpad/tuik_satis.mjs <çıktı.sql> 2026-10 → db query --linked -f. veri/tuik_konut_satis_2026_09.sql
- Emlak ofisleri: Hesabım > 'Emlak ofisleri için' — #/toplu CSV toplu ilan yükleme (csvOku/satirIlan, en çok 100, onay kutusu), Emlakçı davet et (DAVET_METNI, emlakci_davet.md), 'Emlak ofisi' rozeti (firma ya da profiller.yetki_no; migration 20261106210000 uygulandı).
- Toplu yüklemede fotoğraf: CSV ile birlikte seçilen resimler adının başındaki ilan numarasına göre (1326396201_1.jpg) ilgili ilana eklenir, ilan başına 15, ad sırasıyla.
- Hesabım > İlanlarım: her ilanda 'Fotoğraf ekle' (data-fotoekle), fotoğrafsız ilanlar çizgili düğmeyle öne çıkar.
- Arayüz: sürüklenebilir MülkümAI düğmesi (aiDugme, yeri localStorage aiKonum), kartlarda favori kalbi + foto sayısı/AI dekor rozeti, tam ekran foto (fotoGoster), ilan gücü göstergesi (ilanGucu/gucHtml), günün ipucu, başarıda konfeti+titreşim (kutla, toast'tan tetiklenir), giriş animasyonları. Düzeltme: karşılama ekranında Google düğmesi bağlanmıyordu (ciz erken dönüyordu).
- Profesyonel görünüm: gövde fontu Inter (fonts/inter.css, yerel woff2; Tektur yalnız logo/hero), ana düğme lacivert/beyaz (--birincil), ince gölge ve kenarlıklar, odak halkası. Veri girişi: ≤7 seçenekli alanlar dokunmalı seçim düğmesi (data-secim), sayı/metin alanlarında ONERI datalist, değerleme formunda ilçe listesi.
- Emlakçı paneli #/panel(/gorev|musteri|not): özet (aktif ilan, görüntülenme, sohbet, bugünkü görev), kısayollar, görev/randevu (hızlı tarih, tamamla), müşteri talebi (ara/WhatsApp, uygun ilan sayısı → arama), notlar. Tablo panel_kayit (RLS yalnız sahibi; migration 20261106220000 uygulandı).
- Başlık/etiket/düğme metinleri CSS text-transform:capitalize (html lang=tr ile İ doğru). m² etiketleri ㎡ tek karakteriyle (büyümemesi için). Açıklama ve onay cümleleri normal yazım.
- Emlakçı gözüyle: yeni emlak alanları (kat sayısı, aidat, cephe, site, otopark, asansör, balkon, manzara — ALANLAR sonuna), m² birim fiyat, 'Fiyat düştü' (alanlar.oncekiFiyat, ilanKaydet'te), harita bağlantısı, kredi hesabı (faiz kullanıcı girer), benzer ilanlar, randevu isteği (sohbete mesaj).
- Başlık yazımı CSS capitalize yerine JS (basHarfBuyuk/baslikDuzelt + MutationObserver, BASLIK_SECICI): Türkçe i→İ, bağlaçlar küçük (ve, ile, veya…), kısaltmalar/sayılar korunur, tireli kelimede yalnız ilk harf. CSS capitalize Türkçe 'i'yi 'I' yapıyordu.
- Bildirim: @capacitor/local-notifications 8.3.1. Yeni mesaj (realtime, gorunenAd), kayıtlı aramaya yeni ilan (açılış/resume, localStorage aramaBildirilen), panel görev hatırlatması (30 dk önce, uygulama kapalıyken de; gorevHatirlatKur). Hesabım > Bildirimler aç/kapa. Uygulama tamamen kapalıyken mesaj push'u için FCM gerekir (yapılmadı).
- Filtre: site, asansör, otopark, eşya, en çok aidat. İlan performansı (görüntülenme/favori/mesaj/gün) Hesabım'da. Video ve 360° tur bağlantısı (alanlar.video/tur360, yalnız https).
- Doğrulama: profiller/ilanlar.dogrulanmis (tetikleyiciyle yalnız yönetici değiştirir), dogrulama_talepleri, dogrulama_karar RPC; Yönetim > Doğrulama sekmesi; rozetler 'Doğrulanmış ofis' / 'Tapu bilgisi doğrulandı'. Migration 20261106230000 uygulandı.
## 07.11.2026 Banka kredisi
- www/banka.js: #/bankakredi hesaplayıcı (konut/taşıt/ihtiyaç, tutar, peşinat, vade) + banka teklifleri aylık taksite göre sıralı; ilan sayfasındaki kredi kartı da bunu kullanır (ilanKrediTeklifleri). Yan menüde 'Kredi hesapla, banka teklifleri'.
- Taşıt/ihtiyaçta faize %15 KKDF + %15 BSMV eklenir, konut muaf (VERGI_ORANI). Tahsis ücreti toplam geri ödemeye eklenir.
- Tablolar banka_teklifleri (herkes okur, yönetici yazar) ve kredi_ortalama (TCMB EVDS piyasa ortalaması); migration 20261107090000 uygulandı. Yönetim > Banka Teklifleri sekmesi.
- HİÇ TEKLİF GİRİLMEDİ. Banka banka otomatik veri için HangiKredi/Enuygun/Hesapkurdu iş ortaklığı API'si bekleniyor (sitelerden çekme yapılmadı: HangiKredi botları 403 ile engelliyor).
- Edge Function evds-kredi (--no-verify-jwt): EVDS TP.KTF10 ihtiyaç, TP.KTF11 taşıt, TP.KTF12 konut (EVDS_SERILER ile değiştirilebilir), son 60 gün → kredi_ortalama. pg_cron 'evds-kredi' her gün 06:15 UTC (09:15 TR), migration 20261107100000 uygulandı.
- EVDS_API_KEY sırrı HENÜZ YOK (fonksiyon 503 dönüyor). Anahtar eklenince seri kodları ilk çalıştırmada doğrulanmalı. Yeni APK gerekmez.
- Hesap türü: profiller.hesap_turu (bireysel|ofis; migration 20261106240000, firma/yetki girmiş olanlar ofis yapıldı). Kayıtta Bireysel/Emlak ofisi seçimi (ofis: firma zorunlu, yetki no isteğe bağlı); Google ile kayıtta seçim localStorage kayitTuru ile hatırlanır (kayitTuruUygula). Profilde değiştirilebilir. İlanlarda 'Kimden' (kimden(i)), filtre ve kart rozeti; Hesabım'da ofis bölümü yalnız ofis hesaplarında.

- 07.11: kredi-guncelle (Gemini + google_search) yazıldı, yüklendi; ücretsiz kotada arama yok (429), cron kaldırıldı. Faturalandırma açılırsa cron.schedule ile yeniden kurulur (migration 20261107110000). Banka sayfaları test edildi: oranlar çoğunda JavaScript ile yükleniyor, düz çekme çalışmıyor (yalnız İş Bankası sayfasında oran metni var).
- 07.11: EVDS_API_KEY eklendi. EVDS adresi değişmiş: evds2/service/evds artık HTML döndürüyor, yeni uç evds3.tcmb.gov.tr/igmevdsms-dis/ (key başlıkta). evds-kredi çalıştı, 24 satır yazıldı.
- 07.11: pg_cron 'gunluk-temizlik' (00:30 UTC): cron geçmişi 7 gün, cevre_onbellek 30 gün, ai_kullanim 60 gün, kredi_ortalama 2 yıl. Migration 20261107120000 uygulandı.
- 07.11: İlan aktarma bağlantı kabul ediyor: mulkum-ai ice_aktar + url → linkMetni (tek sayfa, normal UA, IP/localhost engelli, bot koruması aşılmaz; engellenirse 'metni kopyala' uyarısı). APK yenilendi.
- 07.11: İlan formunda Sokak / cadde (alanlar.sokak, Photon highway önerisi il+ilçe ile, kapı no kırpılır), mahalle kutusu 'Önce ilçe seç'. Antalya/İstanbul test edildi. Harita bağlantısı sokağı da kullanır.
- 07.11: sahibinden/shbd.io bağlantısı Cloudflare 403 veriyor (aşılmaz). İçe aktarmada bu bağlantılar için 'ilanı aç, metni kopyala' yardımı (#iaYardim) gösteriliyor.
- 07.11: İlan ver uyarıları alt çubuğun arkasında kalıyordu; hataGoster (toast + kaydırma) eklendi.
- 07.11: İçe aktarma: alan şablonu ALANLAR'dan (sema) sunucuya gider; sayiCoz (4,5 milyon / 4.500.000 TL / 120 m²) ve secenekBul ile değerler normalize edilir; sokak da alınır.
- 07.11: İçe aktarmada açıklama aynen alınır (istem); AI boş/kısa dönerse aciklamaSec yapıştırılan metni (telefon/e-posta/bağlantı temizlenmiş) kullanır.
- 07.11: Toplu yükleme XML destekliyor (xmlOku: tekrar eden kayıt öğesi, OpenImmo <immobilie>; SUTUN'a XML/OpenImmo etiketleri eklendi; fotoğraf bağlantıları urlDosya ile indirilir, CORS izin vermezse atlanır). Fiyat sayiCoz ile; sayı oda N → (N-1)+1. Yabancı il tanınmaz (yalnız Türkiye).
- 07.11: #/yardim toplu yükleme rehberi (www/yardim.js, 8 bölüm). Bağlantıdan otomatik aktarma: cordova-plugin-inappbrowser 7.0.0; sayfadanOku ilanı telefonda açar, kullanıcı 'Mülküm360''a aktar'a basınca görünen metin + büyük img adresleri alınır (tek sayfa, kullanıcı isteğiyle). Sunucu okuyamazsa (sadeceDene) otomatik bu yola geçer. ice_aktar sayfa:true ile 9000 karakter. Telefonda henüz denenmedi.
- 07.11: İlan sayfası yeniden düzenlendi (emlak portalı sırası): fiyat+başlık, il › ilçe › mahalle yolu, ilan no/tarih, öne çıkan 4 bilgi şeridi (.one-serit), açıklama üstte (420+ karakterde Devamını oku), iki sütunlu İlan bilgileri tablosu (.bilgi-tablo), satıcı kartı, sonra fiyat analizi/konum/kredi.
- 07.11: secenekBul: yön birleştirme (Kuzey, Batı → Kuzeybatı), en uzun eşleşme, rakam sınırı. Fotoğraf: sunucu linkFotolar (og/JSON-LD/img/sayfa içi JSON) + uygulama içi tarayıcıda zengin toplama; galeriSec benzer ilan görsellerini ayıklar; urlDosya telefonda CapacitorHttp (CORS yok). hurriyetemlak → hepsiemlak, Cloudflare'li; telefonda uygulama içi tarayıcı yoluyla.
- 07.11: Sarı palet: vurgu #FFC72C (koyu tema #FFD24D), --vurgu-ikon #D99A00, zemin #F6F6F3, açık temada header.ust sarı + lacivert yazı, theme-color #FFC72C. Uygulama simgesi ve açılış ekranı eski (lacivert-altın) kaldı.
- 07.11: #/performans (www/performans.js): dönem filtresi, satılan/kiralanan adet ve hacim, ortalama süre, pazarlık payı, kapanma oranı, tahmini komisyon (oran/taraf localStorage perfAyar), son 12 ay grafiği, bölge kırılımı, kapanan ilanlar. ilanlar.kapanis + tetikleyici ilan_kapanis (migration 20261107130000 uygulandı).
- 07.11: Bölge konut fiyat endeksi kartı (www/endeks.js, ilan sayfasında Konum'un altında): tablo kfe (TCMB KFE aylık 2010-01'den, 2023=100; TR + 13 İBBS-2 + TR7/TR8/TR9/TRA/TRB/TRC; EVDS seri TP.KFE.<bölge>, liste bie_kfe). Edge Function evds-kfe, pg_cron her ayın 22'si. 1/5/10 yıl değişim, 10 yıllık grafik (Türkiye kesikli), il değerleme birim fiyatından geriye tahmini m², ilanın m² farkı. Migration 20261107140000 uygulandı.
- 07.11: Endeks kartı başlığı '<Mahalle> Mahallesi konut endeksi'. Bugünkü m²: uygulamadaki aynı mahalle → ilçe → il satılık konut ortancası (≥3 ilan), yoksa TCMB il değerleme; geçmiş TCMB KFE ile geriye. Test ilanları 692'ye çıktı: tüm test emlak ilanlarına gerçek mahalle (ilçe başına 4), 12 ilçe × 4 mahalle × 4 satılık konut (192 yeni, fiyat il birim fiyatı ±%20). Hepsi ornek=true, yayından önce silinmeli.
- 07.11: İlan aktarmada bilgi ekranı (aktarIlerleme): İlan sayfası açılıyor → Sayfa okunuyor → MülkümAI → Fotoğraflar n/N → Form dolduruluyor (bulunan alanlar), geçen süre; uygulama içi tarayıcı açıkken gizlenir.
- 07.11: İlan sayfası sekmeleri (www/sekme.js): İlan Bilgileri / Açıklama / Konumu / Çevre, yapışkan sekme çubuğu. Konum: Photon sokak→mahalle→ilçe, il/ilçe tutarlılık kontrolü, localStorage önbellek, OSM embed harita + Google Haritalar/yol tarifi; endeks kartı Konumu sekmesinde. Çevre: Overpass 1 km (okul, market, eczane, sağlık, ulaşım, park, spor, cami, kafe, banka), cevre_onbellek 'g:' anahtarı. Edge Function cevre (yedek) yüklendi ama Overpass bulut IP'lerini reddediyor (406/zaman aşımı); bu PC'den de erişilemiyor, telefonda doğrulanmadı.
- 07.11: Fotoğraf sınırı 30 (FOTO_SINIR, ilanlar_fotolar_check <= 30, migration 20261107150000 uygulandı).
- 07.11: Kullanıcı isteğiyle sahibinden benzeri palet: üst çubuk #FFE800, yazı #333, düğme/bağlantı mavi #1064BC (app.css sonu). Ad/logo Mülküm360. Marka/Play taklit riski kullanıcıya bildirildi.
- 07.11: Çevre Overpass yerine Photon reverse (osm_tag süzgeci): 16 kategori (okul, hastane, klinik, eczane, raylı, otobüs/dolmuş, AVM, market, polis, restoran/kafe, otel, benzin, park, cami, otogar, havalimanı) 4 grup isteğinde (CEVRE_GRUP), cevre_onbellek 'p:'. Photon kamu sunucusu makul kullanım sınırlı; bu PC test sırasında geçici engellendi. Ölçekte kendi Photon sunucusu ya da ücretli geocoder gerekir.
- 07.11: ALANLAR emlak sonuna ada, parsel, eids. Edge Function parsel (TKGM MEGSİS cbsapi v3; il/ilçe/mahalle id eşleme Türkçe karakter katlamalı; lat/lon ile de sorgu). İlan sayfasında Ada/Parsel (TKGM) kartı, EİDS rozeti (beyan); konum ada/parsel varsa parsel merkezi (duzey parsel).
- 07.11: Fotoğraf sınırı 40 (FOTO_SINIR, ilanlar_fotolar_check <= 40, migration 20261107160000 uygulandı). İlan alt çubuğunda satıcı telefonu açıksa Ara (tel:) ve WhatsApp (wa.me, 90'lı numara, hazır mesaj) düğmeleri; güvenlik uyarısındaki WhatsApp ifadesi ödeme yönlendirmesi olarak değiştirildi. Hesabım'da 'Uygulama sürümü' (SURUM sabiti) — her APK'da güncelle. İlerleme ekranı tarayıcıda doğru; telefonda görünmemesi büyük ihtimalle eski APK.
- 07.11 (sürüm 1.1): Uygulama içi tarayıcıda hepsiemlak alt çubuğu sarı düğmeyi örtüyordu (kullanıcı ekranı). Kapatma düğmesi '✓ Aktar' oldu; sayfa 1,8 sn'de bir arka planda okunur (OKUHER), kapatınca son okunan sayfa (>400 karakter) aktarılır. Sarı düğme bottom:96px ve documentElement sonuna. İlerleme artık aktarma penceresinin içinde (aktarIlerleme(adimlar, kap)).
- 07.11 (sürüm 1.2): Uygulama içi tarayıcı otomatik: sayfa metni oturunca (iki okumada ±50 karakter) galeri için aşağı kaydırılır (KAYDIR), metin tekrar oturunca kendiliğinden kapanır ve aktarma sürer; 45 sn sınır. ✓ Aktar ile beklemeden kapatılabilir.
- 08.11 (sürüm 1.3): Tanılama tablosu istemci_kayit (migration 20261107170000; 14 gün; okuma: CLI). Aktarma adımları kayit() ile yazılır: aktar_basla, tarayici_ac, loadstop, loaderror, okuma, tarayici_bitti, aktar_tamam/hata. Kullanıcı telefonunda eski APK kalmıştı (üst çubukta 'Vazgeç'); APK adı artık sürümlü (Mulkum360-1.3.apk).
- 08.11: android/app/build.gradle versionCode 13 / versionName 1.3 (önceden hep 1). Her yeni APK'da versionCode ve SURUM birlikte artırılmalı.
- 08.11 (sürüm 1.4, versionCode 14): Tanılama gösterdi: her 1,8 sn tüm HTML'i tarayan okuma, Android'de ortak JS iş parçacığını kilitliyordu (okuma cevapları gelmiyor, exit işlenmiyor). Yeni: son loadstop'tan 3 sn sonra bir kez kaydırma, 3,5 sn sonra tek hafif okuma (innerText + img/og, innerHTML taraması yok) ve otomatik kapanma; sarı düğme için yalnız window.__m360 kontrolü (1,5 sn).
- 08.11 (sürüm 1.5): Aktarma telefonda çalıştı (kayıt: 5195 karakter, 36 foto → başlık, fiyat, m², oda, konum, açıklama, 35 foto). Otomatik okuma ilk denemede cevapsız kaldı; 3 kez yeniden deneme eklendi.
- 08.11: MülkümDeko çalışmıyor: gemini-2.5-flash-image ve gemini-3-pro-image-preview bu anahtarda 429 (ücretsiz kota yok). Seçenek: Gemini faturalandırma ya da NVIDIA NIM FLUX Kontext (kullanıcının ücretsiz anahtarı; Supabase sırrı NVIDIA_API_KEY gerekir). Hata metni düzeltildi.
- 08.11: NVIDIA FLUX Kontext ücretsiz uç noktası yalnız example_id kabul ediyor (base64 ve asset_id 422) → kullanılamaz. Pollinations anahtarsız kontext kapalı. MülkümDeko'ya Pollinations eklendi: POLLINATIONS_API_KEY (sk_) varsa gen.pollinations.ai/v1/images/edits, model flux.1-kontext-pro (0,03 pollen) → flux.2-klein-4b; yoksa/başarısızsa Gemini. Anahtar kullanıcı tarafından eklenecek; uç nokta şekli anahtar gelince test edilmeli.
- 08.11: POLLINATIONS_API_KEY eklendi; MülkümDeko Pollinations flux.1-kontext-pro ile çalışıyor (~10 sn). İstem 3 kez denendi: ilki çok az değiştiriyordu, ikincisi kadrajı ve oda ölçüsünü değiştiriyordu; şimdiki istem aynı kadraj + dağınıklık temizliği + eşyaları yerinde yenileme. Zor fotoğraflarda (ön planda kapı kenarı vb.) model kadrajı yine biraz genişletebiliyor. Test görselleri geçici hesaplarla üretildi (4 dosya ilan-fotolari/<silinmiş uid>/deko-*.png), istenirse silinir.
- 08.11: MülkümDeko stilleri lüks tanımlandı (STILLER: tasarım mobilya, kadife/bukle, mermer, pirinç, kristal avize vb.), istemde 'upscale interior-design magazine'. Model bazen bir duvarı koyu boyayabiliyor ve kadrajı biraz genişletebiliyor; ilanda 'yapay zekâ ile oluşturuldu, mobilya dahil değil' uyarısı ve önce/sonra kaydırıcısı var.
- 08.11: MülkümDeko oda türüne göre: STILLER yalnız malzeme/renk, ODA_ESYA (living room/bedroom/kitchen/bathroom) ne kalır-ne yenilenir-ne eklenmez. Mutfakta kanepe eklenmiyor, yerleşim korunuyor; Kontext Pro mutfakta temkinli (fayans çoğu zaman aynı kalıyor). Daha güçlü dönüşüm istenirse flux.2-klein ya da başka model denenebilir.
- 08.11: MülkümDeko istemi: 'award-winning interior architect' çerçevesi, kapı/dolap kapağı/fayans/aydınlatma dahil komple yenileme (yer ve ölçü aynı), tam declutter (tezgâhta en çok bir vazo). Mutfak testinde başarılı. Son denemede Pollinations cevap vermedi → Gemini 429; muhtemelen pollen bakiyesi ya da anahtar bütçesi bitti (testlerde ~9 görsel).
- 08.11: İstem: kapı/pencere/açıklık sayısı ve yeri birebir aynı (yeni kapı eklenmez, duvar kapıya dönmez); yalnız var olan kapılar yenilenir. Mutfak testinde model sağ duvara kapı eklemişti.
- 08.11: Pollinations bakiyesi yüklendi, anahtar ücretli Pollen'e izinli; MülkümDeko çalışıyor (8–9 sn). Oturma odası: kapı/pencere/kolon yerinde, lüks ve tutarlı. Mutfak: komple yenileniyor ama model yerleşimi ve kapı konumunu tam koruyamıyor (arka kapı kayboldu, tezgâh L oldu). Hata ayrıntısı cevapta 'ayrinti' alanında (Pollinations mesajı).
- 08.11 (sürüm 1.6, versionCode 16): MülkümDeko ücretli: her görsel 1 kredi (deko_kredi_kullan önce düşer; başarısızsa deko_kredi_iade, son 10 dk, migration 20261108100000). Günlük 12 sınırı kaldırıldı. Uygulamada bakiye + 'Görseli oluştur · 1 kredi', kredi yoksa 'Kredi al' (#/kredi). Kredi satışı için Google Play Faturalandırma henüz yok (Play Console gerekli).

## Instagram sayfası (07.11.2026)
- Kullanıcı Mülküm360 Instagram hesabını aldı; sayfa doldurma paketi hazır: `pazarlama/instagram/PLANLAMA.md` (profil bio 3 seçenek, ilk 12 gönderi metni, 8 reels planı, haftalık takvim, büyüme hamleleri, yayın öncesi kontrol listesi).
- Görseller: `pazarlama/instagram/gorseller/` — profil fotoğrafı, 6 gönderi kapağı (1080×1350), 3 reels kapağı (1080×1920), 4 öne çıkan kapağı; marka paleti + Tektur + logo. Üretim betiği: `pazarlama/instagram/uret_gorseller.py` (Tektur TTF'ler `pazarlama/fonts/` — Google Fonts'tan indirildi, latin+ext birleşik, Türkçe tam).
- Not: hesap henüz otomasyon tarayıcısında oturumlu DEĞİL; paylaşım için kullanıcı girişi gerekiyor. Test ilanları silinmeden hesap büyütülmemeli (kural).
- 08.11 (sürüm 1.7, versionCode 17): (1) Belgeden ilan: www/belge.js, mulkum-ai gorev belge_oku (Gemini görsel; tapu ya da ruhsat; kişisel veri istemde yasak, fotoğraf saklanmaz). Tapu: il/ilçe/mahalle ILLER ve mahalle listesine eşlenir, ada/parsel/m²/kat/tip/tapu türü; ruhsat: marka/model/yıl/yakıt/kasa/renk. (2) Ücretsiz drone çekimi: drone_talepleri (migration 20261108110000), ilan sahibi kartı #droneK, Yönetim > Drone (durum/çekim tarihi/not). (3) Dil: www/dil.js (TR/EN/RU), Edge Function cevir (--no-verify-jwt, Gemini flash-lite, tablo ceviri migration 20261108120000, cihazda localStorage ceviri_<dil>); MutationObserver metin+placeholder/aria-label/title; .logo ve [data-cevirme] hariç; Türkçe büyük harf düzeltmesi yabancı dilde kapalı. Dil seçici Hesabım ve yan menüde.

## 1.8 (08.11.2026)
- Dil seçimi satırı düzeltildi: başlık üstte, Türkçe/English/Русский 3 eşit sütun. Liste içindeki div.oge satırlarına (dil, uygulama sürümü) eksik olan iç boşluk ve ikon kutusu eklendi; sürüm yazısı tek satır.

## Instagram @mulkum360 CANLI (08.11 ~01:50)
- ⚠️ DERS (08.11 02:40): Profil fotoğrafını var olan fotoyu kontrol etmeden "doldurma paketi"nin parçası diye değiştirdim; kullanıcı eskisini istiyor. KURAL: kullanıcının var olan içerik/ayarlarını tek onaysız değiştirme. Geri alma: web'de "önceki fotoğraflar" şeridi YOK (denendi) → telefondan Profili düzenle > Fotoğrafı değiştir > "Güncel olmayan profil fotoğrafları". Kullanıcı eski dosyayı verirse yükleme akışı hazır (1 dk).
- ÇÖZÜLDÜ (08.11 02:50): Kullanıcı "eski logoyu nereden bulduysan oradan al" dedi → kaynak assets/icon-only.png + icon-background.png (tam kare eski logo). Composite: gorseller/profil-foto-eski.jpg (1024×1024) edit sayfası input[type=file] ile yüklendi; sunucu artık 1024 etiketli yeni fotoyu veriyor (avatar ölçümü tam kare doğruluyor).
- DM teslim (08.11 03:40): calis_fatih'e geçip @mulkum360 DM sohbetine (thread 17963944011079944) 5 sarı kapak + iki açıklama notu gönderildi (sahte ClipboardEvent paste — sohbet kutusu role=textbox DIV, input yok; teker teker blob-beklemeli gönderim; ilk parti de ulaşmış, 10 görsel var, "SON 5'İ KAYDET" notu yazılı). Web'den hikâye/öne çıkan ÜRETİLEMİYOR (composer yok; yükleme istekleri bloks'ta, yakalanamadı) → telefon: DM'den kaydet → hikâyeye at → Öne çıkan (ev/vasita/MülkümAI/rapor/indir). Geçiş notu: JS "Profil değiştir" akışı çalışır; tam navigasyon yaptığından runjs "navigated" hatası başarı demektir.
- Otomasyon Chrome'unda calis_fatih ile giriş (WhatsApp 2FA kodu ile) → yan menü Ayarlar → "Profil değiştir" ile @mulkum360 profiline geçildi (aynı Meta login'in ek profili; ayrı şifre gerekmedi).
- Profil fotoğrafı yüklendi: gorseller/profil-foto.jpg (CDP DOM.setFileInputFiles; 'Profil fotoğrafı eklendi').
- Bio (B seçeneği) KAYDEDİLDİ: "Türkiye'nin emlak pazarına yeni adres. / İlan ver, mesajlaş, MülkümAI ile rapor al. / Hayalindekine bir adım. 👇"
- İLK GÖNDERİ YAYINDA: G1 tanıtım · shortcode DfdSQiSDc3h · https://www.instagram.com/mulkum360/p/DfdSQiSDc3h/ (açıklama PLANLAMA.md G1 birebir; JPEG'e çevrilmiş hali gorseller/gonderi-01-tanisma.jpg). Açıklama metinleri artık pazarlama/instagram/metinler/'de.
- İlk dakikalarda 3 geri takip: onurmun, calis_fatih, ademyasan.realty.world.borsa.
- WEB'DE YAPILAMAYANLAR: (1) Bağlantı/website alanı kilitli — "Bağlantılarını sadece mobil cihazlarda düzenleyebilirsin" → telefondan Profili düzenle > Bağlantılar → https://fatihcalis07-commits.github.io/mulkum360/ eklenecek. (2) Gönderi sabitleme web menüsünde yok (hesap zaten İşletme: düzenlemede kategori + halka açık bilgiler var; yeni çoklu-profil sistemi web'de gizliyor) → telefondan G1'e basılı tut → Profili sabitle. (3) Web oluştur sihirbazında Hikaye/Reels sekmesi yok → hikaye/öne çıkan kapakları telefondan (hikaye-one-cikan-*.jpg hazırlandı).
- Link denemeleri (08.11 gece): formun kendi uç noktası yakalandı (POST /api/v1/web/accounts/edit/, fb_dtsg DTSGInitialData'dan) — external_url dolu gönderildi, "status":"ok" döndü ama sunucu alanı yok saydı (profil ve edit formunda boş). profile_links/user_links uçları 404. Web yolu kapalı; checkpoint riskine girmeden bırakıldı. Bio bu denemelerde temiz kaldı (son hali doğru, 👇 ile biter).
- Yuvarlak öne çıkan kapakları (satarizkurumsal tarzi, 08.11 gece): 5 konu — ev / vasıta / MülkümAI / rapor / indir. İki renk seti: `gorseller/yuvarlak-kirmizi-*.png` (beyaz ikon, kullanıcının istediği) ve `yuvarlak-altin-*.png` (gece mavisi ikon, marka paleti) 1080×1080 + kırmızının hikaye boyu `hikaye-yuvarlak-*.jpg` (1080×1920, daire ortada). Üretim betiği: `pazarlama/instagram/uret_yuvarlak.py`. Uygulama: telefondan bu görselleri hikayeye at → 24 saati beklemeden hemen 'Öne çıkan' → konu adıyla kaydet → hikayeyi arşive kaldır/sil (öne çıkan kalır).
- G2+ gönderileri TAKVİME GÖRE (günde 1-2; art arda paylaşım yeni hesapta checkpoint tetikler). IG bu gece 2 kez "birkaç dakika bekle" limitledi — auth istekleri seyreltilecek.
- KAPAK RENGİ (08.11 gece): kullanıcı kırmızı→altın→SARİ dedi; final set `yuvarlak-sari-*.png` + `hikaye-yuvarlak-*.jpg` SARI (#FFC72C daire, lacivert ikon) — uret_yuvarlak.py renkler=[('sari',...)].
- G2 YAYINDA (08.11 11:21): MülkümAI · DfeUJtPDSkY · https://www.instagram.com/mulkum360/p/DfeUJtPDSkY/ (metin metinler/g2-aciklama.txt 321 kr). Composer akışı kanıtlandı: + JS click → upload → İleri gerçek tık (1233,30) → textarea base64+TextDecoder (placeholder BOŞ, aria-label'da; querySelector('textarea')) → Paylaş gerçek tık (1225,30). Profil 2 gönderi / 5 takipçi. Kullanıcı biyoyu kendisi değiştirmiş (🏡 Yeni Nesil Emlak Platformu...) — dokunma. G3 randevusu 09.11 10:00.
- Ekran kilidi açılınca gerçek CDP tıklama + yazma tekrar çalışıyor; kilitliyken yalnız JS sentetik olay.

## 1.9 (08.11.2026) MülkümVideo (ücretli)
- "Ücretsiz drone çekimi talebi" kaldırıldı (drone.js, drone_talepleri tablosu, Yönetim > Drone sekmesi). Kullanıcı aslında AI drone videosu istemişti.
- Yerine www/video.js: ilan sahibi ilan fotoğrafından (a) AI drone videosu (yalnız emlak; dış cephe fotoğrafından yükselen, dönen hava görüntüsü) ya da (b) fotoğraftan video (kamera yavaşça ilerler) üretir. 5 sn, 720p, sessiz; yatay 16:9 ya da dikey 9:16. Her video 3 kredi (VIDEO_KREDI, mulkum-ai ve video.js'te).
- Sunucu: mulkum-ai gorev video_baslat / video_durum. Pollinations /video/{istem}?image=..., Prefer: respond-async; model sırası bytedance/seedance-1-pro-fast → prunaai/p-video. İş tablosu public.video_isleri; kredi public.video_kredi (yalnız service_role). Başarısızsa kredi iade. Videolar ilan-videolari kovasında (public, 30 MB, mp4), ilanda alanlar.videolar [{url,tur,kaynak}] olarak; herkes izler, "yapay zekâ ile oluşturuldu" notuyla.
- Maliyet: 5 sn video Pollinations'ta ~0,10 pollen. 08.11 itibarıyla Pollinations ücretli bakiyesi 0 (402 INSUFFICIENT_BALANCE) — bakiye yüklenmeden ne video ne MülkümDeko çalışır.
- Migration 20261108130000_ai_video.sql uygulandı.

## 2.0 (08.11.2026) Kredi satış ekranı
- www/satis.js: #/kredi yeniden yazıldı (bakiye, kredi ne alır, 4 paket, satın alma talebi, hareketler) + Yönetim > Kredi Satışları (bekleyen talepler, 'Ödeme alındı, krediyi yükle', aylık ciro, paket fiyat düzenleme).
- Migration 20261108140000_kredi_satis.sql: kredi_paketleri (5/149,99 · 15/349,99 · 40/749,99 · 100/1.499,99 TL), kredi_satislari, kredi_talep, kredi_talep_iptal, kredi_satis_karar. Geri alınan SQL denemesiyle doğrulandı.
- Ödeme şimdilik talep + elle onay (havale vb.). Play'e çıkmadan Play Billing şart. Fiyat gerekçesi FIYATLAMA.md.

## 2.1 (08.11.2026) Google Play Billing
- Paket adı (applicationId) com.vitrin.prototip → **com.mulkum360.app** (Play'e ilk yüklemeden sonra değişmez). namespace ve Google giriş dönüş şeması (com.mulkum360.prototip://giris) aynı kaldı.
- Yükleme anahtarı: .gizli/mulkum360-upload.jks, şifre .gizli/play-imza.txt, gradle android/keystore.properties'ten okur. Play App Signing açık olmalı. ANAHTARI YEDEKLE.
- Derleme: gradlew bundleRelease (AAB, Play'e) ve assembleRelease (imzalı APK).
- cordova-plugin-purchase 13.20.0 (Billing Library 9). satis.js: Play hazırsa paketler Play fiyatıyla "Google Play ile satın al"; onaylanan satın alma play-odeme fonksiyonuna gider, Google Play Developer API ile doğrulanır, play_kredi_yukle kredi yükler (token benzersiz, ikinci kez yüklenmez), ürün tüketilir. Play yoksa talep akışı.
- Play ürün kimlikleri: kredi_5, kredi_15, kredi_40, kredi_100 (kredi_paketleri.play_urun).
- Gerekli gizli: GOOGLE_PLAY_SA_JSON (hizmet hesabı JSON). Yokken play-odeme 503 döner.

## 2.2 (08.11.2026) Ekran incelemesi
- Kredi cüzdanı (cuzdanKarti) Hesabım üstü + yan menü; Keşfet kredi rozetine '+'; panel kısayoluna Kredi al; ilan sahibine 'İlanını güçlendir' bölümü (Video, Deko, Tapu). Hesabım ofis bölümü sadeleşti (panelde olanlar kaldırıldı). Yan menü: MülkümAI Araçları / Finans ayrımı. dilSatiri() ortak. BASLIK_SECICI genişledi, small yardım yazıları büyütülmüyor.
- Öneri listesi: ONERILER.md

## 2.3 (08.11.2026) Öneri listesi uygulandı
- Banka kartı ilanda tek teklif + 'Diğer N teklifi göster'; ekran adı 'Banka kredisi hesapla'. AI düğmesi aşağı kaydırırken gizlenir. 'Aramayı kaydet'. Giriş ekranında neden + 1 kredi hediye notu (S.girisNeden). Misafir Hesabım 'Üye olunca' 3 madde. Boş kategoriler sona, 'İlk ilanı ver' → #/ver. Büyük harf başlık düzeltme (buyukHarfDuzelt) toplu yükleme + aktarma; mulkum-ai ice_aktar istemi başlığı düzeltir. Fiyat uyarısına 'Değer raporu al · 1 kredi'. Yeni ilan sonrası yayinSonrasi() sayfası (Video, Deko, Paylaş). Panelde 'Değer raporları' tek kısayol; raporlar ekranına + düğmesi.
- Davet ödülü: migration 20261108160000_davet.sql (davetler, davet_kullan). Kod = kullanıcı id ilk 8 karakter; yalnız ofis, ilk 7 gün, davet eden ayda en çok 10 ödül. Kayıt formunda Davet kodu, Hesabım'da 'Davet kodum var', paylaşım metninde kod.
- Yönetim sekmeleri 3 grup (YON_GRUP); bekleyen kredi talebi rozeti (YON_BEKLEYEN, yonBekleyenYaz) + açılışta uyarı.
- Ad birliği: MülkümVideo Drone / MülkümVideo Tanıtım; yapay zekâ yazımı.
- Yasal: Kullanım koşullarına 6-8. maddeler, METIN.satis (Mesafeli satış + ön bilgilendirme), METIN.gizlilik. [SATICI UNVANI] vb. alanlar boş. Kredi ekranlarından bağlantı.

## 2.4 (08.11.2026) Görsel düzen
- Açık temada sarı simge kutuları yerine mavi tonlar (--ikon-zemin/--ikon-renk). Yeni Lucide simgeleri (dil, tema, yardim, profil, ofis, bildirim, rozet, yasal, kredi=wallet...) assets/simgeler.mjs ile.
- Dil: tek satır + dilSheet() penceresi ([data-dilac]). 'Emlakçı paneli' → 'Ofisim'. Ayarlar 3 sütun simge düğmesi (.ayar-izgara). Hesabım: ustBar + kartvizit(). Sekme kökleri (Mesajlar, Favorilerim, Hesabım) geri düğmesiz aynı başlık yapısı.

## 2.5 (08.11.2026) Profil fotoğrafı
- profiller.foto (migration 20261108170000_profil_foto.sql); profilFotoKaydet() sb.js; avatarHtml() ilan satıcı kartında. Hesabım başlığı kompakt kartvizit (foto + kamera rozeti ile değiştirme, 3 simge düğme, 4 sayı).

## 2.6 (08.11.2026) Palet ve açılış
- Tüm üst çubuklar Hesabım paleti: lacivert→mavi degrade (--baslik-zemin), beyaz yazı, sarı vurgu; Keşfet hero aynı aile. theme-color #1B2A41.
- Açılış: web yükleme ekranı (.acilis: logo, wordmark, slogan, ilerleme çubuğu) + yerel splash assets/splash.mjs → capacitor-assets generate --android.

## 2.7 (08.11.2026) Yasal metinler, yalnız Play satışı
- Veri sorumlusu/iletişim: Mülküm360 · fatihcalis07@gmail.com (kullanıcı verdi). METIN.satis 'Satış ve iade koşulları' (satıcı Google Play). Taslak notları kaldırıldı.
- Havale/talep ile kredi satışı kapatıldı (ODEME_YONTEMI 'yok'); kredi yalnız Google Play'den. Yönetim > Kredi Satışları eski talepler için duruyor. Gelir: GVK 20/B (uygulama geliştirici hesabı, %15 stopaj) — kullanıcı bankadan teyit edecek.

## 2.9 (08.11.2026) Alt menü ve Ofisim
- Alt menü 2. sekme: ofis hesabında Ofisim (#/panel), diğerlerinde Değerle (#/degerle). Favoriler: Keşfet üst çubuğunda kalp + Hesabım > Takip ettiklerim.
- Ofisim: sekme kökü başlık (sağda Performans), 4 kısayol, sekmeler Portföy (varsayılan) / Görev / Müşteri / Not; Portföy yayında/kapanan ilanlar.

## 3.0 (08.11.2026) Ofisim düzeni
- Renkli degrade kısayollar (İlan ver, Toplu yükle, Performans, Davet et); Performans başlıktan kısayola indi; Değer raporu kısayolu ve 'Aktif ilan' kutusu (Portföy sekmesinde sayı var) kaldırıldı. Sekmeler belirgin: seçili mavi, diğerleri koyu yazı.

## 3.1 (08.11.2026)
- Ofisim sekmeleri: Portföy / Ajanda / Müşteri / Notlar. Müşteri: Arayanlar ve Mal sahipleri (portföy) alt sekmeleri; müşteri formunda tür (Alıcı / kiracı | Mal sahibi), mülk türü, portföydeki ilan.
- Renkli degrade düğme dili (--r1..--r4) kategori, ayar, AI eylem ve kısayol simgelerinde; Keşfet özellik kartları renkli. Dar ekranda Keşfet başlığında yalnız logo.

## 3.2 (08.11.2026) Pastel ikon dili
- Parlak degradeler yerine 4 tonlu pastel (--p1..--p4: şeftali, gök, nane, lavanta) tüm ikon kutularında: ilan ver kategorileri (.kat), Keşfet kategorileri, liste satırları, ayarlar, AI eylemleri, Ofisim kısayolları (beyaz kart). Basınca ikon zıplar. Yeni kategori simgeleri: proje hard-hat, yazlık tree-palm, devre calendar-range, elektrikli plug-zap, hasarlı badge-alert, klasik crown, SUV car-front, minivan bus-front, bina building.

## 3.3 (08.11.2026) Yönetim
- Yönetim özeti: uyarı şeridi (şikayet, kredi talebi, test ilanı), Üyeler / İlanlar / Kredi ve rapor gruplarında pastel simgeli kutular (.yon-k). Grup sekmeleri 3 eşit sütun. Hesabım'da Yönetim kartı en alta (Çıkış'ın üstü).

## VERİ MOTORU FAZ 0-1 (08.11 gece — ayrı analiz oturumu)
- Analiz raporu: `VERI-MOTORU-ANALIZ.md` (depolarda). Özet: ChatGPT'nin 8 önerisinden 6'sı mevcut yapıda var; gerçek eksik ingestion günlüğü + veri kaynağı envanteri + araç piyasası verisi + ilçe granularity. `market_observations` gibi İKİNCİ tablo KURULMAYACAK — hepsi `bolge_gostergeleri`ne gösterge adıyla yazılır.
- **EMSALLER HATASI DÜZELTİLDİ**: `app.js emsaller()` test ilanlarını (`ornek=true`) havuzdan ayırmıyordu; 692 test ilanı değerlemeyi kirletiyordu → `&& !i.ornek` eklendi, APK yeniden derlendi (BUILD SUCCESSFUL 53 sn, `android/app/build/outputs/apk/debug/app-debug.apk`).
- **Git başlatıldı**: `git init -b main`, ilk commit `68be07d` (299 dosya; .gizli/apk/jks hariç — .gitignore genişletildi). GitHub uzak deposu + push KULLANICIDA (gh yok; `git remote add origin https://github.com/<kullanıcı>/mulkum360.git && git push -u origin main`).
- **Yeni migration `20261108200000_ingestion` CANLIDA** (db query ile uygulandı + schema_migrations'a tescil edildi): `ingestion_logs` (kim/nezaman/kaç satır/hata) + `veri_kaynaklari` (10 kaynak envanteri, son_calisma) + `ingestion-log-temizlik` cron (180 gün). RLS: insert authenticated, select yönetici.
- **evds-kredi ve evds-kfe** artık her çalışmada ingestion_logs yazıyor + veri_kaynaklari.son_calisma güncelliyor; deploy edildi. CANLI TEST: evds-kredi → 24 satır, log 'ok' görüldü (08.11 20:28 UTC).
- **kredi-guncelle cron'u yoktu** (sebep belirsiz — DEVIR'de silme notu yok); yeniden planlandı `0 6 * * *`. cron.job artık 7 iş.
- **TÜİK API keşfi YARIM KALDI (dürüst not)**: `data.tuik.gov.tr/api` canlı ama v1.0.1126 kök banner'dan uç listesi yok; `edatun.tuik.gov.tr` bu makinede DNS'siz; databrowser2 JSON-stat gerçek ucu SPA lazy-chunk'larında. Yarın yapılacak: CDP ile databrowser2'de tablo açılırken `tuik-kekikle.js` (harness chrome-ctrl/) Fetch yakalaması → gerçek GET/POST deseni çıkar → `tuik` Edge fonksiyonu (evds şablonu) yazılır. Anahtar gerekmiyor olabilir (eskiden JSON-stat anahtarsız çalışıyordu) — EDATUN başvurusu kullanıcı adımı.
- Görevler 1-4 TAMAM, 5 kısmen. Rapor §10'daki faz 2 (tuik edge, betam betiği deposu, araç göstergeleri) sıra bekliyor.
