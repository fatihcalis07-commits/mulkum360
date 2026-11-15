---
name: mulkum360
description: Mülküm360 (emlak + vasıta ilan uygulaması, MülkümAI, MülkümVideo) için güncel durum, sürüm, derleme, sunucu, yayın (mulkum360.com) ve değişmez kurallar. Mülküm360 kodu, APK, Supabase, video özelliği, alan adı/Pages veya @mulkum360 Instagram hesabıyla ilgili her işte kullan.
---

# Mülküm360: güncel durum (15 Kasım 2026, sürüm 14.30)

> **Senkron:** Bu skill iki yerde birebir aynı tutulur: Claude `C:\Users\fcali\vitrin-app\.claude\skills\mulkum360\SKILL.md` ve DeepSeek Harness `C:\Users\fcali\.dsh\skills\mulkum360\SKILL.md`. Hangisi düzenlenirse düzenlensin diğerine de kopyalanır (hash ile doğrula). Ayrıntılı geçmiş `C:\Users\fcali\vitrin-app\DEVIR.md` sonunda, proje tanıtımı `AGENTS.md`'de. Önce bu skill, sonra DEVIR.md'nin son bölümleri okunur.

## Ürün ve teknoloji
- Türkiye için emlak + vasıta ilan uygulaması, MülkümAI değerleme/PDF rapor, MülkümVideo. Slogan "Hayalindekine bir adım". Dil Türkçe.
- Klasör `C:\Users\fcali\vitrin-app`. Vanilla JS (`www/`), Capacitor 8 Android, Supabase proje `klnabwqduyavaqmbzxpo` (Frankfurt). Yönetici e-postası `public.yonetici()` ile tanımlı.
- Sürüm satırı: `www/app.js` 4. satır `SURUM`, ayrıca `android/app/build.gradle` versionCode/versionName. Şu an **14.30 / versionCode 170**.

