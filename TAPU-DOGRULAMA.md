# TAPU DOĞRULAMA — Teknik Altyapı ve Yol Haritası (09.11.2026)

> Araştırma: TKGM/WebTapu/e-Devlet/EİDS entegrasyon imkânları (kaynaklı, ekteki URL'ler).
> Uygulama durumu: Mülküm360'ta **elle doğrulama akışı ÇALIŞIYOR**; resmî otomatik API yok —
> sahte entegrasyon yok. Bu dosya modüler altyapının Sözleşmesi'dir.

## Uygulamadaki mevcut akış (canlı)
1. Satıcı, ilan detayında **"Tapu doğrulaması iste"** → taşınmaz no (isteğe bağlı) + ada/parsel notu
   → `dogrulama_talepleri` (tur=`ilan`, notu=`Taşınmaz No: …`).
2. Yönetim › Doğrulama sekmesinde onay/red. **Onay kıstası:** sahibinin aldığı e-Devlet
   **barkodlu tapu belgesi**, `https://www.turkiye.gov.tr/belge-dogrulama` sayfasından teyit
   (belge yaşı ≤ 30 gün) — API yok, insan teyidi bilinçli tasarım.
3. Onay → `dogrulama_karar` RPC (yonetici() yetkili) → `ilanlar.dogrulanmis=true` →
   kart + detayda **"Tapu bilgisi doğrulandı"** rozeti.
4. Gizlilik: malik adı/TC hiçbir yerde gösterilmez; yalnız rozet. (KVKK en az veri)

## YASAL ZORUNLULUK — EİDS (acil)
Taşınmaz ilanlarında **ilan verme yetkisi doğrulaması 01.01.2025'ten beri zorunlu**
(Ticaret Bakanlığı EİDS). Mülküm360 ilan platformu olarak EİDS'ye entegre olmakla yükümlüdür:
- Başvuru: Ticaret Bakanlığı İç Ticaret Genel Müdürlüğü; entegrasyon dokümanı Faz-1 kimlik /
  Faz-2 yetki (örnek: https://www.ftso.org.tr/assets/upload/dosyalar/eids-entegrasyon-dokumani.pdf)
- Portallar: https://eids.ticaret.gov.tr/ · e-Devlet yetkilendirme:
  https://www.turkiye.gov.tr/ticaret-eids-tasinmaz-ilani-yetkilendirme-islemleri
- Bireysel ilan: taşınmaz no ile malik/eş/hısım teyidi devlet tarafında otomatik.
  Emlak ofisi ilanı: mülk sahibinin e-Devlet'ten verdiği EİDS yetkisi + TTBS yetki belgesi
  (https://ttbs.gtb.gov.tr/Home/BelgeSorgula).
- Taşıt ilanları: EİDS Taşıt API'si aynı çerçevede (ikinci faz).

## Entegrasyon modülü sözleşmesi (EİDS başvurusu sonuçlanınca doldurulacak)
`supabase/functions/eids-dogrula/index.ts` (gelecek) — arayüz:
```
girdi : { tasinmazNo, sahipKimlikHash }   // Kimlik ASLA düz saklanmaz
çıktı : { durum: 'dogrulandi'|'yetkisiz'|'yetkisiz-kaynak'|'eids-yok', kaynak: 'EIDS', gecerlilik: ISO }
etki  : ilanlar.tapu_dogrulama = { durum, kaynak, gecen, bitis }  // jsonb; dogrulanmis bayrağını besler
```
- Edge secret: EIDS_API_* (Supabase'a gizli; koda/sohbete yazılmaz).
- Çağım noktası: ilan kayıt/ilan güncelleme akışı + Yönetim sekmesi (manuel akış yedek kalır).
- Rozet metni yalnız gerçekten doğrulanan şeyi yazar.

## YASAKLAR (kesin)
- Kullanıcının e-Devlet/WebTapu şifresini almak, onun adına oturum açmak, ekran yönlendirmek (TCK 243/244, KVKK).
- belge-dogrulama / parselsorgu / WebTapu sayfalarını botla sorgulamak (ToS + TAKPAS Yönetmeliği m.16, m.28/7).
- Üçüncü taraftan toplu tapu verisi satın almak; malik adını kamuya göstermek.
- Doğrulama yapmadan rozet basmak (Tüketicinin Korunması Hakkında Kanun).
- Eski tarihli belgeyle yetinmek (satılmış mülk tuzağı — süre kuralı + mümkünse canlı kontrol).

## Kaynaklar
- EİDS duyurusu: https://ticaret.gov.tr/kurumsal-haberler/elektronik-ilan-dogrulama-sistemi-eids-yetki-dogrulama-uygulamasi-hayata-gecirildi
- Taşıt EİDS: https://ticaret.gov.tr/haberler/ticaret-bakanligindan-yeni-ve-zorunlu-uygulama-tum-tasit-ilanlarinda-eids-yetki-dogrulama-uygulamasi-basladi
- TAKPAS Yönetmeliği (RG 07.03.2015): https://www.resmigazete.gov.tr/eskiler/2015-03-20150307-6.htm
- Belge doğrulama: https://www.turkiye.gov.tr/belge-dogrulama · Tapu bilgileri: https://www.turkiye.gov.tr/tapu-bilgileri-sorgulama
- Parsel Sorgu (malik vermez): https://parselsorgu.tkgm.gov.tr/ · WebTapu: https://www.tkgm.gov.tr/e-hizmetler/sik-kullanilanlar/web-tapu
- Entegre platform listesi haberi: https://www.alobilgi.com.tr/emlak-ilanlarinda-eids-entegrasyon-listesi-guncellendi
