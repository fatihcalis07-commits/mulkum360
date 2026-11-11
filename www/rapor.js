// Mülküm360 — MülkümAI Elektronik Değerleme Raporu (çok sayfalı A4)
// Yalnız gerçek verilerle: uygulamadaki ilanlar, kullanıcının girdiği bilgiler ve resmî bölge verisi (bolge_verileri).
'use strict';

const R_MAVI = '#0B1B33', R_ALTIN = '#FFC72C', R_ALTIN_K = '#8A6516', R_KREM = '#FFF4CC', R_CIZGI = '#E1E5EE', R_SOLUK = '#5B5F68';
const GUN = 86400000;

// Rapor anında bölge istatistikleri: ilçe / il / platform geneli (yalnız aynı tür ve işlem)
function bolgeTablosu(f) {
  const temel = (i) => i.ana === f.ana && i.alt === f.alt && (f.ana !== 'emlak' || i.alanlar?.islem === f.islem) && i.fiyat > 0;
  const kume = (filtre) => {
    const hepsi = S.ilanlar.filter((i) => temel(i) && filtre(i));
    const yayinda = hepsi.filter((i) => i.durum === 'yayinda');
    const m2li = yayinda.filter((i) => +i.alanlar?.m2net > 0);
    const birim = m2li.map((i) => i.fiyat / +i.alanlar.m2net);
    const satilan = hepsi.filter((i) => i.durum === 'satildi' && i.guncelleme > i.olusturma);
    const otuzGunOnce = Date.now() - 30 * GUN;
    return {
      stok: yayinda.length,
      stokOnceki: hepsi.filter((i) => i.olusturma <= otuzGunOnce && (i.durum === 'yayinda' || i.guncelleme > otuzGunOnce)).length,
      brutAlan: m2li.length ? m2li.reduce((t, i) => t + +(i.alanlar.m2brut || i.alanlar.m2net), 0) / m2li.length : null,
      birimMin: birim.length ? Math.min(...birim) : null, birimMax: birim.length ? Math.max(...birim) : null,
      birimOrt: birim.length ? birim.reduce((a, b) => a + b, 0) / birim.length : null,
      fiyatOrt: yayinda.length ? yayinda.reduce((t, i) => t + i.fiyat, 0) / yayinda.length : null,
      pazarlama: satilan.length ? satilan.reduce((t, i) => t + (i.guncelleme - i.olusturma), 0) / satilan.length / GUN : null,
      satilan: satilan.length
    };
  };
  const ilce = f.ilce ? kume((i) => kucuk(i.ilce) === kucuk(f.ilce) && i.il === f.il) : null;
  const il = f.il ? kume((i) => i.il === f.il) : null;
  const genel = kume(() => true);
  // amortisman: aynı bölgede satılık ortalama birim / kiralık ortalama birim
  const amort = (filtre) => {
    if (f.ana !== 'emlak') return null;
    const b = (islem) => { const l = S.ilanlar.filter((i) => i.ana === 'emlak' && i.alt === f.alt && i.durum === 'yayinda' && i.alanlar?.islem === islem && +i.alanlar?.m2net > 0 && filtre(i)).map((i) => i.fiyat / +i.alanlar.m2net); return l.length >= 3 ? medyan(l) : null; };
    const s = b('Satılık'), k = b('Kiralık');
    return s && k ? s / (k * 12) : null;
  };
  return {
    sutunlar: [f.ilce ? f.ilce : null, f.il || null, 'Mülküm360 geneli'].filter(Boolean),
    veri: [ilce, il, genel].filter((x, n) => (n === 0 ? !!f.ilce : n === 1 ? !!f.il : true)),
    amortisman: [f.ilce ? amort((i) => kucuk(i.ilce) === kucuk(f.ilce) && i.il === f.il) : undefined, f.il ? amort((i) => i.il === f.il) : undefined, amort(() => true)].filter((x) => x !== undefined)
  };
}

