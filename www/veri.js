// Mülküm360 — sabitler, kategori alanları ve cihaz içi depolama (IndexedDB)
'use strict';

const ILLER = ['Adana','Adıyaman','Afyonkarahisar','Ağrı','Aksaray','Amasya','Ankara','Antalya','Ardahan','Artvin','Aydın','Balıkesir','Bartın','Batman','Bayburt','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Düzce','Edirne','Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari','Hatay','Iğdır','Isparta','İstanbul','İzmir','Kahramanmaraş','Karabük','Karaman','Kars','Kastamonu','Kayseri','Kilis','Kırıkkale','Kırklareli','Kırşehir','Kocaeli','Konya','Kütahya','Malatya','Manisa','Mardin','Mersin','Muğla','Muş','Nevşehir','Niğde','Ordu','Osmaniye','Rize','Sakarya','Samsun','Şanlıurfa','Siirt','Sinop','Şırnak','Sivas','Tekirdağ','Tokat','Trabzon','Tunceli','Uşak','Van','Yalova','Yozgat','Zonguldak'];

// Ana kategoriler ve alt kategoriler (sıra = menüdeki sıra)
const ANA = {
  emlak:  { ad: 'Emlak',  ikon: 'ev',    aciklama: 'Konut, işyeri, arsa, projeler, bina, devre mülk' },
  vasita: { ad: 'Vasıta', ikon: 'araba', aciklama: 'Otomobil, SUV, elektrikli, motosiklet, ticari, deniz' }
};
const ALT = {
  konut:      { ana: 'emlak',  ad: 'Konut',             ikon: 'ev' },
  isyeri:     { ana: 'emlak',  ad: 'İşyeri',            ikon: 'isyeri' },
  arsa:       { ana: 'emlak',  ad: 'Arsa',              ikon: 'arsa' },
  proje:      { ana: 'emlak',  ad: 'Konut Projeleri',   ikon: 'k_proje' },
  bina:       { ana: 'emlak',  ad: 'Bina',              ikon: 'k_bina' },
  yazlik:     { ana: 'emlak',  ad: 'Yazlık',            ikon: 'k_yazlik' },
  devremulk:  { ana: 'emlak',  ad: 'Devre Mülk',        ikon: 'k_devre' },
  turistik:   { ana: 'emlak',  ad: 'Turistik Tesis',    ikon: 'otel' },
  otomobil:   { ana: 'vasita', ad: 'Otomobil',          ikon: 'araba' },
  suv:        { ana: 'vasita', ad: 'Arazi, SUV, Pick-up', ikon: 'k_suv' },
  elektrikli: { ana: 'vasita', ad: 'Elektrikli Araçlar', ikon: 'k_elektrik' },
  motor:      { ana: 'vasita', ad: 'Motosiklet',        ikon: 'motor' },
  minivan:    { ana: 'vasita', ad: 'Minivan, Panelvan', ikon: 'k_minivan' },
  ticari:     { ana: 'vasita', ad: 'Ticari Araçlar',    ikon: 'kamyon' },
  kiralik:    { ana: 'vasita', ad: 'Kiralık Araçlar',   ikon: 'anahtar' },
  deniz:      { ana: 'vasita', ad: 'Deniz Araçları',    ikon: 'tekne' },
  hasarli:    { ana: 'vasita', ad: 'Hasarlı Araçlar',   ikon: 'k_hasarli' },
  karavan:    { ana: 'vasita', ad: 'Karavan',           ikon: 'karavan' },
  klasik:     { ana: 'vasita', ad: 'Klasik Araçlar',    ikon: 'k_klasik' }
};
const altlari = (ana) => Object.keys(ALT).filter((k) => ALT[k].ana === ana);

const MARKALAR = typeof ARAC_MODELLER !== 'undefined' ? [...new Set([...Object.keys(ARAC_MODELLER), 'Jeep', 'Yamaha', 'Kawasaki', 'Bajaj', 'Iveco'])].sort((a, b) => a.localeCompare(b, 'tr')) : ['Volkswagen'];

