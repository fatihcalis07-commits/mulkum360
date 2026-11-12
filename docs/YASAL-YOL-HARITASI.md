# Mülküm360 · Resmî işler yol haritası (13.11.2026)

Teknik altyapı hazır (EİDS röle sunucusu, telefon SMS doğrulaması, e-Devlet kimlik akışı, araç yetki sorgusu, künye sayfası).
Aşağıdaki adımlar sırayla yapılır. Bitirdiğin adımın bilgisini Claude'a ilet; şifre ve API parolalarını sohbete veya e-postaya YAZMA.

## 1. Şirket kuruluşu (1-2 hafta)
- Mali müşavirle şahıs şirketi ya da limited şirket kur. Faaliyet (NACE) kodu: 63.12 Web portalları.
- Vergi levhası, MERSİS no, imza sirküleri al.
- KEP adresi al (PTT KEP veya başka bir KEP sağlayıcı).
- Kurumsal e-posta aç (ör. destek@mulkum360.com).
- Claude'a ilet: unvan, MERSİS, vergi dairesi/no, adres, KEP, kurumsal e-posta, telefon (künye sayfasına girilecek).

## 2. ETBİS kaydı (1 gün)
- eticaret.gov.tr → e-Devlet ya da e-imza ile giriş → platformu "aracı hizmet sağlayıcı" olarak kaydet (mulkum360.com + Android uygulaması).
- Claude'a ilet: ETBİS karekodunun açtığı doğrulama bağlantısı.

## 3. BTK yer sağlayıcı bildirimi (1 gün)
- btk.gov.tr → Yer sağlayıcı bildirim formu (5651 sayılı Kanun md. 5).
- Claude'a ilet: bildirim tarihi / numarası.

## 4. Sabit IP'li sunucu (1 gün)
- Sabit IPv4'lü küçük bir VPS kirala (Türkiye veya AB; en küçük paket yeter).
- Alan adı panelinde `eids.mulkum360.com` için VPS IP'sine A kaydı aç.
- Kurulum: depodaki `eids-sunucu/README.md` adımları. İstersen SSH anahtarını kendin ekle, kurulumu Claude yapsın.
- Claude'a ilet: sunucunun IP adresi.

## 5. SMS sağlayıcı (2-5 gün)
- EİDS, OTP ile doğrulanmış cep telefonu istiyor.
- Supabase panel → Authentication → Sign In / Providers → Phone: Twilio, Vonage ya da MessageBird hesabı bağla
  (Türk sağlayıcı, ör. Netgsm, istenirse "Send SMS Hook" ile Claude bağlar; SMS başlığı onayı için şirket evrakı gerekir).

## 6. EİDS başvurusu (Bakanlık yanıtı: birkaç hafta)
- eids@ticaret.gov.tr adresine başvuru e-postası. Taslak: `docs/EIDS-BASVURU.md`.
- Bildirilecekler: returnUrl `https://eids.mulkum360.com/eids/donus` ve 4. adımdaki sunucu IP'si.
- Ekler: dilekçe, vergi levhası, imza sirküleri, ticaret sicil, ETBİS kaydı.
- İstenecekler: firma kodu, API kullanıcı adı/parolası, taşınmaz yetki doğrulama (Faz-2) entegrasyon dokümanı.

## 7. Bakanlık bilgileri gelince
- Firma kodu, API kullanıcı ve parolayı yalnız sunucudaki `/opt/mulkum-eids/.env` dosyasına sen gir.
- `https://eids.mulkum360.com/saglik` adresi `"ayarlar":"tamam","eids":"Healthy"` gösterince Claude'a haber ver.
- Claude: test, ardından Yönetim'den EİDS fazını `canli` yapar; taşınmaz dokümanı geldiyse o kısmı da bağlar.

## 8. KVKK (1 gün + avukat)
- Supabase veri işleme sözleşmesi (DPA) ve KVKK Kurulu'nun "standart sözleşme" metnini imzala; imzadan sonra 5 iş günü içinde Kurul'a bildir.
- VERBİS kaydı gerekip gerekmediğini mali müşavirle teyit et (50 çalışan ve 100 milyon TL bilanço altı genelde muaf).

## 9. Google Play (2-4 hafta)
- D-U-N-S numarası al (Dun & Bradstreet, ücretsiz, 30 güne kadar sürer).
- Play Console'da kurumsal geliştirici hesabı (ya da mevcut hesabı kuruluşa çevir).
- Veri güvenliği formu: kimlik (EİDS), telefon, konum, fotoğraf, mesaj toplandığını işaretle.
- Hesap silme bağlantısı ve gizlilik politikası adresini gir.

## 10. Avukat kontrolü
- Kullanım koşulları, KVKK aydınlatma metni, gizlilik politikası ve künyeyi bir bilişim avukatına okut.

## Bu süreçte
- EİDS canlıya geçene kadar gerçek kullanıcılara ilan açma; uygulama test ilanları ve yönetici doğrulamalı ilanlarla çalışır.
