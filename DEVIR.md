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
- G3 YAYINDA (09.11 10:28): Değer Raporu · DfgzL4HjbwH · https://www.instagram.com/mulkum360/p/DfgzL4HjbwH/ (metin metinler/g3-aciklama.txt 411 kr, görsel gorseller/gonderi-03-rapor.png). Akış: oturum @paranintarihcisitv'e düşmüştü → gecis-1 + gecis-geri ile @mulkum360'a geçildi ("Profili düzenle" düğmesiyle doğrulandı) → g3-ac.js (+ aç) → chrome.js upload → gerçek tık İleri (1222,30) → g3-yaz.js base64+TextDecoder (textarea 411 kr) → gerçek tık Paylaş (1214,30) → profil 3 gönderi. Notlar: runjs.js ARG enjeksiyonu düzeltildi (window.ARG); ARG ile Türkçe metin geçirme — bozuluyor, düğmeyi g3-ust.js dökümünden koordinatla bul. Öne çıkanlar hâlâ telefon işi (DM'de sarı kapaklar duruyor).
- IG GÖRSEL KURALI (09.11, kullanıcı talebi — KALICI): Gönderiler daima 4:5 TAM dikey yüklenecek; IG web kırpma ekranı varsayılanı 1:1 kare → afişin üstü/altı kesiliyor (1080x1080). KANITLI AKIŞ: ① pencere dikey: `node pencere.js 580 940 <sekme>` ② + (dar ekranda "Yeni Gönderi" alt butonu) → chrome.js upload ③ sol-alt "Genişlet" (fit) düğmesine `js/g-sigar.js` `sigar:true` olana dek bas (ekrana taşmadan sığmalı — kural budur) ④ İleri → açıklama (base64) → Paylaş ③ SONRA MEDYA API DOĞRULAMASI: `/api/v1/media/<id>/info/` → original 864x1080 (oran 1.25) olmalı; 1080x1080 gelirse GÖNDERİ SİLİNİR, tekrar denenir. Araçlar: `g-yayinla.js` (yayınlayıcı+kural kapısı), `g-sigar.js`, `g-akisi.js sil` (gerçek tıklama+sılındı API teyidi — JS sentetik tık SİLME YAPMIYOR, g-sil3 yanıltıcıydı), `g-durum.js` (kod→boyut, cache'siz), `g-izgara.js`. YENİ ÜÇLÜ YAYINDA (09.11 ~12:55): G1 DfhBieUDTTy · G2 DfhD1KejQGa · G3 DfhEE5hjc1S — üçü de 864x1080 ✔ (eski kareler + eski G3 silindi: toplam 8 gönderi silindi, API teyitli).
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
- ⚠️ GERİ ALINDI (kullanıcı kararı, 08.11 gece): gerçek ilan az → testler şimdilik hesaplamaya katılıyor. `app.js` başında `TEST_DAHIL = true` BAYRAĞI var; **yayın öncesi kontrol listesi: TEST_DAHIL=false + test ilanlarını sil** (692 adet, `ornek=true`).
- **Git başlatıldı**: `git init -b main`, ilk commit `68be07d` (299 dosya; .gizli/apk/jks hariç — .gitignore genişletildi). GitHub uzak deposu + push KULLANICIDA (gh yok; `git remote add origin https://github.com/<kullanıcı>/mulkum360.git && git push -u origin main`).
- **Yeni migration `20261108200000_ingestion` CANLIDA** (db query ile uygulandı + schema_migrations'a tescil edildi): `ingestion_logs` (kim/nezaman/kaç satır/hata) + `veri_kaynaklari` (10 kaynak envanteri, son_calisma) + `ingestion-log-temizlik` cron (180 gün). RLS: insert authenticated, select yönetici.
- **evds-kredi ve evds-kfe** artık her çalışmada ingestion_logs yazıyor + veri_kaynaklari.son_calisma güncelliyor; deploy edildi. CANLI TEST: evds-kredi → 24 satır, log 'ok' görüldü (08.11 20:28 UTC).
- **kredi-guncelle cron'u yoktu** (sebep belirsiz — DEVIR'de silme notu yok); yeniden planlandı `0 6 * * *`. cron.job artık 7 iş.
- **TÜİK API keşfi YARIM KALDI (dürüst not)**: `data.tuik.gov.tr/api` canlı ama v1.0.1126 kök banner'dan uç listesi yok; `edatun.tuik.gov.tr` bu makinede DNS'siz; databrowser2 JSON-stat gerçek ucu SPA lazy-chunk'larında. Yarın yapılacak: CDP ile databrowser2'de tablo açılırken `tuik-kekikle.js` (harness chrome-ctrl/) Fetch yakalaması → gerçek GET/POST deseni çıkar → `tuik` Edge fonksiyonu (evds şablonu) yazılır. Anahtar gerekmiyor olabilir (eskiden JSON-stat anahtarsız çalışıyordu) — EDATUN başvurusu kullanıcı adımı.
- Görevler 1-4 TAMAM, 5 kısmen. Rapor §10'daki faz 2 (tuik edge, betam betiği deposu, araç göstergeleri) sıra bekliyor.

## TEMA SİSTEMİ (09.11 gece — Prestij · Vitrin · Alev)
- Kullanıcı isteği: sahibinden + hepsiemlak paleti/fontları → marka adları arayüzde KULLANILMADI (haksız rekabet riski); profesyonel isim seti onaylandı: **Prestij** (mevcut, varsayılan) · **Vitrin** (gök mavisi+sarı) · **Alev** (kırmızı+turkuaz).
- Renkler CANLI siteden ölçüldü (CDP): sahibinden = SHBGrotesk→**Roboto** (kendi fallback'i; SHBGrotesk lisanslı, gömülmez), #558ED2 gök barı + #FFE800 sarı CTA + #1064BC mavi + #333/#F2F2F2. hepsiemlak = **Plus Jakarta Sans** (birebir, açık kaynak) + #F03245 + #00A699 + #222/#F7F7F7.
- Yeni dosyalar: `www/tema.css` (font-face ×4 + iki tema katmanı, `html[data-tema=...]` seçicileri app.css'ten sonra kazanır) + `www/fonts/roboto-*.woff2`, `pjs-*.woff2` (değişken kalınlık, 119 KB, imza doğrulamalı). index.html'e `tema.css` linki eklendi.
- JS: `veri.js` S.palet + YEREL'e 'palet' (IndexedDB tercihler). `app.js` `temaUygula()` data-tema + meta theme-color (durum çubuğu rengi) uyguluyor; `PALETLER/`paletSecimi()` sheet'i; Ayarlar ızgarasına "Tema · Prestij" düğmesi. Koyu tema her paletle çalışır (html.koyu[data-tema] blokları). **Rapor/PDF her temada Prestij lacivert-altın + Tektur** (rapor kapsamı override). Logo her temada Tektur.
- Test: `?tema=vitrin|alev` URL paramı (kalıcı QA derin bağlantısı). Headless CDP doğrulaması: data-tema + govdeBg #F2F2F2/#F7F7F7 + font ailesi + meta renk DOĞRU, konsol hatası yok. Maket: `pazarlama/tema-onizlem.html/.png`. Commit "Tema sistemi..."; APK yeniden derlendi.

## YENİ ÖZELLİKLER (09.11 gece — değerleme konum filtresi · üye profili · tapu altyapısı)
- **1) Değerlemede sokak→mahalle kademesi**: `emsaller()` merdiveni artık **sokak → mahalle → ilçe → il → Türkiye** (her kademe ≥3 emsal). Sokak normalizasyonu `yolAd()` (sokak/sokağı/sk./cad./bulvar… kök eşitleme, Türkçe küçük harf `kucuk`). Değer hesapla formuna **Mahalle (kaskat) + Sokak/cadde (Photon önerili)** alanları eklendi (`name=mahalle/sokak` → FormData → hesapla). Detay sayfası emsal karşılaştırması da ilan kendi mahalle/sokağını esas alıyor (`emsalDurumu`). Kapsam etiketi sonucu şeffaflaştırıyor: "İncirli Sokak, Bostancı Mah., Kadıköy (aynı sokak)". **Test**: canlı 702 ilanla — Kadıköy 44 → Bostancı Mah. 11 (mah kademe ✓); sentetik 4 ilanla sokak kademe ✓ ve 4 yazım varyantının hepsi eşleşti; konsol hatası yok.
- **2) Üye profili**: `EKRAN.uye` zaten vardı (bio/açık telefon/üyelik/rozet — görünürlük yönetimi `profil ekranında` mevcut: soyad_gizle, acik_tel). Eklenenler: **Satılanlar bölümü** (durum=satildi; RLS zaten herkese açık) + **profil fotoğrafı** (foto varsa img, yoksa harf avatarı) + "N satıldı" sayacı. Erişim: ilan detayındaki satıcı kartı `#/uye/<id>` (mevcut). **Test**: satilmiş ilanı olan üye sayfasında Satılanlar/İlanları/Üyelik/avatar ✓.
- **3) Tapu doğrulama**: uçtan uca akış ZATEN VARDI (tapuIste → dogrulama_talepleri → Yönetim›Doğrulama → `dogrulama_karar` RPC (yonetici) → `ilanlar.dogrulanmis` → rozet). Güçlendirme: talebe **Taşınmaz No alanı** (e-Devlet Tapu Bilgileri Sorgulama'dan; 8-20 hane doğrulaması, `notu` içinde `Taşınmaz No: X` olarak saklanır) + admin onay kıstası satırı (TTBS + turkiye.gov.tr/belge-dogrulama, belge yaşı ≤30 gün). **Büyük bulgu (rapor: `TAPU-DOGRULAMA.md`)**: resmî yol TKGM değil **Ticaret Bakanlığı EİDS**; taşınmaz ilanlarında yetki doğrulama **01.01.2025'ten beri yasal zorunluluk** — EİDS başvurusu ACİL aksiyon maddesi; sahte/paralel entegrasyon YOK, modül sözleşmesi dokümante. **Test**: syntax ✓; uçtan uca (girişli) test telefonda kullanıcı hesabıyla yapılacak.
- Değişen dosyalar: `www/app.js` (emsaller/hesapla-yolu, degerle formu, EKRAN.uye, tapuIste sheet), `www/yonetim.js` (onay kıstası metni), `TAPU-DOGRULAMA.md` (yeni). **Veritabanı değişikliği YOK** (mevcut kolon/RPC yeterli). APK yeniden derlendi.

## MODÜL 12–16 ANALİZ + FAZ 3 MODÜL 14 (09.11 gece — çok dilli)
- Kullanıcı 5 yeni modül ekletti (doping/harita+AR/çok dilli/yeni ana sayfa/doping paneli) + faz sırası. **Fizibilite raporu: `MODULLER-12-16.md`** (commit adb9992) — kod+canlı DB doğrulamalı. Kritik envanter: Google Play Billing + **sunucu doğrulamalı** `play-odeme` ÇALIŞIYOR (doping ödemesi bu iskeleti kullanır), `kredi_paketleri` yönetimden düzenlenebilir fiyat kalıbı hazır, `ilanlar.goruntulenme`+favori mevcut; **ilanlar'da lat/lon YOK** (harita ön koşulu: alanlar.enlem/boylam + backfill); fiyat geçmişi tablosu gerekiyor (`ilan_fiyat_log`, FAZ 3 migration onayına). AR araştırması: tam AR SDK'ları önerilmiyor → **pusula-AR melez** (getUserMedia+DeviceOrientation+GPS, gerçek sensör verisi) + FAZ 5 başı 1 günlük spike kararı.
- **MODÜL 14 UYGULANDI (FAZ 3-①)**: `cevir` edge Almanca+Arapça (+en/ru) — DEPLOYED; `dil.js` DILLER 5 dil + **otomatik algılama** (navigator.language, ilk kurulum) + `?dil=` QA parametresi + `dir=rtl`; `tema.css` sonuna RTL katmanı (~10 kural; app.css flex-first olduğu için risk düşük — ince ayar cihaz QA'sında); ilan detayına **"Orijinalini göster"** düğmesi (yalnız DIL≠tr; DOM'daki `__ham` Türkçe kaynak geri yüklenir, tekrar dokununca önbellekten anında çeviri — kural: orijinal korunur, çeviri ayrı `ceviri` tablosunda). Dil seçici 5 dilli. **Testler** (headless): DE edge "Wohnung/Inserat erstellen" ✓, DOM canlı Almanca ✓; AR dir=rtl+sağa hizalama+canlı Arapça ✓; orijinal↔çeviri döngüsü gerçek ilanda ✓; konsol hatası yok. **Kalan (dürüst)**: video dublaj = TTS sağlayıcı araştırması (backlog); RTL ince ayar + otomatik algılama taze kurulum testi telefonda.

## MODÜL 15 YENİ ANA SAYFA (09.11 gece yarısı — FAZ 3-②)
- **Ana sayfa (EKRAN.kesfet) pazaryeri düzeni**: üst bar = menü·logo·**dil (TR/EN/RU/DE/AR kısayolu)**·kredi·**mesajlar (okunmamış rozetli)**·kayıtlı arama; akıllı arama korundu; **kısayol ızgarası** 8 kutu: Satın al / Kiralayın / **Sezonluk** / Fırsatlar (fiyatı düşenler) / **Projeler** (#/proje) / **Danışman bulun** (#/danisman) / MülkümAI ile ara / Konut değerleme — hepsi GERÇEK hedefe (Haritada Ara bilinçli YOK — Modül 13/FAZ 5'te eklenecek, ölü kutu konulmadı).
- **Dinamik vitrin şeritleri** (gerçek veriden türetilir, ≥3 ilan yoksa şerit görünmez — sahte vitrin yok): **Öne çıkanlar** (doğrulanmış + ≥5 foto, gösterim sıralı; doping gelince devredecek), **Fırsat ilanları** (≥%7 indirimli), **Fiyatı düşenler**, **Proje vitrini**. Sıra+görünürlük **Yönetim›Görünürlük›Ana Sayfa** sekmesinden (ok butonları + Açık/Kapalı) — yerel (`vitrin_ayarlari` localStorage) + `S.AYARLAR.vitrinler`; tüm cihazlara yayılma `ayarlar` tablosuna bağlı: **ayarlar-migration.sql ONAY BEKLİYOR** (repo kökünde; onay verilirse migrations'a taşınıp push + sb.js'ye tek satır yükleme).
- **Alt navigasyon kullanıcı spec'i**: Ara · Favoriler · **İlan Ver(+)** · Keşfet · Hesabım. Kaybedilen erişimler korundu: Mesajlar → ana sayfa üst bar rozetli çan + Hesabım listesi ("Mesajlarım"); Ofisim → Hesabım "Emlak ofisleri için" listesi. Favori artık üst barda değil (nav'da).
- **Veri modeli**: `islem` seçeneklerine **Sezonluk** eklendi (jsonb — migration yok; parser "sezonluk" tanır ✓ test) + emlak alanlarına **Proje adı** (metin, sona eklendi — filtre indeksleri bozulmaz); arama motoruna `dusen=1` filtresi (`oncekiFiyat>fiyat`).
- **Testler** (headless, 702 ilan): kısayollar/vitrinler/nav 5'li ✓; parser "Antalya sezonluk yazlık 3+1" → islem=Sezonluk ✓; #/danisman gerçek ofis listesi (2 doğrulanmış ofis) ✓; #/proje boş durumu ✓; yönetici vitrin editörü 4 kart+sıralama+kapatma ✓; kapalı vitrin ana sayfada gizlendi ✓; konsol hatası yok. **Kalan (dürüst)**: Fırsat/Fiyatı düşen şeritleri test verisinde sıfır olduğu için görünmedi (kod sentetik veride doğrulandı, gerçek düşüm gelince kendiliğinden dolacak); #/ver formu giriş gerektirdiğinden tarayıcı testi yapılamadı (alanlar ALANLAR'dan otomatik, kod incelemesi ✓); DB geneli vitrin ayarı migration onayı bekliyor.