// Alan tanımı: [anahtar, etiket, tür, seçenekler?, zorunlu?]
const ALANLAR = {
  emlak: [
    ['islem', 'İşlem', 'sec', ['Satılık', 'Kiralık', 'Günlük Kiralık', 'Sezonluk', 'Devren'], true],
    ['tip', 'Tip', 'sec', ['Daire', 'Rezidans', 'Müstakil Ev', 'Villa', 'Çiftlik Evi', 'Yazlık', 'Arsa', 'Tarla', 'Bağ & Bahçe', 'Dükkan', 'Ofis', 'Depo', 'Fabrika', 'Bina', 'Otel', 'Devre Mülk'], true],
    ['oda', 'Oda sayısı', 'sec', ['Stüdyo (1+0)', '1+1', '2+1', '3+1', '4+1', '5+1', '6+ oda']],
    ['m2net', 'Net ㎡', 'sayi', null, true],
    ['m2brut', 'Brüt ㎡', 'sayi'],
    ['kat', 'Bulunduğu kat', 'metin'],
    ['binaYasi', 'Bina yaşı', 'sec', ['0', '1', '2', '3', '4', '5-10', '11-15', '16-20', '21-25', '26-30', '31 ve üzeri']],
    ['isitma', 'Isıtma', 'sec', ['Doğalgaz (kombi)', 'Merkezi', 'Yerden ısıtma', 'Klima', 'Soba', 'Yok']],
    ['esya', 'Eşya', 'sec', ['Eşyasız', 'Eşyalı']],
    ['tapu', 'Tapu durumu', 'sec', ['Kat mülkiyeti', 'Kat irtifakı', 'Hisseli', 'Müstakil tapu', 'Bilinmiyor']],
    ['kredi', 'Krediye uygun', 'sec', ['Evet', 'Hayır', 'Bilinmiyor']],
    // Alıcının ilk sorduğu bilgiler (sona eklendi; üstteki sıra filtrelerde indeksle kullanılıyor)
    ['katSayisi', 'Bina kat sayısı', 'sayi'],
    ['aidat', 'Aylık aidat (TL)', 'sayi'],
    ['cephe', 'Cephe', 'sec', ['Güney', 'Kuzey', 'Doğu', 'Batı', 'Güneydoğu', 'Güneybatı', 'Kuzeydoğu', 'Kuzeybatı']],
    ['site', 'Site içinde', 'sec', ['Evet', 'Hayır']],
    ['otopark', 'Otopark', 'sec', ['Kapalı', 'Açık', 'Yok']],
    ['asansor', 'Asansör', 'sec', ['Var', 'Yok']],
    ['balkon', 'Balkon', 'sec', ['Var', 'Yok']],
    ['manzara', 'Manzara', 'sec', ['Deniz', 'Şehir', 'Doğa', 'Göl', 'Yok']],
    // Tapu ve ilan doğrulama (isteğe bağlı): ada/parsel ile TKGM'den parsel bilgisi ve tam konum gelir
    ['ada', 'Ada no', 'metin'],
    ['parsel', 'Parsel no', 'metin'],
    ['eids', 'EİDS ilan doğrulama no', 'metin'],
    ['proje', 'Proje adı (yeni konut projelerinde)', 'metin']
  ],
  vasita: [
    ['marka', 'Marka', 'liste', MARKALAR, true],
    ['model', 'Model / seri', 'metin', null, true],
    ['yil', 'Model yılı', 'sayi', null, true],
    ['km', 'Kilometre', 'sayi', null, true],
    ['yakit', 'Yakıt', 'sec', ['Benzin', 'Dizel', 'LPG & Benzin', 'Hibrit', 'Elektrik'], true],
    ['vites', 'Vites', 'sec', ['Manuel', 'Otomatik', 'Yarı otomatik'], true],
    ['kasa', 'Kasa tipi', 'sec', ['Sedan', 'Hatchback', 'Station wagon', 'Coupe', 'Cabrio', 'SUV', 'Pick-up', 'Panelvan', 'Minivan', 'Motosiklet']],
    ['renk', 'Renk', 'metin'],
    ['hasar', 'Boya / değişen', 'sec', ['Hatasız', 'Boyalı parça var', 'Değişen parça var', 'Ağır hasar kayıtlı'], true],
    ['takas', 'Takas', 'sec', ['Takasa açık', 'Takas yok']],
    ['kimden', 'Kimden', 'sec', ['Sahibinden', 'Galeriden']]
  ]
};

