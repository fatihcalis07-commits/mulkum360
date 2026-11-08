// Test ilanları: 3 test satıcısı, 500 ilan (temel liste + türetilmiş emsaller), çizim görseller. Hepsi ornek=true ("Test ilanı").
// Silmek için: node test/test_ilanlari.mjs sil
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs';
const ayar = fs.readFileSync(new URL('../www/sb-ayar.js', import.meta.url), 'utf8');
const sb = createClient(ayar.match(/SB_URL = '([^']+)'/)[1], process.env.SB_GIZLI, { auth: { persistSession: false } });
const EPOSTA = (n) => `test-satici-${n}@example.com`;

async function sil() {
  const { data } = await sb.auth.admin.listUsers();
  for (const u of data.users.filter((u) => /^test-satici-\d@example\.com$/.test(u.email || ''))) {
    const f = await sb.storage.from('ilan-fotolari').list(u.id, { limit: 1000 });
    if (f.data?.length) await sb.storage.from('ilan-fotolari').remove(f.data.map((x) => `${u.id}/${x.name}`));
    await sb.auth.admin.deleteUser(u.id);
  }
  console.log('test satıcıları ve ilanları silindi');
}
if (process.argv[2] === 'sil') { await sil(); process.exit(0); }
await sil();

// Basit çizim görsel (gökyüzü + bina/araç silueti). Gerçek fotoğraf değildir.
const RENK = [['#9CC3E6', '#E9DCC5'], ['#F2C9A0', '#D9E4EC'], ['#B7D7C2', '#EDE6D6'], ['#C9C3E6', '#F1E4D3'], ['#F6D58E', '#DCE7F2']];
function ev(r, tur) {
  const [gok, bina] = RENK[r % RENK.length];
  const sekil = {
    konut: `<rect x="250" y="250" width="300" height="250" fill="${bina}"/><path d="M230 260 L400 130 L570 260z" fill="#0B1B33"/>${[0, 1, 2].map((i) => `<rect x="${280 + i * 90}" y="300" width="50" height="60" fill="#5B7FA6"/>`).join('')}<rect x="375" y="400" width="50" height="100" fill="#8A6516"/>`,
    isyeri: `<rect x="220" y="200" width="360" height="300" fill="${bina}"/><rect x="220" y="200" width="360" height="40" fill="#D4A24C"/><rect x="250" y="300" width="300" height="140" fill="#7FA3C8"/>`,
    arsa: `<path d="M0 420 Q400 360 800 430 L800 600 L0 600z" fill="#7FB069"/><rect x="380" y="330" width="6" height="90" fill="#8A6516"/><rect x="386" y="330" width="70" height="40" fill="#D4A24C"/>`,
    bina: `${[0, 1].map((k) => `<rect x="${230 + k * 190}" y="${140 + k * 60}" width="150" height="${360 - k * 60}" fill="${bina}"/>${[...Array(6)].map((_, i) => `<rect x="${250 + k * 190}" y="${170 + k * 60 + i * 48}" width="110" height="22" fill="#6E8FB3"/>`).join('')}`).join('')}`,
    yazlik: `<circle cx="640" cy="130" r="60" fill="#FFD166"/><rect x="0" y="430" width="800" height="170" fill="#4FA3C7"/><rect x="250" y="270" width="280" height="160" fill="#fff"/><path d="M230 280 L390 180 L550 280z" fill="#C8553D"/>`,
    araba: `<rect x="0" y="470" width="800" height="130" fill="#7A7F87"/><path d="M170 420 Q200 330 320 320 L500 320 Q590 330 630 420z" fill="${['#C8553D', '#2F5D8A', '#E8E8E8', '#1F1F1F', '#D4A24C'][r % 5]}"/><rect x="150" y="410" width="500" height="60" rx="20" fill="${['#C8553D', '#2F5D8A', '#E8E8E8', '#1F1F1F', '#D4A24C'][r % 5]}"/><circle cx="260" cy="475" r="38" fill="#222"/><circle cx="540" cy="475" r="38" fill="#222"/><path d="M300 330 L330 395 L470 395 L480 330z" fill="#BFD8EE"/>`,
    motor: `<rect x="0" y="470" width="800" height="130" fill="#7A7F87"/><circle cx="260" cy="450" r="60" fill="none" stroke="#222" stroke-width="18"/><circle cx="540" cy="450" r="60" fill="none" stroke="#222" stroke-width="18"/><path d="M260 450 L380 370 L480 370 L540 450" stroke="#C8553D" stroke-width="22" fill="none"/>`,
    tekne: `<rect x="0" y="420" width="800" height="180" fill="#3E8EB8"/><path d="M220 420 L580 420 L530 480 L270 480z" fill="#fff"/><path d="M400 180 L400 410 L540 410z" fill="#F3F3F3"/>`,
    karavan: `<rect x="0" y="470" width="800" height="130" fill="#8BAA6B"/><rect x="200" y="300" width="380" height="160" rx="30" fill="#F1E4D3"/><rect x="230" y="330" width="120" height="60" fill="#7FA3C8"/><circle cx="300" cy="470" r="34" fill="#222"/><circle cx="500" cy="470" r="34" fill="#222"/>`
  }[tur] || '';
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${gok}"/>${sekil}<rect x="16" y="16" width="190" height="40" rx="10" fill="#0B1B33cc"/><text x="111" y="43" font-family="Segoe UI,Arial" font-size="20" font-weight="700" fill="#fff" text-anchor="middle">TEST GÖRSELİ</text></svg>`);
}

