// ---------- Haritada ara (MODÜL 13 · FAZ 5) — kendi OSM karo çizici (Leaflet YOK), rapor.js'ten türedi
// Kural: kullanıcının ANLIK konumu yalnız bellekte tutulur, cihaza/sunucuya YAZILMAZ. İlan koordinatı sunucu verisidir (alanlar.enlem/boylam).
const HARP = { z: 6, lat: 39.1, lon: 35.2, kaynak: '', hassasiyet: null, r: 0, ana: 'emlak', islem: '', sirala: 'fiyat' };

const dunyaPx = (lat, lon, z) => { const n = 2 ** z * 256; return { x: ((lon + 180) / 360) * n, y: ((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2) * n }; };
const pxDon = (x, y, z) => { const n = 2 ** z * 256, t = Math.PI * (1 - (2 * y) / n); return { lon: (x / n) * 360 - 180, lat: (Math.atan(Math.sinh(t)) * 180) / Math.PI }; };
const fiyatKisa = (n) => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.', ',') + 'M' : n >= 1e3 ? Math.round(n / 1e3) + ' B' : String(Math.round(n));

const haritaAday = () => {
  const ham = yayinda().filter((i) => i.ana === HARP.ana && +i.alanlar?.enlem > 0 && +i.alanlar?.boylam > 0 && (!HARP.islem || i.alanlar?.islem === HARP.islem));
  let l = ham.map((i) => ({ i, m: Math.round(mesafe(HARP.lat, HARP.lon, +i.alanlar.enlem, +i.alanlar.boylam)) }));
  if (HARP.r) l = l.filter((x) => x.m <= HARP.r);
  l.sort((a, b) => HARP.sirala === 'mesafe' ? a.m - b.m : HARP.sirala === 'ucuz' ? a.i.fiyat - b.i.fiyat : b.i.olusturma - a.i.olusturma);
  return { liste: l.slice(0, 120), tum: l, toplam: ham.length, kok: yayinda().filter((i) => i.ana === HARP.ana).length };
};

function harpBilgi() {
  const ad = { sen: 'Senin konumun' + (HARP.hassasiyet ? ' (±' + Math.round(HARP.hassasiyet) + ' m)' : ''), secim: HARP.ad || 'Türkiye', ilan: 'Seçilen ilan' }[HARP.kaynak] || 'Türkiye';
  return `Merkez: <b>${kac(ad)}</b>`;
}

function harpCiz() {
  const kap = document.getElementById('harp'); if (!kap) return;
  const W = kap.clientWidth || 360, H = kap.clientHeight || 420, z = HARP.z, n = 2 ** z;
  const p = dunyaPx(HARP.lat, HARP.lon, z), Wpx = n * 256;
  const x0 = ((p.x - W / 2) % Wpx + Wpx) % Wpx, y0 = Math.max(0, Math.min(Wpx - H, p.y - H / 2));
  const tx0 = Math.floor(x0 / 256), ty0 = Math.floor(y0 / 256), tx1 = Math.floor((x0 + W) / 256), ty1 = Math.floor((y0 + H) / 256);
  let karolar = '';
  for (let tx = tx0; tx <= tx1; tx++) { const wx = tx % n; for (let ty = ty0; ty <= ty1; ty++) karolar += `<img src="https://tile.openstreetmap.org/${z}/${wx}/${ty}.png" crossorigin="anonymous" alt="" loading="lazy" style="position:absolute;left:${tx * 256 - x0}px;top:${ty * 256 - y0}px;width:256px;height:256px">`; }
  const mPx = (156543.03392 * Math.cos((HARP.lat * Math.PI) / 180)) / n;
  const { liste, tum, toplam, kok } = haritaAday();
  // 58px ızgarada kümele: tek→fiyat etiketi, çok→sayı balonu
  const kufeler = new Map();
  for (const { i, m } of tum) { // iğneler tüm ilanlardan; alttaki liste ilk 120 ile sınırlı
    const q = dunyaPx(+i.alanlar.enlem, +i.alanlar.boylam, z), sx = q.x - p.x + W / 2, sy = q.y - p.y + H / 2;
    if (sx < -30 || sy < -30 || sx > W + 30 || sy > H + 30) continue;
    const k = Math.floor(sx / 58) + ':' + Math.floor(sy / 44);
    (kufeler.get(k) || kufeler.set(k, []).get(k)).push({ i, m, sx, sy });
  }
  let iğneler = '';
  for (const hucre of kufeler.values()) {
    const sx = hucre.reduce((t, x) => t + x.sx, 0) / hucre.length, sy = hucre.reduce((t, x) => t + x.sy, 0) / hucre.length;
    if (hucre.length > 2) iğneler += `<button class="harp-kume" data-hk="${hucre.map((x) => x.i.id).join(' ')}" style="left:${sx}px;top:${sy}px">${hucre.length}</button>`;
    else for (const x of hucre) iğneler += `<button class="harp-pin${x.i.alanlar?.islem === 'Kiralık' ? ' harp-k' : ''}" data-hp="${x.i.id}" style="left:${x.sx}px;top:${x.sy}px">${fiyatKisa(x.i.fiyat)} ₺</button>`;
  }
  const halka = HARP.r ? `<svg width="${W}" height="${H}" style="position:absolute;inset:0;pointer-events:none"><circle cx="${W / 2}" cy="${H / 2}" r="${HARP.r / mPx}" fill="var(--vurgu-ikon,#C8553D)" fill-opacity=".06" stroke="var(--vurgu-ikon,#C8553D)" stroke-width="2.5" stroke-dasharray="7 5"/></svg>` : '';
  const benNokta = HARP.kaynak === 'sen' ? `<svg width="${W}" height="${H}" style="position:absolute;inset:0;pointer-events:none"><circle cx="${W / 2}" cy="${H / 2}" r="${Math.min(60, (HARP.hassasiyet || 30) / mPx)}" fill="#2563EB" fill-opacity=".15"/><circle cx="${W / 2}" cy="${H / 2}" r="7" fill="#2563EB" stroke="#fff" stroke-width="3"/></svg>` : '';
  kap.innerHTML = `<div class="harp-kaydir" style="position:absolute;inset:0;will-change:transform">${karolar}</div>${halka}${benNokta}<div class="harp-kaydir" style="position:absolute;inset:0">${iğneler}</div>
    <div style="position:absolute;right:8px;top:8px;display:flex;flex-direction:column;gap:6px"><button class="btn sade kucuk" id="hz+" style="width:44px;height:44px;padding:0;font-weight:900">+</button><button class="btn sade kucuk" id="hz-" style="width:44px;height:44px;padding:0;font-weight:900">−</button></div>
    <div class="r-harita-not" style="font-size:10px">© OpenStreetMap</div>`;
  kap.querySelectorAll('[data-hp]').forEach((b) => (b.onclick = () => harpKart(b.dataset.hp)));
  kap.querySelectorAll('[data-hk]').forEach((b) => (b.onclick = () => {
    const l = b.dataset.hk.split(' ').map(ilan).filter(Boolean).map((i) => ({ l: +i.alanlar.enlem, o: +i.alanlar.boylam }));
    HARP.lat = l.reduce((t, x) => t + x.l, 0) / l.length; HARP.lon = l.reduce((t, x) => t + x.o, 0) / l.length; HARP.z = Math.min(18, HARP.z + 2); harpCiz(); harpListe();
  }));
  document.getElementById('hz+').onclick = () => { HARP.z = Math.min(18, HARP.z + 1); harpCiz(); };
  document.getElementById('hz-').onclick = () => { HARP.z = Math.max(4, HARP.z - 1); harpCiz(); };
  const bil = document.getElementById('harpBilgi'); if (bil) bil.innerHTML = `${harpBilgi()} · <b>${toplam}</b> ilan${toplam > liste.length ? ` <span style="opacity:.75">(ilk ${liste.length} listelendi)</span>` : ''}${HARP.r ? ' · yarıçap ' + (HARP.r >= 1000 ? HARP.r / 1000 + ' km' : HARP.r + ' m') : ''} · ${toplam === kok ? 'koordinatlı tüm ilanlar' : toplam + '/' + kok + ' ilanın koordinatı var'}`;
  harpListe(liste);
}

function harpListe(hazir) {
  const yer = document.getElementById('harpListe'); if (!yer) return;
  const { liste } = hazir ? { liste: hazir } : haritaAday();
  yer.innerHTML = liste.length ? liste.map(({ i, m }) => `<div style="display:flex;flex-direction:column;gap:6px">${ilanSatir(i, `<div class="perf"><span>${ic('konum', 12)} ${m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : m + ' m'}</span><span>${tl(i.fiyat)}</span></div>`)}<div class="izgara3"><a class="btn sade kucuk" href="#/ilan/${i.id}">İncele</a><button class="btn sade kucuk" data-hgit="${i.id}">Buraya git</button></div></div>`).join('')
    : `<div class="k soluk" style="padding:10px 2px">Bu merkez ve filtrede konumu çözülmüş ilan yok. Yarıçapı kaldırın ya da haritayı kaydırın.</div>`;
  yer.querySelectorAll('[data-hgit]').forEach((b) => (b.onclick = () => { const i = ilan(b.dataset.hgit); HARP.lat = +i.alanlar.enlem; HARP.lon = +i.alanlar.boylam; HARP.z = Math.max(HARP.z, 15); harpCiz(); scrollTo({ top: 0, behavior: 'smooth' }); }));
}

function harpKart(id) { const i = ilan(id); if (!i) return; sheetAc(`<h2 style="font-size:16px;font-weight:800">${kac(i.baslik)}</h2><div style="margin:8px 0">${ilanKart(i)}</div><a class="btn tam" href="#/ilan/${i.id}">İlan detayı</a>`); }

async function haritaKonum() {
  const y = document.getElementById('hkonum'); if (y) { y.disabled = true; y.textContent = 'Konum alınıyor…'; }
  try {
    let pos = null;
    const G = window.Capacitor?.Plugins?.Geolocation;
    if (G) { const p = await G.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 }); pos = { lat: p.coords.latitude, lon: p.coords.longitude, h: p.coords.accuracy }; }
    else pos = await new Promise((ok, hayir) => navigator.geolocation ? navigator.geolocation.getCurrentPosition((p) => ok({ lat: p.coords.latitude, lon: p.coords.longitude, h: p.coords.accuracy }), hayir, { timeout: 8000, maximumAge: 120000 }) : hayir(new Error('yok')));
    HARP.lat = pos.lat; HARP.lon = pos.lon; HARP.hassasiyet = pos.h || null; HARP.kaynak = 'sen'; if (HARP.z < 13) HARP.z = 15;
    harpCiz();
  } catch (_) { toast('Konum alınamadı — il/ilçe seçerek de arayabilirsin'); }
  finally { const y2 = document.getElementById('hkonum'); if (y2) { y2.disabled = false; y2.innerHTML = ic('konum', 15) + ' Konumum'; } }
}

