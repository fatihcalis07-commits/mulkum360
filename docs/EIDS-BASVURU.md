# EİDS Resmî Başvuru Taslağı (Faz 1 — Üye Kimlik Doğrulama)

> **Durum: TASLAK — gönderilmedi.** Göndermeden önce [KULLANICI] işaretli alanlar doldurulmalı ve §3'teki teknik kararlar netleşmelidir.
> Resmî teknik temel: `docs/EIDS.md` §4.5 (EİDS Entegrasyon Dokümanı V2.2, Ekim 2023).
> **Resmî kanal:** `returnUrl` değeri + sunucu IP adresleri **eids@ticaret.gov.tr** adresine bildirilir.

## 1. E-posta taslağı

**Kime:** eids@ticaret.gov.tr
**Konu:** İkinci El Emlak Satış Platformu — EİDS Teknik Entegrasyon Başvurusu (EIDS-BASVURU)

> Sayın Ticaret Bakanlığı İç Ticaret Genel Müdürlüğü,
>
> İkinci el taşınmaz ticaretine aracılık eden **Mülküm360** (uygulama/platform adı) işletmecisi olarak, 14 Ekim 2021 tarihli 31632 mükerrer sayılı Resmî Gazete'de yayımlanan "İkinci El Motorlu Kara Taşıtı ve Taşınmaz Ticaretine Aracılık Eden İnternet Ortamında Uygulanacak Usul ve Esaslar Hakkında Yönetmelik" kapsamında EİDS teknik entegrasyonumuz için başvuruyoruz.
>
> **Platform bilgileri**
> - Ticari unvan: [KULLANICI — şirket unvanı; ETSİB kayıt numarası]
> - MERSIS/vergi no: [KULLANICI]
> - Platform adı / uygulama: Mülküm360 (Android uygulaması `com.mulkum360.app`)
> - Yetkili kişi: [KULLANICI — ad soyad, unvan]
> - İletişim: e-posta + telefon (OTP doğrulanmış GSM — Faz 1 `GetKullaniciKodu` çağrısında zorunlu)
>
> **Teknik bilgiler**
> - **returnUrl (dönüş adresi):** `https://[KULLANICI — hosting kararı, bkz. §3.1]/eids/donus`
> - **Sunucu IP adresleri:** Entegrasyon çağrılarımız (GetKullaniciKodu) §3.2'de belirtilen sabit çıkış IP(ler)inden yapılacaktır. [Sunucu IP listesi eklenecek]
>
> Faz 1 akışını (e-Devlet üzerinden üye kimlik doğrulama → `returnUrlAdresi?yetkiKodu=…&durum=…` → sunucu tarafından `GetKullaniciKodu`) V2.2 dokümanına uygun kurmayı taahhüt ederiz. Faz 2 (taşınmaz yetki doğrulama) servis uçlarının ve güncel entegrasyon dokümanının tarafımıza iletilmesini talep ederiz.
>
> Gereğini saygılarımızla arz ederiz. [ad soyad, tarih]

## 2. Eklenecek belgeler (araştırmayla derlenen beklenti — nihai liste Bakanlık yanıtıyla netleşir, EIDS.md §4)

1. [KULLANICI] Dilekçe (antetli, imza sirküleri eki)
2. [KULLANICI] Ticaret sicil / vergi levhası fotokopisi
3. [KULLANICI] Yetki belgesi (taşınmaz ticareti yetki belgesi — platform işletmecisi sıfatıyla; işletme yetki belgesi durumu danışmanla netleştirilecek)
4. [KULLANICI] ETSİB kayıt bilgisi
5. Teknik altyapı özeti: barındırma (Supabase — bölgesel veri merkezi), KVKK aydınlatma metni bağlantısı, bilgi toplumu hizmetleri sorumlusu iletişim noktası

## 3. Gönderimden önce KAPALI teknik kararlar

### 3.1 returnUrl barındırma kararı  `[KULLANICI]`
Uygulama şu an yalnız APK olarak dağıtılıyor; **herkese açık https host yok.** EİDS dönüşü bir https adresine olacağından en az bir mikro-web gerekli:
- **Seçenek A (önerilen):** `https://mulkum360.app/eids/donus` — alan adı satın alınıp Cloudflare Pages/Workers (ücretsiz katman) üzerinde ~20 satırlık dönüş yakalama sayfası; sayfa `yetkiKodu`nu APK'ya derin bağlantıyla aktarır ya da doğrulama durumunu gösterir.
- Seçenek B: Uygulama içi tarayıcı (Capacitor Browser) `mulkum360://` şemasını yakalar — ancak Bakanlığın şema (scheme) kabul edip etmeyeceği **bilinmiyor**, https tercih edilmeli.
- **Karar: A ise alan adı satın alma + DNS [KULLANICI].**

### 3.2 Sunucu çıkış IP'si  `[KULLANICI onaylı teknik adım]`
- Veritabanı/Edge Supabase'de (eu-central-1) çalışıyor. Supabase yönetilen **adlı çıkış IPv4'ü** (Compute add-on) alınabilir; Edge Function çıkışları Supabase havuz IP'leridir ve sabit garanti edilmez.
- **Eylem:** Supabase projesine dedicated IPv4 ekle (Pro tarife özelliği — tarifeyi kontrol et) ve/veya GetKullaniciKodu çağrısını sabit IP'li küçük bir röle üzerinden yap. Liste Bakanlığa **net IP'lerle** verilmeli; "değişebilir" beyanı entegrasyon kırılganlığı yaratır.

### 3.3 Uygulama tarafı hazır durumu (kodda doğrulandı)
- `eids.js` + DB kapısı CANLIDA (`eids_ayar.faz='manuel'`): başvuru → kuyruk → yönetici onayı → yayın.  `canli` fazına geçiş yalnız bu başvuru sonuçlanıp Basic Auth bilgileri + Faz-2 dokümanı gelince yapılır (`eids-dogrula` edge'i sırlar bekleyen dürüst uyumlu olarak hazır bekliyor).
- Faz 1'de e-Devlet yönlendirmesi `https://giris.turkiye.gov.tr` üzerinden; APK'ya eklenmesi gereken: dönüş yakalama + `yetkiKodu` → sunucu çağrısı. Bu kod, §3.1 kararıyla birlikte FAZ-2 iş paketi olarak yazılacak (2 dakikalık yetki kodu süresi nedeniyle çağrı anlıktır — sunucu ucu `eids-dogrula` içine alınacak).

## 4. Başvuru sonrası yol (bilinen adımlar)
1. Bakanlık yanıtı → teknik kılavuz + Basic Auth bilgileri + Faz-2 dokümanı talebi
2. `GetKullaniciKodu` uçtan uca test (sağlık kontrolü `https://ws.gtb.gov.tr:8443/EidsApi/health`)
3. `eids-dogrula` edge'ine resmî çağrının eklenmesi + sırlar (`EIDS_API_*`)
4. `eids_ayar.faz='canli'` — DB kapısı otomatik resmî doğrulamaya döner
5. Yönetmelik takvimi: güvenli ödeme sistemi maddesi 01.12.2026'ya ertelendi (RG 01.10.2026/33387) — kimlik+yetki doğrulama yükümlülüğü ise bugün yürürlükte.
