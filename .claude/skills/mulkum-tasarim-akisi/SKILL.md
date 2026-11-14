---
name: mulkum-tasarim-akisi
description: Mülküm360 için tasarım iş akışı. Uygulama ekranı, yeni özellik arayüzü, tanıtım ya da iniş sayfası tasarlarken veya mevcut ekranı yenilerken kullan. frontend-design, design-dna, scroll-craft ve design-taste-frontend becerilerini doğru sırayla ve Mülküm360'ın marka kurallarıyla birlikte çalıştırır.
---

# Mülküm360 tasarım iş akışı

Dört global beceri bu akışta birlikte çalışır. Önce işin türünü seç, sonra sırayı izle.

| Beceri | Rolü | Ne zaman |
|---|---|---|
| `design-dna` | Marka jetonlarını ve referans stilini ölçülebilir hâle getirir | Her işte ilk adım; referans görsel varsa ölçüm |
| `frontend-design` | Estetik yön, yazı tipi, düzen, metin yazımı | Uygulama ekranı ve sayfa tasarımının tamamı |
| `scroll-craft` | Kaydırmayla ilerleyen tanıtım sayfası, katmanlı kahraman alan | Yalnız tanıtım/iniş sayfası |
| `design-taste-frontend` | "Şablon gibi" görünmeyen kurumsal web sitesi ve gerçek tarayıcıda kontrol kapısı | Yalnız tanıtım/iniş sayfası |

## 0. İşin türü

- **A. Uygulama ekranı** (`www/*.js`, `www/premium.css`): `design-dna` + `frontend-design`. `scroll-craft` ve `design-taste-frontend` kullanılmaz: ikisi pazarlama sitesi içindir.
- **B. Tanıtım ya da iniş sayfası**: dört beceri birlikte. Sayfa `vitrin-app\www` içine konmaz; ayrı bir klasörde hazırlanır (ör. `vitrin-app\tanitim-sitesi\`), uygulamanın paketine girmez.

## 1. Kısa (frontend-design)

Konuyu, hedef kitleyi ve ekranın asıl işini tek cümleyle yaz. Mülküm360: Türkiye'de emlak ve vasıta ilanı, MülkümAI değerleme, slogan "Hayalindekine bir adım." Dil Türkçe, cümle düzeni küçük harf, eylem düğmeleri "Kaydet", "Paylaş" gibi net fiillerdir.

## 2. Jetonlar (design-dna)

Marka sabit olduğu için jetonlar **keşfedilmez, okunur**: `www/app.css` ve `www/premium.css`.

- Palet A: gece mavisi `#0B1B33`, altın `#D4A24C` (metinde koyu altın `#8A6516`, açık krem `#F5EEDF`); altın düğmede yazı gece mavisi.
- Yazı tipi Tektur (gömülü `www/fonts`), simgeler Lucide (`www/simgeler.js`).
- Koyu tema `html.koyu` ile gelir; her yeni stil iki temada da denenir.
- Referans görsel verilirse `design-dna` Aşama 2 ile yapılandırılmış profile çevrilir; renkler gözle değil ölçerek alınır (ölçüm betiği `sharp` bağımlılığını ilk kullanımda indirir, bu adımda kullanıcıya haber ver).

## 3. Plan ve eleştiri (frontend-design)

Kodlamadan önce kısa plan yaz: renk (jeton adlarıyla), yazı tipi rolleri, düzen taslağı (ASCII), tek akılda kalacak öğe. Planı markanın kendi kurallarına karşı kontrol et. Marka paleti ve Tektur **brief'in kendisidir**; frontend-design'ın "varsayılan görünümden kaçın" kuralı bunların dışına uygulanır, yani tasarım özgün olur ama paletten sapmaz.

## 4. Üretim

**A (uygulama):**
- Vanilla JS, çatı yok. Stil `www/premium.css` sonuna eklenir; mevcut kural kaldırılıp yerine yazılmaz.
- Dokunma alanı ≥ 44 px, yüzen öğe yok, tek renk paleti, tekrar eden menü yok (AGENTS.md kural 7).
- Ekran dışı pencereler `sheetAc` ile açılır (geri tuşunu otomatik yönetir).
- Hareket yalnızca bir eylemin sonucunu gösterirken ya da tek bir giriş anında; her karta kayarak giriş koyma.

**B (tanıtım sayfası):**
- Sırası: `scroll-craft` yolculuk ve kaydırma planı → `design-taste-frontend` ile bölüm düzeni, metin ve gerçek ürün görüntüsü → `frontend-design` ile son yazı tipi ve metin cilası.
- Gerçek ürün görüntüsü olarak uygulamanın kendi ekran görüntüleri kullanılır; rakip sitelerden görsel ya da içerik alınmaz.
- **Ücretli üretim kuralı:** `scroll-craft` kie.ai ile görsel/video üretmeyi önerebilir (ücretli ve dosya yükler). Önce tek örnek ve maliyet kullanıcıya sunulur, onay alınmadan üretilmez. Anahtar yoksa hazır fotoğraf ve uygulama ekranlarıyla ilerle.
- `design-taste-frontend` bir Stop kapısı (hook) taşır: beceri devredeyken her cevap sonunda gerçek bir Chrome ile siteyi ölçer ve kontroller geçmezse düzeltmeye zorlar; tur uzayabilir. Yalnızca B işlerinde bu beceriyi çağır.

## 5. Doğrulama

- Önizleme: `preview_start` ile `mulkum360` (A) ya da sayfanın kendi sunucusu (B). Ekran görüntüsünü ve `read_page` çıktısını kontrol et.
- Genişlikler: 375, 412, 768 ve masaüstü; açık ve koyu tema; hareket azaltma tercihi; klavye odağı görünür; metin/zemin kontrastı.
- Taşma ve kırpma: yatay kaydırma çıkmamalı, uzun Türkçe başlıklar iki satırda kalmalı.
- Renk sadakati gerekiyorsa `design-dna` doğrulama betiği ekran görüntüsünü profile karşı puanlar.
- A işlerinde mevcut özellikler bozulmadı mı: ilan listesi, ilan sayfası, MülkümVideo penceresi ve geri tuşu en az bir kez açılıp denenir.

## 6. Teslim (Mülküm360 kuralları)

1. `www/app.js` ilk satırlardaki `SURUM` ve `android/app/build.gradle` (`versionCode`, `versionName`) bir artırılır; paralel bir oturum sürümü artırmışsa önce `git pull`.
2. `npx cap sync android`, sonra APK + AAB derlenir (`JAVA_HOME` Android Studio jbr, `GRADLE_USER_HOME=D:\gradle-home`).
3. `C:\Users\fcali\OneDrive\Desktop\Mulkum360-vX.Y.apk/.aab` (eskisi silinir), `git push`, APK kullanıcıya gönderilir.
4. Rapor kısa: değişen dosyalar, denenenler, denenemeyenler (telefonda doğrulanmayan her şey açıkça yazılır).
5. Kural değiştiyse `DEVIR.md` güncellenir.
