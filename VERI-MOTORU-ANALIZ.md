# Mülküm360 Veri Motoru — Mevcut Sistem Analizi ve Geliştirme Planı
*Hazırlayan: kodlama ajanı (salt okunur inceleme) — 08.11.2026 23:15. Hiçbir dosya/değişiklik yapılmadı; canlı veritabanında yalnız salt okunur SELECT çalıştırıldı. Gizli anahtar/parola bu raporda yoktur.*

## 1. Mevcut teknik mimari

| Katman | Tespit | Referans |
|---|---|---|
| İstemci | Vanilla JS tek sayfa (framework YOK), Capacitor 8 Android APK | `package.json`, `capacitor.config.json`, `AGENTS.md §2` |
| Veri katmanı | `www/sb.js` (Supabase istemcisi), `www/veri.js` (İLLER, kategori ağacı, sabitler), `www/endeks.js` (KFE kartı), `www/rapor2.js` (rapor verileri), `www/sekme.js` (konum/çevre) | grep: `from('bolge_gostergeleri')` sb.js:196, endeks.js:39 |
| Arka uç | Supabase projesi `klnabwqduyavaqmbzxpo` (Frankfurt): Postgres+RLS, Auth, Storage, Realtime, Edge Functions, **pg_cron + pg_net** | `AGENTS.md §2`, `supabase/.temp/project-ref` |
| Sunucu servisleri | 8 Edge Function (Deno/TS): `mulkum-ai` (Gemini sohbet/açıklama/belge okuma/deko), `evds-kredi`, `evds-kfe`, `kredi-guncelle`, `cevre` (Overpass vekili), `parsel` (TKGM MEGSİS), `cevir`, `play-odeme` | `supabase/functions/` |
| Zamanlama | **Sunucu içi pg_cron** (GitHub Actions / Windows görevi YOK — kontrol edildi) | `cron.job` canlı sorgu; bkz. §Aşağı |
| Python | Veri hattında Python YOK; yalnız pazarlama görsel betikleri (`pazarlama/instagram/uret_*.py`) | klasör taraması |
| Coğrafi statik | `www/mahalle/*.json` 81 il mahalle listesi (istemci tarafı, ~1,6 MB) | klasör listesi |
| Sürüm kontrolü | ⚠️ **vitrin-app bir git deposu DEĞİL** (`.git` yok; makinede `git` kurulu değil — `where.exe git` boş). DEVIR.md'deki "GitHub repo" iddiası bu klasör için doğru değil. Landing `site/` ayrı (GitHub Pages: fatihcalis07-commits.github.io/mulkum360) | Test-Path False |

