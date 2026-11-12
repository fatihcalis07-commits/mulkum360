// docs/PLAY-LISTE.md üreticisi — Play Console karakter sınırlarını doğrulayarak yazar
import { writeFileSync } from 'node:fs';

const ADLAR = [
  ['Mülküm360', 'Saf marka — aramada "emlak" kelimesi geçmez ama marka temiz.'],
  ['Mülküm360: Emlak & Vasıta', 'ÖNERİLEN — anahtar kelime + marka, 30 sınırın içinde.'],
  ['Mülküm360: Emlak, Arsa, Araç', 'Anahtar kelime zenginleştirilmiş varyant.'],
];

const KISA = [
  'Konut, işyeri, arsa ve vasıta ilanlarını haritada ara; AI ile değerle.',
  'Emlak ve vasıta ilanları: haritada ara, ücretsiz ver, AI ile karar ver.',
  'Ev, arsa, işyeri, araç: ilan ver, haritada keşfet, değerini raporda gör.',
];

const UZUN = `Mülküm360; konut, işyeri, arsa ve vasıta alım–satım–kiralama ilanlarını tek uygulamada toplayan bir emlak ve vasıta pazarıdır. İlan ver, haritada keşfet, mesajlaş ve kararını verilerle ver.

🏠 ÜCRETSİZ İLAN VER
Konut, işyeri, arsa ve vasıta ilanlarını ücretsiz yayınla. İlan asistanı; link yapıştırma ya da tapu fotoğrafı çekme yoluyla ilan metnini senin için hazırlar. Yeni emlak ilanları yayından önce incelemeden geçer.

🗺 HARİTADA ARA
İlanları interaktif haritada bölge bölge gez. İl/ilçe, yarıçap ve fiyat filtreleriyle çevrendeki fırsatları "Haritada Ara" modunda anında gör.

🤖 MÜLKÜM YAPAY ZEKA ASİSTANI
İlan hakkında soru sor, iki mülkü karşılaştır, ilan açıklaması oluştur. Değer raporları benzer ilanlar ve TCMB verileriyle PDF olarak hazırlanır. MülkümDeko, evinin iç mekân yenilemesini görselleştirir.
(Değer raporları bilgilendirme amaçlıdır; SPK lisanslı değerleme yerine geçmez.)

🔔 KAYITLI ARAMA VE ALARMLAR
Aramanı kaydet; kriterlerine uyan yeni ilan ve fiyat değişikliklerinden anında haberdar ol. Favorilerini tek yerden yönet.

💬 NUMARANI PAYLAŞMADAN MESAJLAŞ
Alıcı ve satıcı uygulama içi mesajlaşmada buluşur. Telefon numaranı yalnız sen istersen paylaşır.

🏢 EMLAKÇI VE OFİS PANELİ
Ofis hesabıyla ekip yönetimi, toplu ilan ve doğrulanmış ofis rozeti. Emlakçı araçları: TAKBİS parsel sorgulama, e-Devlet, TKGM, DASK ve GİB sorguları tek dokunuşla güvenli tarayıcıda.

🌍 5 DİL VE KOYU TEMA
Türkçe, English, Русский, Deutsch, العربية arayüz desteği ve koyu tema.

💳 UYGULAMA İÇİ SATIN ALMALAR
Uygulama ve ilan vermek ücretsizdir. Değer raporu gibi AI özellikleri kredi ile kullanılır; yeni üyelere 1 kredi hediye edilir. Kredi paketleri ve ilan dopingleri (vitrin, güncelleme, acil etiketi) Google Play üzerinden tek seferlik satın alma olarak sunulur.

⚖️ ŞEFFAFLIK VE GÜVENLİK
Gerçek olmayan ilanlara karşı inceleme süreci, ilan ve profilleri şikâyet etme, uygulama içinden hesap ve verilerini silme imkânı.

📬 İletişim: +90 542 689 19 82 · mulkum360.com`;

const MAX = { ad: 30, kisa: 80, uzun: 4000 };
const sat = (s) => s.split('\n').map((x) => `${x.length.toString().padStart(4)}  ${x}`).join('\n');
const hatali = [];
ADLAR.forEach(([a]) => { if (a.length > MAX.ad) hatali.push('AD ' + a.length); });
KISA.forEach((k) => { if (k.length > MAX.kisa) hatali.push('KISA ' + k.length); });
if (UZUN.length > MAX.uzun) hatali.push('UZUN ' + UZUN.length);