## Yayın ve alan adı (ÖNEMLİ)
- Uygulama adresi `https://mulkum360.com/` (`WEB_ADRES`, `www/app.js` satır ~1033; ilan paylaşım bağlantısı, video karekodu ve künye paylaşımı bunu kullanır).
- Pages **GitHub Actions** ile yayınlanır: `.github/workflows/pages.yml`. Yalnız derlenen `_site` yayınlanır, depo belgeleri yayınlanmaz.
- Mod dosyası `.github/pages-modu` (ilk satır). **Şu an `bakim`**: kökte "Mülküm360 · Yakında" sayfası. `acik` yapılınca `www/` kökte açılır.
- **EİDS sonucu (başvuru 13.11.2026, eids@ticaret.gov.tr) gelmeden ve kullanıcı onaylamadan `acik` YAPILMAZ.** Web uygulamasını kimseye açma.
- **Bakım modunda kökte tanıtım sayfası (15.11.2026):** `anasayfa/` klasörü (scroll-craft tanıtım sayfasının yayın kopyası; uydu kapaklı, cam üst çubuk, 56 karelik iniş, gerçek ekranlar) `bakim` modunda kökte yayınlanır. Düğmeler "Yakında açılıyor" der ve `#kunye`ye gider (uygulama kapalı; EİDS notu künyede). `acik`a geçerken `anasayfa/` yerine `www/` yayınlanır, tanıtım sayfası ayrı bir adrese alınmazsa kaybolur; o gün karar verilir. Kökteki `index.html` (artık yayınlanmıyor, yedek) premium "Yakında" sayfasıdır (15.11.2026): tek dosya, yazı tipleri/uydu karesi/logo base64 gömülü (~475 KB), çünkü workflow bakımda yalnız `index.html`i kopyalar. Şablon oturum klasöründe üretildi; yeniden üretmek için yazı tipleri ve `anasayfa/assets/inis/38.webp` gömülerek yapılır. Workflow güncellenince `anasayfa/` kökü alır, bu dosya yedek kalır.
- **Canlı (15.11.2026):** `pages.yml` GitHub web arayüzünden elle güncellendi (commit `bcef22e`, bakımda `cp -r anasayfa/. _site/`). mulkum360.com artık `anasayfa/` tanıtım sayfasını gösterir (düğmeler "Yakında açılıyor"). Workflow dosyaları OAuth `workflow` izni olmadığından Claude'dan push edilemez; değişiklik gerekirse Claude in Chrome ile GitHub düzenleyicisine `execCommand('insertText')` ile yapıştırılır (base64, CRLF→LF) ya da kullanıcı elle yapar.
- Tanıtım sayfasında değişiklik: önce `scrollcraft\builds\mulkum360-tanitim\` (kaynak, `node ... sunucu` ile yerelde bak), sonra `anasayfa/` kopyasına (robocopy, `node_modules lab _ham` hariç) ve CTA metinleri korunarak taşınır.
- **Tanıtım sayfasındaki ilan (15.11.2026):** Kadıköy örnek ilanı no 100107 (Bostancı, test ilanı, 2+1, 95 m², 11.150.000 TL; konum 40.958168, 29.096805). İlan ekranı ve 56 karelik uydu inişi buna ait (z3-z17, `uydu` fonksiyonundan 15 çağrı, `_ham/z*.jpg` kaynak klasörde); ekranda uygulamanın kendi "test ilanıdır" uyarısı görünür. Değerleme, video ve bitiş ekranları giriş gerektirdiği için hâlâ ilan 100795'e ait (Kepez, Antalya) ve altlarında açık not var; yenilemek için kullanıcı kendi hesabıyla giriş yapmalı veya ekran görüntüsünü vermeli. Ekran alma yöntemi: `www` yerel sunucuda, Playwright mobil 390 genişlik DPR2, `#/ilan/<uuid>` (herkese açık görünüm); sunucuya yazma istekleri `route` ile engellenir. Ön koşul: Mapbox çağrısı önce tek örnekle onaya sunulur.
- **Cihaz testi (15.11.2026):** Her tasarım değişikliğinden sonra gerçek Chrome ile 13 boyutta (280, 320, 360, 390, 430, yatay telefon 844x390 ve 667x375, tablet 768 ve 1024, 1280, 1440, 1920, 2560) yatay taşma, kesilme ve görünmeyen öğe ölçülür; betik oturum klasöründe `cihaz-testi.cjs` (Playwright-core + Chrome). Kurallar: giriş animasyonu `translate` ile, arka plan katmanları `position:fixed`, mobilde backdrop-filter/blend/sürekli animasyon yok, `min-width:0` ve `minmax(0,1fr)`, yatay telefonda iki sütun, 1700 px üstünde `html` yazı boyu büyür, `env(safe-area-inset-*)`.
- `/www/` adresi köke yönlenir. Pages ayarı: Settings → Pages → Source = GitHub Actions (kuruldu, 15.11.2026).
- GitHub'a workflow dosyası push'u OAuth belirteciyle reddedilir (`workflow` izni yok); workflow dosyaları GitHub web arayüzünden değiştirilir.