const satici = [];
for (const [n, ad, tel] of [[1, 'Test Satıcı Ayşe', '05320000001'], [2, 'Test Galeri Mehmet', '05320000002'], [3, 'Test Emlak Zeynep', '05320000003']]) {
  const { data, error } = await sb.auth.admin.createUser({ email: EPOSTA(n), password: 'TestSatici' + n + Date.now(), email_confirm: true, user_metadata: { ad, tel } });
  if (error) throw error; satici.push(data.user.id);
}
const E = (s, alt, baslik, il, ilce, fiyat, a, gorsel, saatOnce) => ({ s, ana: 'emlak', alt, baslik, il, ilce, fiyat, alanlar: a, gorsel, saatOnce });
const V = (s, alt, baslik, il, ilce, fiyat, a, gorsel, saatOnce) => ({ s, ana: 'vasita', alt, baslik, il, ilce, fiyat, alanlar: a, gorsel, saatOnce });
const K = (islem, oda, m2, yas, ek = {}) => ({ islem, tip: 'Daire', oda, m2net: String(m2), m2brut: String(Math.round(m2 * 1.2)), binaYasi: String(yas), isitma: 'Doğalgaz (kombi)', esya: 'Eşyasız', tapu: 'Kat mülkiyeti', kredi: 'Evet', kat: String(1 + (m2 % 7)), ...ek });
const A = (marka, model, yil, km, ek = {}) => ({ marka, model, yil: String(yil), km: String(km), yakit: 'Benzin', vites: 'Otomatik', kasa: 'Hatchback', renk: 'Beyaz', hasar: 'Hatasız', takas: 'Takas yok', kimden: 'Sahibinden', ...ek });
const ilanlar = [
  E(2, 'konut', 'Güney cephe, bakımlı 3+1 daire', 'Ankara', 'Çankaya', 6200000, K('Satılık', '3+1', 130, 12), 'konut', 3),
  E(2, 'konut', 'Yeni binada asansörlü 3+1', 'Ankara', 'Çankaya', 6900000, K('Satılık', '3+1', 125, 2), 'konut', 7),
  E(0, 'konut', 'Parka yürüme mesafesinde 3+1', 'Ankara', 'Çankaya', 6500000, K('Satılık', '3+1', 140, 18), 'konut', 30),
  E(2, 'konut', 'Otoparklı site içinde 3+1', 'Ankara', 'Çankaya', 5800000, K('Satılık', '3+1', 120, 20), 'konut', 50),
  E(0, 'konut', 'Metroya 5 dakika 2+1 kiralık', 'İstanbul', 'Kadıköy', 32000, K('Kiralık', '2+1', 85, 15), 'konut', 2),
  E(2, 'konut', 'Bakımlı 2+1, ara kat', 'İstanbul', 'Kadıköy', 35000, K('Kiralık', '2+1', 90, 10), 'konut', 5),
  E(0, 'konut', 'Eşyalı 2+1, deniz manzaralı', 'İstanbul', 'Kadıköy', 42000, K('Kiralık', '2+1', 95, 8, { esya: 'Eşyalı' }), 'konut', 9),
  E(2, 'konut', 'Asansörlü 2+1 daire', 'İstanbul', 'Kadıköy', 29000, K('Kiralık', '2+1', 80, 25), 'konut', 20),
  E(2, 'isyeri', 'Cadde üzeri köşe dükkan', 'İzmir', 'Konak', 9500000, { islem: 'Satılık', tip: 'Dükkan', m2net: '110', binaYasi: '15', tapu: 'Kat mülkiyeti' }, 'isyeri', 14),
  E(0, 'arsa', 'İmarlı, yola cepheli arsa', 'Muğla', 'Bodrum', 4300000, { islem: 'Satılık', tip: 'Arsa', m2net: '600', tapu: 'Müstakil tapu' }, 'arsa', 40),
  E(2, 'bina', 'Komple satılık 5 katlı bina', 'Bursa', 'Nilüfer', 28000000, { islem: 'Satılık', tip: 'Bina', m2net: '900', binaYasi: '6' }, 'bina', 60),
  E(0, 'yazlik', 'Denize sıfır günlük kiralık yazlık', 'Antalya', 'Kaş', 6500, K('Günlük Kiralık', '2+1', 75, 5, { tip: 'Yazlık', esya: 'Eşyalı' }), 'yazlik', 4),
  // İşyeri, arsa, bina, yazlık ve kira getirisi için tamamlayıcı test ilanları
  ...[[9500000, 110, 'Alsancak'], [7800000, 95, 'Kemeraltı'], [12500000, 140, 'Alsancak'], [6900000, 80, 'Basmane']].map(([fy, m2, mh], n) => E(n % 2 ? 0 : 2, 'isyeri', `${mh} cadde üzeri dükkan`, 'İzmir', 'Konak', fy, { islem: 'Satılık', tip: 'Dükkan', m2net: String(m2), binaYasi: String(10 + n * 4), tapu: 'Kat mülkiyeti' }, 'isyeri', 10 + n * 6)),
  ...[[45000, 110], [38000, 90], [55000, 140]].map(([fy, m2], n) => E(2, 'isyeri', `Kiralık ofis ${m2} m²`, 'İzmir', 'Konak', fy, { islem: 'Kiralık', tip: 'Ofis', m2net: String(m2), binaYasi: '12' }, 'isyeri', 5 + n * 7)),
  ...[[3900000, 550], [5200000, 750], [4600000, 640]].map(([fy, m2], n) => E(0, 'arsa', `Yola cepheli imarlı arsa ${m2} m²`, 'Muğla', 'Bodrum', fy, { islem: 'Satılık', tip: 'Arsa', m2net: String(m2), tapu: 'Müstakil tapu' }, 'arsa', 20 + n * 9)),
  ...[[24000000, 800], [31000000, 1000], [19500000, 650]].map(([fy, m2], n) => E(2, 'bina', `Komple satılık bina ${m2} m²`, 'Bursa', 'Nilüfer', fy, { islem: 'Satılık', tip: 'Bina', m2net: String(m2), binaYasi: String(4 + n * 5) }, 'bina', 15 + n * 12)),
  ...[[5800, 70], [7200, 90], [5200, 60]].map(([fy, m2], n) => E(0, 'yazlik', `Denize yakın günlük kiralık ${m2} m²`, 'Antalya', 'Kaş', fy, K('Günlük Kiralık', '2+1', m2, 6 + n, { tip: 'Yazlık', esya: 'Eşyalı' }), 'yazlik', 3 + n * 4)),
  ...[[10500000, 95], [11800000, 105], [9600000, 85]].map(([fy, m2], n) => E(2, 'konut', `Satılık 2+1, Kadıköy ${m2} m²`, 'İstanbul', 'Kadıköy', fy, K('Satılık', '2+1', m2, 10 + n * 5), 'konut', 6 + n * 5)),
  ...[[26000, 125], [28500, 135], [24000, 120]].map(([fy, m2], n) => E(0, 'konut', `Kiralık 3+1, Çankaya ${m2} m²`, 'Ankara', 'Çankaya', fy, K('Kiralık', '3+1', m2, 8 + n * 6), 'konut', 4 + n * 6)),
  V(1, 'otomobil', 'Tek elden Clio, otomatik', 'İzmir', 'Bornova', 820000, A('Renault', 'Clio', 2019, 78000), 'araba', 4),
  V(1, 'otomobil', 'Clio Touch, bakımlı', 'İzmir', 'Karşıyaka', 880000, A('Renault', 'Clio', 2020, 61000), 'araba', 8),
  V(0, 'otomobil', 'Clio Joy, ilk sahibinden', 'Manisa', 'Yunusemre', 760000, A('Renault', 'Clio', 2018, 98000, { vites: 'Manuel' }), 'araba', 26),
  V(1, 'otomobil', 'Clio dizel, boyalı parça var', 'İzmir', 'Buca', 790000, A('Renault', 'Clio', 2019, 120000, { yakit: 'Dizel', hasar: 'Boyalı parça var' }), 'araba', 33),
  V(0, 'otomobil', 'Az kullanılmış Egea sedan', 'Bursa', 'Nilüfer', 900000, A('Fiat', 'Egea', 2021, 45000, { kasa: 'Sedan' }), 'araba', 12),
  V(1, 'otomobil', 'Corolla hibrit, servis bakımlı', 'Ankara', 'Yenimahalle', 1350000, A('Toyota', 'Corolla', 2022, 38000, { yakit: 'Hibrit', kasa: 'Sedan', kimden: 'Galeriden' }), 'araba', 6),
  V(1, 'elektrikli', 'Togg T10X, garantili', 'İstanbul', 'Ataşehir', 1850000, A('Togg', 'T10X', 2024, 15000, { yakit: 'Elektrik', kasa: 'SUV', kimden: 'Galeriden' }), 'araba', 3),
  V(0, 'suv', 'Duster 4x4, arazi paketi', 'Kayseri', 'Melikgazi', 1100000, A('Dacia', 'Duster', 2021, 70000, { yakit: 'Dizel', vites: 'Manuel', kasa: 'SUV' }), 'araba', 18),
  V(0, 'motor', 'Honda PCX, ilk sahibinden', 'Antalya', 'Muratpaşa', 145000, A('Honda', 'PCX 125', 2022, 9000, { kasa: 'Motosiklet' }), 'motor', 10),
  V(1, 'ticari', 'Transit Custom panelvan', 'Konya', 'Selçuklu', 1250000, A('Ford', 'Transit Custom', 2020, 140000, { yakit: 'Dizel', vites: 'Manuel', kasa: 'Panelvan', kimden: 'Galeriden' }), 'araba', 22),
  V(0, 'deniz', '7 metre fiber tekne', 'Muğla', 'Fethiye', 950000, A('Diğer', 'Fiber tekne', 2016, 0, { kasa: 'Tekne' }), 'tekne', 45),
  V(1, 'karavan', 'Çekme karavan, 4 kişilik', 'İzmir', 'Urla', 680000, A('Diğer', 'Çekme karavan', 2019, 0, { kasa: 'Karavan' }), 'karavan', 28)
];
// Emsal havuzu için türetilmiş test ilanları: temel ilanların fiyat/m² ±%15, tarih 0–90 gün oynatılmış kopyaları (toplam HEDEF).
const HEDEF = 500;
let tohum = 360;
const rast = () => ((tohum = (tohum * 16807) % 2147483647) / 2147483647);
const temel = ilanlar.slice();
for (let i = 0; ilanlar.length < HEDEF; i++) {
  const b = temel[i % temel.length], c = 0.85 + rast() * 0.3, a = { ...b.alanlar };
  if (a.m2net) { const m2 = Math.max(20, Math.round(Number(a.m2net) * (0.85 + rast() * 0.3))); a.m2net = String(m2); if (a.m2brut) a.m2brut = String(Math.round(m2 * 1.2)); }
  if (a.km && a.km !== '0') a.km = String(Math.round(Number(a.km) * (0.7 + rast() * 0.6)));
  const fiyat = Math.round((b.fiyat * c) / (b.fiyat > 100000 ? 10000 : 100)) * (b.fiyat > 100000 ? 10000 : 100);
  ilanlar.push({ ...b, s: i % 3, fiyat, alanlar: a, saatOnce: Math.round(rast() * 2160) + 1 });
}

