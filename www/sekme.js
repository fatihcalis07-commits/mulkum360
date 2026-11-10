// İlan sayfası sekmeleri: İlan Bilgileri · Açıklama · Konumu · Çevre
// Konum: Photon (OSM) ile sokak → mahalle → ilçe sırasıyla bulunur, il/ilçe tutarlılığı kontrol edilir.
// Çevre: Overpass ile 1 km içindeki okul, market, eczane, sağlık, ulaşım, park vb.; 30 gün önbellek.

function sekmeBagla(i) {
  const bar = document.getElementById('sekmeler'); if (!bar) return;
  const ac = (k) => {
    bar.querySelectorAll('[data-sekme]').forEach((b) => { const s = b.dataset.sekme === k; b.classList.toggle('secili', s); b.setAttribute('aria-selected', s); });
    app.querySelectorAll('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== k));
    if (k === 'konum') konumPanel(i);
    if (k === 'cevre') cevrePanel(i);
    // Sekme çubuğu yapışkan; içerik başına kaydır
    const y = bar.getBoundingClientRect().top + scrollY - 8; if (scrollY > y) scrollTo({ top: y, behavior: 'smooth' });
  };
  bar.querySelectorAll('[data-sekme]').forEach((b) => (b.onclick = () => ac(b.dataset.sekme)));
  const oz = document.getElementById('ozetAc'); if (oz) oz.onclick = () => ac('aciklama');
}

// ---------- Ada / parsel (TKGM, sunucu fonksiyonu "parsel") ----------
const PARSEL_ONB = {};
function parselGetir(i) {
  const f = i.alanlar || {}; if (!(f.ada && f.parsel && f.mahalle && i.ilce)) return Promise.resolve(null);
  const a = [i.il, i.ilce, f.mahalle, f.ada, f.parsel].join('|');
  return PARSEL_ONB[a] = PARSEL_ONB[a] || (async () => {
    try { const c = JSON.parse(localStorage.getItem('parsel:' + a) || 'null'); if (c) return c; } catch (_) {}
    try {
      const { data, error } = await sb.functions.invoke('parsel', { body: { il: i.il, ilce: i.ilce, mahalle: f.mahalle, ada: f.ada, parsel: f.parsel } });
      if (error) { let m = 'Parsel bulunamadı.'; try { m = (await error.context.json()).hata || m; } catch (_) {} return { hata: m }; }
      try { localStorage.setItem('parsel:' + a, JSON.stringify(data)); } catch (_) {}
      return data;
    } catch (_) { return { hata: 'TKGM servisine ulaşılamadı.' }; }
  })();
}
async function parselKartiYukle(i) {
  const kap = document.getElementById('parselK'); if (!kap) return;
  const p = await parselGetir(i); if (!document.body.contains(kap)) return;
  const f = i.alanlar || {};
  if (!p || p.hata) { kap.innerHTML = `<h3>Ada / Parsel (TKGM)</h3><div class="bilgi-tablo"><div><span>Ada / parsel</span><b>${kac(f.ada)} / ${kac(f.parsel)}</b></div></div><div class="k soluk" style="margin-top:6px">${kac(p ? p.hata : 'Bilgi alınamadı.')}</div>`; return; }
  const satir = [['Mahalle', p.mahalle], ['Ada / parsel', `${p.ada} / ${p.parsel}`], ['Yüzölçümü', p.alan ? p.alan + ' m²' : ''], ['Nitelik', p.nitelik], ['Mevkii', p.mevkii], ['Zemin durumu', p.zemin], ['Pafta', p.pafta]].filter(([, v]) => v);
  kap.innerHTML = `<h3>Ada / Parsel (TKGM)</h3><div class="bilgi-tablo">${satir.map(([a, v]) => `<div><span>${a}</span><b>${kac(String(v))}</b></div>`).join('')}</div>
    <div class="k soluk" style="font-size:12px;margin-top:6px">Kaynak: Tapu ve Kadastro Genel Müdürlüğü parsel sorgu. Malik bilgisi gösterilmez; tapu kaydı için e-Devlet ya da tapu müdürlüğüne başvurulur.</div>
    <a class="btn sade tam" style="margin-top:8px" href="https://parselsorgu.tkgm.gov.tr/" target="_blank" rel="noopener">${ic('konum', 16)}TKGM Parsel Sorgu'da aç</a>`;
}

// ---------- Konum ----------
async function ilanKonumu(i) {
  const f = i.alanlar || {}, anahtar = 'konum3:' + i.id + ':' + [i.il, i.ilce, f.mahalle, f.sokak, f.ada, f.parsel].join('|');
  try { const c = JSON.parse(localStorage.getItem(anahtar) || 'null'); if (c) return c; } catch (_) {}
  // Ada/parsel varsa parselin kendisi: tam konum
  const p = await parselGetir(i);
  if (p && !p.hata && p.lat) { const s = { lat: p.lat, lon: p.lon, duzey: 'parsel' }; try { localStorage.setItem(anahtar, JSON.stringify(s)); } catch (_) {} return s; }
  const k = (x) => kucuk(String(x || '')).replace(/\s+mahallesi$|\s+mah\.?$/, '');
  // Sonuç il ve ilçeyle uyuşmalı (aynı adlı başka yerlere düşmesin)
  const uyumlu = (p) => p.countrycode === 'TR' && (!i.il || [p.state, p.city, p.county].some((x) => k(x) === k(i.il))) && (!i.ilce || [p.county, p.city, p.district].some((x) => k(x) === k(i.ilce)));
  const ara = async (q, etiket) => {
    try {
      const r = await (await fetch('https://photon.komoot.io/api/?limit=6&lang=default' + (etiket ? '&' + etiket : '') + '&q=' + encodeURIComponent(q), { signal: AbortSignal.timeout(8000) })).json();
      const ft = (r.features || []).find((x) => uyumlu(x.properties)); return ft ? { lat: ft.geometry.coordinates[1], lon: ft.geometry.coordinates[0] } : null;
    } catch (_) { return null; }
  };
  let s = null;
  if (f.sokak && f.mahalle) { s = await ara(`${f.sokak}, ${f.mahalle}, ${i.ilce}, ${i.il}`, 'osm_tag=highway'); if (s) s.duzey = 'sokak'; }
  if (!s && f.mahalle) { s = await ara(`${f.mahalle}, ${i.ilce}, ${i.il}`, 'osm_tag=place'); if (s) s.duzey = 'mahalle'; }
  if (!s && f.mahalle) { s = await ara(`${f.mahalle} Mahallesi ${i.ilce} ${i.il}`); if (s) s.duzey = 'mahalle'; }
  if (!s && i.ilce) { s = await ara(`${i.ilce}, ${i.il}`, 'osm_tag=place'); if (s) s.duzey = 'ilçe'; }
  if (s) try { localStorage.setItem(anahtar, JSON.stringify(s)); } catch (_) {}
  return s;
}

async function konumPanel(i) {
  const kap = document.getElementById('konumK'); if (!kap || kap.dataset.yuklendi) return; kap.dataset.yuklendi = '1';
  const f = i.alanlar || {}, yol = kap.querySelector('.konum-yol')?.outerHTML || '';
  const k = await ilanKonumu(i);
  if (!document.body.contains(kap)) return;
  const adres = [f.sokak, f.mahalle && f.mahalle + ' Mahallesi', i.ilce, i.il, 'Türkiye'].filter(Boolean).join(', ');
  if (!k) {
    kap.innerHTML = `<h3>Konumu</h3>${yol}<div class="k soluk" style="margin:6px 0 10px">Harita için konum bulunamadı.</div>
      <a class="btn sade tam" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adres)}" target="_blank" rel="noopener">Google Haritalar'da ara</a>`;
    return;
  }
  const d = k.duzey === 'parsel' ? 0.0025 : k.duzey === 'sokak' ? 0.004 : k.duzey === 'mahalle' ? 0.008 : 0.03;
  const bbox = [k.lon - d * 1.4, k.lat - d, k.lon + d * 1.4, k.lat + d].map((x) => x.toFixed(5)).join('%2C');
  const aciklama = { parsel: `Tapu parseli (TKGM ${kac(f.ada)} ada ${kac(f.parsel)} parsel) gösteriliyor; konum kesindir.`, sokak: 'Sokak düzeyinde yaklaşık konum. Kapı numarası gösterilmez.', mahalle: 'Mahalle merkezi gösteriliyor; tam adres satıcıdan öğrenilir.', ilçe: 'Mahalle haritada bulunamadı; ilçe merkezi gösteriliyor.' }[k.duzey];
  kap.innerHTML = `<h3>Konumu</h3>${yol}
    <div class="harita-kutu"><iframe title="İlanın konumu" loading="lazy" referrerpolicy="no-referrer" src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${k.lat.toFixed(5)}%2C${k.lon.toFixed(5)}"></iframe></div>
    <div class="k soluk" style="font-size:12px;margin:6px 0 10px">${aciklama} Harita © OpenStreetMap katkıda bulunanlar.</div>
    <div class="izgara2"><a class="btn sade" href="https://www.google.com/maps/search/?api=1&query=${k.lat},${k.lon}" target="_blank" rel="noopener">${ic('konum', 16)}Haritada aç</a>
    <a class="btn sade" href="https://www.google.com/maps/dir/?api=1&destination=${k.lat},${k.lon}" target="_blank" rel="noopener">${ic('pusula', 16)}Yol tarifi</a>
    <a class="btn sade" href="#/harita?merkez=${k.lat.toFixed(5)},${k.lon.toFixed(5)}&ana=emlak">${ic('konum', 16)}Çevresinde ara</a></div>`;
}

// ---------- Çevre ----------
// Photon (komoot, OpenStreetMap verisi, ücretsiz) "yakındaki yer" araması: her kategori için en yakın 3 yer.
// [ad, simge, osm etiketleri, yarıçap km, isim süzgeci]
const CEVRE_TUR = [
  ['Okul', 'belge', ['amenity:school', 'amenity:kindergarten'], 3],
  ['Hastane', 'kalkan', ['amenity:hospital'], 10],
  ['Sağlık ocağı / klinik', 'kalkan', ['amenity:clinic', 'amenity:doctors'], 3],
  ['Eczane', 'kalkan', ['amenity:pharmacy'], 3],
  ['Metro / tramvay / raylı sistem', 'araba', ['railway:subway_entrance', 'railway:tram_stop', 'railway:station', 'railway:halt'], 5],
  ['Otobüs / dolmuş durağı', 'araba', ['highway:bus_stop'], 2],
  ['AVM', 'ev', ['shop:mall'], 10],
  ['Market', 'ev', ['shop:supermarket', 'shop:convenience'], 2],
  ['Polis', 'kalkan', ['amenity:police'], 10],
  ['Restoran / kafe', 'yildiz', ['amenity:restaurant', 'amenity:cafe'], 2],
  ['Otel', 'otel', ['tourism:hotel'], 10],
  ['Benzin istasyonu', 'araba', ['amenity:fuel'], 10],
  ['Park', 'gunes', ['leisure:park', 'leisure:playground'], 3],
  ['Cami', 'bina', ['amenity:place_of_worship'], 2, /cami|mescid|mescit|mosque/i],
  ['Otogar', 'araba', ['amenity:bus_station'], 40, /otogar|terminal|termin/i],
  ['Havalimanı', 'pusula', ['aeroway:aerodrome'], 150, /havaliman|havaalan|airport/i]
];

// Photon "makul kullanım" sınırı için ilan başına 4 istek: yakın kategoriler tek istekte, sonuç osm_key:osm_value ile ayrılır
const CEVRE_GRUP = [[2, 50], [3, 40], [10, 30], [150, 10]]; // [yarıçap km, en çok sonuç]
const grupNo = (km) => (km <= 2 ? 0 : km <= 5 ? 1 : km <= 10 ? 2 : 3);
async function photonGrup(k, etiketler, km, limit) {
  const u = `https://photon.komoot.io/reverse?lat=${k.lat}&lon=${k.lon}&limit=${limit}&radius=${km}&` + etiketler.map((e) => 'osm_tag=' + encodeURIComponent(e)).join('&');
  for (let d = 0; d < 2; d++) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
      if (r.ok) return ((await r.json()).features || []).map((x) => ({ et: x.properties.osm_key + ':' + x.properties.osm_value, ad: x.properties.name || '', m: Math.round(mesafe(k.lat, k.lon, x.geometry.coordinates[1], x.geometry.coordinates[0])) }));
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

async function cevreGetir(k) {
  const anahtar = `p:${k.lat.toFixed(3)},${k.lon.toFixed(3)}`;
  try { const { data } = await sb.from('cevre_onbellek').select('veri, olusturma').eq('anahtar', anahtar).maybeSingle(); if (data && Date.now() - new Date(data.olusturma) < 30 * 864e5) return data.veri; } catch (_) {}
  const sonuclar = [];
  for (let g = 0; g < CEVRE_GRUP.length; g++) {
    const et = [...new Set(CEVRE_TUR.filter((c) => grupNo(c[3]) === g).flatMap((c) => c[2]))];
    sonuclar.push(et.length ? await photonGrup(k, et, CEVRE_GRUP[g][0], CEVRE_GRUP[g][1]) : []);
  }
  if (sonuclar.every((x) => x === null)) return null;
  const hepsi = sonuclar.flat().filter(Boolean);
  const veri = CEVRE_TUR.map(([ad, , et, km, suz]) => ({ ad, l: hepsi.filter((x) => et.includes(x.et) && x.ad && x.m <= km * 1000 && (!suz || suz.test(x.ad))).sort((a, b) => a.m - b.m).filter((x, n, l) => l.findIndex((y) => y.ad === x.ad) === n).slice(0, 3) }));
  if (sonuclar.every((x) => x !== null)) sb.from('cevre_onbellek').upsert({ anahtar, veri, olusturma: new Date().toISOString() }).then(() => {}, () => {});
  return veri;
}
async function cevrePanel(i) {
  const kap = document.getElementById('cevreK'); if (!kap || kap.dataset.yuklendi) return; kap.dataset.yuklendi = '1';
  kap.innerHTML = '<h3>Çevre</h3><div class="k soluk">Yakındaki yerler aranıyor…</div>';
  const k = await ilanKonumu(i);
  let veri = null; try { veri = k ? await cevreGetir(k) : null; } catch (_) {}
  if (!document.body.contains(kap)) return;
  if (!veri) { kap.innerHTML = '<h3>Çevre</h3><div class="k soluk">Çevre bilgisi şu an alınamadı.</div><button class="btn sade tam" id="cevreTekrar" style="margin-top:8px">Tekrar dene</button>'; delete kap.dataset.yuklendi; $('#cevreTekrar', kap).onclick = () => cevrePanel(i); return; }
  const mt = (m) => (m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : m + ' m');
  // 1,5 km'ye kadar yürüme, ötesi araçla (şehir içi ~30 km/sa, uzak ~60 km/sa)
  const sure = (m) => (m <= 1500 ? Math.max(1, Math.round(m / 80)) + ' dk yürüme' : Math.max(2, Math.round(m / (m > 15000 ? 1000 : 500))) + ' dk araçla');
  const ikon = Object.fromEntries(CEVRE_TUR.map(([a, ik]) => [a, ik]));
  // Önbellekteki eski sonuçlara da güncel isim süzgeci uygulanır
  const suz = Object.fromEntries(CEVRE_TUR.map((c) => [c[0], c[4]]));
  veri = veri.map((v) => ({ ...v, l: (v.l || []).filter((y) => !suz[v.ad] || suz[v.ad].test(y.ad)) }));
  const var_ = veri.filter((v) => v.l.length), yok = veri.filter((v) => !v.l.length);
  kap.innerHTML = `<h3>Çevre</h3><div class="k soluk" style="margin:-4px 0 8px">${{ parsel: 'Tapu parseline', sokak: 'Sokağa', mahalle: 'Mahalle merkezine', ilçe: 'İlçe merkezine' }[k.duzey] || ''} göre en yakın yerler</div>
    <div class="cevre-liste">${var_.map((v) => `<div style="align-items:flex-start">${ic(ikon[v.ad], 20, 'var(--vurgu-ikon)')}<div class="ara"><b>${v.ad}</b>${v.l.map((y) => `<span>${kac(y.ad)} · ${mt(y.m)}</span>`).join('')}</div><div class="cevre-m"><b>${mt(v.l[0].m)}</b><span>${sure(v.l[0].m)}</span></div></div>`).join('')}</div>
    ${yok.length ? `<div class="k soluk" style="font-size:12px;margin-top:8px">Yakında bulunamadı: ${yok.map((v) => v.ad.toLocaleLowerCase('tr')).join(', ')}.</div>` : ''}
    <div class="k soluk" style="font-size:12px;margin-top:6px">Kaynak: OpenStreetMap (Photon). Mesafeler kuş uçuşudur; süreler yaklaşıktır.</div>`;
}