## Derleme ve yayın akışı
- `npx cap sync android` → `cd android` → `JAVA_HOME="D:/Program Files/Android/Android Studio/jbr"`, `GRADLE_USER_HOME=D:/gradle-home` → `./gradlew.bat bundleRelease assembleRelease -q`.
- Çıktılar: `android/app/build/outputs/apk/release/app-release.apk` ve `bundle/release/app-release.aab`. Masaüstüne `Mulkum360-vX.Y.apk/.aab` olarak kopyalanır, eski sürüm dosyaları silinir.
- Keystore `.gizli/mulkum360-upload.jks` (keystore.properties). Gizli anahtarlar (DB şifresi, service_role, Gemini, Google secret) koda, sohbete, depoya yazılmaz.
- Her değişiklikte: SURUM + versionCode artır, APK derle, kullanıcıya gönder, `DEVIR.md` sonuna not ekle. Committen önce `git pull --rebase`. Commit sonuna `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (Claude tarafında; DSH kendi imzasını kullanır).

## Sunucu
- Edge Functions: `mulkum-ai` (sohbet, değerlendirme, video üretimi, kredi), `uydu` (Mapbox uydu karesi), `video-temizle` (+ cron), `gunluk-hat` Tahmin Arenası'na ait, karıştırma. Dağıtım: `npx supabase@2.121.0 functions deploy <ad> --project-ref klnabwqduyavaqmbzxpo --use-api`.
- Şema: `supabase/migrations/` (en son 20261121040000'a kadar uygulandı). `npx supabase@2.121.0 db query --linked`.
- Kredi sistemi: `profil_ozel.kredi`; yeni üyeye 1 kredi; 1 kredi ≈ 15 TL.

## MülkümVideo (www/video.js) durumu
- Türler: Fotoğraf turu (ücretsiz), Çok odalı tur (9/15 kredi), Uzaydan konuma iniş (1 kredi, yapay zekâ yok), Drone (bina fotoğrafından, 5 kredi, 9 sn, 0,9 hız), AI video (5 kredi).
- **Vasıta ilanlarında yalnız Fotoğraf turu ve AI klibi** sunulur (14.23); Çok odalı tur, Drone ve Uzaydan konuma iniş yalnız emlak ilanlarında. Bu yalnız arayüz kuralıdır, sunucu ilan türünü denetlemiyor.
- Her videoda 3 sn marka kapağı + 3 sn bitiş ekranı (karekod `WEB_ADRES#/ilan/<id>`), Gemini TTS anlatım, ilana ekle / taslak / sil, indir + WhatsApp paylaş, geri tuşu sayfa içinde kalır.
- **Yapay zekâ video türleri şimdilik YALNIZ yönetici** (`VIDEO_URETIM_ACIK=false`); diğer kullanıcılar paneli görür ama "Çok yakında". Kullanıcı onay verene kadar açılmaz.
- Video kapağı kat yazımı düzeltildi (14.19): "1. Kat" gibi hazır değerler olduğu gibi, düz sayı "3. kat" olarak yazılır.
- Pollinations/kie.ai gibi ücretli üretimler önce tek örnekle onaya sunulur.

## Fotoğrafsız ilan ve test ilanı kapağı (14.25 → 14.30 marka kapağı)
- 14.30 (kullanıcı onayı, A·Klasik montaj): test ilanları (`ornek`) ve fotosuz ilanlar artık **marka kapağı** taşır — `kapak(i)` bu iki durumda `KAPAK_MARKA = 'img/kapak-marka.png'` döner (1200×1200 PNG; logo + mülküm360 + slogan; üretici `promo/kapak-marka.py`). Kart/liste/vitrin/fırsat/kıyas/harita/paylaşım/sohbet tek fonksiyondan beslenir. `kadreIzle` marka kapağını ölçüme sokmaz. 14.25 lacivert `.foto-yok` tasarımının görsel kuralı 14.30'da kalktı; premium.css'deki kural CSS yedeği olarak durur.
- Kod: `fotoKutu` boş döner; stil `www/premium.css` sonu "Fotoğrafsız ilan kapağı".
- Masaüstünde kullanıcı isteğiyle eski `Mulkum360-v14.24.apk/.aab` silinmedi (genel kuraldan istisna, o dosyaya dokunma). 14.27'de yer tutucu kutuları `.vitrin-k`, `.kiyas-bas`, `.harp-alt` ile genişletildi.

