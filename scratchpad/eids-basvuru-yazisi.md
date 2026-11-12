# EİDS Entegrasyon Başvurusu — eids@ticaret.gov.tr'a gönderilecek resmî yazı

**Kime:** eids@ticaret.gov.tr (T.C. Ticaret Bakanlığı — İç Ticaret Genel Müdürlüğü)
**Konu:** EİDS Entegrasyon Başvurusu – Mülküm360 (Gerçek Kişi Platform İşletmecisi)

---

Sayın Ticaret Bakanlığı İç Ticaret Genel Müdürlüğü Yetkilileri,

**1. Tanıtım.** Mülküm360 (yayın adresleri: mulkum360.com ve app.mulkum360.com; Android uygulaması Google Play'de yayına hazırlanmaktadır), taşınmaz ve ikinci el motorlu kara taşıtı ilanlarına elektronik ortam sağlayan, **gerçek kişi tarafından işletilen** bir ilan platformudur.

**2. Yükümlülük bilinci.** Taşınmaz Ticareti Hakkında Yönetmelik m. 12/2 kapsamındaki (c) kimlik doğrulama, (ç) yetki doğrulama ve (f) pazar bütünlüğü yükümlülüklerinin, ayrıca 6563 sayılı Kanun kapsamındaki aracı hizmet sağlayıcı sorumluluklarının farkındayız. Platformumuzda **kimlik/yetki doğrulanmış ilan yayımlama kuralı teknik olarak kurulmuştur**; doğrulanmamış ilan veritabanı tetikleyicisiyle de yayına çıkamaz. Şu anki doğrulama, resmî sorgu ekranları üzerinden yönetici onayıyla (manuel) yürütülmekte olup hedefimiz doğrulamayı EİDS üzerinden otomatik yapmaktır.

**3. Entegrasyon talebi ve teknik beyan.** EİDS Entegrasyon Dokümanı (V2.2) incelenmiştir. Faz 1 (üye kimlik doğrulama) akışı için planlanan dönüş adresimiz:

> **returnUrl:** `https://app.mulkum360.com/eids-donus`
> (yetkiKodu ve durum parametrelerinin karşılanacağı uç; entegrasyon aşamasında kesinleştirilecektir.)

Platform sunucusu, yönetilen bulut altyapısı (Supabase — Avrupa bölgesi) üzerinde çalışmaktadır; çıkış IP kümesi, entegrasyon aşamasına geçildiğinde tarafınıza ayrıca bildirilecektir. Kullanılmak istenmesi hâlinde Faz 2 (taşıınmaz/taşıt yetki doğrulama) servis uçlarını içeren güncel entegrasyon dokümanının da tarafımızla paylaşılmasını saygıyla talep ederiz.

**4. Görüşünüze başvurduğumuz hususlar.**
1. Platform işletmecisinin **gerçek kişi (şahıs)** olması hâlinde EİDS entegrasyonu mümkün müdür; mümkünse tüzel kişilerden (ticaret unvanı, MERSIS numarası, imza sirküleri) farklı olarak hangi belge ve koşullar aranmaktadır?
2. Gerçek kişi işletmeci için 6563 sayılı Kanun kapsamındaki **ETBİS** bildirim yükümlülüğünün kapsam ve usulü hakkında tarafımıza bilgi verilmesini; entegrasyon için ETBİS kaydının ön koşul olup olmadığını talep ederiz.
3. Kimlik bilgilerinin saklanması (m. 12/2-c) yükümlülüğü kapsamında Bakanlığın beklediği veri saklama süresi/güvenlik standartları hakkında yönlendirme rica ederiz.

**5. İletişim.**
Ad Soyad : Fatih Çalık *(gerçek kişi — platform işletmecisi)*
Telefon  : +90 542 689 19 82
E-posta  : [gönderici e-posta adresiniz]
Adres    : [ağzınıza kadar açık adresiniz — resmî yazışma için]

Gereğini saygılarımla arz ederim. 13.11.2026

*(e-imza / ıslak imza — gönderim kanalına göre)*

---

## Gönderim talimatı (kullanıcıya)
1. Konu satırını aynen kullan: **EİDS Entegrasyon Başvurusu – Mülküm360 (Gerçek Kişi Platform İşletmecisi)**
2. Köşeli parantezli 3 alanı doldur (e-posta, adres; TCKN **istendikten sonra** verilmeli — ilk yazıda yazma).
3. Kendi mailbox'ından `eids@ticaret.gov.tr`'ye gönder. Eklenti gerekmez; yanıtta belge isterlerse tamamlarız.
4. Yanıt gelmezse 10 gün sonra aynı konu üstünden bir hatırlatma; sonuç çıkmazsa CİMER üzerinden "EİDS gerçek kişi platform entegrasyonu başvurusu" başlığıyla takip.