async function haritaIlceGit(il, ilce) {
  try {
    const r = await (await fetch('https://photon.komoot.io/api/?limit=4&lang=default&osm_tag=place&q=' + encodeURIComponent(ilce ? ilce + ', ' + il : il), { signal: AbortSignal.timeout(8000) })).json();
    const kuc = (x) => String(x || '').toLocaleLowerCase('tr-TR').trim();
    const ft = (r.features || []).find((x) => kuc(x.properties?.state || x.properties?.city || x.properties?.county) === kuc(il) || kuc(x.properties?.name) === kuc(ilce || il));
    if (!ft) return toast('Haritada bulunamadı');
    HARP.lat = ft.geometry.coordinates[1]; HARP.lon = ft.geometry.coordinates[0]; HARP.kaynak = 'secim'; HARP.ad = [ilce, il].filter(Boolean).join(' '); HARP.z = ilce ? 13 : 8;
    harpCiz();
  } catch (_) { toast('Photon servisine ulaşılamadı'); }
}

const HARP_SECIM = [
  ['r', 'Mesafe', [[0, 'Her yer'], [250, '250 m'], [500, '500 m'], [1000, '1 km'], [2000, '2 km'], [5000, '5 km']]],
  ['i', 'İşlem', [['', 'Hepsi'], ['Satılık', 'Satılık'], ['Kiralık', 'Kiralık']]],
  ['s', 'Sıralama', [['fiyat', 'En yeni'], ['mesafe', 'Yakına göre'], ['ucuz', 'En ucuz']]]
];
function harpSecimAc(k) {
  const [, et, l] = HARP_SECIM.find(([x]) => x === k), v = k === 'r' ? HARP.r : k === 'i' ? HARP.islem : HARP.sirala;
  sheetAc(`<h2 style="font-size:18px;font-weight:800">${et}</h2><div class="liste">${l.map(([x, ad]) => `<button class="oge" data-hc="${k}${x}">${ad}<span class="ok">${String(x) === String(v) ? ic('tik', 20, 'var(--ios-mavi,#007AFF)') : ''}</span></button>`).join('')}</div>`, (s) => {
    s.querySelectorAll('[data-hc]').forEach((b) => (b.onclick = () => { const z = b.dataset.hc; if (z[0] === 'r') HARP.r = +z.slice(1); else if (z[0] === 'i') HARP.islem = z.slice(1); else HARP.sirala = z.slice(1); sheetKapat(); ciz(); }));
  });
}
EKRAN.harita = () => {
  const s = sorgu();
  if (s.ana && ANA[s.ana]) HARP.ana = s.ana;
  const mz = String(s.merkez || '').split(',');
  if (+mz[0] && +mz[1]) { HARP.lat = +mz[0]; HARP.lon = +mz[1]; HARP.kaynak = 'ilan'; HARP.z = 14; }
  else if (HARP.kaynak !== 'sen') { const b = ben(); if (b?.il) { HARP.kaynak = 'secim'; HARP.ad = [b.ilce, b.il].filter(Boolean).join(' '); HARP.z = b.ilce ? 13 : 8; haritaIlceGit(b.il, b.ilce); } }
  const chip = (ad, v, aktif, js) => `<button class="cip ${aktif ? 'secili' : ''}" data-hc="${js}">${ad}</button>`;
  app.innerHTML = ustBar('Harita görünümü') + `<div class="ic">
    <div class="segment" role="tablist">${Object.entries(ANA).map(([k, a]) => `<button role="tab" aria-selected="${k === HARP.ana}" data-hana="${k}">${ic(a.ikon, 16)}${a.ad}</button>`).join('')}</div>
    <div class="filtre-cubuk">
      ${HARP_SECIM.filter(([k]) => k !== 'i' || HARP.ana === 'emlak').map(([k, et, l]) => { const v = k === 'r' ? HARP.r : k === 'i' ? HARP.islem : HARP.sirala, s = l.find(([x]) => String(x) === String(v)) || l[0]; return `<button class="filtre-sec" data-hsec="${k}"><small>${et}</small><b>${s[1]}</b>${ic('asagi', 14)}</button>`; }).join('')}
    </div>
    <div class="satir" style="gap:8px"><button class="btn sade kucuk" id="hkonum" style="flex:1">${ic('konum', 15)} Konumum</button><button class="btn sade kucuk" id="hilce" style="flex:1">${ic('pusula', 15)} İl / ilçe seç</button></div>
    <div id="harp" style="position:relative;height:52vh;min-height:340px;overflow:hidden;border-radius:16px;background:#dfe7ee;touch-action:none;user-select:none"></div>
    <div class="k soluk" style="font-size:12px;margin:6px 2px 10px" id="harpBilgi"></div>
    <div style="display:flex;flex-direction:column;gap:10px" id="harpListe"></div>
    <div class="k soluk" style="font-size:12px;margin:10px 2px">Konumlar OpenStreetMap/TKGM'den çözülür; yakın konumlu ilanlar yaklaşıncaya kadar tek etikette toplanır. Kaydırmak için haritayı sürükle.</div></div>`;
  app.querySelectorAll('[data-hana]').forEach((x) => (x.onclick = () => { HARP.ana = x.dataset.hana; HARP.islem = ''; ciz(); }));
  app.querySelectorAll('[data-hsec]').forEach((x) => (x.onclick = () => harpSecimAc(x.dataset.hsec)));
  document.getElementById('hkonum').onclick = haritaKonum;
  document.getElementById('hilce').onclick = () => sheetAc(`<h2 style="font-size:17px;font-weight:800">İl / ilçe</h2>
    <label class="alan">İl<select id="hIl" data-bos="Seç">${ILLER.map((x) => `<option ${x === ben()?.il ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    <label class="alan">İlçe<select id="hIlce" data-bos="Seç"></select></label>
    <button class="btn tam" id="hGit">Haritada göster</button>`, (s) => {
    konumSecBagla($('#hIl', s), $('#hIlce', s), null);
    $('#hGit', s).onclick = async () => { const il = $('#hIl', s).value, ilce = $('#hIlce', s).value; if (!il) return toast('Önce il seç'); sheetKapat(); await haritaIlceGit(il, ilce); };
  });
  const kap = document.getElementById('harp');
  let tut = null;
  kap.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; tut = { x: e.clientX, y: e.clientY }; kap.setPointerCapture(e.pointerId); });
  kap.addEventListener('pointermove', (e) => { if (!tut) return; const dx = e.clientX - tut.x, dy = e.clientY - tut.y; kap.querySelectorAll('.harp-kaydir').forEach((el) => (el.style.transform = `translate(${dx}px,${dy}px)`)); });
  kap.addEventListener('pointerup', (e) => {
    if (!tut) return; const dx = e.clientX - tut.x, dy = e.clientY - tut.y; tut = null;
    if (Math.abs(dx) + Math.abs(dy) < 6) return harpCiz();
    const p = dunyaPx(HARP.lat, HARP.lon, HARP.z), q = pxDon(p.x - dx, p.y - dy, HARP.z);
    HARP.lat = Math.max(-85, Math.min(85, q.lat)); HARP.lon = ((q.lon + 540) % 360) - 180; harpCiz();
  });
  kap.addEventListener('pointercancel', () => { tut = null; harpCiz(); });
  kap.addEventListener('wheel', (e) => { e.preventDefault(); HARP.z = Math.max(4, Math.min(18, HARP.z + (e.deltaY > 0 ? -1 : 1))); harpCiz(); }, { passive: false });
  harpCiz();
  navCiz('ara');
};