## ⚠️ Fotoğraf kadrajı: kanıtsız/onaysız dokunulmaz — 14.29 ONAYLI istisna yürürlükte
- 14.27 enerji sezgisi (fotoFokus) kullanıcıda "iyice bozdun" tepkisi aldı → 14.28'de söküldü. 14.29'da doğru yol bulundu: çevrimdışı kanıt + kullanıcı onayı. 712 yayından ilanının 692'si ornek=true (test kapağı) çıktı (`promo/kapak-ornek.mjs`) — ham istatistikleri TEST verisi domine ediyor, her ölçümde GERÇEK/TEST ayrımı şart. Gerçek 15 ilanın kart görselleri indirilip önce/sonra montajı kullanıcıya gösterildi; kullanıcı seçti: "Evet, ikisi de olsun".
- 14.29 kalıcı çözüm (yalnız istemci, DB'ye yazma yok): `fotoKadre` modülü (app.js, bgYukle üstü). Kesin gökyüzü bandı ölçeri (crossOrigin Image→96px canvas, üst kesintisiz mavi bant `c`) + `kadra`: `c>0.30` & pencere≥340px & zum faydalıysa gökyüzünü kesen zum; dikeyde içerik bandını ortalamaya kaydırma; iç mekân → null (center/cover). Yalnız `.vitrin-k .foto` (1:1) + `.ilan-k .foto` (4:3); liste küçük resmi, `.firsat-k`, `.kiyas-bas` kapsam dışı. Önbellek localStorage `fotoKadre`; eski `fotoFokus` temizlenmeye devam eder.
- ASIL KÖK NEDEN (14.24→14.28 şikâyetinin kaynağı, 14.29'da bulundu): premium.css'deki `.foto:not([data-bg])` yer tutucu kuralı, `bgYukle`'ün `data-bg`'yi silmesiyle YÜKLENMİŞ fotoğrafa da uygulanıp `background` kısayoluyla `center/cover`'ı siliyordu → fotoğraflar doğal boyutta sol üst köşeden kırpılıyordu. 14.29'da seçici `:not([style*="background-image"])` ile sabitlendi; v1429-kadre testi computed `cover 50% 50%` ile kilitler. DERS: `background` kısayolu yazan her kural ya tüm alt özellikleri versin ya da satır içi stil taşıyan öğeleri dışarıda bıraksın.
- Kalıcı kural: kadraj davranışı yalnız kullanıcıya KENDİ fotoğrafları üzerinden görsel kanıt gösterilip onay alınarak değişir (14.29 bu kurala uygun doğdu). Sunucu tarafı kapak yeniden üretimi (kapakUret/kapakK) DB yazmasıdır — her zaman ayrı onay.
- Testler: promo/v1429-kadre.mjs 10/10, v1429-kapsam.mjs 6/6; v1428-geri.mjs GEÇERSİZ (stub), v1427-fokus.mjs geçersiz. "Kayık/kayıt" şikâyeti KAYDIRMA idi; 14.26 düzeltmeleri yerinde (v1425 11/11, v1424 25/25).

## Arama sonuçları ekranı (14.20 - 14.22)
- 14.22: ekrandaki hızlı filtre çipleri (Satılık, Fotoğraflı, Videolu) kaldırıldı. Satılık/Kiralık zaten filtre ekranında (İşlem); Fotoğraflı, Videolu ve Fiyatı düşen filtre ekranına "Fotoğraf, video, fiyat" grubu olarak taşındı (`foto`, `video`, `dusen` anahtarları, seçiliyken üstte çıkarılabilir etiket olarak görünür).
- 14.21: Emlak ve Vasıta alt alta 44 px açılır satırlar (`araSekmeHtml`, seçili satırın içinde alt kategoriler). Filtrele düğmesi arama kutusunun içinde (`.ara-filtre-ik`, aktif filtre sayısı rozetle); Sırala, Aramayı kaydet (zil) ve Liste/Izgara/Harita (yalnız simge) sonuç sayısı satırında. Ayrı filtre çubuğu ve "Sonuçlar" başlığı kaldırıldı.
- `EKRAN.ara` (www/app.js): liste satırında metrekare fiyatı (yalnız satılık emlak), tapu/ruhsat doğrulandı, video ve kimden rozetleri, kalp, kategori seçili değilken tür öneki; hızlı filtre çipleri (Satılık, Kiralık, Fiyatı düşen, Fotoğraflı, Videolu; sonucu olmayan çip gizlenir); Liste/Izgara/Harita seçimi (`araGorunum`, localStorage); `aramaYap` yeni `foto` ve `video` süzgeçleri. Arama kaydı yeni ilan bildirimi göndermez, yalnız Keşfet'te gösterir.

## Harita ve rozetler (14.24)
- Harita (www/harita.js, Leaflet yok): küme balonu her zoomda (72×54 px hücre, >1 ilan), z≥16'da tam çakışık iğneler yelpaze. Pinç zoom pointer-events ile (≥24 px, kademe 4–18). "Bu görünümü ara" (`HARP.kutu`): liste görünen kutuyla sınırlı, harita oynayınca otomatik kalkar, etiket `harpCiz` sonunda senkronlanır.
- `sozluk()` (app.js): tr-TR kelime başı büyük — tüm rozet/etiketler ("Emlak Ofisi", "Oto Galeri", "Fiyatı Düşenler", "EİDS Doğrulandı", "Fotoğraf Yok"). kimden() ve süzgeç seçenekleri birlikte değişti ("Emlak Ofisinden"); veritabanındaki küçük veriler arayüzde sozluk ile gösterilir.
- `fiyatVitrin(n)`: ≥10M → "22,5 M ₺", altı tam TL. AI FAB `body.ai-acik` alt tampon 52 px. Fotosuz ilan marka gradyan + "Fotoğraf Yok".
- Endeks: `endeksSeri` localStorage gün önbelleği (`endeks:…`), hata halinde eski veri; üç istek Promise.all.
- Kredi (banka.js): `amortismanTablosu(anapara, aylikFaiz, vade, tur, banka)` — DİKKAT: `t.faiz` aylık faizdir. Yıllık özet sheet; `[data-amort]` düğmeleri `hesapla()` içinde bağlanır.
- Danışmanlar: `DAN_DURUM {il,ara}` arama + şehir çipleri + `.dan-fotos` portföy şeridi. Proje izleme: `projeTakip`/`projeTakipSon` localStorage, önplan bildirimi (`projeTakipKontrol`, sb.js). Sunucu push yok (şema onayı gerekir). Son gezdiklerin `S.gorulen` zaten vardı.

## Tanıtım sitesi
- `scrollcraft/builds/mulkum360-tanitim/` (kaynak, yerel): scroll-craft ile yapılmış tanıtım sayfası. 15.11.2026'da premium sürüm: uydu karesi arka planlı kapak, altın "bir adım." başlığı, eğik gerçek ilan ekranı, cam üst çubuk (aşağı kaydırınca gizlenir), yetenek şeridi (4 madde, sayı yok), genişletilmiş künye, OG etiketleri. Giriş animasyonu `translate` özelliğiyle yapılır (kart `transform`unu ezmesin). Yayın kopyası `anasayfa/` (commit `a2f698f`).
- Tasarım iş akışı skill'i: `vitrin-app\.claude\skills\mulkum-tasarim-akisi`.

## Değişmez kurallar
1. Veri uydurma yok; veri yoksa "yetersiz veri" yazılır. Test ilanları `ornek=true` ve silinebilir.
2. Değerleme: kademeli emsal, kapsam ve güven yazılır; "SPK lisanslı değerleme yerine geçmez" uyarısı kalır. Kullanıcı beyanları sayıya katılmaz.
3. Kullanıcının kişisel adı görünmez; marka kimliği kullanılır.
4. Çalışma biçimi: önce incele, yalnız istenen dosyalar, büyük değişiklikten önce plan, her değişiklikten sonra test, kısa rapor (değişen dosyalar + test sonucu). Ayrıntı `C:\Users\fcali\CLAUDE ORTAK\calisma_bicimi.md`.
5. Ücretli üretim (kredi harcayan) önce onaya sunulur.

## @mulkum360 Instagram hesabı
- Ayrı hesap, Paranın Tarihçisi ile karıştırılmaz. Kurallar `instagram` skill'inin "MÜLKÜM360 HESABI" bölümünde: oran **4:5 (1080×1350)**, her yüklemeden önce hesap doğrulama. 12-13 Kasım'da g4–g18 yayınlandı (profil 18 gönderi, hepsi 4:5).