// ---- OpenStreetMap (ücretsiz, açık veri): adres -> koordinat, çevredeki önemli noktalar ----
const POI = [
  ['Eğitim', 'egitim', '["amenity"~"^(school|kindergarten|university|college)$"]'],
  ['Sağlık', 'saglik', '["amenity"~"^(hospital|clinic|doctors|pharmacy|dentist)$"]'],
  ['Ulaşım', 'ulasim', '["highway"="bus_stop"]', '["railway"~"^(station|tram_stop|subway_entrance|halt)$"]'],
  ['Alışveriş', 'alisveris', '["shop"~"^(supermarket|mall|convenience|bakery)$"]', '["amenity"="marketplace"]'],
  ['Park ve spor', 'park', '["leisure"~"^(park|playground|sports_centre|pitch)$"]']
];
const mesafe = (a, b, c, d) => { const R = 6371000, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r; const s = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); };
// Zaman sınırlı istek: yavaş ya da erişilemeyen servis raporu bekletmesin
function sureliFetch(url, se, ms = 9000) { const a = new AbortController(); const t = setTimeout(() => a.abort(), ms); return fetch(url, { ...(se || {}), signal: a.signal }).finally(() => clearTimeout(t)); }
// Overpass sunucuları yoğunken 20–30 sn sürebiliyor: aynalar aynı anda denenir, ilk başarılı cevap alınır.
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
function overpassYaris(govde) {
  const H = window.Capacitor?.isNativePlatform?.() && window.Capacitor.Plugins?.CapacitorHttp;
  if (H) return Promise.any(OVERPASS.map(async (uc) => {
    const r = await H.request({ url: uc + '?' + govde, method: 'GET', headers: { 'User-Agent': 'Mulkum360/1.0', Accept: 'application/json' }, connectTimeout: 15000, readTimeout: 60000 });
    if (r.status < 200 || r.status >= 300) throw new Error(uc + ' ' + r.status);
    return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
  })).catch(() => null);
  return Promise.any(OVERPASS.map(async (uc) => {
    const r = await sureliFetch(uc, { method: 'POST', body: govde, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 45000);
    if (!r.ok) throw new Error(uc + ' ' + r.status);
    return r.json();
  })).catch(() => null);
}
async function konumVerisi(f) {
  if (!f.il) return null;
  // Öncelik: ilanın kayıtlı koordinatı → rapor penceresindeki adres → formdaki sokak + mahalle → ilçe merkezi
  const ia = (f.haric && typeof ilan === 'function' && ilan(f.haric)?.alanlar) || {};
  const sokak = f.sokak || ia.sokak, mahalle = f.mahalle || ia.mahalle;
  const adres = f.adres || [sokak, mahalle && mahalle + ' Mahallesi'].filter(Boolean).join(', ');
  const sorgu = [adres, f.ilce, f.il, 'Türkiye'].filter(Boolean).join(', ');
  let yer = null;
  if (+ia.enlem > 0 && +ia.boylam > 0) yer = { lat: +ia.enlem, lon: +ia.boylam, ad: [sokak, mahalle && mahalle + ' Mah.', f.ilce, f.il].filter(Boolean).join(', '), ilan: true };
  if (!yer) try { // Photon (komoot, OSM tabanlı, ücretsiz)
    const p = await (await sureliFetch('https://photon.komoot.io/api/?limit=1&q=' + encodeURIComponent(sorgu))).json();
    const ft = p.features?.[0];
    if (ft && ft.properties?.countrycode === 'TR') yer = { lat: ft.geometry.coordinates[1], lon: ft.geometry.coordinates[0], ad: [ft.properties.name, ft.properties.district, ft.properties.county, ft.properties.city || ft.properties.state].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(', ') };
  } catch (_) {}
  if (!yer) try { // yedek: Nominatim
    const g = await (await sureliFetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tr&accept-language=tr&q=' + encodeURIComponent(sorgu))).json();
    if (g?.[0]) yer = { lat: +g[0].lat, lon: +g[0].lon, ad: g[0].display_name };
  } catch (_) {}
  if (!yer) return null;
  const lat = yer.lat, lon = yer.lon, sonuc = { lat, lon, ad: yer.ad, hassas: !!(yer.ilan || f.adres || sokak), duzey: yer.ilan ? 'ilan konumu' : f.adres ? 'adres' : sokak ? 'sokak' : mahalle ? 'mahalle' : 'ilçe', poi: {} };
  try {
    const par = POI.flatMap(([, , ...ss]) => ss.map((s) => `nwr(around:1500,${lat},${lon})${s};`)).join('');
    const govde = 'data=' + encodeURIComponent(`[out:json][timeout:25];(${par});out center tags;`);
    const o = await overpassYaris(govde);
    if (!o) throw new Error('overpass');
    for (const [ad, k, ...ss] of POI) {
      const uyan = (o.elements || []).filter((e) => ss.some((s) => { const [, key, op, val] = s.match(/\["(\w+)"(=|~)"([^"]+)"\]/); const t = e.tags?.[key]; return t && (op === '=' ? t === val : new RegExp(val).test(t)); }));
      const uz = uyan.map((e) => mesafe(lat, lon, e.lat ?? e.center?.lat, e.lon ?? e.center?.lon)).filter((x) => !isNaN(x));
      sonuc.poi[k] = { ad, r500: uz.filter((x) => x <= 500).length, r1000: uz.filter((x) => x <= 1000).length, r1500: uz.length, enYakin: uz.length ? Math.round(Math.min(...uz)) : null };
    }
  } catch (_) { sonuc.poiHata = true; }
  return sonuc;
}
// Uydu görüntüsü: EOX Sentinel-2 cloudless 2016 (CC BY 4.0). 10 m çözünürlük, mahalle ölçeği; 300/600/1000 m halkaları
function uyduHtml(k) {
  if (!k) return '';
  const z = 14, W = 682, H = 420, n = 2 ** z;
  const px = ((k.lon + 180) / 360) * n * 256, py = ((1 - Math.log(Math.tan((k.lat * Math.PI) / 180) + 1 / Math.cos((k.lat * Math.PI) / 180)) / Math.PI) / 2) * n * 256;
  const x0 = px - W / 2, y0 = py - H / 2;
  let karolar = '';
  for (let tx = Math.floor(x0 / 256); tx <= Math.floor((x0 + W) / 256); tx++) for (let ty = Math.floor(y0 / 256); ty <= Math.floor((y0 + H) / 256); ty++)
    karolar += `<img src="https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/${z}/${ty}/${tx}.jpg" crossorigin="anonymous" alt="" style="position:absolute;left:${tx * 256 - x0}px;top:${ty * 256 - y0}px;width:256px;height:256px">`;
  const mPx = (156543.03392 * Math.cos((k.lat * Math.PI) / 180)) / n;
  const halka = [[300, '#FFFFFF'], [600, '#FFC72C'], [1000, '#7FB3E6']];
  // Üst katman: Mapbox uydu (z16, bina ölçeği; anahtar sunucuda). Yüklenemezse katman kalkar, alttaki Sentinel görünür.
  const zM = 16, mPxM = (156543.03392 * Math.cos((k.lat * Math.PI) / 180)) / 2 ** zM, halkaM = [[100, '#FFFFFF'], [250, '#FFC72C'], [500, '#7FB3E6']];
  const mapbox = `<div class="r-mapbox" style="position:absolute;inset:0;z-index:2"><img src="${SB_URL}/functions/v1/uydu?lat=${k.lat.toFixed(6)}&lon=${k.lon.toFixed(6)}&z=${zM}" crossorigin="anonymous" alt="" style="width:${W}px;height:${H}px;display:block" onerror="this.parentElement.remove()" onload="var l=document.getElementById('uyduKaynak');if(l)l.textContent='Uydu görüntüsü © Mapbox © Maxar';var g=document.getElementById('uyduLejant');if(g)g.style.display='none'"><svg width="${W}" height="${H}" style="position:absolute;inset:0">${halkaM.map(([m, c]) => `<circle cx="${W / 2}" cy="${H / 2}" r="${m / mPxM}" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="6 4"/>`).join('')}<circle cx="${W / 2}" cy="${H / 2}" r="6" fill="#C8553D" stroke="#fff" stroke-width="2"/></svg><div class="r-lejant" style="position:absolute;left:8px;bottom:26px;margin:0">${halkaM.map(([m, c]) => `<span style="background:${c === '#FFFFFF' ? '#9AA3AE' : c}">${m} m</span>`).join('')}</div></div>`;
  return `<div class="r-harita" style="width:${W}px;height:${H}px">${mapbox}${karolar}
    <svg width="${W}" height="${H}" style="position:absolute;inset:0">${halka.map(([m, c]) => `<circle cx="${W / 2}" cy="${H / 2}" r="${m / mPx}" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="6 4"/>`).join('')}<circle cx="${W / 2}" cy="${H / 2}" r="6" fill="#C8553D" stroke="#fff" stroke-width="2"/></svg>
    <div class="r-harita-not" id="uyduKaynak" style="z-index:3">Sentinel-2 cloudless 2016, s2maps.eu, EOX IT Services GmbH (Copernicus Sentinel verisi içerir)</div></div>
    <div class="r-lejant" id="uyduLejant">${halka.map(([m, c]) => `<span style="background:${c === '#FFFFFF' ? '#9AA3AE' : c}">${m} m</span>`).join('')}</div>`;
}
// OSM karo haritası + 150/300/600 m halkaları
function haritaHtml(k) {
  if (!k) return '';
  const z = k.hassas ? 16 : 13, W = 682, H = 300, n = 2 ** z;
  const px = ((k.lon + 180) / 360) * n * 256, py = ((1 - Math.log(Math.tan((k.lat * Math.PI) / 180) + 1 / Math.cos((k.lat * Math.PI) / 180)) / Math.PI) / 2) * n * 256;
  const x0 = px - W / 2, y0 = py - H / 2, tx0 = Math.floor(x0 / 256), ty0 = Math.floor(y0 / 256), tx1 = Math.floor((x0 + W) / 256), ty1 = Math.floor((y0 + H) / 256);
  let karolar = '';
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) karolar += `<img src="https://tile.openstreetmap.org/${z}/${tx}/${ty}.png" crossorigin="anonymous" alt="" style="position:absolute;left:${tx * 256 - x0}px;top:${ty * 256 - y0}px;width:256px;height:256px">`;
  const mPx = (156543.03392 * Math.cos((k.lat * Math.PI) / 180)) / n;
  const halka = k.hassas ? [[150, '#C8553D'], [300, R_ALTIN], [600, '#4F8CC9']] : [[1500, R_ALTIN]];
  return `<div class="r-harita" style="width:${W}px;height:${H}px">${karolar}
    <svg width="${W}" height="${H}" style="position:absolute;inset:0">${halka.map(([m, c]) => `<circle cx="${W / 2}" cy="${H / 2}" r="${m / mPx}" fill="${c}" fill-opacity=".08" stroke="${c}" stroke-width="3"/>`).join('')}<circle cx="${W / 2}" cy="${H / 2}" r="7" fill="${R_MAVI}" stroke="#fff" stroke-width="3"/></svg>
    <div class="r-harita-not">© OpenStreetMap katkıda bulunanlar</div></div>
    <div class="r-lejant">${halka.map(([m, c]) => `<span style="background:${c}">${m} m</span>`).join('')}${k.hassas ? '' : k.duzey === 'mahalle' ? '<em>Sokak girilmediği için mahalle merkezi gösterilmiştir</em>' : '<em>Adres girilmediği için ilçe merkezi gösterilmiştir</em>'}</div>`;
}

// raporAl içinde çağrılır: rapora konacak ek veriyi hazırlar
// adim(n): ilerleme ekranına hangi adımın bittiğini bildirir (0 konum, 1 çevre, 2 deprem, 3 resmî veri)
async function raporEkVeri(v, h, adim = () => {}) {
  const b = ben(), emlak = v.ana === 'emlak';
  const resmi = Promise.all([
    emlak && v.il ? secimSonuclari(v.il, v.ilce).catch(() => null) : null,
    v.il ? gostergeler(v.il, v.ilce).catch(() => []) : [],
    emlak && v.il ? yatirimEndeksi(v.il).catch(() => null) : null
  ]).finally(() => adim(3));
  let konum = null; try { if (emlak) konum = await konumVerisi(v); } catch (_) {}
  adim(0);
  // Ada/parsel (TKGM): girilen ada/parselden, yoksa adres tam bulunduysa noktadan
  const parselP = emlak ? (async () => {
    const f2 = (v.haric && ilan(v.haric)?.alanlar) || {}, ada = v.ada || f2.ada, parsel = v.parsel || f2.parsel, mah = v.mahalle || f2.mahalle;
    const govde = ada && parsel && mah ? { il: v.il, ilce: v.ilce, mahalle: mah, ada, parsel } : konum?.hassas ? { lat: konum.lat, lon: konum.lon } : null;
    if (!govde) return null;
    try { const { data } = await sb.functions.invoke('parsel', { body: govde }); return data && !data.hata ? { ...data, kaynak: govde.ada ? 'ada/parsel' : 'konum' } : null; } catch (_) { return null; }
  })() : Promise.resolve(null);
  const gelirP = emlak && v.il ? sb.from('endeks_veri').select('kod,bolge,donem,deger').in('kod', ['TUIK.GSYH.KISI.TL', 'TUIK.GSYH.KISI.USD', 'TUIK.GSYH.KISI.TL.TAHMIN', 'TUIK.GSYH.KISI.USD.TAHMIN']).in('bolge', [v.il, 'TR']).order('donem', { ascending: false }).limit(40).then(({ data }) => {
    const al = (kod, b) => (data || []).find((x) => x.kod === kod && x.bolge === b); // en yeni dönem önce
    const resmi = al('TUIK.GSYH.KISI.TL', v.il), tah = al('TUIK.GSYH.KISI.TL.TAHMIN', v.il);
    const il = tah && (!resmi || tah.donem > resmi.donem) ? tah : resmi; if (!il) return null;
    const tahmin = il === tah, yil = il.donem.slice(0, 4), trAy = (data || []).find((x) => x.kod === 'TUIK.GSYH.KISI.TL' && x.bolge === 'TR' && x.donem === il.donem);
    return { il: v.il, yil, tahmin, tl: +il.deger, usd: +(al(tahmin ? 'TUIK.GSYH.KISI.USD.TAHMIN' : 'TUIK.GSYH.KISI.USD', v.il)?.deger || 0), trTl: +(trAy?.deger || al('TUIK.GSYH.KISI.TL', 'TR')?.deger || 0), resmiYil: resmi?.donem.slice(0, 4) };
  }, () => null) : Promise.resolve(null);
  const [cevre, deprem, fay, parselB, arazi, gelir] = await Promise.all([
    (emlak && konum ? cevreVerisi(konum, v).catch(() => null) : Promise.resolve(null)).finally(() => adim(1)),
    (emlak && konum ? depremVerisi(konum).catch(() => null) : Promise.resolve(null)).finally(() => adim(2)),
    emlak && konum ? fayVerisi(konum).catch(() => null) : Promise.resolve(null),
    parselP, emlak && konum ? araziKullanimi(konum).catch(() => null) : Promise.resolve(null), gelirP
  ]);
  const ozellik = emlak ? Object.fromEntries(Object.entries({ ...((v.haric && ilan(v.haric)?.alanlar) || {}), ...Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === 'string' && x)) }).filter(([k, x]) => x !== '' && x != null && typeof x !== 'object' && !/^_|^(deko|videolar|video|tur360|eids|oncekiFiyat|elEmsal)$/.test(k))) : null;
  const [secim, gost, yatEnd] = await resmi;
  const beyan = Object.fromEntries(['cephe', 'kat', 'manzara', 'otopark', 'site', 'tadilat', 'iskan', 'aidat', 'faiz', 'vade', 'pesinat', 'imarTipi', 'arsaAlani', 'kaks', 'taks', 'hmax', 'rayic', 'rayicYil'].map((k) => [k, v[k] || '']));
  const saha = []; for (const u of v._sahaFoto || []) { try { saha.push(await fotoYukle(u)); } catch (_) {} } delete v._sahaFoto;
  return {
    konum, secim, cevre, deprem, fay, parsel: parselB, arazi, gelir, ozellik, gostergeler: gost, yatirim: yatEnd, beyan, saha, trend: fiyatTrendi(v), piyasa: piyasaDavranisi(v),
    tablo: bolgeTablosu(v),
    dagilim: h.emsal.map((x) => Math.round(x.birim)),
    danisman: { ad: b.ad, tel: b.tel, eposta: b.eposta, firma: b.firma || '', unvan: b.unvan || '', hakkinda: b.hakkinda || '', slogan: b.slogan || '' },
    kapak: v.haric ? (ilan(v.haric)?.fotolar || [])[0] || '' : ''
  };
}

// ---- Grafik: emsallerin birim fiyat dağılımı + aralık + konu taşınmaz ----
function dagilimSvg(h, ana) {
  const d = (h.dagilim || []).slice().sort((a, b) => a - b);
  if (d.length < 3) return '';
  const W = 680, H = 170, p = 40, min = Math.min(...d, h.alt / (ana === 'emlak' ? +h._m2 || 1 : 1)), max = Math.max(...d);
  const lo = min * 0.9, hi = max * 1.1, x = (v) => p + ((v - lo) / (hi - lo)) * (W - 2 * p);
  const birim = (v) => (ana === 'emlak' ? v : v);
  const b25 = yuzdelik(d, 0.25), b75 = yuzdelik(d, 0.75), bOrt = medyan(d);
  const etiket = (v) => new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  const izgara = [0, 0.25, 0.5, 0.75, 1].map((t) => lo + t * (hi - lo));
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="display:block">
    ${izgara.map((v) => `<line x1="${x(v)}" y1="20" x2="${x(v)}" y2="${H - 34}" stroke="${R_CIZGI}"/><text x="${x(v)}" y="${H - 16}" font-size="11" fill="${R_SOLUK}" text-anchor="middle">${etiket(birim(v))}</text>`).join('')}
    <rect x="${x(b25)}" y="56" width="${x(b75) - x(b25)}" height="46" rx="8" fill="${R_KREM}" stroke="${R_ALTIN}"/>
    <line x1="${x(bOrt)}" y1="48" x2="${x(bOrt)}" y2="110" stroke="${R_ALTIN_K}" stroke-width="3"/>
    <text x="${x(bOrt)}" y="40" font-size="12" font-weight="700" fill="${R_ALTIN_K}" text-anchor="middle">Ortalama ${etiket(bOrt)}</text>
    ${d.map((v, n) => `<circle cx="${x(v)}" cy="${79 + ((n % 3) - 1) * 9}" r="6" fill="${R_MAVI}" fill-opacity=".85"/>`).join('')}
    <text x="${p}" y="14" font-size="11" fill="${R_SOLUK}">${ana === 'emlak' ? 'TL / m²' : 'TL'} · her nokta bir emsal ilan · altın kutu: benzerlerin orta yarısı</text>
  </svg>`;
}

function qrSvg(metin) {
  try { const q = qrcode(0, 'M'); q.addData(metin); q.make(); return q.createSvgTag({ cellSize: 3, margin: 0 }); } catch (_) { return ''; }
}

const silüet = `<svg width="794" height="90" viewBox="0 0 794 90" xmlns="http://www.w3.org/2000/svg" style="display:block"><path fill="${R_MAVI}" d="M0 90V62h30V30h18v32h20V48h26v14h30V22l16-14 16 14v40h24V40h40v22h18V52h14v10h36V14h22v48h20V44l18-12 18 12v18h30V36h44v26h22V50h18v12h40V26h26v36h20V46h30v16h24V30l20-14 20 14v32h30V44h40v18h28V52h20v38z"/><circle cx="560" cy="42" r="6" fill="${R_ALTIN}"/><circle cx="700" cy="36" r="5" fill="${R_ALTIN}"/></svg>`;

// Yatay çubuk grafik (seçim oyları, yaş grupları)
const R_RENK = ['#0B1B33', '#FFC72C', '#4F8CC9', '#C8553D', '#2E9E6B', '#7A5AA6', '#8A6516', '#5B5F68'];
function cubukSvg(veri, birim = '%') {
  const W = 682, sat = 26, H = veri.length * sat + 8, enCok = Math.max(...veri.map((d) => d.deger), 1);
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="display:block">${veri.map((d, n) => {
    const y = n * sat + 4, g = Math.max(2, (d.deger / enCok) * (W - 250));
    return `<text x="0" y="${y + 15}" font-size="12" fill="#0B1B33">${kac(d.ad)}</text><rect x="150" y="${y + 3}" width="${g}" height="16" rx="5" fill="${R_RENK[n % R_RENK.length]}"/><text x="${156 + g}" y="${y + 15}" font-size="12" font-weight="700" fill="#0B1B33">${String(d.deger.toFixed(1)).replace('.', ',')}${birim}</text>`;
  }).join('')}</svg>`;
}
function secimSayfasi(s) {
  if (!s) return '';
  return `${rBaslik(`Seçim Sonuçları · ${kac(s.kapsam)} · ${s.yil}`)}
    ${Object.entries(s.gruplar).map(([tur, l]) => {
      const ilk = l.slice(0, 7), diger = l.slice(7).reduce((t, x) => t + x.oran, 0);
      const veri = ilk.map((x) => ({ ad: x.parti, deger: x.oran })).concat(diger > 0 ? [{ ad: 'Diğer', deger: diger }] : []);
      return `<div class="r-kutu"><div style="font-size:12.5px;font-weight:700;margin-bottom:6px">${kac(tur)} <span style="color:${R_SOLUK};font-weight:500">· en yüksek oy: ${kac(l[0].parti)} %${String(l[0].oran).replace('.', ',')}</span></div>${cubukSvg(veri)}</div>`;
    }).join('')}
    <div class="r-not">Kaynak: ${kac(s.kaynak)} resmî sonuçları (${s.yil}). Seçim verileri bölgenin sosyal yapısını anlamaya yardımcı bilgi olarak sunulur; değer hesabında kullanılmaz.</div>`;
}

// ---- Sayfa iskeleti ----
function sayfa(ic, d, no, toplam) {
  return `<section class="r-sayfa">
    <div class="r-ust"><div><b>${kac(d.ad)}</b>${d.firma ? ' · ' + kac(d.firma) : ''}<br>${kac(d.tel || '')}${d.tel && d.eposta ? ' · ' : ''}${kac(d.eposta || '')}</div><div class="r-logo"><img src="logo.png" alt="">mülküm<span>360</span></div></div>
    <div class="r-govde">${ic}</div>
    <div class="r-alt"><span>MülkümAI Elektronik Değerleme Raporu</span><span>Sayfa ${no} / ${toplam}</span></div></section>`;
}
const rBaslik = (t) => `<div class="r-bas">${t}</div>`;
const rDeger = (v, birim = '') => (v == null || isNaN(v) ? '—' : tl(v).replace(' TL', '') + (birim ? ' ' + birim : ' TL'));

EKRAN.rapor = (id) => {
  if (girisGerek()) return;
  const b = ben(), r = (b.raporlar || []).find((x) => x.id === id);
  if (!r) { git('#/raporlar'); return; }
  const f = r.form, h = r.sonuc, em = h.emsalOzet || [];
  const d = h.danisman || { ad: b.ad, tel: b.tel, eposta: b.eposta };
  const emlak = f.ana === 'emlak', kira = /Kiralık/.test(f.islem || '');
  const tur = emlak ? (ALT[f.alt]?.ad || 'Taşınmaz') : 'Araç';
  const tarih = new Date(r.zaman).toLocaleDateString('tr-TR');
  const yorum = mulkumAiYorum(f, h);
  const satir2 = (a, v) => `<tr><th>${a}</th><td>${v == null || v === '' ? '—' : kac(v)}</td></tr>`;
  h._m2 = f.m2net;

  // 1 · Kapak
  const kapak = `<section class="r-sayfa r-kapak">
    <div class="r-kapak-ust"><div class="r-logo buyuk"><img src="logo.png" alt="">mülküm<span>360</span></div><div class="r-etiket">MülkümAI</div></div>
    <h1>${kac(tur.toLocaleUpperCase('tr-TR'))}<br>ELEKTRONİK<br>DEĞERLEME RAPORU</h1>
    <div class="r-kapak-orta">
      <div class="r-foto">${h.kapak ? `<img src="${h.kapak}" alt="" crossorigin="anonymous">` : `<div class="r-foto-yok">${ic(ALT[f.alt]?.ikon || 'ev', 64, R_ALTIN, 1.4)}</div>`}</div>
      <div class="r-kapak-bilgi">
        <div class="r-cizgi"></div>
        <b class="r-ad">${kac(d.ad)}</b>
        ${f.adina ? `<div>Bu rapor <b>${kac(f.adina)}</b> adına hazırlanmıştır.</div>` : ''}
        <div><b>Konum:</b> ${kac([f.adres, f.ilce, f.il].filter(Boolean).join(', ') || '—')}</div>
        ${f.ada || f.parsel ? `<div><b>Ada / Parsel:</b> ${kac(f.ada || '—')} / ${kac(f.parsel || '—')}</div>` : ''}
        ${!emlak ? `<div><b>Araç:</b> ${kac([f.marka, f.model, f.yil].filter(Boolean).join(' '))}</div>` : ''}
        <div><b>Rapor No:</b> ${r.no}</div><div><b>Rapor Tarihi:</b> ${tarih}</div>
        <div class="r-cizgi"></div>
      </div></div>
    <div class="r-kapak-yasal"><p>Bu rapor Mülküm360 tarafından, platformda yayınlanan ilan verileri ve kullanıcının sağladığı bilgilerle istatistiksel yöntemlerle üretilmiştir; sapmalar içerebilir. Bilgi ve tahminler varsayımsaldır, taahhüt içermez ve yalnız bilgilendirme amaçlıdır. SPK lisanslı değerleme raporu ya da ekspertiz yerine geçmez; kredi, mahkeme ve resmî işlemlerde kullanılamaz.</p><div class="r-qr">${qrSvg(`Mülküm360 · ${r.no} · ${tarih} · ${tur} · ${[f.ilce, f.il].filter(Boolean).join(', ')}`)}<small>Rapor kimliği</small></div></div>
    <div class="r-silüet">${silüet}</div></section>`;

  const sayfalar = [];
  // 2 · Danışman
  if (d.hakkinda || d.firma) sayfalar.push(`<div class="r-danisman"><div class="r-avatar">${basHarf(d.ad)}</div><div style="flex:1"><b style="font-size:20px">${kac(d.ad)}</b><div>${kac(d.unvan || '')}</div><div>${kac(d.tel || '')}</div><div>${kac(d.eposta || '')}</div></div><div style="text-align:right"><b>${kac(d.firma || '')}</b><div style="color:${R_SOLUK};font-style:italic">${kac(d.slogan || '')}</div></div></div>
    ${d.hakkinda ? `${rBaslik('Hakkımda')}<div style="font-size:12.5px;line-height:1.7;white-space:pre-line">${kac(d.hakkinda)}</div>` : ''}`);

  // 3 · Taşınmaz ve değer analizi
  sayfalar.push(`${rBaslik(emlak ? 'Taşınmaz Bilgileri' : 'Araç Bilgileri')}
    <table class="r-tablo iki">${emlak ? satir2('Tür', tur) + satir2('İşlem', f.islem) + satir2('İl / İlçe', [f.il, f.ilce].filter(Boolean).join(' / ')) + satir2('Adres / Mahalle', f.adres) + satir2('Ada / Parsel', f.ada || f.parsel ? `${f.ada || '—'} / ${f.parsel || '—'}` : '') + satir2('Net alan · kat', f.m2net && f.m2net + ' m²' + ((f.kat || h.beyan?.kat) ? ' · ' + (f.kat || h.beyan.kat) + (/kat/i.test(f.kat || h.beyan.kat) ? '' : /^(bodrum|zemin)$/i.test(f.kat || h.beyan.kat) ? ' kat' : /^\d+$/.test(f.kat || h.beyan.kat) ? '. kat' : '') : '')) + satir2('Oda sayısı', f.oda) + satir2('Bina yaşı', f.binaYasi)
      : satir2('Marka', f.marka) + satir2('Model', f.model) + satir2('Model yılı', f.yil) + satir2('Kilometre', f.km && sayiBicim(f.km) + ' km') + satir2('Boya / değişen', f.hasar)}</table>
    <div class="r-serit">${emlak ? 'TAŞINMAZIN' : 'ARACIN'} DEĞER / FİYAT ANALİZİ</div>
    <div class="r-uclu">${VADE.map(([ad, sure, k, acik], n) => `<div class="r-vade ${['y', 'a', 'k'][n]}"><div class="r-vade-fiyat">${tl(h[k])}</div><div class="r-vade-ad">${n === 0 ? 'Hızlı satış fiyatı' : n === 1 ? (kira ? 'Tahmini piyasa kirası' : 'Tahmini piyasa değeri') : 'Üst fiyat'}</div><div class="r-vade-sure">Hedef süre: ${ad} (${sure})</div>${n === 1 && emlak && f.m2net ? `<div class="r-vade-alt">Birim: ${tl(h.alt / f.m2net)} – ${tl(h.ust / f.m2net)} / m²</div>` : ''}</div>`).join('')}</div>
    <div class="r-not">Hedef süreler kullanıcı tanımıdır; ${kira ? 'kiralama' : 'satış'} süresi garanti edilmez. Değerler ${h.sayi} emsal ilanın dağılımından (alt çeyrek, ortalama, üst çeyrek) hesaplanmıştır. Güven düzeyi: <b>${h.guven}</b>${h.kapsam ? ' · Emsal kapsamı: <b>' + kac(h.kapsam) + '</b>' : ''}.${h.genis ? ' Bölgede yeterli ilan olmadığından Türkiye geneli emsaller kullanıldı; bölge farkı büyük olabilir.' : ''}</div>
    ${rBaslik('Emsal Fiyat Dağılımı')}<div class="r-kutu">${dagilimSvg(h, f.ana) || '<div class="r-not">Grafik için en az 3 emsal gerekir.</div>'}</div>
    <div class="r-ai"><div class="r-ai-bas">MÜLKÜMAI DEĞERLENDİRMESİ</div>${yorum.map((y) => `<div>• ${kac(y)}</div>`).join('')}</div>`);

  // 4 · Emsaller
  sayfalar.push(`${rBaslik('Değere Esas Emsaller')}
    ${!em.length ? `<div class="r-not" style="font-size:12px">${kac(f.ilce ? f.ilce + ', ' + f.il : f.il || '')} için Mülküm360'ta yeterli gerçek ilan yok; başka şehirlerin ilanları emsal alınmaz. Değer, ${kac(h.refKaynak || 'bölgenin piyasa m² verisi')} esas alınarak hesaplandı.</div>` : ''}
    <table class="r-tablo" ${em.length ? '' : 'style="display:none"'}><tr><th>#</th><th>İlan</th><th>Konum</th><th>${emlak ? 'Alan / oda' : 'Yıl / km'}</th><th>Fiyat</th>${emlak ? '<th>TL/m²</th>' : ''}</tr>
    ${em.map((i, n) => `<tr><td>${n + 1}</td><td>${kac(String(i.baslik).slice(0, 34))}</td><td>${kac([i.ilce, i.il].filter(Boolean).join(', '))}</td><td>${emlak ? kac((i.alanlar.m2net || '—') + ' m² · ' + (i.alanlar.oda || '—')) : kac((i.alanlar.yil || '—') + ' · ' + sayiBicim(i.alanlar.km || 0) + ' km')}</td><td>${tl(i.fiyat)}</td>${emlak ? `<td>${i.alanlar.m2net ? tl(i.fiyat / i.alanlar.m2net) : '—'}</td>` : ''}</tr>`).join('')}</table>
    ${h.sayi > em.length ? `<div class="r-not">Hesapta ${h.sayi} emsal kullanıldı; ilk ${em.length} tanesi listelendi.</div>` : ''}
    ${h.tablo ? `${rBaslik(emlak ? (kira ? 'Kiralık' : 'Satılık') + ' Gayrimenkul Bilgileri' : 'Bölge Araç Piyasası')}
    <table class="r-tablo bolge"><tr><th></th>${h.tablo.sutunlar.map((s) => `<th>${kac(s)}</th>`).join('')}</tr>
      ${[['Ortalama brüt alan', (x) => (x.brutAlan ? Math.round(x.brutAlan) + ' m²' : '—'), emlak],
         ['Min. – Mak. birim fiyat', (x) => (x.birimMin ? `${rDeger(x.birimMin, 'TL/m²')} –<br>${rDeger(x.birimMax, 'TL/m²')}` : '—'), emlak],
         ['Ortalama birim fiyat', (x) => rDeger(x.birimOrt, 'TL/m²'), emlak],
         ['Ortalama fiyat', (x) => rDeger(x.fiyatOrt), true],
         ['Ortalama pazarlama süresi', (x) => (x.pazarlama ? Math.round(x.pazarlama) + ' gün' : '—'), true],
         ['Bir ay önceki stok', (x) => x.stokOnceki + ' ad.', true],
         ['Stok (yayındaki ilan)', (x) => x.stok + ' ad.', true],
         ['Önceki aya göre stok değişimi', (x) => (x.stokOnceki ? Math.round(((x.stok - x.stokOnceki) / x.stokOnceki) * 100) + ' %' : '—'), true]
        ].filter((s) => s[2]).map(([a, fn]) => `<tr><th>${a}</th>${h.tablo.veri.map((x) => `<td>${fn(x)}</td>`).join('')}</tr>`).join('')}
      ${emlak ? `<tr><th>Amortisman (geri dönüş)</th>${h.tablo.amortisman.map((a) => `<td>${a ? Math.round(a) + ' yıl' : '—'}</td>`).join('')}</tr>` : ''}
    </table><div class="r-not">Kaynak: Mülküm360 platformundaki ${emlak ? 'aynı tür ve işlem tipindeki' : 'aynı kategorideki'} ilanlar, ${tarih}. Pazarlama süresi, satıldı olarak işaretlenen ilanların yayında kalma süresidir.</div>` : ''}`);

  // 5 · Konum ve önemli noktalar (OpenStreetMap)
  if (emlak && h.konum) {
    const p = h.konum.poi || {};
    sayfalar.push(`${rBaslik('Konum')}${haritaHtml(h.konum)}<div class="r-not">${kac(h.konum.ad)} · ${h.konum.lat.toFixed(5)}, ${h.konum.lon.toFixed(5)}</div>
      ${rBaslik('Önemli Konumlar')}
      ${Object.keys(p).length ? `<table class="r-tablo bolge"><tr><th></th><th>500 m</th><th>1000 m</th><th>1500 m</th><th>En yakın</th></tr>${Object.values(p).map((x) => `<tr><th>${x.ad}</th><td>${x.r500}</td><td>${x.r1000}</td><td>${x.r1500}</td><td>${x.enYakin != null ? x.enYakin + ' m' : '—'}</td></tr>`).join('')}</table>
      <div class="r-not">Kaynak: OpenStreetMap (açık veri), ${tarih}. Sayılar haritaya işlenmiş noktalardır; OSM’de eksik kayıt olabilir.${h.konum.hassas ? '' : h.konum.duzey === 'mahalle' ? ' Sokak girilmediği için mahalle merkezine göre sayılmıştır.' : ' Adres girilmediği için ilçe merkezine göre sayılmıştır.'}</div>`
      : `<div class="r-not">Önemli konum verisi alınamadı${h.konum.poiHata ? ' (OpenStreetMap servisine ulaşılamadı)' : ''}.</div>`}`);
    if (h.konum.hassas) { const k = h.konum, u = `https://www.google.com/maps/@${k.lat.toFixed(6)},${k.lon.toFixed(6)},150m/data=!3m1!1e3`; sayfalar.push(`${rBaslik('Uydu Görünümü')}${uyduHtml(k)}<div class="r-not">Mülkün çevresindeki yerleşim dokusu, yeşil alanlar ve kıyı/su alanları. Görüntü 10 metre çözünürlüklüdür, bina ölçeğinde değildir.</div><div class="r-satir3" style="grid-template-columns:auto 1fr;align-items:center;margin-top:8px"><div style="width:84px">${typeof qrSvg === 'function' ? qrSvg(u) : ''}</div><div style="font-size:12px;line-height:1.5"><b>Sokağın yakın uydu görüntüsü</b><br>Karekodu telefonla okutun ya da <a href="${u}">bu bağlantıya</a> tıklayın; konum sokak ölçeğinde uydu görünümünde açılır (Google Haritalar).</div></div>`); }
  }
  // 6 · Bölge: fiyat analizleri + demografi + sosyal (+ yaş grupları grafiği)
  if (emlak) {
    const dm = h.demografi, yd = dm?.yas_dagilim, on = (a, b2) => Math.round(Object.entries(yd || {}).filter(([k]) => { const n = parseInt(k, 10); return n >= a && n <= b2; }).reduce((t, [, x]) => t + +x, 0) * 10) / 10;
    const yas = yd ? [['0–9 yaş', on(0, 9)], ['10–19 yaş', on(10, 19)], ['20–29 yaş', on(20, 29)], ['30–39 yaş', on(30, 39)], ['40–49 yaş', on(40, 49)], ['50–59 yaş', on(50, 59)], ['60–69 yaş', on(60, 69)], ['70–79 yaş', on(70, 79)], ['80 yaş ve üstü', on(80, 200)]] : dm ? [['0–19 yaş (Z kuşağı)', dm.yas_0_19], ['20–39 yaş (Y kuşağı)', dm.yas_20_39], ['40–59 yaş (X kuşağı)', dm.yas_40_59], ['60 yaş ve üstü', dm.yas_60]].filter(([, x]) => x != null) : [];
    sayfalar.push(raporEkBolumler(f, h, 'bolge'));
    // Demografik ve sosyal yapı: tablolar + cinsiyet + medeni durum; sonraki sayfa yaş + eğitim (A4 taşmasın)
    const kaynakNot = dm ? `<div class="r-not">Kaynak: ${kac(dm.demografi_kaynak || dm.kaynak || 'TÜİK')}. İl geneli verisidir; mahalle ve ilçe yapısı farklı olabilir.</div>` : '';
    const gl = h.gelir, gelirHtml = gl ? `<div class="r-satir3"><div class="r-kutu"><b>${tl(gl.tl)}</b><small>Kişi başı gelir (GSYH), ${kac(gl.il)} ${gl.yil}${gl.tahmin ? ' tahmini' : ''}</small></div><div class="r-kutu"><b>${sayiBicim(Math.round(gl.usd))} $</b><small>Dolar karşılığı</small></div><div class="r-kutu"><b>${gl.trTl ? '%' + Math.round((gl.tl / gl.trTl) * 100) : '—'}</b><small>Türkiye ortalamasına göre</small></div></div><div class="r-not">${gl.tahmin ? `${gl.yil} il değeri tahminidir: TÜİK'in ${gl.resmiYil} il verisi, Türkiye'nin resmî ${gl.yil} kişi başı GSYH artışıyla güncellendi (TÜİK ${gl.yil} il verisini yayımlayınca resmî rakam kullanılır). ` : ''}TÜİK il bazında kişi başı gayrisafi yurt içi hasıla. TÜİK il düzeyinde tüketim harcaması yayımlamadığı için bölgenin alım gücüne en yakın resmî gösterge olarak verilmiştir.</div>` : '';
    if (dm) sayfalar.push(`${rBaslik('Demografik ve Sosyal Yapı')}${gelirHtml}${raporEkBolumler(f, h, 'demo')}${demografiGrafikleri(dm, rBaslik, ['cinsiyet', 'medeni'])}`);
    const dg = typeof demografiGrafikleri === 'function' ? demografiGrafikleri(dm, rBaslik, ['egitim']) : '';
    if (yas.length || dg) sayfalar.push(`${yas.length ? `${rBaslik('Yaş Grupları')}<div class="r-kutu">${cubukSvg(yas.map(([ad, x]) => ({ ad, deger: +x })))}</div>` : ''}${dg}${dm ? `<div class="r-not">Kaynak: ${kac(dm.demografi_kaynak || dm.kaynak || 'TÜİK')}. İl geneli verisidir; mahalle ve ilçe yapısı farklı olabilir.</div>` : ''}`);
  }
  // 7 · Seçim sonuçları (YSK, girilmişse)
  if (emlak && h.secim) sayfalar.push(secimSayfasi(h.secim));

  sayfalar.push(...raporSayfalari2(f, h));
  // 6 · Yöntem ve yasal
  sayfalar.push(`${rBaslik('Yöntem')}
    <div class="r-metin">Değer, Mülküm360’ta yayınlanan ve ${emlak ? 'aynı tür, işlem ve ilde (yeterli sayıda varsa aynı ilçe ve oda sayısında) bulunan' : 'aynı marka ve modelde, model yılı ±2 olan'} ilanların ${emlak ? 'metrekare fiyatlarının' : 'fiyatlarının'} ortalamasıyla hesaplanır. Hızlı satış fiyatı benzerlerin alt çeyreği, üst fiyat üst çeyreğidir.${!emlak ? ' Kilometre farkı için ±%15 ile sınırlı düzeltme uygulanır.' : ''} İlan fiyatları gerçekleşen satış fiyatlarından farklı olabilir. Demografik ve sosyal veriler yalnız resmî kaynaktan (TÜİK) girilmiş bölgeler için gösterilir.</div>
    ${rBaslik('Yasal Uyarı')}
    <div class="r-metin">Bu rapor bilgilendirme amaçlı bir değer tahminidir. Rapordaki bilgiler ve tahminler varsayımsaldır, taahhüt içermez ve yatırım tavsiyesi değildir. SPK lisanslı değerleme uzmanı raporu ya da ekspertiz raporu yerine geçmez; kredi, mahkeme ve resmî işlemlerde kullanılamaz. Bu bilgi ve tahminlerin bir yatırıma ya da ticarete konu edilmesi halinde Mülküm360 sorumluluk üstlenmez.</div>
    <div class="r-imza"><div><b>Hazırlayan</b><br>${kac(d.ad)}${d.firma ? '<br>' + kac(d.firma) : ''}</div><div><b>Rapor No</b><br>${r.no}<br>${tarih}</div><div>${qrSvg(r.no + ' · ' + tarih)}</div></div>
    <div class="r-silüet" style="margin-top:auto">${silüet}</div>`);

  const toplam = sayfalar.length + 1;
  const html = kapak + sayfalar.map((s, n) => sayfa(s, d, n + 2, toplam)).join('');
  app.innerHTML = ustBar('Değerleme raporu') + `<div class="ic">
    <div class="rapor-kap" id="kap"><div class="rapor-olcek" id="olcek"><div id="raporSayfa">${html}</div></div></div>
    <button class="btn tam" id="pdf">${ic('indir', 18)}PDF olarak kaydet / paylaş (${toplam} sayfa)</button>
    <button class="btn sade tam" id="sil" style="color:var(--hata)">Raporu sil</button></div>`;
  const olc = () => { const kap = $('#kap'), o = $('#olcek'); if (!kap) return; const k = Math.min(1, (kap.clientWidth - 24) / 794); o.style.transform = `scale(${k})`; o.style.width = '794px'; kap.style.height = $('#raporSayfa').offsetHeight * k + 24 + 'px'; kap.style.overflow = 'hidden'; };
  olc(); setTimeout(olc, 400);
  $('#pdf').onclick = () => pdfOlustur($('#raporSayfa'), 'Mulkum360-' + r.no + '.pdf');
  $('#sil').onclick = async () => { if (await onayla('Rapor silinsin mi?', 'Bu rapor listenden kaldırılır.', 'Sil', true) && (await dene(() => raporSil(id), 'Rapor silindi'))) git('#/raporlar'); };
  navCiz();
};

// Her .r-sayfa ayrı bir A4 PDF sayfası olur (içerik sayfa ortasından bölünmez)
async function pdfOlustur(el, ad) {
  const dugme = $('#pdf'); dugme.disabled = true; dugme.textContent = 'PDF hazırlanıyor…';
  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    const kopya = el.cloneNode(true);
    kopya.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px';
    document.body.appendChild(kopya);
    const sayfalar = [...kopya.querySelectorAll('.r-sayfa')];
    for (let n = 0; n < sayfalar.length; n++) {
      dugme.textContent = `PDF hazırlanıyor… ${n + 1}/${sayfalar.length}`;
      const tuval = await html2canvas(sayfalar[n], { scale: 2, backgroundColor: '#ffffff', useCORS: true, width: 794, height: 1123, windowWidth: 794 });
      if (n) pdf.addPage();
      pdf.addImage(tuval.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297);
    }
    kopya.remove();
    pdf.setProperties({ title: ad.replace('.pdf', ''), creator: 'Mülküm360', subject: 'MülkümAI Elektronik Değerleme Raporu' });
    const P = window.Capacitor?.Plugins;
    if (window.Capacitor?.isNativePlatform?.() && P?.Filesystem && P?.Share) {
      const yaz = await P.Filesystem.writeFile({ path: ad, data: pdf.output('datauristring').split(',')[1], directory: 'CACHE' });
      await P.Share.share({ title: ad, url: yaz.uri, dialogTitle: 'Raporu kaydet veya paylaş' });
    } else pdf.save(ad);
    toast('PDF hazır');
  } catch (e) { console.error(e); toast('PDF oluşturulamadı: ' + (e.message || e)); }
  finally { dugme.disabled = false; dugme.innerHTML = ic('indir', 18) + 'PDF olarak kaydet / paylaş'; }
}