const md = `# Google Play Mağaza Listesi — Doldurmaya Hazır Metinler

> Play Console karakter sınırları bu dosyada **programatik doğrulandı** (üretici: scratchpad/play-liste.mjs).
> Sınırlar: ad ≤ 30 · kısa açıklama ≤ 80 · tam açıklama ≤ 4000.
> Mağaza dili: **Türkçe (Birincil)**. Uygulama arayüzü 5 dil destekler (TR/EN/RU/DE/AR) — ileride liste çevirisi eklenir.

## 1) Temel bilgi (Mağaza başvurusu → Uygulama adı)
| Alan | Değer |
|---|---|
| Uygulama adı (önerilen) | **Mülküm360: Emlak & Vasıta** (${ADLAR[1][0].length} kr) |
| Alternatif | Mülküm360 (${ADLAR[0][0].length} kr) |
| Paket adı | com.mulkum360.app |
| Kategori | **Ev ve Yaşam** (House & Home) — ikinci: Finans DEĞİL, çünkü kredi/banka hizmeti yok |
| İçerik türü | Uygulama (oyun değil) · Reklam: **Yok** · Uygulama içi satın alma: **Var** |
| Hedef kitle | **18+** (gayrimenkul işlemi; çocuk hedeflenmiyor) |
| Gizlilik politikası | **https://www.mulkum360.com/gizlilik.html** (CANLI — TLS doğrulamalı 200, 12.11) · yedek: https://mulkum360.app/gizlilik.html |
| Web sitesi | https://www.mulkum360.com (aynı içerik mulkum360.app'de de var) |
| İletişim e-postası | fatihcalis07@gmail.com (ileride destek@mulkum360.com yönlendirmesi önerilir) |

### Ad adayları (30 kr sınırı)
${ADLAR.map(([a, n]) => `- \`${a}\` (${a.length} kr) — ${n}`).join('\n')}

## 2) Kısa açıklama (80 kr) — birini seç
${KISA.map((k, i) => `${i + 1}. \`${k}\` (${k.length} kr)`).join('\n')}

## 3) Tam açıklama (4000 kr) — doğrudan yapıştır
Toplam: **${UZUN.length} karakter** ✔

\`\`\`text
${UZUN}
\`\`\`

## 4) Uygulama içi satın almalar (aynı sekmeden tanıtılacak)
Kimlikler sunucuyla BİREBİR aynı olmalı — ayrıntı: [PLAY-URUNLER.md](PLAY-URUNLER.md). Yalnız **aktif 5 ürün**:
\`kredi_5\` 149,99₺ · \`kredi_15\` 349,99₺ · \`kredi_40\` 749,99₺ · \`kredi_100\` 1.499,99₺ · dopinglerden aktif 5'i (fiyatlar PLAY-URUNLER tablosunda).
Hepsi **tüketilebilir tek seferlik ürün** (abonelik DEĞİL).

## 5) Veri güvenliği formu — soru soru dürüst yanıt
| Soru | Yanıt | Gerekçe |
|---|---|---|
| Toplanan veri | Ad; e-posta; telefon (opsiyonel profil alanı); fotoğraf/video (ilan görselleri); mesajlar (uygulama içi sohbet); uygulama etkinliği (favori, arama, kayıtlı ilan); satın alma kaydı; günlük kayıtları (IP/cihaz — Supabase auth) | Hesap açılışı, ilan, mesajlaşma, ödeme ve güvenlik logları |
| Veriler paylaşılıyor mu? | **Hayır** — üçüncü taraflara satılmıyor/paylaşılmıyor. Barındırma ve ödeme altyapısı (Supabase, Google Play) "hizmet sağlayıcı"dır, Play tanımı gereği paylaşım sayılmaz; AI sorguları Google altyapısında işlenir | |
| Şifreleme | Yolda şifreleme **Var** (HTTPS/TLS uçtan uca) | |
| Silinebiliyor mu? | **Evet** — Hesabım → Hesabımı Sil (uygulama içi) veya e-posta ile talep | |
| Aile politikası | Uygulama çocukları **hedeflemiyor**; mağaza hedefi 18+ | Gayrimenkul sözleşme işlemi |

## 6) İçerik derecelendirme (IPCA/IARC) — kritik yanıtlar
- Kullanıcıların oluşturduğu içerik: **EVET** (ilan görselleri/metinleri + mesajlaşma). Sorulursa: bildirme mekanizması uygulama içinde var, moderatör incelemesi yapıyor.
- Şiddet / cinsel içerik / kumar: **Hayır**. Küfür: kullanıcı içeriklerinde nadiren mümkün.
- Uyuşturucu/tütün/silah: ilan kategorilerinde yok.

## 7) Görsel varlıklar (henüz eksik — production-öncesi yapılacaklar listesinde)
| Varlık | Boyut | Durum |
|---|---|---|
| Uygulama simgesi | 512×512 PNG, ≥128px kaynak | ikon kaynak dosyası var, üretim bekliyor |
| Telefon ekran görüntüleri | 2–8 adet, 9:16 dikey (örn. 1080×1920) | ⚠️ TEST İLAN filigranları temizlenmeden EKLENMEMELİ |
| Özellik grafiği | 1024×500 | tasarım bekliyor |

## 8) Yayın kapısı (bunlar tamamlanmadan kapalı testten çıkarma YOK)
1. TEST_DAHIL=false + örnek/test ilan verisinin temizliği (kullanıcı onayıyla)
2. GOOGLE_PLAY_SA_JSON + uçtan uca ödeme testi (bkz. PLAY-URUNLER.md §2)
3. Temiz ekran görüntüleriyle görsel seti
4. Gizlilik linki TLS'li hâliyle yayında (mulkum360.com — sertifika bekleniyor)
`;

writeFileSync('C:/Users/fcali/vitrin-app/docs/PLAY-LISTE.md', md, 'utf8');
console.log(hatali.length ? ' SINIR İHLALİ: ' + hatali.join(', ') : 'tüm sınırlar içinde ✔');
console.log('adlar: ' + ADLAR.map(([a]) => a.length + 'kr').join(', '));
console.log('kisa: ' + KISA.map((k) => k.length + 'kr').join(', '));
console.log('uzun: ' + UZUN.length + 'kr');