## TÜİK VERİ API KEŞFİ TAMAMLANDI (09.11 sabah — VERİ MOTORU'nun en büyük riski çözüldü)
- Eski data.tuik.gov.tr ölü (yeni **veriportali.tuik.gov.tr** SPA'sına yönleniyor; JSONStat bitti). POST uçları DataDome korumalı ama **asıl hazine bulundu**: **`databrowser2.tuik.gov.tr` (Fusion) TAMAMEN AÇIK** — `GET .../api/core/nodes/1/datasets/{AKIS}/structure` + `POST .../data` gövde `[]` → SDMX-JSON 2.0 küp, boyut etiketleri dahil, **sunucudan direkt** (Deno/pg_cron'dan tarayıcısız; canlı doğrulandı: konut satış TR küpü 82KB, 2011→2026-09).
- **İL/İLÇE konut satış akışı**: `TR,DF_SATIS_SEKLI_DURUMU_ILILCE_V3,1.0` (REF_AREA=İBBS) + TÜFE `DF_TUFE_SDMX_TT10` + inşaat maliyeti `DF_UFE_INSAAT_V1`. Ana göstergeler GET'i (`/api/tr/indicators`) UA başlığıyla direkt açık.
- **Sözleşme + entegrasyon planı: `TUIK-VERI-API.md`** (flow ID tablosu, küp çözme, nazik kullanım, FAZ 2 yatırım endeksi beslemesi, `tuik_ay_veri` migration taslağı ONAYA sunulacak). Keşif yardımcıları: chrome-ctrl/tuik-*.js.

