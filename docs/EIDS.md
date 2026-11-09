# EİDS Araştırma ve İlan Doğrulama Modülü — Mülküm360

> Doğrulama tarihi: 09.11.2026 · Kaynaklar resmîdir (ticaret.gov.tr, resmigazete.gov.tr, eids.ticaret.gov.tr, turkiye.gov.tr).
> **Durum: Resmî EİDS API entegrasyonumuz YOKTUR.** Bu belge, entegrasyon olmadan yürütülebilecek altyapıyı ve resmî başvuru yolunu belgeler.

## 1. EİDS nedir (resmî tanım)

> "Bu hizmet kullanılarak, elektronik platformlarda ilan yoluyla taşınmaz veya ikinci el motorlu kara taşıtı pazarlayan kişinin kimlik bilgileri ile ilana konu taşınmazı pazarlama yetkisinin olup olmadığı doğrulanabilmektedir."
> — eids.ticaret.gov.tr (Ticaret Bakanlığı)

İki faz:
- **Faz 1 — Kimlik doğrulama:** Üyelik/ilan öncesi gerçek kişinin ad-soyad + TCKN/YKN + telefon; tüzel kişinin unvan + telefon doğrulaması.
- **Faz 2 — Yetki doğrulama:** 15.09.2024'te devreye girdi. **01.01.2025 itibarıyla yetki doğrulaması yapılmaksızın ilan verilemez** (geçiş süreci 15.09–31.12.2024).

## 2. Yasal yükümlülük (yönetmelik metni, kaynak gösterimli)

**Taşınmaz Ticareti Hakkında Yönetmelik** (05.06.2018 / RG 30442), **12/2** — ilan platformlarının yükümlülükleri (31.08.2023 / RG 32295 değişikliğiyle):

- **(c)** Gerçek kişinin adı, soyadı ve T.C. kimlik numarası ya da yabancı kimlik numarası ile telefon numarasını; tüzel kişinin unvan ve telefon numarasını **üyelikten veya ilanın yayımlanmasından önce doğrulamak**. Doğrulanmış bilgilerin güncelliğini korumak ve **saklamak**.
- **(ç)** İlana konu taşınmazın ilan veren üyeye veya birinci/ikinci derece kan hısımlarına veya eşine ait olduğunu **ya da** taşınmaz sahibi tarafından yetkilendirildiğini **ilanı yayımlamadan önce doğrulamak**.
- **(f)** Piyasa yapısını bozucu/yanıltıcı ilanlara karşı tedbir; Bakanlık tedbirlerine uyma.
- **Yaptırım:** 6563 sayılı Kanun md. 12/1(d) ve 6585 sayılı Kanun md. 18 idari para cezaları Bakanlıkça uygulanır.

