// Emlak ofisleri için toplu yükleme rehberi (#/yardim). Bölümler açılır-kapanır, adımlar madde madde.
const YARDIM_TOPLU = [
  ['Başlamadan önce', 'kalkan', [
    'Hesabının türü <b>Emlak ofisi</b> olmalı. Değiştirmek için: Hesabım → Profil → Hesap türü.',
    'Yalnız kendi ilanlarını ve kendi çektiğin fotoğrafları yükle.',
    'Tek seferde en çok <b>100 ilan</b> yüklenir. Daha fazlası için dosyayı bölüp tekrar yükle.',
    'Şimdilik yalnız <b>Türkiye</b>deki ilanlar yayınlanabilir.',
    'Yükleme ekranı: <b>Hesabım → Ofisim → Toplu yükle</b>.'
  ]],
  ['Hangi yöntemi seçmeliyim?', 'pusula', [
    '<b>XML (önerilen):</b> Ofis yazılımın ya da portal panelin ilanlarını XML olarak verebiliyorsa en kolayı budur. Fotoğraflar da otomatik gelir.',
    '<b>Excel / CSV:</b> Elinde ilan listesi Excel tablosu olarak varsa bunu kullan. Fotoğrafları ayrıca seçersin.',
    '<b>Tek ilan:</b> Birkaç ilanın varsa İlan ver → <b>Başka sitedeki ilanını aktar</b> ile tek tek aktar.'
  ]],
  ['XML ile yükleme', 'belge', [
    'Ofis yazılımında ya da portal panelinde <b>XML dışa aktar</b>, <b>XML ilan beslemesi</b> veya <b>OpenImmo</b> seçeneğini bul.',
    'Bulamazsan yazılım firmana "İlanlarımı XML olarak alabilir miyim?" diye sor. Çoğu firma bu dosyayı ücretsiz verir.',
    'XML dosyasını telefonuna ya da bilgisayarına indir.',
    'Mülküm360\'ta <b>Toplu yükle</b> ekranını aç, <b>XML / CSV ve fotoğrafları seç</b> düğmesine bas, dosyayı seç.',
    'Önizlemede her ilanın başlığını, fiyatını ve konumunu kontrol et.',
    'Kırmızı uyarılı ilanlar yüklenmez; aşağıdaki "Önizleme uyarıları" bölümüne bak.',
    'Onay kutusunu işaretle, <b>İlanı yayınla</b> düğmesine bas.',
    'XML\'deki fotoğraf bağlantıları yükleme sırasında indirilir. Bu sırada uygulamayı kapatma.'
  ]],
  ['Excel / CSV ile yükleme', 'belge', [
    'Portalın kurumsal panelinden ilan listeni <b>Excel</b> olarak dışa aktar.',
    'Excel\'de dosyayı aç, <b>Dosya → Farklı kaydet → CSV UTF-8</b> seç.',
    'İlk satırda sütun başlıkları olmalı (bir sonraki bölümdeki adlar).',
    'Fotoğrafların adını ilan numarasıyla başlat: <b>1326396201_1.jpg</b>, <b>1326396201_2.jpg</b>…',
    'CSV\'de <b>İlan No</b> sütunu olmalı; fotoğraflar bu numarayla ilana bağlanır.',
    'Toplu yükle ekranında CSV dosyasını ve fotoğrafları <b>birlikte</b> seç.',
    'Her ilana en çok 40 fotoğraf eklenir; ad sırasına göre dizilir.',
    'Önizlemeyi kontrol et, onay kutusunu işaretle, yayınla.'
  ]],
  ['Sütun adları (CSV)', 'menu', [
    'Zorunlu: <b>Fiyat</b>, <b>İl</b>. Başlık yoksa oda, işlem ve ilçeden otomatik başlık yazılır.',
    'Önerilen: <b>İlan No</b>, <b>Başlık</b>, <b>İlçe</b>, <b>Mahalle</b>, <b>İşlem</b> (Satılık/Kiralık), <b>Tip</b> (Daire, Villa…), <b>Oda Sayısı</b>, <b>Net m2</b>, <b>Brüt m2</b>, <b>Bina Yaşı</b>, <b>Kat</b>, <b>Isıtma</b>, <b>Açıklama</b>.',
    'Fiyat "4.500.000", "4500000" ya da "4,5 milyon" yazılabilir.',
    'Oda sayısı "3+1" biçiminde olmalı.',
    'Örnek satır:<br><code style="font-size:12px;word-break:break-all">İlan No;Başlık;Fiyat;İl;İlçe;Mahalle;İşlem;Tip;Oda Sayısı;Net m2;Açıklama<br>1001;Işıklar\'da 3+1 Daire;4.500.000;Antalya;Muratpaşa;Altındağ;Satılık;Daire;3+1;120;Site içinde, havuzlu</code>'
  ]],
  ['Önizleme uyarıları', 'uyari', [
    '<b>fiyat yok:</b> Fiyat sütunu boş ya da adı farklı. Sütun adını "Fiyat" yap.',
    '<b>il tanınmadı:</b> İl adı yanlış yazılmış ya da yurt dışı. "Antalya", "İstanbul" gibi tam il adı yaz.',
    '<b>başlık kısa:</b> Başlık 10 karakterden kısa. Başlığı uzat ya da sütunu boş bırak, otomatik yazılsın.',
    '<b>Fotoğraf eşleşmedi:</b> Fotoğraf adı ilan numarasıyla başlamıyor. Örnek: 1001_1.jpg.',
    '<b>"XML içinde ilan bulunamadı":</b> Dosya ilan listesi değil. Yazılım firmandan ilan beslemesini iste.'
  ]],
  ['Yükledikten sonra', 'yildiz', [
    'İlanların <b>Hesabım → İlanlarım</b> altında görünür.',
    'Fotoğrafsız ilanlarda <b>Fotoğraf ekle</b> düğmesi öne çıkar.',
    'İlanı açıp <b>MülkümAI ile açıklama yaz</b> ile açıklamayı güzelleştirebilirsin.',
    'İlan gücü puanı 100\'e yaklaştıkça ilanın daha çok görünür.',
    'Aynı dosyayı ikinci kez yüklersen ilanlar tekrar eklenir; önce eskileri kaldır.'
  ]],
  ['Sahibinden ilanımı nasıl aktarırım?', 'kalem', [
    'Sahibinden\'de ilanını aç, <b>Paylaş → Bağlantıyı kopyala</b>.',
    'Mülküm360\'ta <b>İlan ver → Başka sitedeki ilanını aktar</b> kutusuna bağlantıyı yapıştır, <b>Bilgileri doldur</b>\'a bas.',
    'İlan uygulamanın içinde açılır; bilgiler okununca kendiliğinden kapanır. Beklemek istemezsen üstteki <b>✓ Aktar</b>a bas.',
    'Başlık, fiyat, m², oda, konum, özellikler, açıklama ve fotoğraflar otomatik doldurulur.',
    'Bilgileri kontrol et; eksik kalan alan olursa elle tamamla.',
    'Fotoğraflar gelmezse bir sonraki adımda telefonundan ekle.'
  ]]
];

EKRAN.yardim = () => {
  app.innerHTML = ustBar('Toplu aktarım rehberi') + `<div class="ic">
    <div class="k soluk" style="margin-bottom:10px">Emlak ofisleri için adım adım anlatım. Bir başlığa dokun, maddeler açılsın.</div>
    ${YARDIM_TOPLU.map(([baslik, ikon, maddeler], n) => `<details class="kart" style="padding:0" ${n === 0 ? 'open' : ''}>
      <summary style="display:flex;align-items:center;gap:10px;padding:14px;cursor:pointer;font-weight:700;list-style:none">${ic(ikon, 20, 'var(--vurgu-ikon)')}<span style="flex:1">${baslik}</span><span class="soluk">›</span></summary>
      <ol style="margin:0;padding:0 16px 14px 34px;line-height:1.6;font-size:14px">${maddeler.map((m) => `<li style="margin:6px 0">${m}</li>`).join('')}</ol></details>`).join('')}
    <a class="btn tam" href="#/toplu" style="margin-top:12px">${ic('belge', 18, '#fff')}Toplu yükleme ekranına git</a>
    <div class="k soluk" style="margin-top:10px">Takıldığın yerde MülkümAI'ye sorabilirsin.</div></div>`;
  navCiz('hesap');
};