// ---- Depolama ----
const DB_AD = 'mulkum360', DB_SURUM = 1;
let _db = null;
function dbAc() {
  if (_db) return Promise.resolve(_db);
  return new Promise((ok, red) => {
    const r = indexedDB.open(DB_AD, DB_SURUM);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => { _db = r.result; ok(_db); };
    r.onerror = () => red(r.error);
  });
}
async function kvAl(k) {
  try { const db = await dbAc(); return await new Promise((ok) => { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => ok(r.result); r.onerror = () => ok(undefined); }); }
  catch (e) { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return undefined; } }
}
async function kvYaz(k, v) {
  try { const db = await dbAc(); await new Promise((ok, red) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = ok; t.onerror = () => red(t.error); }); }
  catch (e) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
}

// Uygulama durumu
// Sunucu verisi (ilanlar, üyeler, mesajlar) sb.js ile gelir; cihazda yalnız tercihler tutulur.
const S = { kullanicilar: [], ilanlar: [], sohbetler: [], kayitliAramalar: [], favSayilari: {}, oturum: null, tema: 'acik', palet: 'prestij', gorulen: [], karsilandi: false, donus: null, AYARLAR: {} };
const YEREL = ['tema', 'palet', 'gorulen', 'karsilandi', 'donus'];
// Ana sayfa vitrin ayarı: sıra + her vitrinin görünürlüğü. Yönetim panelinden değişir.
// Şimdilik cihazda saklanır; ayarlar tablosu (migration onay bekliyor) gelince sunucudan da okunur.
const VITRIN_VARSAYILAN = { sira: ['onecikan', 'firsat', 'dusen', 'proje'], aktif: { onecikan: true, firsat: true, dusen: true, proje: true }, ad: { onecikan: 'Öne çıkan ilanlar', firsat: 'Fırsat ilanları', dusen: 'Fiyatı düşen ilanlar', proje: 'Proje vitrini' } };
function vitrinAyar() { try { const v = JSON.parse(localStorage.getItem('vitrin_ayarlari') || 'null'); if (v && Array.isArray(v.sira)) return Object.assign({}, VITRIN_VARSAYILAN, v); } catch (_) {} return Object.assign({}, VITRIN_VARSAYILAN); }
let _yazZaman = null;
async function yukle() { const v = await kvAl('tercihler'); if (v) YEREL.forEach((k) => v[k] !== undefined && (S[k] = v[k])); }
function kaydet() { clearTimeout(_yazZaman); _yazZaman = setTimeout(() => kvYaz('tercihler', Object.fromEntries(YEREL.map((k) => [k, S[k]]))), 150); }

