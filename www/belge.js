// Tapu ya da araç ruhsatı fotoğrafından ilan: MülkümAI (Gemini, görsel okuma) teknik bilgileri çıkarır, form dolar.
// Fotoğraf sunucuda saklanmaz; kişisel veriler (malik adı, T.C. no, adres) istemde yasaklıdır ve forma alınmaz.
const trK = (s) => String(s || '').toLocaleLowerCase('tr').replace(/\s+(mahallesi|mah\.?|köyü)$/, '').trim();

// Fotoğrafı en uzun kenarı 1600 px JPEG'e küçültür (yazı okunur kalır, istek hafif olur)
function belgeKucult(dosya) {
  return new Promise((ok, red) => {
    const img = new Image(), u = URL.createObjectURL(dosya);
    img.onload = () => {
      const o = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * o); c.height = Math.round(img.height * o);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      ok(c.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.onerror = () => red(new Error('Fotoğraf açılamadı.')); img.src = u;
  });
}

// Tapudaki niteliği uygulamanın "Tip" seçeneğine eşle
function nitelikTip(n, alt) {
  const k = trK(n);
  if (/mesken|daire|konut/.test(k)) return 'Daire';
  if (/villa/.test(k)) return 'Villa';
  if (/kargir ev|ahşap ev|müstakil|ev$/.test(k)) return 'Müstakil Ev';
  if (/dükkan|dukkan|mağaza/.test(k)) return 'Dükkan';
  if (/ofis|büro|buro|işyeri|isyeri/.test(k)) return alt === 'isyeri' ? 'Ofis' : '';
  if (/depo|ambar/.test(k)) return 'Depo';
  if (/fabrika|imalathane/.test(k)) return 'Fabrika';
  if (/arsa/.test(k)) return 'Arsa';
  if (/tarla/.test(k)) return 'Tarla';
  if (/bağ|bahçe/.test(k)) return 'Bağ & Bahçe';
  if (/otel/.test(k)) return 'Otel';
  return '';
}

async function belgeOku(tur, dosya, durum) {
  durum('Fotoğraf hazırlanıyor…');
  const gorsel = await belgeKucult(dosya);
  durum('MülkümAI belgeyi okuyor (10–20 sn)…');
  const ham = await aiSor('belge_oku', { tur, gorsel });
  const v = JSON.parse(ham.slice(ham.indexOf('{'), ham.lastIndexOf('}') + 1));
  const al = {};
  if (tur === 'ruhsat') {
    const alt = ALT[v.alt] ? v.alt : 'otomobil';
    const marka = secenekBul(MARKALAR, v.marka || '');
    if (marka) al.marka = marka; else if (v.marka) al.marka = String(v.marka);
    if (v.model) al.model = String(v.model).slice(0, 60);
    if (+v.yil > 1950) al.yil = String(+v.yil);
    const yak = secenekBul(ALANLAR.vasita.find(([k]) => k === 'yakit')[3], v.yakit || ''); if (yak) al.yakit = yak;
    const kasa = secenekBul(ALANLAR.vasita.find(([k]) => k === 'kasa')[3], v.kasa || ''); if (kasa) al.kasa = kasa;
    if (v.renk) al.renk = String(v.renk).slice(0, 30);
    al.kimden = 'Sahibinden';
    return { alt, baslik: String(v.baslik || [al.marka, al.model, al.yil].filter(Boolean).join(' ')).slice(0, 80), il: '', ilce: '', alanlar: al };
  }
  // Tapu
  const alt = ALT[v.alt] ? v.alt : 'konut';
  const il = ILLER.find((x) => trK(x) === trK(v.il)) || '';
  let ilce = '', mahalle = '';
  if (il) {
    durum('Konum eşleştiriliyor…');
    const veri = await mahalleVeri(il);
    ilce = Object.keys(veri).find((x) => trK(x) === trK(v.ilce)) || '';
    if (ilce) mahalle = (veri[ilce] || []).find((x) => trK(x) === trK(v.mahalle)) || '';
  }
  if (mahalle) al.mahalle = mahalle; else if (v.mahalle) al.mahalle = String(v.mahalle).replace(/\s*(mahallesi|mah\.?)$/i, '');
  if (v.ada) al.ada = String(v.ada).replace(/\D/g, '');
  if (v.parsel) al.parsel = String(v.parsel).replace(/\D/g, '');
  const m2 = sayiCoz(v.m2brut); if (m2 > 0) al.m2brut = String(m2);
  if (v.kat) al.kat = String(v.kat).slice(0, 20);
  const tip = nitelikTip(v.nitelik, alt); if (tip) al.tip = tip;
  const tapu = secenekBul(ALANLAR.emlak.find(([k]) => k === 'tapu')[3], v.tapuTuru || ''); if (tapu) al.tapu = tapu;
  al.islem = 'Satılık';
  return { alt, baslik: String(v.baslik || '').slice(0, 80), il, ilce: ilce || String(v.ilce || ''), alanlar: al };
}

function belgeOkuBagla() {
  const b = document.getElementById('belgeOku'); if (!b) return;
  b.onclick = () => sheetAc(`<h2 style="font-size:19px;font-weight:800">Belgeden ilan oluştur</h2>
    <div class="k soluk" style="line-height:1.5">Tapu senedinin ya da araç ruhsatının fotoğrafını çek; MülkümAI konum, ada/parsel, alan veya marka, model, yıl gibi bilgileri doldursun. Fotoğraf saklanmaz; malik adı ve kimlik numarası okunmaz.</div>
    <div class="ciplar" id="blTur"><button class="cip secili" data-t="tapu">Tapu</button><button class="cip" data-t="ruhsat">Araç ruhsatı</button></div>
    <label class="btn tam">${ic('foto', 18, '#fff')}Fotoğraf çek ya da seç<input type="file" accept="image/*" capture="environment" hidden id="blDosya"></label>
    <div class="k soluk" id="blDurum" style="text-align:center"></div>`, (s) => {
    let tur = 'tapu';
    s.querySelectorAll('[data-t]').forEach((x) => (x.onclick = () => { tur = x.dataset.t; s.querySelectorAll('[data-t]').forEach((y) => y.classList.toggle('secili', y === x)); }));
    $('#blDosya', s).onchange = async (e) => {
      const d = e.target.files[0]; if (!d) return;
      const durum = (m) => ($('#blDurum', s).textContent = m);
      try {
        const v = await belgeOku(tur, d, durum);
        taslak = { adim: 1, fotolar: [], alt: v.alt, baslik: v.baslik, fiyat: 0, il: v.il, ilce: v.ilce, aciklama: '', alanlar: v.alanlar };
        const dolu = Object.keys(v.alanlar).length + (v.il ? 1 : 0) + (v.ilce ? 1 : 0);
        sheetKapat(); toast(`Belgeden ${dolu} bilgi dolduruldu; fiyat ve fotoğrafları ekle`); ciz();
      } catch (x) { durum(''); toast(x && x.message && !/JSON|Unexpected/.test(x.message) ? x.message : 'Belge okunamadı; daha net ve düz bir fotoğraf dene.'); e.target.value = ''; }
    };
  });
}