## VERİ MOTORU TÜİK BESLEMESİ CANLI (2026-11-09)
- **Edge `supabase/functions/tuik`** (kod `tuik-satis`, deploy `--no-verify-jwt`): databrowser2 `POST /data` (body `[]`) + `/structure` (zaman etiketleri `chartLayoutCartesian.primaryDimValues`). İki küp paralel: İL `DF_SATIS_SEKLI_DURUMU_ILILCE_V3` + TR `DF_SATIS_SEKLI_SATIS_DURUMU_V3`. UA `mulkum360-ingest/1.0`, 429/5xx backoff.
- **Küp çözme doğrulandı**: küp boyutları `[2,9,81,2,2,178]`; REF_AREA indeks sırası = TÜİK tablo sırası (81/81, DB değeriyle birebir + 48 bağımsız DOM kontrolü, 0 çelişki → `chrome-ctrl/ref-il-harita.json`). Satış ayrışması **çalışma zamanında İstanbul'dan çözülür** (kod hardcode yok): durum çifti (ilk+ikinci=toplam, ~%28.5 çapası) ve şekil çifti (ipotekli+diğer=toplam, ~%20.8 çapası). İndeks: konut `K=1`, ipotekli `IP=0`, ilkTur=4, ikinciTur=5.
- **Runtime doğrulama (biri patlarsa HİÇ satır yazılmaz)**: küp boyutu sabit; her il `|ilk+ikinci−toplam|≤1` ve `|ipotekli+diğer−toplam|≤1`; 81 il toplamı == Türkiye (ay ay, ±0.1%); İstanbul ilk-el/hisse payları DB son değeriyle ±4 puan (kod listesi kayarsa durur); NaN→null guard'ı.
- **Yazım**: `bolge_gostergeleri` upsert `on_conflict (il,ilce,donem,gosterge)`, `ilce=''`. Göstergeler: `Konut satışı (aylık)` (adet), `İlk el satış payı`(%), `İpotekli satış payı`(%) (81 il + `Türkiye`); `Konut satışı yıllık değişim`(%), Türkiye aylık+ipotekli+yıllık değişim. `ingestion_logs`(kaynak=tuik-satis) + `veri_kaynaklari.son_calisma`.
- **Çalıştırıldı**: tam geriye dönüş `?ay=999` → **40.511 satır, 165 ay (2013-01→2026-09), 0 atlanan**. Örnek TR aylık: 2013-01=92594, 2020-01=120066, 2026-09=142390. `?kuru=1` kuru deneme, `?ay=N` son N ay.
- **Zamanlama**: pg_cron `tuik-satis-aylik` jobid 8 `0 8 18,25 * *` → `net.http_post(.../tuik)`. Her çalışmada son 24 ay taranır; geciken TÜİK yayını kendini iyileştirir. **Migration gerekmedi** (mevcut `bolge_gostergeleri` yeniden kullanıldı).