**Bakanlık duyurusu (İç Ticaret Genel Müdürlüğü, 22.08.2024):**
- Emlak ilanları **yalnızca** taşınmaz sahibi, 1.–2. derece kan hısımı/eşi veya **taşınmaz sahibince yetkilendirilmiş yetki belgeli emlak işletmesi** tarafından verilebilir.
- **Yetki belgesi olmayan işletme ilan girişi yapamaz.**
- Yetkilendirme e-Devlet "**EİDS Taşınmaz İlanı Yetkilendirme İşlemleri**" ekranından: taşınmaz seçilir → emlak işletmesinin **yetki belgesi numarası** girilir (TTBS'den sorgulanabilir: ttbs.gtb.gov.tr/Home/BelgeSorgula) → **yetki bitiş tarihi** seçilir (**süre 3 aydan kısa olamaz**).
- Bireysel ilanda ilanın dayandığı **taşınmaz numarası** zorunludur; malik/hısımlık kontrolünü EİDS otomatik yapar. Vatandaş taşınmaz numarasını e-Devlet "Tapu Bilgileri Sorgulama"dan veya yeni tip tapu senedinden görür.
- EİDS yetkisi yalnız **ilan verme** yetkisidir; tapu tasarrufu yetkisi vermez; aracılık sözleşmesi/gösterme belgesi zorunlulukları ayrıdurur.

**Güncel tarih notu (RG 01.10.2026 / 33387):** Yönetmeliğe "güvenli ödeme sistemi entegratörü" eklendi; **geçici md. 1/f.10'daki 01.07.2026 tarihi 01.12.2026'ya ertelendi.** (f.10'un tam kapsamı — güvenli ödeme sistemiyle ilgili olduğu anlaşılıyor — başvuru sırasında Bakanlıktan teyit edilmelidir.) Kimlik + yetki doğrulama yükümlülüğü buna bağlı değildir ve bugünkü haliyle yürürlüktedir.

## 3. Mülküm360'ın iki kullanıcı türü karşılığı

| Modüldeki tür | EİDS karşılığı | Doğrulama içeriği |
|---|---|---|
| **Bireysel** (`hesap_turu='bireysel'`) | Malik / eş / 1.–2. derece kan hısımı | Kimlik (Faz 1) + taşınmaz numarası üzerinden malik-hısımlık (Faz 2) |
| **Emlak işletmesi** (`hesap_turu='ofis'`, `yetki_no`) | Yetki belgeli emlak işletmesi | Kimlik/tüzel + **yetki belgesi geçerliliği (TTBS)** + malikin EİDS yetkilendirmesi (3 ay+ süreli) |

## 4. Entegrasyon: resmî erişim ve başvuru (DOĞRULANMIŞ DURUM)

- eids.ticaret.gov.tr yalnız bilgilendirme + (vatandaş) doğrulama ekranı sunar; **herkese açık geliştirici/API portalı, başvuru formu veya teknik kılavuz bulunmamaktadır** (09.11.2026'da arandı; giriş duvarı arkası hariç).
- Platform entegrasyonu **Ticaret Bakanlığı İç Ticaret Genel Müdürlüğü** koordinasyonunda, resmî yazışma/protokol ile yürütülür; teknik servis şartları başvuru sonrası paylaşılır. **Erişim ve onay olmadan entegrasyon varmış gibi davranılmayacaktır** (kodda uyarlanabilir arayüz + dürüst "bekliyor" durumu).
- **Başvuru öncesi hazırlanacaklar (yönetmelik yükümlülüklerinden çıkarsanan, talep edilecek klasik belgeler):**
  1. Platformun 6563 sayılı Kanun kapsamında **ETSİB kaydı / aracı hizmet sağlayıcı** kimliği (e-ticaret bilgi sistemi),
  2. Ticaret unvanı/vergi kimliği (tüzel kişi), imza sirküleri,
  3. Yetki belgeli işletme doğrulama süreci tarifi (TTBS sorgusu),
  4. Kimlik bilgisi saklama/güvenlik ve KVKK aydınlatma + veri işleme envanteri (md. 12/2-c "saklamak" yükümlülüğü),
  5. İlansız-yayın akış şeması (doğrulama kapısı — bu modül),
  6. İletişim noktası (bilgi toplumu hizmetleri sorumlusu).
  Not: Bu liste resmî duyurularda tek tek sayılmıyor; yönetmelik yükümlülüklerinden derlendi — **nihai liste Bakanlık yanıtıyla netleşir.**
- Bireysel geliştirici hesabıyla API erişimi: **bulunamadı**; muhatap tüzel kişi platform işletmecisidir. Şirketleşme + ETSİB kaydı ön koşuldur.

### 4.5 Resmî teknik entegrasyon sözleşmesi — DOĞRULANDI
**Kaynak: T.C. Ticaret Bakanlığı "EİDS Entegrasyon Dokümanı" V2.2 (Ekim 2023, güvenli elektronik imzalı; oda üzerinden resmî yazı örneği: Gelen Tarih Sayı 13.12.2024-41190; PDF FTSO arşivinden alındı, 5 sayfa).**

**Faz 1 — Üye kimlik doğrulama akışı:**
1. Platform, üyelik/ilan öncesi kullanıcıyı **e-Devlet Kimlik Doğrulama Sistemi** ekranına yönlendirir (TCKN + e-Devlet şifresi / mobil imza / e-imza / T.C. kimlik kartı / internet bankacılığı).
2. Başarılı girişte EİDS, önceden bildirilen adrese parametrelerle geri döndürür: `returnUrlAdresi?yetkiKodu=...&durum=...`
   - `yetkiKodu`: EİDS'in ürettiği, sonraki sorguda kullanılan **20 karakterlik kod, geçerlilik 2 dakika**;
   - `durum`: doğrulama işlem sonucu mesajı.
3. **Başvuru kanalı (resmî): `returnUrl` değeri + uygulamanın sunucu IP adresleri `eids@ticaret.gov.tr` adresine bildirilir.**
4. Sunucu tarafı sorgu servisi (firmaya özel **Basic Authentication** bilgileri kurumca verilir):
   - `POST https://ws.gtb.gov.tr:8443/EidsApi/Kullanici/GetKullaniciKodu`
   - İstek: `{ yetkiKodu (zorunlu), vergiNo (tüzel temsilci doğrulaması için, zorunlu değil), gsmNo (zorunlu — OTP ile doğrulanmış gsm) }`
   - Yanıt: `{ ad, soyad, kullaniciKodu (benzersiz Guid), hataMesaji/hataKodu ya da islemSonucMesaji/islemSonucKodu }`
   - `kullaniciKodu` üretilemezse (ör. şirket yetkilisi değilse) boş döner + hata parametreleri dolar.
5. Sağlık kontrolü: `GET https://ws.gtb.gov.tr:8443/EidsApi/health` → tüm servisler (MERSIS + Esbis) sağlıklılarsa `"Healthy"`; **MERSIS sorgusu tüzel kişinin ticaret siciline kayıtlı olması şartını ima eder.**
6. Hata kodları: `TB-0001` beklenmeyen hata · `TB-0002` yetki kodu hatalı/süresi dolmuş · `TB-0003` belirtilen firmayı temsil yetkisi yok · `TB-0004` provizyon numarası üretilemedi · `TB-0005` vergi kimlik no ve TC kimlik no eşleşmiyor.

**Faz 2 (yetki doğrulama — taşınmaz no + e-Devlet yetkilendirmesi + TTBS belge teyidi) servis uçları bu V2.2 dokümanında YOK; Bakanlıktan güncel doküman (Faz-2 ekinin) istenmesi gerekir.** (Vatandaş tarafı akış §1–2'de resmî duyuruyla belgelidir.)

> Bu bulgu §4'teki "herkese açık teknik kılavuz yok" tespitini netleştirir: kılavuz **vardır** ancak resmî yazıyla (oda/bakanlık) paylaşılır; yukarıdaki uçlar o kılavuzdan doğrulanmıştır. Başvuru e-posta kanalıyla başlar: **eids@ticaret.gov.tr**.

## 5. Uygulanan kontrol mekanizması (bu modül)

Kapurum kapıda: **doğrulanmamış ilan yayınlanamaz** (EİDS md. 12/2-ç'nin platform karşılığı).

1. **Durum makinesi:** `ilanlar.durum` alanına `onayda` eklendi; emlak ilanları yeni akışta `onayda` doğar. RLS: `onayda` yalnız sahibine ve yöneticiye görünür (yayın politikası değişmedi: `yayinda` herkese).
2. **İlan doğrulama kaydı:** `ilan_dogrulama` tablosu — yöntem (`sahiplik`/`yetki`), taşınmaz no, yetki belge no, sonuç (`bekliyor/onayli/red`), EİDS referans alanı (resmî bağlantı gelince doldurulur), karar notu.
3. **Tetik kapısı (DB seviyesi):** `dogrulama_koru` tetiği güncellendi: `durum='yayinda'` yalnız `ilan_dogrulama.sonuç='onayli'` (veya yönetici müdahalesi) varsa mümkün; aksi halde durum `onayda`'ya sabitlenir. **İstemciyi atlayan herkes için de kapı çalışır.**
4. **Yönetim paneli:** Doğrulama sekmesi genişletildi — taşınmaz no + yöntem + TTBS/e-Devlet belge sorgu hatırlatması; onay → ilan otomatik yayına çıkar, red → gerekçe sahibe bildirilir.
5. **EİDS uyarlayıcı (`www/eids.js`):** `EIDS.dogrula({...})` tek giriş noktası. Bugünkü implements `{'el-dogrulama'}` (yönetici onayı + resmî sorgu ekranları: TTBS BelgeSorgula, turkiye.gov.tr/belge-dogrulama). Resmî API erişimi gelince yalnız bu dosyadaki `eidsSunucu()` gövdesi Edge Function çağrısıyla değişir; akışın geri kalanı etkilenmez.
6. **İlan verme akışı:** Emlak ilanında artık zorunlu: **Kimden** (sahibiyim / eş-hısım / yetkili işletme) + **taşınmaz numarası** (8–20 hane) + işletmeyse **yetki belge no**. Vasita ilanları EİDS kapısı dışındadır (kapsam: taşınmaz).

### Uygulama sırası
1. `supabase/migrations/20261109150000_eids.sql` — **KULLANICI ONAYI BEKLİYOR** (şema değişikliği onay kuralı).
2. Onay sonrası: migration uygulanır → `www/eids.js`'te `EIDS_KAPISI = true` → v3.5 APK.
3. Kapı `false` iken mevcut davranış birebir korunur (geriye dönük uyumlu).

## 6. Kaynaklar
- https://eids.ticaret.gov.tr/ — EİDS tanımı
- https://icticaret.ticaret.gov.tr/haberler/elektronik-ilan-dogrulama-sistemi-15-eylulde-hayata-geciyor — Faz 2 + akış kuralları (22.08.2024)
- https://www.resmigazete.gov.tr/eskiler/2023-08-20230831-6.htm — RG 32295: md. 12/2 (c)(ç)(f) + yaptırım
- https://www.resmigazete.gov.tr/eskiler/2026-10-20261001-1-1.htm — RG 33387: entegratör + erteleme
- https://www.turkiye.gov.tr/ticaret-eids-tasinmaz-ilani-yetkilendirme-islemleri — e-Devlet yetkilendirme hizmeti
- https://ttbs.gtb.gov.tr/Home/BelgeSorgula — yetki belgesi sorgulama
- https://www.ftso.org.tr/assets/upload/dosyalar/eids-entegrasyon-dokumani.pdf — **Resmî EİDS Entegrasyon Dokümanı V2.2** (yerel kopya: `C:\Users\fcali\AppData\Local\Temp\eids-dokuman.pdf`; sayfa görüntüleri chrome-ctrl\eids-*.png)