// ---- Yardımcılar ----
const $ = (s, k = document) => k.querySelector(s);
const kac = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const yeniId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const tl = (n) => (n == null || isNaN(n) ? '—' : new Intl.NumberFormat('tr-TR').format(Math.round(n)) + ' TL');
const sayiBicim = (n) => new Intl.NumberFormat('tr-TR').format(n);
function gecen(t) {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'az önce';
  if (s < 3600) return Math.floor(s / 60) + ' dk önce';
  if (s < 86400) return Math.floor(s / 3600) + ' sa önce';
  if (s < 86400 * 7) return Math.floor(s / 86400) + ' gün önce';
  return new Date(t).toLocaleDateString('tr-TR');
}
// Fiyatların ortalaması: uç değerler sonucu bozmasın diye en düşük ve en yüksek %10 atılır (budanmış ortalama).
// Ad eskiden kalma; tüm fiyat hesapları bunu kullanır.
function medyan(a) { const s = [...a].filter((x) => isFinite(x)).sort((x, y) => x - y); if (!s.length) return NaN; const k = s.length >= 5 ? Math.max(1, Math.floor(s.length * 0.1)) : 0, l = s.slice(k, s.length - k); return l.reduce((t, x) => t + x, 0) / l.length; }
function medyanEski(a) { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function yuzdelik(a, p) { const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * p, a0 = Math.floor(i); return s[a0] + (s[Math.ceil(i)] - s[a0]) * (i - a0); }
const kucuk = (s) => String(s || '').toLocaleLowerCase('tr-TR');

async function sifreOzet(sifre, tuz) {
  const veri = new TextEncoder().encode(tuz + ':' + sifre);
  const h = await crypto.subtle.digest('SHA-256', veri);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Fotoğrafı 1280 px'e küçültüp JPEG'e çevirir
function fotoKucult(dosya, enfazla = 1280) {
  return new Promise((ok, red) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, enfazla / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        ok(c.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = red; img.src = r.result;
    };
    r.onerror = red; r.readAsDataURL(dosya);
  });
}

// ---- İkonlar (çizgi SVG) ----
const IKON = {
  telefon: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  ev:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  arsa: '<path d="M3 20h18"/><path d="M5 20V9l7-5 7 5v11"/><path d="M9 20v-6h6v6"/>',
  isyeri: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M10 21v-4h4v4"/>',
  gunes: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  araba: '<path d="M5 16l1.5-5A2 2 0 0 1 8.4 9.6h7.2a2 2 0 0 1 1.9 1.4L19 16"/><rect x="3" y="16" width="18" height="4" rx="1"/><circle cx="7" cy="20" r="1"/><circle cx="17" cy="20" r="1"/>',
  suv: '<path d="M3 15V9h12l4 3h2v3"/><rect x="3" y="15" width="18" height="3" rx="1"/><circle cx="7" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
  motor: '<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5L10 9h4l4.5 7.5M14 9l-1-3h-3"/>',
  kamyon: '<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  ara: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  arti: '<path d="M12 5v14M5 12h14"/>',
  kalp: '<path d="M12 21s-8-5-8-11a5 5 0 0 1 8-3 5 5 0 0 1 8 3c0 6-8 11-8 11z"/>',
  mesaj: '<path d="M21 12a8 8 0 0 1-12 7l-5 1 1-4a8 8 0 1 1 16-4z"/>',
  kisi: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  pusula: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  geri: '<path d="M15 5l-7 7 7 7"/>',
  kapat: '<path d="M6 6l12 12M18 6L6 18"/>',
  paylas: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  filtre: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  kalkan: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  uyari: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  gonder: '<path d="M4 12l16-8-6 16-2-7z"/>',
  indir: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  belge: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
  grafik: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  zil: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21h4"/>',
  ayar: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  ay: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',
  cikis: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  kalem: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  cop: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  tik: '<path d="M5 12l5 5 9-10"/>',
  foto: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M8 5l1.5-2h5L16 5"/>',
  konum: '<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  yildiz: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  bayrak: '<path d="M5 21V4h11l-1.5 4L16 12H5"/>',
  goz: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  kilit: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  yenile: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  vinc: '<path d="M6 21V3l12 3H6M10 6v4M18 6v6M16 12h4v3h-4zM3 21h8"/>',
  bina: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1"/>',
  takvim: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  otel: '<path d="M3 21V7l9-4 9 4v14M9 21v-5h6v5M8 10h2M14 10h2"/>',
  simsek: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  minivan: '<path d="M3 16V8a2 2 0 0 1 2-2h9l5 5h2v5"/><rect x="3" y="16" width="18" height="2" rx="1"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/>',
  anahtar: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
  tekne: '<path d="M3 17l2 4h14l2-4zM12 3v12M12 4l6 9h-6"/>',
  karavan: '<path d="M2 16V7h14l4 5v4"/><path d="M5 10h4v3H5zM12 10h2"/><circle cx="7" cy="17" r="1.5"/><path d="M20 16h2"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  ok: '<path d="M9 5l7 7-7 7"/>',
  numara: '<path d="M5 9h14M5 15h14M10 3L8 21M16 3l-2 18"/>'
};
// Eksik kalan 4 ad, tanımlı simgelere takma adla bağlanır (boş kare kutu yerine glif): kiralık=anahtar, sezonluk=tekne, proje=vinc, vasıta=araba
Object.assign(IKON, { kiralik: IKON.anahtar, deniz: IKON.tekne, proje: IKON.vinc, vasita: IKON.araba });

// ---- Akıllı arama: "3+1 satılık Çankaya 5 milyon altı" -> yapılandırılmış filtre ----
function sorguCoz(q) {
  const f = {}, anlasilan = [];
  let kalan = ' ' + kucuk(q) + ' ';
  const al = (re, fn) => { const m = kalan.match(re); if (m) { fn(m); kalan = kalan.replace(m[0], ' '); } };
  al(/\b(\d)\s*\+\s*(\d)(?=\s)/, (m) => { f.oda = `${m[1]}+${m[2]}`; anlasilan.push(f.oda); });
  al(/\bstüdyo\b|\b1\s*\+\s*0(?=\s)/, () => { f.oda = 'Stüdyo (1+0)'; anlasilan.push('Stüdyo'); });
  al(/\bgünlük( kiralık)?(?=\s)/, () => { f.islem = 'Günlük Kiralık'; anlasilan.push('Günlük kiralık'); });
  al(/\bsezonluk(?=\s)/, () => { f.islem = 'Sezonluk'; anlasilan.push('Sezonluk kiralama'); });
  al(/\bsatılık(?=\s)/, () => { f.islem = 'Satılık'; anlasilan.push('Satılık'); });
  al(/\bkiralık(?=\s)/, () => { f.islem = 'Kiralık'; anlasilan.push('Kiralık'); });
  al(/\bdevren(?=\s)/, () => { f.islem = 'Devren'; anlasilan.push('Devren'); });
  const tutar = (s, b) => Math.round(parseFloat(s.replace(',', '.')) * (b === 'milyon' ? 1e6 : b === 'bin' ? 1e3 : 1));
  al(/(\d+(?:[.,]\d+)?)\s*(milyon|bin)?\s*(tl)?\s*(altı|altında|e kadar|a kadar|ye kadar|ya kadar)(?=\s)/, (m) => { f.max = tutar(m[1], m[2]); anlasilan.push('≤ ' + new Intl.NumberFormat('tr-TR').format(f.max) + ' TL'); });
  al(/(\d+(?:[.,]\d+)?)\s*(milyon|bin)?\s*(tl)?\s*(üstü|üzeri|üzerinde)(?=\s)/, (m) => { f.min = tutar(m[1], m[2]); anlasilan.push('≥ ' + new Intl.NumberFormat('tr-TR').format(f.min) + ' TL'); });
  al(/\b(19[5-9]\d|20[0-3]\d)\s*(model|ve üstü|sonrası)?(?=\s)/, (m) => { f.yilmin = m[1]; anlasilan.push(m[1] + (m[2] ? ' ve üstü' : ' model')); });
  al(/\b(otomatik|manuel)(?=\s)/, (m) => { f.vites = m[1] === 'otomatik' ? 'Otomatik' : 'Manuel'; anlasilan.push(f.vites); });
  al(/\b(dizel|benzin|lpg|hibrit|elektrikli)(?=\s)/, (m) => { f.yakit = { dizel: 'Dizel', benzin: 'Benzin', lpg: 'LPG & Benzin', hibrit: 'Hibrit', elektrikli: 'Elektrik' }[m[1]]; anlasilan.push(f.yakit); });
  for (const il of ILLER) { const k = kucuk(il); if (kalan.includes(' ' + k + ' ') || kalan.includes(' ' + k + "'")) { f.il = il; anlasilan.push(il); kalan = kalan.replace(k, ' '); break; } }
  for (const [k, a] of Object.entries(ALT)) { const ad = kucuk(a.ad.split(',')[0]); if (kalan.includes(' ' + ad + ' ')) { f.alt = k; anlasilan.push(a.ad); kalan = kalan.replace(ad, ' '); break; } }
  if (!f.alt) { if (/\b(daire|ev|konut)(?=\s)/.test(kalan)) { f.alt = 'konut'; anlasilan.push('Konut'); kalan = kalan.replace(/\b(daire|ev|konut)(?=\s)/, ' '); } else if (/\b(araba|araç|oto)(?=\s)/.test(kalan)) { f.ana = 'vasita'; anlasilan.push('Vasıta'); kalan = kalan.replace(/\b(araba|araç|oto)(?=\s)/, ' '); } }
  if (f.oda || f.islem) f.ana = f.ana || 'emlak';
  if (f.vites || f.yakit) f.ana = f.ana || 'vasita';
  return { f, anlasilan, kalan: kalan.replace(/\s+/g, ' ').trim() };
}
const ic = (ad, boy = 20, renk = 'currentColor', kalin = 2) => `<svg aria-hidden="true" width="${boy}" height="${boy}" viewBox="0 0 24 24" fill="none" stroke="${renk}" stroke-width="${kalin}" stroke-linecap="round" stroke-linejoin="round">${IKON[ad] || ''}</svg>`;