**Çalışan pg_cron işleri (canlı `cron.job` doğrulandı):**
- `evds-kredi` — 15 6 * * * (her gün 09:15 TR) → TCMB EVDS faiz → `kredi_ortalama` (functions/evds-kredi/index.ts)
- `evds-kfe` — 30 6 22 * * (her ay 22'si) → TCMB KFE → `kfe` (functions/evds-kfe/index.ts)
- `gunluk-temizlik` — 30 0 * * * (cron geçmişi 7g, cevre önbellek 30g, ai_kullanim 60g, eski kredi_ortalama 730g)
- `istemci-kayit-temizlik` — 50 0 * * * (14 gün)
- ⚠️ **`kredi-guncelle` ZAMANLANMIŞ DEĞİL**: migration 20261107110000 `cron.schedule('kredi-guncelle', '0 6 * * *')` istiyor ama canlı `cron.job`'da yok. Ya hiç kurulmadı ya unschedule edildi — onaylı adım gerektirir.

## 2. Mevcut Supabase tabloları (canlı: 27 tablo)
Veri motorunu ilgilendirenler (satır sayıları canlı COUNT):

| Tablo | Yapı (özet) | Satır | Yazar |
|---|---|---|---|
| `bolge_verileri` | il, ilce, yil, kaynak, nufus, yas_ortanca, hane_buyuklugu, erkek/universite/okuryazar oranları, nufus_artisi, yas_0_19/20_39/40_59/60; **unique(il,ilce,yil)** | **81** (yalnız il nüfusu; ilçe/mahalle YOK) | yönetici (panel) |
| `bolge_gostergeleri` | il, ilce, donem **text**(4-20), gosterge **text**(3-80), deger numeric, birim, kaynak; **unique(il,ilce,donem,gosterge)** | **1 010** | yönetici + SQL betikleri |
| `kfe` | bolge, donem date, deger; PK(bolge,donem); TR+19 İBBS bölgesi 2010→ | **4 020** | evds-kfe (cron) |
| `kredi_ortalama` | tur(konut/tasit/ihtiyac), donem date, faiz_yillik, kaynak; PK(tur,donem) | **24** (cron çalışıyor kanıtı) | evds-kredi (cron) |
| `banka_teklifleri` | banka,tur,faiz,vade,tutar sınırları, otomatik bool | az | yönetici + kredi-guncelle |
| `secim_sonuclari` | il,ilce,yil,tur,parti,oy_orani; unique 5'li | **4 297** | SQL (YSK) |
| `cevre_onbellek` | anahtar PK, veri jsonb (≤200 KB), 30 günlük ömür cron'lu | 7 | istemci |
| `ilanlar` | + `satis_fiyati` (rapor_verileri.sql) | **702 — 692'si `ornek=true` TEST, 10 gerçek** | üyeler |
| `raporlar` | form jsonb + sonuc jsonb (MülkümAI değer çıktılarının ham hazine) | **19** | RPC rapor_olustur |
| `istemci_kayit` | tanılama logu, 14 gün | döner | istemci |

`veri/*.sql` tohum dosyaları (kaynak etiketli, upsert'li — yeniden çalıştırılabilir): `nufus_2025.sql` (TÜİK ADNKS 81 il), `gostergeler_2026.sql` (305 satır: TCMB EVDS 2026-3Ç il konut birim fiyatı/kirası + kira getirisi + KFE), `sahibindex_2026.sql` (300: Betam 30 il m² satış/kira/değişim/kapanma süresi), `tuik_konut_satis_2026_09.sql` (405: TÜİK il satış istatistikleri), `secim_2024.sql` (4 297: YSK).
RLS canlıda tümünde `true`; politika sayıları migration'larla birebir (canlı pg_policies sorgusu).

## 3. Daha önce yapılmış veri entegrasyonları
1. **TCMB EVDS (canlı, kurulu düzen)** — `evds3.tcmb.gov.tr/igmevdsms-dis/` (key başlıkta, EVDS_API_KEY secret'ı EKLENDİ — DEVIR 148). İki fonksiyon + cron + upsert + 3'lü seri gruplama deseni = **yeni kaynaklar için hazır şablon**.
2. **TÜİK databrowser2 JSON-stat API** — `DF_SATIS_SEKLI_DURUMU_ILILCE_V3` ile 81 il satış verisi çekildi; ama **üretim betiği (`scratchpad/tuik_satis.mjs`) depoda YOK** (geçici alanda kaybolmuş). `betam.mjs` (sahibindex docx→SQL) de yok. ⚠️ Bu iki betik depo içinde kalıcılaştırılmalı.
3. **sahibindex/Betam aylık raporları** — ücretsiz yayın; elle/tek seferlik aktarım; aylık yenileme betiği kayıp.
4. **OpenStreetMap ekosistemi** — Photon geokod (birincil), Overpass (çevre; Edge `cevre` 4 aynalı — DEVIR: cloud IP'ler reddedilebiliyor 406), OSRM süreler, Open-Meteo rakım; `cevre_onbellek` 30 gün önbellek. **Photon kamu sunucusu bizi geçici engelledi** (DEVIR 169) → ölçekte kendi sunucusu gerekir.
5. **TKGM MEGSİS** (`cbsapi.tkgm.gov.tr` v3) — parsel sorgu + sınır geometrisi (Edge `parsel`), çalışıyor.
6. **YSK** — sonuc.ysk.gov.tr, tek seferlik toplu yükleme (yıllık tazeleme gerekli).
7. **MülkümAI (Gemini)** — `kredi-guncelle` banka tekliflerini Gemini+arama ile üretiyor (cron'suz), sohbet 30/gün sınır, `ai_kullanim` sayacı.
8. Yapılmamış ama planlanmış: **lisanslı emsal verisi** kurumsal talep taslağı hazır — `veri_talebi.md` (Endeksa/Hepsiemlak/Emlakjet; `lisansli_emsal` tablosu planı dahil).

## 4. Eksik bileşenler (hedef listeye göre)
- **data_sources envanteri**: kaynak bilgisi satır içi `kaynak` text kolonunda dağınık; merkezi envanter/seri-kod kaydı yok.
- **ingestion_logs**: iş kayıt/izlenebilirlik tablosu YOK. Yalnız `cron.job_run_details` (7 gün) ve fonksiyon HTTP cevabı; net.http_post response body'si kimse okumuyor → sessiz hata riski.
- **İlçe/mahalle granularity**: nüfus yalnız il; fiyat göstergeleri büyük oranda il; mahalle düzeyinde tek veri kaynağı kendi ilanları (10 gerçek ilan).
- **Araç piyasası**: hiçbir gösterge/seri yok (sıfır).
- **Kendi ilan snapshot'ı**: ilanlar akışkan; haftalık/günlük geriye dönük piyasa gözlemi biriktirilmiyor (`satis_fiyati` + `raporlar` hariç).
- **Sürüm kontrolü + uzak depo**: .git yok, git kurulu değil, `.gitignore` eksikleri (bkz. §6).
- **Betik kalıcılığı**: TÜİK/Betam aktarım betikleri depoda değil.
- **Backfill/tarihsel derinlik**: KFE 2010'dan var ✓; gösterge serileri tek dönem anlık (2026-09) — trend için aylık biriktirme başladı ama geçmiş dönemler tam değil.

## 5. ChatGPT mimarisi ile karşılaştırma
| Önerilen | Mevcut karşılığı | Karar |
|---|---|---|
| `data_sources` | `kaynak` text kolonları + `veri/*.sql` başlık yorumları | **Yeni tablo şart değil**; küçük `veri_kaynaklari` kayıt tablosu (kod, url, periyot, lisans, son_calisma) EKLENEBİLİR — düşük maliyet, yüksek değer |
| `ingestion_logs` | YOK (yalnız cron.job_run_details) | **EKLENMELİ** — asıl açık buydu |
| `market_observations` | **`bolge_gostergeleri` tam olarak bu** (EAV: il/ilce/donem/gosterge/deger/birim/kaynak, upsert'li) | **İKİNCİ TABLO YANLIŞ OLUR** — endeks.js:39, sb.js:196, yonetim panosu bu tabloya bağlı. Zenginleştirme: kontrollü gosterge sözlüğü + `donem_tarih date` yardımcı kolon |
| `economic_indicators` | TCMB/TÜİK göstergeleri `bolge_gostergeleri.gosterge` içinde; kredi faizi `kredi_ortalama`; endeks `kfe` | Ayrı tablo GEREKSİZ — tür etiketi/sozluk yeterli |
| `real_estate_market_data` | `bolge_gostergeleri` (fiyat/kira/satış adedi) + `ilanlar.satis_fiyati` + `raporlar` | Tablo var; **eksik olan veri (ilçe derinliği), şema değil** |
| `vehicle_market_data` | YOK (sıfır) | **Yeni TABLO GEREKMEZ** — aynı EAV yapısı "Otomobil..." göstergeleriyle çalışır; asıl mesele kaynak (bkz. §7) |
| `geo_points` | `cevre_onbellek` (jsonb cache) + runtime OSM/Photon + `parsel` kenar geometrisi + `www/mahalle/*.json` | Kalıcı geo tablosu **önermiyorum** (free tier 500 MB + ODbL türev-taşıma yükü); mevcut runtime+cache mimarisi doğru |
| `market_reports` | `raporlar` (kullanıcı PDF çıktıları) | Karıştırmayın; otomatik analiz raporu istenirse ilerda ayrı `analiz_raporlari` — ertelenebilir |

**Sonuç: 8 öneriden yalnızca `ingestion_logs` genuinely eksik; `data_sources` küçük yardımcı tablo; diğerleri mevcut yapıyla zaten karşılanıyor.** Paralel şema kurmak §6'daki çakışma riskini doğurur.

## 6. Çakışma ve veri kaybı riskleri
1. **Paralel tablo riski (en büyük mimari risk)**: `market_observations` benzeri ikinci tablo → okuyucu taraf ikiye bölünür, rapor uçları yanlış kaynağa düşer. Çözüm: genişlet-me-yeniden-yapılandır kuralı.
2. **Test verisi kirliliği**: `ilanlar` 692/702 test. `emsaller()/hesapla()` içinde `ornek=false` filtresi **doğrulanmadı** — filtre yoksa değerleme test fiyatlarıyla kirleniyor olabilir (ACIL kontrol, görev #2). Her durumda yayından önce silinecekler listesi DEVIR'de.
3. **Serbest metin `gosterge`**: aynı kavrama farklı ad yazılması → sorgu sessiz boş döner. Mevcut fiili sözlük: "Konut birim fiyatı (değerleme)", "Konut birim kirasi"… → CHECK constraint veya lookup migration'ı (mevcut 1 010 satıra dokunmadan, önce ad envanteri çıkararak).
4. **`donem` text formatı**: "2026-09" vs "2026-9" karışırsa zaman serisi bozulur. Migration check'i zayıf (yalnız uzunluk). Yardımcı `donem_tarih date` kolonu + normalize fonksiyonu önerisi.
5. **Sessiz cron ölümü**: `kredi-guncelle`'ın sessizce kaybolması tam bu riskin gerçekleşmiş hali. ingestion_logs + "cron.job beklenen listeyle karşılaştır" kontrolü şart.
6. **Dış bağımlılık kırılganlığı**: Overpass cloud red (406), Photon engeli, EVDS uç adresi değişti (evds2→evds3, DEVIR 148) — çoklu ayna deseni var ama alarm/loop yok.
7. **Sırlar/altyapı**: `EVDS_API_KEY`, `GEMINI_API_KEY` Supabase Secrets'ta ✓ (kodda yok). `.gizli/db-sifre.txt` makinede düz metin (AGENTS kuralı: repo'ya girmemeli) → **git init öncesi .gitignore denetimi zorunlu** (`.gizli/`, `*.apk`, `node_modules/`, büyük `gorseller/`...). DB şifresi ayrıca Supabase dashboard'dan rotasyon adayı.
8. **Tek kopya felaketi**: depo git'siz → disk arızası = proje kaybı. İlk görev bu.
9. **Ücretsiz plan limitleri**: Supabase free ~500 MB DB / 5 GB aktarım. OSM tüm Türkiye dump'ı veya 81 il×mahalle ham veri yüklemek bu limiti zorlar; **ham dosyalar DB'ye değil** runtime sorgu/önbelleğe. EVDS tek istekte çok seri → limit dostu (mevcut desen doğru).
10. **Lisans riski**: sahibindex verisi "ücretsiz yayın" ama veri setinin depolanıp türev ürünle ticari kullanımı gri alan → kaynak adı `sahibindex` ile gösteriliyor (iyi), ölçek büyürse §3-8 lisans yoluna geç. **Sahibinden/hepsiemlak/emlakjet scraping YASAK** (kullanıcı kuralı + ToS) — plan hiçbir yerde kazıma içermiyor.

## 7. Ücretsiz veri kaynakları değerlendirme tablosu
| Kaynak | Veri türü | Yöntem | Sıklık | Lisans/ticari | Tarihsel? | Entegrasyon |
|---|---|---|---|---|---|---|
| **TCMB EVDS (evds3)** | Faiz, KFE, güven endeksleri, konut piyasa serileri, enflasyon | REST JSON, key header — **KURULU** | günlük/aylık | TCMB açık veri; ticari yeniden yayında kaynak şartı (EVDS veri politikası onaylanmalı — doğrulanmadı) | ✓ (KFE 2010→) | Mevcut desen: yeni seri kodlarını `evds-kfe`ye ekleyip genişlet (en ucuz kazanım) |
| **TÜİK EDATUN / API** | Nüfus ilçe, konut satış ilçe, inşaat izinleri, taşıt kayıtları (il, aylık), hanehalkı | API (ücretsiz key başvurusu) — **adres/anahtar akışı TEST EDİLMEDİ**; databrowser2 JSON-stat deseni kanıtlı | aylık/yıllık | TÜİK açık veri: kaynak göster + değiştirme; ticari kullanıma izinli | kısmi (yayın dönemi kadar) | Yeni `tuik` Edge (evds şablonu) → `bolge_verileri` + `bolge_gostergeleri`; ara adım: mevcut JSON-stat ile ilçe nüfusu backfill |
| **TÜİK taşıt tescil (ICOL)** | İl bazında aylık devir tescilli araç adedi | EDATUN/JSON-stat | aylık | yukarıdakiyle aynı | ✓ | `bolge_gostergeleri` "Araç" göstergeleri — **araç tarafı için en somut ücretsiz kaynak** |
| **TUCBS (tucbs.gov.tr)** | İl/ilçe idari sınır vektörleri, coğrafi servisler | WMS/WFS | nadir | Kurumsal açık hizmet (kullanım koşulları teyit) | statik | Gerekli DEĞİL şu an — harita için runtime OSM yeterli; polygon lazımsa GeoJSON statik dosya |
| **OpenStreetMap / Geofabrik** | POI, bina, yol ağı | Overpass runtime (mevcut) veya haftalık .pbf indirme | haftalık (Geofabrik) | **ODbL** — ticari serbest; türev DB'yi paylaşma yükümlülüğü var (DB'ye yükleyip ürünle dağıtmak dikkat) | snapshot | Runtime+cache mevcut ✓; kalıcı POI tablosu ÖNERİLMİYOR (limit+lisans); Overpass red sorununa kendi aynası ileride Fly.io free gibi değerlendirilir |
| **Open-Meteo / OSRM / Photon** | Rakım, süre, geokod | REST — kısmen KURULU | gerçek zamanlı | açık (kullanım limiti; Photon self-host uzun vade) | ✗ | Mevcut; izleme ekle |
| **AFAD deprem servisi** | Bölgesel depremsellik | JSON feed (uç teyit) | canlı | kamu açık | ✓ | Rapor "deprem" bölümü (AGENTS fikir listesi) — Phase 2 |
| **YSK** | Seçim sonuçları | Toplu indirme — YÜKLÜ | 5 yılda | kamu açık | ✓ | Bitti; yılda tazeleme görevi |
| **sahibindex/Betam** | m² satış/kira/ilan kapanma (30 il aylık) | Aylık docx/pdf → betik (KAYIP, yeniden yaz) | aylık | Ücretsiz yayın; veri seti ticari kullanım gri → kaynak gösterim + iç gösterge; ölçekte §3-8 lisans | ~1 yıl | Betiği depoya yaz, cron'la değil aylık manuel tetikle |
| **ODMD / OSDD** | Yeni araç satış adedi (aylık, segment) | Aylık bülten PDF → manuel/yarı-otomatik | aylık | Serbest yayın (kaynak göster) | ~1 yıl | `bolge_gostergeleri` Türkiye geneli araç göstergeleri — **araç fiyat yerine önce satış/segment** |
| **İBB/bigdata.istanbul vb. belediye açık veri** | İstanbul demografi/konum | API/CSV | değişken | Çoğu CC benzeri — kaynakça teyit | kısmi | İstanbul pilot; düşük öncelik |
| ~~Sahibinden/hepsiemlak/ilan scraping~~ | — | — | — | **YASAK (ToS + kullanıcı kuralı)** | — | Plan dışı. Ticari yol: `veri_talebi.md` lisans görüşmesi |

## 8. Önerilen nihai mimari (mevcutla uyumlu, ek minimum)
```
[Kaynaklar]                [Toplama: Supabase Edge + pg_cron]        [Depo: mevcut public şeması]
TCMB EVDS        ──► evds-kredi (günlük✓) / evds-kfe (aylık✓) ──► kredi_ortalama / kfe
TÜİK EDATUN/API  ──► tuik (yeni; aylık)                        ──► bolge_verileri (ilçe!) + bolge_gostergeleri
sahibindex/Betam ──► veri/betam.mjs (yeniden yaz; aylık elle)  ──► bolge_gostergeleri
ODMD/aylık bülten──► elle giriş (yonetim paneli ✓ var)         ──► bolge_gostergeleri ("araç" göstergeleri)
Kendi ilanların  ──► ilan-snapshot SQL agregası (yeni cron haftalık) ──► ilan_snapshot (yeni, küçük)
OSM/Photon/TKGM  ──► runtime + cevre_onbellek (mevcut ✓)
                        her toplama adımı ─────────────────────► ingestion_logs (yeni) + veri_kaynaklari (yeni, küçük)
```
- **Python/GitHub Actions EKLEMİYORUM**: geliştirme makinesi her zaman açık değil; zamanlama zaten sunucuda (pg_cron) ve Edge deseni kanıtlı. GitHub repo yine de açılmalı (yedek + geçmiş), ama çalıştırıcı GH Actions değil Supabase kalır. (Kullanıcının GH Actions tercihi "uygun ücretsiz zamanlayıcı"ya mevcut pg_cron ile karşılık veriyor — itiraz edersen Phase 1'de GH runner'lı Python seçeneğini ayrıca yazarım.)
- Yeni tablo yalnız 3: `ingestion_logs`, `veri_kaynaklari`, `ilan_snapshot`. `market_observations/economic_indicators/real_estate_market_data/vehicle_market_data` = **`bolge_gostergeleri` + sözlük**; `geo_points` = runtime; `data_sources` = `veri_kaynaklari`.
- Değerleme/ML: `raporlar`(19) + `satis_fiyati` + `ilan_snapshot` biriktikçe; faz-5, şimdiden şema yok.

## 9. Aşamalı uygulama planı
**Faz 0 — Hijyen (yarım gün, onaysız risk yok)**
0.1 git init + .gitignore denetimi + ilk commit + GitHub private repo (push'u kullanıcı yapar; GH kimliği onda).
0.2 `emsaller()/hesapla()` test-ilan filtresi doğrulaması (salt okuma) → sonuç raporu.
0.3 `kredi-guncelle` cron'unun neden yok olduğunun karara bağlanması (DEVIR'de silme notu yok).
**Faz 1 — İzlenebilirlik (1 gün; migration ONAYLA)**
1.1 `ingestion_logs` migration + üç fonksiyona log yazımı + başarısızlıkta tek retry.
1.2 `veri_kaynaklari` envanter tablosu + mevcut 6 kaynağın kaydı.
1.3 `kredi-guncelle` cron'unun (onayla) yeniden planlanması; beklenen-cron-kontrolü gunluk-temizlik'e.
**Faz 2 — Ücretsiz kaynak genişletme (2-3 gün)**
2.1 TÜİK API keşfi (anahtar başvurusu SANA) → `tuik` Edge: ilçe nüfusu + ilçe konut satış + **il araç tescil/ICOL**.
2.2 `veri/tuik_satis.mjs` kalıcı betik (JSON-stat → SQL, upsert) — kayıp betiğin deposu.
2.3 `veri/betam.mjs` yeniden: aylık docx → SQL; `gosterge` sözluk migration'ı ile ad standardı.
**Faz 3 — Kendi piyasa snapshot'ı (1 gün; migration ONAYLA)**
3.1 `ilan_snapshot` haftalık agregasyon cron'u (yalnız `ornek=false`, `durum` kırılımlı, mediyan m² TL/m²).
3.2 Uygulama "Piyasa" gösterimi (rapor2 piyasa bölümüne bağlanır).
**Faz 4 — Coğrafi dayanıklılık (opsiyonel)**: Photon/Overpass kendi ücretsiz aynası (Fly.io/OVH deneme), fallback zinciri.
**Faz 5 — Araç derinliği + tahmin modeli**: ODMD/OSDD birikimi + snapshot ≥ 6 ay olunca hedonik model denemesi.

## 10. İlk uygulanacak 5 teknik görev (onayını bekliyor)
1. **Depoyu güvenceye al**: `.gitignore` taslağı + `git init` + ilk commit; GitHub'da private repo (push anahtarı sende). *(Veri kaybı riski #1)*
2. **Test ilanı filtresi denetimi**: `app.js` değerleme/emsal sorgularında `ornek=false` garantisi; yoksa tek satır düzeltme önerisi. *(Doğruluk riski #1)*
3. **`ingestion_logs` + `veri_kaynaklari` migration'ı** + evds-kredi/evds-kfe'ye log yazımı (ONAYINLA `db push`).
4. **`kredi-guncelle` cron onarımı**: sebeb araştır + (onayınla) yeniden `cron.schedule` + beklenen-işler kontrolü.
5. **TÜİK ilçe verisi keşfi**: EDATUN/API anahtar başvuru adımlarını sana hazırla; anahtar gelir gelmez `tuik` Edge (evds şablonu) ile ilçe nüfus + ilçe konut satış + il araç tescil backfill'i.

## Belirsizlikler (dürüstçe)
- `kredi-guncelle` cron'unun neden olmadığı bilinmiyor (silme kaydı yok) — araştırılacak.
- TÜİK EDATUN'un güncel API uç adresi/anahtar akışı test edilmedi; `databrowser2` JSON-stat deseni 2026-09'da kanıtlı ama uç değişmiş olabilir.
- TCMB EVDS ticari-kullanım politika metni teyit edilmedi (mevcut kullanım: kaynak gösterimli türev gösterge).
- Edge `cevre`nin production Overpass erişimi (406) hâlâ mı sorunlu — telefondan canlı test gerekiyor.
- `hesapla()` test filtresi henüz okunmadı (Faz 0.2'nin sebebi).
- GitHub'da proje remote'u gerçekten var mı — bu klasörde .git olmadığından doğrulanamadı.
- Canlı=Migration şema eşitliği tablo listesi ve RLS üzerinden doğrulandı; kolon bazında tam diff alınmadı (gerekirse tek sorguluk diff çıkarılır).