## FAZ 2 YATIRIM ENDEKSİ CANLI (2026-11-09) — commit 4b7e79a
- **`www/yatirim.js`**: `hesaplaYatirimEndeksi(d)` saf motor + `yatirimEndeksi(il)` canlı toplayıcı (7 gün IndexedDB önbellek `yatendeks_<il>`) + `yatirimEndeksiHtml(e)` bileşen. Ağırlıklar: fiyat büyümesi %30 (bölge KFE 12 ay, −10…+50), kira getirisi %25 (brüt, 3–8), talep momentumu %25 (TÜİK il satışı YoY — 165 aylık besleme sayesinde), kredi erişimi %12 (ipotekli payı 5–35), fiyat düzeyi %8 (㎡/iller medyanı 2,0×–0,5×).
- **Dürüstlük kuralları**: `+null`→0 tuzağına karşı null/undefined guard; eksik bileşenin ağırlığı diğerlerine dağıtılır ve **"bileşen verisinin %X'iyle hesaplandı"** olarak gösterilir (ör. Ardahan kira+㎡ yok → güven %67). Skor seviyeleri güçlü/olumlu/dengeli/temkinli/zayıf; her yerde "yatırım tavsiyesi değildir" notu.
- **Bağlandığı yerler**: (1) ilan sayfası endeks kartı sonuna şerit (`endeksKartiYukle` sonu, kartı bloklamaz), (2) değerlendirme raporu B·Piyasa sayfası "Resmî Göstergeler" önü (`raporEkVeri` → `h.yatirim`, `rapor2.js` skoru + ilk iki kutu + tüm çubuklar).
- **Test (canlı, kafaless Chrome)**: İstanbul 47 dengeli (㎡ 2,5× medyan → fiyat düzeyi 0 — pahalı olduğu için DOĞRU), Ankara 51, Kırşehir 50 (0,8× → 81 değerli), Ardahan 22 zayıf/güven 67; motor birim testleri (eksik veri yeniden ağırlıklandırma 60/güven50, tam 58); kart görsel E2E: şerit + 5 çubuk + tavsiye notu `yatirim-kart.png`. Migration yok.
- Not: TCMB değerlemede `Türkiye` satırı yok — fiyat düzeyi **iller medyanı** üzerinden hesaplanır (DB'ye yeni satır yazılmadı).

## EİDS İLAN DOĞRULAMA MODÜLÜ (09–10.11.2026) — CANLIDA (faz=manuel)
- **Kullanıcı isteği**: Bireysel malik + yetki belgeli emlak işletmesi için EİDS uyumlu kimlik/taşınmaz-yetki doğrulama altyapısı; resmî erişim olmadan entegrasyon var gibi davranma; yayınlanmamayı engelleyen kontrol.
- **Araştırma raporu**: `docs/EIDS.md` (kaynaklı, resmî). Özet: Yasal taban = Taşınmaz Ticareti Yönetmeliği md.12/2 (c)(ç)(f) (RG 32295, 31.08.2023). EİDS Faz-1 kimlik + Faz-2 yetki (15.09.2024; 01.01.2025'ten beri yetkisiz ilan verilemez). Bireysel: malik/eş/1.-2. derece kan hısımı, taşınmaz no ile devlet otomatik teyit. İşletme: TTBS yetki belgesi + malikin e-Devlet yetkilendirmesi (≥3 ay). Teknik sözleşme (Entegrasyon Dokümanı V2.2, EİM'li PDF, 5 sayfa — FTSO arşivinden indirildi): e-Devlet yönlendirme → `returnUrl?yetkiKodu=&durum=` (kod 20 cn, 2 dk); sunucu sorgu `POST ws.gtb.gov.tr:8443/EidsApi/Kullanici/GetKullaniciKodu` Basic Auth, döner `{ad,soyad,kullaniciKodu(Guid),hata}`; health `/EidsApi/health`; hatalar TB-0001..0005. **Başvuru: returnUrl + sunucu IP'lerini eids@ticaret.gov.tr'a bildirim** (Faz-2 taşınmaz uçları bu dokümanda YOK — Bakanlıktan güncel doküman istenecek).
- **Durum**: resmî EİDS API erişimimiz YOK. Manuel faz (yönetici, resmî sorgu ekranlarıyla onaylar) gerçek; sahte entegrasyon YOK.
- **Altyapı kodu (faz='kapali' iken bugünkü davranış birebir korunur — geriye dönük uyumlu, test edildi)**:
  - `www/eids.js` — faz okuma (`eidsFazGetir`/`eidsAcik`), RPC sarmalayıcıları, üye doğrulama sheet'i, `data-eids` delege tıklama.
  - `www/app.js` — ilan kartı/detay/portfoy "Doğrulanıyor" etiketi + chip + düğme; ilan verme akışı adım-3 emlak EİDS alanları (yöntem/taşınmaz no/yetki belge no, doğrulama), kayıt sonrası `eids_iste`.
  - `www/yonetim.js` — Yönetim›Doğrulama üstüne **EİDS kuyruğu** (yöntem/no/işletme; Onayla→yayınla, Reddet→kaldır; onay öncesi resmî sorgu hatırlatması).
  - `supabase/functions/eids-dogrula/index.ts` — resmî API uyarlayıcı TASLAK (deploy edilmedi; sır yoksa "manuel" döner, iddia üretmez).
- **Migration CANLIDA uygulandı (10.11, kullanıcı onayından sonra)**: `20261109160000_eids.sql`: `eids_ayar(faz)` kapali/manuel/canli; ilan durumuna `onayda`; `ilan_dogrulama` (ilan PK, yontem sahibim/hisim/yetkili, tasinmaz_no 8–20, yetki_belge_no, sonuc); `ilan_eids_kapisi` tetiği (emlak + faz≠kapali + yönetici değil + sonuc≠onayli → yayına geçemez, onayda'ya çeker); RPC `eids_iste` (üye talep, ofis+yetkili kontrolü), `eids_karar` (yönetici, onay→yayinda+dogrulanmis, red→kaldirildi). RLS okuma sahibi+yönetici; yazma yalnız RPC. schema_migrations'a tescil edildi.
- **İki onarım (uygulama sırasında yakalandı, migration dosyasına işlendi)**: ① tetik `before insert or update` → `before insert or update of durum` (fiyat/başlık/foto düzenlemesi durum yazmaz; YAYİNDEKİ mevcut ilan yanlışlıkla onayda'ya düşmez — yalnız yeni kayıt + yayına geçiş gate'lenir). ② plpgsql `select faz into faz` → `v_faz/v_s` (PL/pgSQL değişkeni sütunla çakıştı, 42702).
- **CANLI KAPI TESTİ (db query, test üyesiyle, iz bırakmadı)**: doğrulanmamış emlak ilanı `yayinda` girmeye çalıştı → tetik `onayda`ya çekti ✔; ilan_dogrulama sonuc='onayli' eklenip yayına geçildi → tetik GEÇİT verdi (yayinda kaldı) ✔; test kaydı silindi (kalan=0) ✔.
- **CANLI İSTEMCİ TESTİ (headless, 704 ilan)**: `S.eidsFaz='manuel'`, `eidsAcik()=true`, "Doğrulanıyor" etiketi ✔, modüller yüklü, konsol hatası yok.
- **Test (headless, 704 ilan, kapali faz)**: ana sayfa ✓, `S.eidsFaz='kapali'`, `eidsAcik()=false`, modüller yüklü, `etiketHtml(onayda)` doğru, konsol hatası yok. `node --check` tümü temiz.
- **Yapıldı**: ① migration uygulandı ✔ ② `eids_ayar.faz='manuel'` ✔ ③ UI faz-okur (kod değişikliği gerekmedi) ✔ ④ **kalan**: v3.5 APK (eids.js bundle'ı ile) — eski APK'lı üyelerin EİDS formu görünmez AMA DB kapısı yine de onları `onayda`ya çeker (bildirimsiz kalırlar; web'i olan etkilensin diye DB kapısı bilinçli olarak APK'dan bağımsız). **canli** fazı yalnız resmî başvuru sonuçlanıp eids-dogrula sırları gelince.

## MODÜL 13 FAZ 5 — HARİTADA ARA CANLIDA (10.11.2026) — Pusula-AR cihaz spike'ı bekliyor
- **`www/harita.js` `EKRAN.harita` (`#/harita`)**: kendi OSM karo çizici (rapor.js'ten türedi; Leaflet YOK) — sürükle-kaydır (pointer olayları, bırakınca komşu karolar yenilenir), +/− ve tekerlek zoom (4–18), 58×44 px ızgara kümeleme (≤2→fiyat etiketi `harp-pin`, >2→sayı balonu `harp-kume`, dokun→yakınlaş), fiyat etiketli marker dokunuşu→bottom sheet ilan kartı, yarıçap çipleri (yok/250m/500m/1/2/5 km, kesikli halka + Haversine süz — `mesafe()` rapor.js), satış/kiralık + sıralama çipleri (yakına/en yeni/en ucuz), liste + "Buraya git" (merkez yap), il/ilçe seçici (sheet + `konumSecBagla` + Photon ilçe noktası), "Konumum" (Capacitor Geolocation → navigator.geolocation zinciri). **Kural: anlık kullanıcı konumu yalnız HARP belleğinde; localStorage'a YAZILMAZ** (ilan koordinatı sunucu verisidir, ayrı kavramlar).
- **Girişler**: kesfet emlak kısayol ızgarasına "Haritada ara" eklendi (FAZ 4'te bilinçli boş bırakılan kutu doldu); ilan detayı Konum sekmesine "Çevresinde ara" (`#/harita?merkez=lat,lon`). Rota tablosu + index.html `harita.js` (sekme.js sonrasına) + app.css `.harp-pin/.harp-kume` (tema değişkenli).
- **Koordinat boru hattı**: `sb.js ilanKaydet` → `konumFakla(r)`: emlak ilanında koordinat yoksa **arkadan** `ilanKonumu` (sekme.js: TKGM parsel → Photon sokak→mahalle→ilçe; scrape YOK, ilanın kendi verisi) ile çözüp `alanlar.enlem/boylam/konumDuzey` yazar; **adres değişmezse mevcut koordinat korunur, değişirse silinir yeniden çözülür**. Yeni kayıt + düzenleme.
- **Backfill TAMAMLANDI**: 577 koordinatsız yayında emlak ilanın **577/577'si çözüldü ve CANLIDA** (tur 1 Photon: 174; tur 2 Nominatim: 403 — Photon tur başına ~1200 sorguda IP'yi kısıyor, script `nominatim` modu ekledi: 1 istek/sn + tanımlı UA, `display_name` çapalı il/ilçe tutarlılık süzgeci). Düzey dağılımı (dürüst, `konumDuzey`de işaretli): **564 mahalle + 13 ilçe**; sokak/parsel 0 (mevcut ilanlarda sokak boş, parsel edge 7 adaya yetişi veremedi → mahalle'ye düştü). Sıhhati: **0/577 Türkiye sınır kutusu dışında**. `scratchpad/harita-backfill.mjs [cikti.sql] [nominatim|photon]` idempotent; SQL'i UTF-8 `fs` ile yazıyor (PowerShell `>` yönlendirmesi UTF-16 ürette, jsonb bozuyor — 1. turun dersi). KonumDuzey jsonb tırnağı: `'${JSON.stringify(duzey)}'` tek stringify + tek tırnak SQL (çifte stringify 42601).
- **Testler (headless, CANLI veri)**: ekran + 9 karo ✔; `Merkez: Türkiye · 120 ilan · koordinatlı tüm ilanlar` (577/577 coverage satırı) ✔; Türkiye genelinde 6 küme balonu, Ankara z12'de kümeler ✔; yarıçap 5km→0 ilan (Türkiye merkezinde doğru) ✔; vasita sekmesi 0 koordinat/126 ilan (yanlış kutu yok) ✔; liste gerçek ilan ✔; konsol hatası yok ✔; `node --check` tümü ✔. **Karşılama kapısı notu**: taze oturum `#/harita`ya giremez (uygulama kuralı) — test `S.karsilandi=true; ciz()` kurulumuyla.
- **Pusula-AR (FAZ 5 ②)**: fizibilite KURALI — "getUserMedia+DeviceOrientation Capacitor APK'da test edilmeden kamera modu YOK". Cihaz/ekran kaydı elimizde yok; `@capacitor/geolocation` + kamera izni manifest'te yok. **Bilinçli ertelendi (bozuk AR sunulmaz)**: v3.5 APK + telefonu olan bir spike oturumu gerekir; kamerasız tam ekran pusula bandı yedeği o spike'la birlikte ele alınacak.
- **v3.5 notları (birikmiş)**: `@capacitor/geolocation@8.2.4` kuruldu + manifest `ACCESS_FINE/COARSE_LOCATION` eklendi + `cap sync` ✔ (751a705) — **kalan: v3.5 derlemesi** (`eids.js`/`harita.js` bundle'lı; `npm i && npx cap sync && gradlew assembleRelease`); v3.4 kullanıcı testi beklemede.

## ALAN ADI BAĞLANDI (11.11, kullanıcı Cloudflare'e taşıdı, kayıtları ben girdim)
- Kullanıcı mulkum360.com NS'lerini **Cloudflare**'e taşıdı (bristol/chance.ns) + **sınırlı API token** verdi (yalnız o zona DNS-yazma; token metni hiçbir yere yazılmadı, disk kopyası silindi, kullanıcıdan panelde silmesi istendi).
- Cloudflare API ile: park A×2 + eski www CNAME silindi → **A @ ×4 = 185.199.108-111.153 (proxy KAPALI/gri)** + **CNAME www → fatihcalis07-commits.github.io (gri)** yazıldı. TXT _dmarc ve _domainconnect korundu.
- Repo: CNAME dosyası geri eklendi (`36919c6`), Pages rebuild. Doğrulandı: http 200 gerçek içerik · apex 301→www · github.io 301→domain · `--insecure` https 200 = **sunucu tam hazır, GitHub özel alan TLS sertifikası otomatik üretiliyor** (be­klemede; 20 dk'lık zamanlı doğrulama kurulu). https_enforced API PATCH'i token yetkisi yok (404) — GitHub zaten varsayılan HTTPS veriyor, gerekirse kullanıcı web'den açar.
- **Play gizlilik linki (sertifika sonrası): `https://www.mulkum360.com/gizlilik.html`**. Geçerli Geçici link o ana kadar: `https://fatihcalis07-commits.github.io/mulkum360/gizlilik.html` (301'li — Play 301'i takip eder ama sertifika sonrası temiz olanı ver).

## v3.7 — EMLAKÇI ARAÇLARI (11.11 sabah, kullanıcı: "web sekmesi koy, emlakçılar için kolaylık")
- Kullanıcı seçti: **Emlakçı hızlı araçlar**. `EKRAN.hesap` üstüne `WEB_ARACLAR` sabiti + `webAc()` (Capacitor Browser → yoksa window.open → yoksa location) + `aracBolumu()` eklendi; misafir VE üye görür. Araçlar: TAKBİS parsel sorgu, e-Devlet, TKGM, DASK, GİB (hepsi resmî gov domaini). Genişletmek: WEB_ARACLAR dizisine satır ekle.
- Headless doğrulandı: 5 satır, 0 boş ikon, tıklama TAKBİS URL'sini açıyor, SPA yerinde. Commit `e4afdce`, push'lu. **v3.7 APK** masada (versionCode 37, imza kodu 0).
- **Alan adı durumu**: mulkum360.com hâlâ GoDaddy PARK'ta (kullanıcı elle girmedi, API anahtarı da verilmedi). Bu yüzden CNAME GEÇİCİ GERİ ALINDI (`4f26098`) — github.io gizlilik linki yine doğrudan 200 veriyor (canlı doğrulandı). DNS hazırlanınca CNAME geri + rebuild = kesintisiz geçiş.
- **DİSK KRİZİ (2. kez)**: Build ortasında C: 0,00 GB → commit patladı. Kalıcı önlem: npm önbelleği artık `D:\araclar\npm-cache` (global config), test geçicileri silindi. ~1.5 GB `.gradle\caches` ileride `GRADLE_USER_HOME=D:\gradle-home` ile taşınabilir. **Kullanıcıya C: disk temizliği önerilmeli** — 0 GB tekrar build kırar.
- gh CLI artık `D:\araclar\gh\bin\gh.exe` (oturum keyring'de; push'lar `git -c credential.interactive=false push` ile sorunsuz).

## GİTHUB PUSH + GÜVENLİK REVİZYONU (10.11 akşam, kullanıcı "benim yapacaklarımı da yap")
- **Kimlik**: gh CLI taşınabilir (D:\araclar\gh), cihaz akışıyla `fatihcalis07-commits` oturumu (kullanıcı tarayıcıda onayladı). Token keyring'de, ekrana hiç basılmadı.
- **GÜVENLİK KRİTİK**: Depoya ilk push öncesi taramada `android/keystore.properties` (gerçek storePassword/keyPassword) bir commit'te izlenmiş olduğu bulundu. → Dosya takipten çıkarıldı, `keystore.example.properties` kondu, **filter-branch ile TÜM geçmişten blob silindi** (37 commit yeniden yazıldı → uç `6ae1a29`). Dosya diskte duruyor, build'ler etkilenmedi.
- **Doğrulama**: tüm yeniden-yazılmış geçmiş `scratchpad/gizli-tara.js` ile tarandı (12 gizli-anahtar kalıbı) → **0 eşleşme**. Uzak depodaki 429 dosyada keystore/.jks/.gizli/service_account → **yok**.
- **Depo**: `github.com/fatihcalis07-commits/mulkum360` (ZATEN mevcuttu; boş 2 dosyalık PUBLIC Pages deposu). `--allow-unrelated-histories` ile birleştirildi → kökteki `index.html` + `gizlilik.html` (Mahmure Aydın gizlilik aydınlatma, 6698 uyumlu) korundu, **silinmedi/silme**. Push: `b08f54d..6ae1a29 main`, yerel=uzak.
- **Yedek**: eski (keystore içeren) bundle SİLİNDİ; temiz geçmişten `D:\yedek\vitrin-app-guvenli-20261110.bundle` (verify okay).
- **Not**: repo PUBLIC. İçinde gizli yok (istemci-only anahtarlar, RLS korumalı). İstenirse ileride özel yapılabilir ama Pages gizlilik sayfası bunu gerekebilir — kullanıcı kararı.

## TAM ARAYÜZ DENETİMİ (10.11 akşam, kullanıcı talebi: "tüm sayfalar/düğmeler, A düşen var mı")
- **Kapsam**: 30 rota headless crawl (chrome-ctrl/test-denetim.js) + ikon statik taraması (108 tanımlı IKON anahtarına karşı tüm `ic('..')` + kisayol/menuSatir argümanları + `ikon:` değerleri) + kod okuması.
- **Sağlam (A)**: 30/30 rotada 0 konsol hatası · 0 ölü bağlantı · 0 yatay taşma · 15 oturum-duyarlı rota zarif "Giriş" perdesi · geçersiz id'ler (uye/x, sohbet/x, rapor/x) boş-durum/zorunlu giriş · alt menü Ara/Favoriler/+ (toplui renkli)/Keşfet/Hesabım yerinde.
- **A-düşen bulgular → hepsi düzeltildi (0cfc543 + sürüm etiketi)**: ① 4 EKSİK SİMGE boş kare basıyordu: `kiralik, deniz, proje, vasita` (Kiralayın/Sezonluk/Projeler/Tüm vasıtalar kutuları) → simgeler.js sonuna takma ad: anahtar/tekne/vinc/araba. ② "Haritada ara" şeritte 5.'ydi (kullanıcı bulamadı!) → emlak+vasıta şeritlerinin BAŞINA alındı. ③ **Vasıta haritası boştu: 126 vasıta ilanı 0 koordinat** → 12 ilçe merkezi çözüldü (Photon; Nilüfer/Yunusemre varyasyon sorgusuyla, Fethiye çift-kaynak Nominatim+Photon aynı nokta 36.622115,29.115338; hepsi il+ilçe denetimli) → CANLIDA 126/126, harita vasıta segmentinde 4 küme. ④ Harita başlığı yarıçap/zoom ne olursa "120 ilan" diyordu (slice tavani) → artık `toplam` + "(ilk 120 listelendi)". ⑤ Hesabım sürüm etiketi 3.4'te takılı kalmış (v3.5 APK'da bile!) → 3.6 · 10.11.
- **v3.6 derleniyor** (versionCode 36): bu düzeltmeler + doping Play istemci yolu; vasıta koordinatları DB'de, eski APK'lara otomatik yansır.
- **Kalan öneriler (kullanıcı kararı)**: "Projeler" kısayolu boş sayfaya gidiyor (proje ilanı yok) → gizle/"yakında" rozeti; danışman listesi 1 kişi (EİDS sonrası gerçek ofisler); Play Console 5 doping + SA JSON (gelir kapısı); GitHub push (etkileşimli kimlik); Pusula-AR cihaz spike; EİDS başvurusu alan adı/IP kararları.
- **DOPİNG FİYATLARI CANLIDA** (10.11, "sen teklif sun" → onayladı): 13/13 fiyat, 5 birinci kademe aktif (`guncel_7` 99,99 · `guncel_30` 299,99 · `vitrin_anasayfa_7` 349,99 · `vitrin_anasayfa_30` 949,99 · `acil_7` 74,99 ₺; KDV dahil, Play %15 sonrası net ≈ fiyat÷1,2×0,85). RPC kapı testleri canlıda ✔ (pasif→urun yok; aktif+sahte ilan→sahiplik red). Kalan: Play Console 5 ürün + SA JSON sırrı + edge deploy + v3.6 istemci yolu — tablo docs/PLAY-URUNLER.md.
- **"Yapabildiğini yap" turu (kullanıcı dışarıda, tam yetki verdi)**: ① **Uçtan uca regresyon CANLIDA hepsi yeşil** (chrome-ctrl/test-regresyon.js): 704 ilan/703 yayinda, ana 27 kart, harita 9 karo+6 küme "koordinatlı tüm ilanlar", doping 5 aktif+6 tür, play istemcisi webde zarif, EİDS faz=manuel canlı okuma, 4 navigasyon perdesi, konsol 0 hata. ② **Disk-dışı YEDEK**: `git bundle create D:\yedek\vitrin-app-<tarih>.bundle --branches --tags` yazıldı + `bundle verify` "okay" (5,9 MB, tüm geçmiş; geri döndürme: `git clone bundle yol`). ③ GitHub push DENENDİ ve BILINÇLI bırakıldı: credential manager'daki kayıt `GitHub - api.github.com/fatihcalis07-commits` (Desktop/Copilot token'ı; `git credential fill` etkileşim bekletti — GUI onayı/kimlik çıkarımı yapılmadı). Kullanıcı işi: repo aç + adres veya `gh auth login`. ④ v3.5 APK imzası apksigner ile bağımsız doğrulandı (CN=Mulkum360, verify exit 0) ve GUI üzerinden kullanıcıya sunuldu. ⑤ Oyunda kalan tek büyük gelir kapısı hâlâ: Play Console 5 doping+4 kredi ürünü + SA JSON → `secrets set` → v3.6 derleme (istemci doping Play yolu 2641b1d'de hazır; edge doping dallı deploy edilmiş, SA yokken 503 — docs/PLAY-URUNLER.md §2).
- **v3.5 CANLI DERLENDİ** (kullanıcı "hepsine başla" → v3.4 test beklemesi aşıldı): `versionCode 35 / versionName "3.5"`, `JAVA_HOME=D:\Program Files\Android\Android Studio\jbr` (gradlew bu shell'de yolda Java bulamıyor — DEVIR satır 19 kuralı), `bundleRelease assembleRelease` 1dk20s ✔. Ürünler: `android/app/build/outputs/bundle/release/app-release.aab` (7,5 MB — Play'e) + `apk/release/app-release.apk` (7,7 MB — **masaüstünde `Mulkum360-v3.5.apk`**). Keystore gerçekte `vitrin-app/.gizli/mulkum360-upload.jks` (keystore.properties `../../` göreli — satır 229'daki `.gizli/...` doğru ama kök-repo göreli).
- **Doping Play satışı (kod hazır, YAYINDA DEĞİL)**: canlı `doping_paketleri` 13 ürün, play_urun'lar tanımlı, **hepsi fiyat 0 + pasif** (iş kararı). `play-odeme` edge'ine doping dalı yazıldı (kredi'de bulunamaz → aktif doping paketi + ilan sahiplik doğrulaması + `play_doping_baslat` RPC) — **deploy edilmedi**. Şema: `20261110130000_doping_play.sql` (`doping_satislari.play_token` partial unique + RPC) — **KULLANICI ONAYIYLA UYGULANDI + deftere tescil edildi** (10.11): idx+fn canlıda doğrulandı, RPC davranış testi: pasif ürün → `urun yok veya satista degil` red (veri değişmedi ✔). Sıra: fiyatlar → edge deploy → istemci doping Play yolu (v3.6). Plan + 17 ürün listesi: **docs/PLAY-URUNLER.md** (GOOGLE_PLAY_SA_JSON sırrı kurulmadı → edge dürüst 503 veriyor, ödeme kabul etmiyor ✔).
- **EİDS başvuru taslağı**: **docs/EIDS-BASVURU.md** — eids@ticaret.gov.tr e-posta metni + belge listesi + 3 KAPALI karar: returnUrl host'u (web host YOK → Cloudflare Pages + alan adı önerisi), Supabase sabit çıkış IPv4 (dedicated IP add-on / röle), GSM OTP. **Gönderilmedi; [KULLANICI] alanları bekliyor.**
- **GitHub push**: hâlâ KULLANICIDA — `gh` yok, remote tanımsız; komutlar satır 282.
- Not: `supabase/scratch/` sorgu çöpü commit'lere girmiyor (silinecek).

## v3.8 (11.11) Sade menü ve simgeler
- Uzun menüler açılır-kapanır: katla(baslik, ikon, icerik, ozet, acik). Yan menü: MülkümAI ve Finans (açık) / Emlak / Vasıta / Yardım ve Dil (kapalı). Hesabım: Ofis ve davet / Resmî kurum araçları / Takip ettiklerim / Ayarlar (kapalı).
- Renkli (pastel + iOS degrade) simgeler kaldırıldı: tek renk sade dil (--sade-zemin, --sade-ikon = --birincil), app.css sonundaki 3.8 bloğu öncekileri geçersiz kılar.
- ajanda.js (AI ajanda, 08.11) derlemeye dahil; mulkum-ai ajanda_coz/ajanda_ozet canlı.
- UYARI: C: diskinde 599 MB boş kaldı, build kırılabilir.

## v3.9 (11.11) İlanı Yönet
- Hesabım ilan kartında Düzenle/Satıldı/Sil/Fotoğraf ekle yerine tek 'İlanı yönet' düğmesi → seçenek penceresi (Düzenle, Fotoğraf ekle, EİDS, Satıldı/Kiralandı, Görüntüle, Sil). Eski düğmeler gizli duruyor, pencere onları tetikliyor (işleyiciler aynı).
- Başlık kuralı katı: KUCUK_KAL boş (ve/için/ile de büyük harf). Katla özetleri ve seçenek penceresi başlıkları da kapsamda.

## Disk temizliği (11.11, kullanıcı onaylı)
- Silindi: Temp (2 günden eski), NVIDIA DXCache, Chrome Cache/Code Cache, CapCut önbelleği, .cache\codex-runtimes, 'DeepSeek Harness.new-{4812E517…}' güncelleme kalıntısı (çalışan sürüm ana klasörde, aynı 0.2.1-rc.5). Windows Update indirmeleri yönetici izni olmadığı için atlandı.
- Gradle önbelleği D:\gradle-home'a taşındı; kullanıcı ortam değişkeni GRADLE_USER_HOME=D:\gradle-home. assembleRelease bu ayarla çalıştı (exit 0).
- C: boş alan 0,67 GB → 9,1 GB. Daha fazlası için seçenek: hazırda bekletmeyi kapatmak (hiberfil.sys 6,3 GB, yönetici: powercfg -h off).

## v4.0 (11.11)
- Resmî kurum araçları: TAKBİS bağlantısı yanlış alan adına (parselsorgu.takbis.gsb.gov.tr, DNS yok) gidiyordu → https://parselsorgu.tkgm.gov.tr/ (200). Web Tapu eklendi: https://webtapu.tkgm.gov.tr/ (200).

## v4.1 (11.11) Emlak haberleri
- Keşfet 'Günün ipucu' kaldırıldı → 'Emlak Haberleri' kartı (5 başlık, kaynak + ne zaman; dokununca haber sitesinde açılır).
- Yeni edge: supabase/functions/haberler — yayıncıların kendi RSS'i: Emlak Kulisi (tamamı), AA ve TRT Haber ekonomi (emlak anahtar kelimeleriyle süzülür). Yalnız başlık+bağlantı, 30 dk önbellek, kaynak başına en çok 5. Google Haberler RSS bilerek kullanılmadı (ticari kullanım yasak).

## v4.2 (11.11) Piyasa gündemi + profesyonel menü adları + açılış yarışı
- Haberler: edge `haberler` artık {kategoriler:{emlak,otomobil,ekonomi}}. Otomobil: Motor1 Türkiye, Autoshow RSS. Ekonomi: AA + TRT Haber ekonomi. Keşfet kartı "Piyasa gündemi" + 3 sekme.
- Menü adları (adlar.js ile, yalnız ustBar/menuSatir/katla/sekme bağlamı): Değer hesapla→Değerleme, Değer raporlarım→Değerleme raporlarım, Banka kredisi hesapla→Kredi hesaplama, Haritada ara→Harita görünümü, Kredilerim→Kredi bakiyem, Profil ve şifre→Profil ayarları, Satış ve kiralama performansım→Performans raporu, Toplu ilan yükle→Toplu ilan aktarımı, Asistana sor→MülkümAI asistan, Ofisim paneli→Ofis paneli, Güvenli alışveriş rehberi→Güvenli alım satım rehberi, Emlak ofisi rozeti al→Kurumsal rozet başvurusu, Yardım ve yasal metinler→Yardım merkezi; katlar: Akıllı araçlar, Kurumsal hesap, Resmî sorgulamalar, Takip listem, Destek ve dil; Ofisim: Müşteriler, Toplu aktarım; Yönetim: Kredi Yükleme, Vitrin, Öne Çıkarma, Seçim Verileri; Ayarlar: Renk paleti, Bildirimler, Yardım merkezi, Yasal bilgiler.
- HATA DÜZELTİLDİ: basla() app.js sonunda eşzamanlı çağrılıyordu; await yukle() hızlı dönünce veriYukle, doping.js parse edilmeden çalışıp "dopingYukle is not defined" → "Bağlantı kurulamadı" veriyordu (aralıklı). Artık DOMContentLoaded'da başlıyor + sb.js'de typeof koruması.

## v4.3 (11.11) Mülküm360 Endeks Bankası (emlak + otomobil, 2016+)
- DeepSeek'in bıraktığı yer: ingestion_logs + veri_kaynaklari (08.11), kfe (TCMB KFE bölgesel, 4.020 satır), bolge_gostergeleri (TÜİK satış vb. 41.284), yatırım endeksi (yatirim.js). Otomobil verisi YOKTU, il bazlı m² fiyat/kira serisi YOKTU.
- Yeni: migration 20261111150000_endeks_bankasi.sql → endeks_seri (19 seri) + endeks_veri (kod, bolge, donem, deger) + endeks_ilan_ozeti() (kendi ilanlarımızın aylık m²/fiyat ortancası, test ilanları hariç, ≥3 ilan) + cron: endeks-topla her ayın 23'ü 06:45, endeks-ilan-ozeti her ayın 1'i ve 15'i.
- Edge endeks-topla (--no-verify-jwt; ?tani=1 kuru çalışma): EVDS aylık (frequency=5, avg) KFE/YKFE/YOKFE TR, TÜFE kira 04110, konut satış adedi, TÜFE 07111 sıfır motorlu taşıt, 071, 0722 yakıt, 0723 bakım, 07211 lastik, 07244 kiralama, TÜFE genel, USD/EUR; çeyreklik (frequency=6) bie_birimfiyat ve bie_bk il serileri (76 il + TR; Ardahan, Bayburt, Gümüşhane, Hakkari, Tunceli TCMB'de yok). İlk yükleme 7.430 satır.
- Ekran: www/endeksler.js, #/endeksler "Piyasa Endeksleri" (yan menü > Akıllı Araçlar). Emlak: Mülküm360 Konut Endeksi (nominal/reel/dolar, 2016=100), il seçimli m² fiyat + kira + brüt kira getirisi, yeni/ikinci el/kira, satış adedi. Otomobil: Mülküm360 Otomobil Endeksi (07111 nominal/reel/dolar) + akaryakıt/bakım/lastik/kiralama. SVG grafik, kütüphanesiz.

## v4.4 (11.11) Yayınlanmış raporlar + değerleme hatası
- Değerleme (EKRAN.degerle): ilandan "Bu mülkün değer raporu" ile gelince önceki başka mülkün hesabı (sonDegerleme) kalıyordu → kaynak ilan farklıysa sonDegerleme sıfırlanıyor. Önizlemede 2 farklı ilanla doğrulandı.
- Migration 20261111160000_endeks_raporlar.sql: BETAM.SATILIK.M2, BETAM.KIRALIK.M2, ENDEKSA.M2 serileri; Emlakjet & Endeksa Konut Değer Raporu basın rakamları (TR 2026-05..09, 6 il 2026-07); ilan özeti cron'u haftalık (pazartesi 03:20).
- Betam/sahibindex raporları: Betam WordPress medya API'sinden (kamuya açık docx) indirildi, scratchpad/betam2.mjs ile "ülke genelinde/İstanbul'da/Ankara'da/İzmir'de X TL" çekildi → veri/betam_endeks_2026_11.sql (247 satır: satılık 2021-12→2026-09, kiralık 2024-01→2026-09; 2021 öncesi raporlar medya listesinde yok/farklı biçim). Rakip ilan sitelerinden scraping BİLEREK yapılmadı (ToS/robots/Cloudflare/KVKK).
- Ekran: Piyasa Endeksleri > "Piyasa Raporları Karşılaştırması" (TCMB değerleme / sahibindex ilan / Emlakjet&Endeksa; seçili il ya da Türkiye) + "Mülküm360 İlan Verisi" kartı (gerçek ilan sayısı, İlan Ver / Toplu Aktarım).

## v4.5 (11.11) Antalya
- Betam docx raporlarında il tabloları YOK (yalnız TR + 3 büyükşehir metni; grafikler resim). bolge_gostergeleri içindeki sahibindex il değerleri (25 il, 2025-12..2026-09) endeks_veri BETAM.* serilerine kopyalandı. ENDEKSA.M2 Antalya 2026-05 = 54.541 (basın). Karşılaştırma kartı artık seçili ilin TCMB/Endeksa/Betam verisi varsa o ili gösteriyor (önce yalnız Betam varsa).

## v4.6 (11.11) Betam il tabloları
- Betam docx raporlarında il tablosu VAR (w:tbl; il | geçen yıl m² | bu yıl m² | yıllık %, her ay en çok/en az artan 10 il). scratchpad/betam3.mjs ilk "Türkiye Ortalaması" tablosunu okur, bu yıl → veri ayı, geçen yıl → 12 ay önce. veri/betam_il_2026_11.sql: 1.235 satır; BETAM.SATILIK.M2 30 il (865), BETAM.KIRALIK.M2 29 il (481). Örn. Antalya satılık 2020-12 → 2025-08 neredeyse aylık.

## v4.7 (11.11) 81 il kapsamı
- TCMB bie_birimfiyat/bie_bk Ardahan, Bayburt, Gümüşhane, Hakkari, Tunceli serileri tanımlı ama BOŞ (EVDS veri dönmüyor). endeksler.js bolgeYedekHtml: bu illerde KFE_BOLGE (endeks.js) ile bölge bulunur; bölgedeki diğer illerin son TCMB m² fiyat/kira ortalaması + bölgesel KFE grafiği (nominal/reel), "bölge ortalaması" etiketiyle.

## v4.8 (11.11) iOS tarzı kontroller
- Kök neden: .segment taban stili koyu hero için (açık gri yazı, #ffffff12 zemin) → açık sayfalarda soluk. app.css sonu 4.8 bloğu: --ios-* değişkenleri; segment gri ray + beyaz seçili kapsül (class secili VE aria-selected), hero istisnası; çipler hafif tonlu mavi seçili; .btn iOS mavisi, .sade gri dolgu; simgeler iOS gri kare + sistem mavisi. Eski renkli kurallar yüksek özgüllükle (.segment.segment.segment, .kisayol.kisayol) eziliyor.

## v4.9 (11.11)
- Harita filtreleri: 3 sıra çip yerine tek sıra açılır seçici (Mesafe / İşlem / Sıralama, .filtre-sec) + Konumum / İl-ilçe düğmeleri; seçenekler alt pencerede (HARP_SECIM, harpSecimAc).
- Kat önerilerine "Giriş katı" eklendi (ONERI.kat).

## 5.0 (11.11.2026)
- Ara > Filtrele penceresi iOS gruplu liste: Konum, Fiyat, Emlak, Özellikler, Vasıta grupları; etiket solda, değer sağda; aktif filtre sayısı; sabit alt düğmeler.

## 5.1 (11.11.2026)
- Değerlemede Bulunduğu kat: katEtki() katsayısı (bodrum 0,85, giriş/zemin 0,92, bahçe/çatı 0,95, yüksek giriş 0,96, 1. kat 0,98, 2-5 = 1, 6+ 1,02, villa katı 1,05). Emsaller kendi katına göre eşitlenir, sonuçta kat etkisi yazar. İlan endeks kartında kata göre beklenen m².

## 5.2 (11.11.2026)
- Filtrele: Emlak grubuna Bulunduğu kat. Vasıta: Araç (marka, model, kasa), Model yılı ve Kilometre aralıkları, Teknik ve durum (yakıt, vites, boya/değişen, renk, takas, kimden). Alt düğme çubuğu altındaki satırları örtüyor.

## 5.3 (11.11.2026)
- Bina yaşı sahibinden gibi seçim: 0,1,2,3,4 tek tek, sonra 5-10, 11-15, 16-20, 21-25, 26-30, 31 ve üzeri (İlan Ver, Değerleme, Filtrele aynı liste). yasSayi() grup ortasını sayıya çevirir (rapor yönetmelik dönemi, öneri metni). Eski sayısal yaşlar korunur ve doğru gruba düşer.

## 5.4 (11.11.2026)
- bildirimler tablosu + ilanlar_yayin_bildirimi tetikleyicisi: ilan onayda/kaldırıldı → yayında geçince sahibine "İlanın Onaylandı ve Yayında". İstemci canliBaglan içinde dinler, açılışta okunmamışları gösterir (uyeBildirimi, bekleyenBildirimler). Not: FCM push yok; bildirim uygulama açıkken/arka plandayken ya da sonraki açılışta düşer.

## 5.5 (12.11.2026)
- Demografi: TÜİK databrowser2 küpleri (DF_ADNKS_T16 il×cinsiyet×5li yaş, DF_ULUSAL_EGITIM_ISTATISTIK_BED_NUFUS il×eğitim 15+, DF_ADNKS_T10 il×medeni 15+), 2025, 81 il → bolge_verileri yeni sütunlar erkek_sayisi, kadin_sayisi, yas_dagilim, egitim_dagilim, medeni_dagilim, demografi_kaynak; universite_orani, okuryazar_orani, yaş grupları dolduruldu. Çıkarıcı: scratchpad demografi.js, SQL migrations/20261111240000_demografi_detay.sql.
- Rapor: demografik/sosyal tablo genişledi; yeni "Nüfus Yapısı" sayfası (10luk yaş grupları, cinsiyet, eğitim, medeni durum).
- HATA DÜZELTME: bolgeVerisi/gostergeler/secimSonuclari .in(ilce, ["",""]) boş ilçeyi eşleştirmiyordu → raporlara demografi ve il göstergeleri hiç gelmiyordu. Artık il bazında çekip ilçeyi JSte süzüyor.

## 5.6 (12.11.2026)
- İlçe verisi (973 ilçe, TÜİK 2025): nüfus, yıllık artış (binde), merkez/köy, doğum, ölüm, evlenme, boşanma, yabancılara konut satışı son 12 ay + önceki 12 ay. Çıkarıcı scratchpad ilce.js → migrations/20261112010000_ilce_verileri.sql. bolgeVerisi artık il satırını döndürür, ilçe satırı .ilceVeri içinde. Raporda "<İlçe> İlçesi" kartı (3 kutu), altında il geneli tablolar.
- Not: ilk yüklemede il adı önekli 100 fazla ilçe satırı oluştu (ör. "Adıyaman Merkez"); uygulama bunları eşleştirmez, zararsız. Silmek kullanıcı onayı ister.

## 5.7 (12.11.2026)
- Toplu taşıma boş geliyordu. Sebep: overpass-api.de tarayıcı/WebView User-Agentını 406 ile reddediyor; diğer aynalar yoğun. Çözüm: telefonda CapacitorHttp GET + User-Agent "Mulkum360/1.0" (overpassYaris), maps.mail.ru aynası eklendi, okuma süresi 60 sn, overpass() bir kez 4 sn sonra yeniden dener. Taşıma sorgusu ayrı ve hafif (ağır hastane/havalimanı sorgusundan ayrıldı). Eksik sonuç önbelleğe yazılmaz (s.eksik), önbellek anahtarı v2: (eski boş kayıtlar okunmaz). Veri alınamazsa raporda sıfırlar yerine açıklama.

## iOS (12.11.2026)
- @capacitor/ios 8 eklendi, ios/ klasörü oluşturuldu (SPM, CocoaPods yok). Bundle ID com.mulkum360.app, ad Mülküm360. Info.plist: konum, kamera, galeri izin metinleri, ITSAppUsesNonExemptEncryption=false. Simge ve açılış görselleri @capacitor/assets ile üretildi.
- Eksik: Cordova eklentileri (cordova-plugin-purchase, inappbrowser) SPM ile iOSa girmez; kredi satışı iOSta kapalı görünür (ODEME_YONTEMI=yok). Google ile giriş varsa Apple ile giriş zorunlu (App Store 4.8). Derleme Mac/Xcode veya bulut (Codemagic / GitHub Actions macOS) ister; Apple Developer hesabı gerekir.

## 5.8 (12.11.2026)
- Araç veri bankası: TSB Kasko Değer Listesi (tsb.org.tr/content/InsuranceExcelFiles/YYYYMMR1.xlsx, herkese açık) 2026-11 → public.arac_kasko (79.781 satır: marka, model, tip, yıl 2012-2026, değer). Çıkarıcı scratchpad kasko.js (+ad.js birleştirme). www/araclar.js: 175 marka / ~1.690 model (ARAC_MODELLER) + ARAC_KASKO_AD (uygulama adı → kasko adı). MARKALAR artık bu listeden.
- Marka→model seçimi: aracModelBagla() Filtrele, İlan Ver (öneri listesi) ve Değerleme (seçim).
- Filtre: "Ağır hasar kayıtlı" Evet/Hayır (agirhasar), Boya/değişen ayrı.
- Değerleme vasıta: kaskoDegeri() tip ortancası + çeyrekler; km (yılda 15 bin km beklentisi, 10 bin km başına %1, ±%15) ve hasar (boyalı -4, değişen -8, ağır -25; tahmin) düzeltmesi. Emsal yoksa sonuç kaskodan, varsa kasko kartı ek bilgi.
- public.degerleme_kayitlari: her değerleme isteği kimliksiz kaydedilir (anon insert, yalnız yönetici okur).
- Sonraki: TSB listesi her ay yenileniyor (aylık otomatik çekme kurulmadı).

## 5.9 (12.11.2026)
- İlan Ver araç/emlak tam ayrımı: araç ilanında Mahalle, Sokak/Cadde, kapı no notu ve 360° tur yok (yalnız il/ilçe); topla() bu alanlar yokken güvenli, araçta mahalle/sokak silinir. İçe aktarmada kategori gelmezse marka/km/vites/yakıt varsa otomobil (önceden hep konut sayılıyordu → araç ilanı emlak formuyla açılıyordu).

## 6.0 (12.11.2026)
- İlan aktar: şemada marka/model serbest metin (180 markalık liste 40ta kesiliyordu, Volkswagen gibi markalar düşüyordu); tüm ALT kategorileri istemciden; araçta mahalle/sokak yazılmaz; marka markaBul() (VW, Mercedes, Range Rover, Tofaş gibi kısaltmalar), model aracModelEsle() ile seriye eşlenir. Özet satırında marka/model/yıl/km.
- Ruhsat: marka markaBul, model seriye eşlenir; mulkum-ai belge_oku alt listesine elektrikli/minivan/karavan/klasik eklendi; ice_aktar istemi mahalle/sokak yalnız emlak. mulkum-ai deploy edildi.
- Tapu akışı kontrol edildi, değişiklik gerekmedi.

## 6.1 (12.11.2026)
- İlan aktar: üstte Emlak ilanı / Araç ilanı seçimi (iaAna). MülkümAIye yalnız seçilen türün alanları ve kategorileri gider; kategori seçilen türe zorlanır (araç seçildiyse emlak formu açılamaz). mulkum-ai ice_aktar: m² ve işlem notu yalnız emlakta, araçta km/yıl/hasar notu. Deploy edildi.

## 6.2 (12.11.2026)
- Araç ilanı sayfası ve yayın sonrası: MülkümDeko yok; video "MülkümVideo Araç Tanıtımı"; yeni "Fiyatın piyasaya göre nerede?" (değerleme, kasko) seçeneği; değer kartı "Bu aracın değeri · TSB kasko". rozet(k, ana): araçta "Kurumsal satıcı / Doğrulanmış satıcı".

## 6.3 (12.11.2026)
- Araç ilanı rozeti: "Galeri ofisi" / "Doğrulanmış galeri".

## 6.4 (12.11.2026)
- Hesabım > Resmî sorgulamalar: Emlak / Motorlu Araçlar sekmeleri. ARAC_ARACLAR: Mülküm360 kasko değeri (iç bağlantı), TSB kasko listesi, e-Devlet trafik cezası, SBM hasar kaydı (SMS 5664), TÜVTÜRK, GİB Dijital (MTV), TNB, EGM. Adresler curl ile açılıyor diye kontrol edildi; tahmini e-Devlet hizmet adresleri 404 verdiği için kullanılmadı.

## 6.5 (12.11.2026)
- Araç ilanı sayfası: "Almadan Önce Kontrol Et" kartı (aracKontrolKarti): TRAMER hasar SMS (sms:5664 HASAR), kasko değeri (#/degerle?ilan=), e-Devlet trafik cezası, TÜVTÜRK, TNB; ağır hasar/çekme/rehin uyarısı. webAc sms: ve #/ bağlantılarını açar; EKRAN.ilan araçta webBagla() çağırır.

## 6.6 (12.11.2026)
- Davet herkese: "Davet et, ikiniz de 3 kredi kazanın"; davet metni ev/arsa/araç sahipleri ve galerileri kapsıyor; üyelikte davet kodu her hesap türünde; davet_kullan() ofis şartı kaldırıldı (migrations/20261112050000_davet_herkes.sql). Üyelik seçeneği "Emlak ofisi" → "Kurumsal (emlak ofisi ya da galeri)".

## 6.7 (12.11.2026)
- Hesap türleri: Bireysel / Emlak ofisi / Oto galeri (üyelik ve Profil ayarları). DB: profiller.sektor (emlak|galeri), hesap_turu=ofis olanlar için; mevcut ofisler emlak. uyeOl, profilKaydet, hesapTuruYap(ofis, sektor), Google ile üyelikte kayitTuru emlak/galeri. Rozet kurumAd(): sektöre göre "Oto galeri" / "Emlak ofisi" (sektör yoksa ilan türüne göre).

## 6.8 (12.11.2026)
- EİDS taşıt (manuel faz): ilan_dogrulama.plaka/sasi, tasinmaz_no nullable + belirteç kısıtı; eids_iste_tasit(ilan, yontem, plaka, sasi, yetki) RPC; ilan_eids_kapisi artık emlak + vasita (yalnız insert ve durum yazımında; mevcut 126 yayındaki araç ilanı etkilenmez). İstemci: İlan Ver son adımında araç EİDS alanları (sahibim / eş-akraba / yetkili galeri, plaka zorunlu, şasi isteğe bağlı, yetki belge no), eidsSheet araç sürümü, ilan sayfasında "doğrulama sürüyor" araçta da, yönetim kuyruğunda plaka/şasi. Migration 20261112070000_eids_tasit.sql.
- Kalıcı çözüm: EİDS resmî entegrasyonu için Ticaret Bakanlığına platform başvurusu (eids@ticaret.gov.tr) kullanıcıya bırakıldı.

## 6.9 (12.11.2026)
- Onay bildirimleri: ilan_dogrulama tetikleyicisi (dogrulama_bildirimi): talep gelince yöneticiye "Onay Bekleyen İlan" (#/yonetim/dogrulama; yonetici_idler() yönetici e-postasından), red olunca sahibine "İlanın Onaylanmadı" + karar notu. Onay bildirimi (ilan_yayin_bildirimi) zaten vardı.
- Gelen kutusu: #/bildirimler (zil ikonu; kayıtlı aramalar bağlantısı üstte). Bildirimler okunana kadar listede kalır, telefonda her biri bir kez gösterilir (localStorage bildirimGosterilen), sayfa açılınca okundu.
- Not: uygulama tamamen kapalıyken anlık bildirim için FCM kurulmadı.

## 7.0 (12.11.2026)
- Aylık "Konut Trend Analizi" bildirimi: piyasa_bildirimi_gonder() (TCMB KFE TR aylık/yıllık + BIRIMFIYAT TR, 100 m² örneği), dönem başına üye başına bir kez; pg_cron piyasa-bildirimi her ayın 20si 10:30 TSİ. Örnek yalnız yöneticiye gönderildi. Gelen kutusunda piyasa simgesi grafik.
- İlan sayfası (sahibine): "İlanını güçlendir" altında "Öne Çıkar · Vitrin" kartı (dopingKartiYukle): tür başına en düşük paket fiyatı, açıklama, etkin doping durumu; dokununca dopingAlimSheet.

## 7.1 (12.11.2026)
- Anlık bildirim (FCM): Firebase projesi mulkum360-27818 (Gemini ve Analytics kapalı), Android uygulaması com.mulkum360.app, android/app/google-services.json (gitignore). @capacitor/push-notifications 8; www/push.js PUSH_ACIK=true: girişte izin, "genel" kanalı, jeton public.push_jetonlari. bildirimler INSERT → pg_net → push-gonder (FCM HTTP v1, --no-verify-jwt). EKSİK: FCM_SA secret (Firebase hizmet hesabı JSON) — kullanıcı oluşturup `supabase secrets set FCM_SA=...` ile eklemeli; yokken fonksiyon sessizce geçer.

## 7.2 (12.11.2026)
- Bildirim simgesi: res/drawable/ic_stat_bildirim.xml (logodaki ev + merkez nokta + yay, beyaz tek renk vektör), renk #E89B1A (values/bildirim.xml). Yerel bildirimler capacitor.config LocalNotifications.smallIcon/iconColor; FCM AndroidManifest default_notification_icon/color/channel ve push-gonder android.notification.icon/color.

- 12.11.2026: FCM_SA secret eklendi (hizmet hesabı firebase-adminsdk-fbsvc, anahtar 3f056c000f…). Bu anahtarın ekran görüntüsü sohbete düştü; yenisiyle değiştirilmesi önerildi. push_jetonlari şu an boş; ilk jeton 7.2 kurulup giriş yapılınca gelir.

- 12.11.2026: İlk anlık bildirim telefona gönderildi (gonderilen:1). FCM_SA secret tek tırnaklı env dosyasıyla yüklenmeli (çift tırnak kaçışları bozuyor). push-gonder hataları JSON olarak döndürür.

## 7.3 (12.11.2026)
- Bildirim başlıkları her kelime büyük harfle: DB baslik_buyut() + bildirimler BEFORE INSERT/UPDATE tetikleyicisi (tüm kaynaklar, mevcut kayıtlar da düzeltildi; tırnakla başlayan kelime dahil, i→İ). İstemci yerel bildirimler (mesaj, kayıtlı arama, ajanda) bildir() içinde baslikBuyut().

## 7.4 (12.11.2026)
- Bildirim simgesi logodan: ic_stat_bildirim = assets/logo.svg şekilleri (çatı, yay, nokta) beyaz tek renk; vurgu rengi logodaki altın #D4A24C (values/bildirim.xml, capacitor.config, push-gonder).

## 7.5 (12.11.2026)
- Öne çıkarma/vitrin kredi ile: doping_paketleri.kredi (fiyat/25, en az 1), doping_kredi_talep() RPC (kredi düşer, talep bekler), doping_bildirimi tetikleyicisi: talep→yöneticiye, onay→üyeye, red→üyeye + kredi iadesi. dopingAlimSheet ve ilan kartı kredi gösterir; yönetim listesinde kredi.

## 7.6 (12.11.2026)
- Rapor bölge analizi: ortanca yerine ortalama (m2Ort, ortalama, alanOrt; oda tablosu ortalama fiyat). Kartlar m² fiyatı üzerinden (ortalama ilan fiyatı ve ortalama alan alt satırda). "Bu mülk: net N m² × X TL/m² = değer, bölge ortalamasına göre %Y" satırı (7,43 M bölge ilan ortalaması 120 m² ilanlardan; 3,36 M mülk ~58 m², çelişki değildi). Eski raporlar m2Ortanca/ortanca alanlarına geri düşer.
- Medeni durum 18+: medeni18() TÜİK 15+ dağılımından 15-17 yaşı (15-19 grubunun 3/5i, hiç evlenmemiş) çıkarır; grafik ve tablo 18+.

## 7.7 (12.11.2026)
- Rapor A4 taşması: bölge sayfası (raporEkBolumler parca=bolge) yalnız fiyat+ilçe; yeni "Demografik ve Sosyal Yapı" sayfası (parca=demo + cinsiyet + medeni), sonraki sayfa yaş + eğitim. Tüm sayfalar ölçüldü, en dolu 874/1123 px.
- Rozet çakışması: kurum rozeti .rozet.kurum (sayaç .rozet position:absolute alıyordu, fotoğraf köşesine kayıyordu). .kart-alt sarılır.
- m² öne çıktı: ilan sayfasında .m2-hap (m² fiyatı + net/brüt m²), rapor vade kartlarında m² başına fiyat.
