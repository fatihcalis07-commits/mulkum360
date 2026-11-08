# Lisanslı emsal verisi talebi (taslak)

Gönderilecek yerler: Endeksa kurumsal satış, Hepsiemlak / Emlakjet / Sahibinden kurumsal iş ortaklığı, değerleme şirketleri (SPK lisanslı).
Kendi e-postandan, kendi adınla gönder. Fiyat ve sözleşme koşullarını yazılı iste.

---

**Konu:** Mülküm360 – konut emsal verisi lisansı / API erişimi hakkında

Merhaba,

Mülküm360, Türkiye'de emlak ve vasıta ilanı ile bilgilendirme amaçlı değer raporu sunan bir mobil uygulamadır. Raporlarımızda resmi kaynakları (TCMB, TÜİK, YSK, AFAD) ve kendi platformumuzdaki ilanları kullanıyoruz. Emsal kapsamını genişletmek için lisanslı veri satın almak istiyoruz.

İhtiyacımız olan veri:
- İl / ilçe / mahalle düzeyinde konut satış ve kira ilan fiyatları (TL, TL/m²)
- Oda sayısı, net/brüt m², bina yaşı, kat bilgisi
- Mümkünse ilan tarihi ve yayından kalkma (satış/kiralama) bilgisi
- Güncelleme sıklığı: aylık ya da haftalık; API veya toplu dosya

Kullanım: Uygulama içi değer raporları ve bölge istatistikleri. Ham verinin üçüncü taraflara aktarılması söz konusu değildir; raporlarda kaynak olarak firmanız belirtilecektir.

Fiyatlandırma, lisans koşulları ve örnek veri setini paylaşabilir misiniz?

Saygılarımla,
[Ad Soyad]
[Telefon] · [E-posta]
Mülküm360

---

Teknik not: Veri gelince `bolge_gostergeleri` tablosuna (il, ilce, donem, gosterge, deger, birim, kaynak) aktarılır; rapor göstergeler sayfası kaynak adıyla otomatik gösterir. İlan düzeyinde veri gelirse ayrı bir `lisansli_emsal` tablosu açılıp emsaller() havuzuna eklenir.