// Görseller paylaşılır: her satıcı × görsel türü için 2 çizim (yüzlerce dosya yüklememek için).
const gorselUrl = {};
async function gorseller(uid, tur) {
  const k = `${uid}/${tur}`;
  if (gorselUrl[k]) return gorselUrl[k];
  const u = [];
  for (let j = 0; j < 2; j++) {
    const jpg = await sharp(ev(j + tur.length, tur)).jpeg({ quality: 80 }).toBuffer();
    const yol = `${uid}/test-${tur}-${j}.jpg`;
    const up = await sb.storage.from('ilan-fotolari').upload(yol, jpg, { contentType: 'image/jpeg', upsert: true });
    if (up.error) throw up.error;
    u.push(sb.storage.from('ilan-fotolari').getPublicUrl(yol).data.publicUrl);
  }
  return (gorselUrl[k] = u);
}
const satirlar = [];
for (const x of ilanlar) {
  const uid = satici[x.s];
  satirlar.push({ sahip: uid, ana: x.ana, alt: x.alt, baslik: x.baslik, il: x.il, ilce: x.ilce, fiyat: x.fiyat, alanlar: x.alanlar, fotolar: await gorseller(uid, x.gorsel), ornek: true,
    olusturma: new Date(Date.now() - x.saatOnce * 3600000).toISOString(),
    aciklama: 'Bu bir TEST ilanıdır; uygulamanın ekranlarını denemek için eklenmiştir. Gerçek değildir, fiyat ve bilgiler temsilidir.' });
}
for (let i = 0; i < satirlar.length; i += 100) {
  const { error } = await sb.from('ilanlar').insert(satirlar.slice(i, i + 100));
  if (error) throw error;
}
console.log(`${satirlar.length} test ilanı eklendi`);
