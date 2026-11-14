---
name: mulkum360
description: Mülküm360 (emlak + vasıta ilan uygulaması, MülkümAI, MülkümVideo) için güncel durum, sürüm, derleme, sunucu, yayın (mulkum360.com) ve değişmez kurallar. Mülküm360 kodu, APK, Supabase, video özelliği, alan adı/Pages veya @mulkum360 Instagram hesabıyla ilgili her işte kullan.
---

# Mülküm360: güncel durum (14 Kasım 2026, sürüm 14.23)

> **Senkron:** Bu skill iki yerde birebir aynı tutulur: Claude `C:\Users\fcali\vitrin-app\.claude\skills\mulkum360\SKILL.md` ve DeepSeek Harness `C:\Users\fcali\.dsh\skills\mulkum360\SKILL.md`. Hangisi düzenlenirse düzenlensin diğerine de kopyalanır (hash ile doğrula). Ayrıntılı geçmiş `C:\Users\fcali\vitrin-app\DEVIR.md` sonunda, proje tanıtımı `AGENTS.md`'de. Önce bu skill, sonra DEVIR.md'nin son bölümleri okunur.

## Ürün ve teknoloji
- Türkiye için emlak + vasıta ilan uygulaması, MülkümAI değerleme/PDF rapor, MülkümVideo. Slogan "Hayalindekine bir adım". Dil Türkçe.
- Klasör `C:\Users\fcali\vitrin-app`. Vanilla JS (`www/`), Capacitor 8 Android, Supabase proje `klnabwqduyavaqmbzxpo` (Frankfurt). Yönetici e-postası `public.yonetici()` ile tanımlı.
- Sürüm satırı: `www/app.js` 4. satır `SURUM`, ayrıca `android/app/build.gradle` versionCode/versionName. Şu an **14.23 / versionCode 163**.

## Yayın ve alan adı (ÖNEMLİ)
- Uygulama adresi `https://mulkum360.com/` (`WEB_ADRES`, `www/app.js` satır ~1033; ilan paylaşım bağlantısı, video karekodu ve künye paylaşımı bunu kullanır).
- Pages **GitHub Actions** ile yayınlanır: `.github/workflows/pages.yml`. Yalnız derlenen `_site` yayınlanır, depo belgeleri yayınlanmaz.
- Mod dosyası `.github/pages-modu` (ilk satır). **Şu an `bakim`**: kökte "Mülküm360 · Yakında" sayfası. `acik` yapılınca `www/` kökte açılır.
- **EİDS sonucu (başvuru 13.11.2026, eids@ticaret.gov.tr) gelmeden ve kullanıcı onaylamadan `acik` YAPILMAZ.** Web uygulamasını kimseye açma.
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

## Arama sonuçları ekranı (14.20 - 14.22)
- 14.22: ekrandaki hızlı filtre çipleri (Satılık, Fotoğraflı, Videolu) kaldırıldı. Satılık/Kiralık zaten filtre ekranında (İşlem); Fotoğraflı, Videolu ve Fiyatı düşen filtre ekranına "Fotoğraf, video, fiyat" grubu olarak taşındı (`foto`, `video`, `dusen` anahtarları, seçiliyken üstte çıkarılabilir etiket olarak görünür).
- 14.21: Emlak ve Vasıta alt alta 44 px açılır satırlar (`araSekmeHtml`, seçili satırın içinde alt kategoriler). Filtrele düğmesi arama kutusunun içinde (`.ara-filtre-ik`, aktif filtre sayısı rozetle); Sırala, Aramayı kaydet (zil) ve Liste/Izgara/Harita (yalnız simge) sonuç sayısı satırında. Ayrı filtre çubuğu ve "Sonuçlar" başlığı kaldırıldı.
- `EKRAN.ara` (www/app.js): liste satırında metrekare fiyatı (yalnız satılık emlak), tapu/ruhsat doğrulandı, video ve kimden rozetleri, kalp, kategori seçili değilken tür öneki; hızlı filtre çipleri (Satılık, Kiralık, Fiyatı düşen, Fotoğraflı, Videolu; sonucu olmayan çip gizlenir); Liste/Izgara/Harita seçimi (`araGorunum`, localStorage); `aramaYap` yeni `foto` ve `video` süzgeçleri. Arama kaydı yeni ilan bildirimi göndermez, yalnız Keşfet'te gösterir.

## Tanıtım sitesi
- `scrollcraft/builds/mulkum360-tanitim/` (yerel, commit edilmedi): scroll-craft ile yapılmış tanıtım sayfası, uydu inişi + gerçek ekran görüntüleri. Yayına alınmadı; yayın kararı kullanıcıya ait.
- Tasarım iş akışı skill'i: `vitrin-app\.claude\skills\mulkum-tasarim-akisi`.

## Değişmez kurallar
1. Veri uydurma yok; veri yoksa "yetersiz veri" yazılır. Test ilanları `ornek=true` ve silinebilir.
2. Değerleme: kademeli emsal, kapsam ve güven yazılır; "SPK lisanslı değerleme yerine geçmez" uyarısı kalır. Kullanıcı beyanları sayıya katılmaz.
3. Kullanıcının kişisel adı görünmez; marka kimliği kullanılır.
4. Çalışma biçimi: önce incele, yalnız istenen dosyalar, büyük değişiklikten önce plan, her değişiklikten sonra test, kısa rapor (değişen dosyalar + test sonucu). Ayrıntı `C:\Users\fcali\CLAUDE ORTAK\calisma_bicimi.md`.
5. Ücretli üretim (kredi harcayan) önce onaya sunulur.

## @mulkum360 Instagram hesabı
- Ayrı hesap, Paranın Tarihçisi ile karıştırılmaz. Kurallar `instagram` skill'inin "MÜLKÜM360 HESABI" bölümünde: oran **4:5 (1080×1350)**, her yüklemeden önce hesap doğrulama. 12-13 Kasım'da g4–g18 yayınlandı (profil 18 gönderi, hepsi 4:5).
