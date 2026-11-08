// Mülküm360 — rapor ek verileri: toplu taşıma, ulaşım süreleri, çevre (sahil, yeşil alan, gürültü, olumsuz tesisler),
// rakım ve güneş, fiyat trendi, piyasa davranışı, resmî göstergeler, kullanıcı beyanı ve kredi hesabı.
// Kaynaklar: OpenStreetMap (Overpass), OSRM, Open-Meteo (Copernicus DEM), kendi ilanlarımız, yönetimden girilen resmî veriler.
'use strict';

const TASIMA = [
  ['Metro', (t) => t.station === 'subway' || t.railway === 'subway_entrance' || (t.public_transport === 'station' && /subway|metro/.test(t.subway || t.station || ''))],
  ['Tramvay', (t) => t.railway === 'tram_stop'],
  ['Tren / banliyö', (t) => (t.railway === 'station' || t.railway === 'halt') && t.station !== 'subway'],
  ['Vapur / deniz otobüsü', (t) => t.amenity === 'ferry_terminal'],
  ['Otobüs durağı', (t) => t.highway === 'bus_stop'],
  ['Otobüs terminali', (t) => t.amenity === 'bus_station']
];
const CEVRE = [
  ['Sahil / plaj', 'sahil', (t) => t.natural === 'coastline' || t.natural === 'beach'],
  ['Park / yeşil alan', 'yesil', (t) => /^(park|garden|nature_reserve)$/.test(t.leisure || '') || /^(forest|recreation_ground)$/.test(t.landuse || '')],
  ['Otoyol / ana yol', 'gurultu', (t) => /^(motorway|trunk)$/.test(t.highway || '')],
  ['Demiryolu hattı', 'gurultu', (t) => t.railway === 'rail'],
  ['Havalimanı', 'gurultu', (t) => t.aeroway === 'aerodrome'],
  ['Sanayi alanı', 'olumsuz', (t) => t.landuse === 'industrial'],
  ['Atık / geri dönüşüm tesisi', 'olumsuz', (t) => /^(waste_disposal|waste_transfer_station)$/.test(t.amenity || '') || t.landuse === 'landfill'],
  ['Yüksek gerilim hattı / trafo', 'olumsuz', (t) => t.power === 'line' || t.power === 'substation'],
  ['Baz istasyonu / iletişim kulesi', 'olumsuz', (t) => (t.man_made === 'mast' || t.man_made === 'tower') && /communication/.test(t['tower:type'] || t['communication:mobile_phone'] || 'communication')]
];

async function overpass(sorgu) {
  return overpassYaris('data=' + encodeURIComponent(sorgu));
}
// Öğenin konuma en yakın noktası (çizgi/alan geometrisi varsa köşelerden)
function enYakinMesafe(lat, lon, e) {
  const noktalar = e.geometry?.length ? e.geometry : [{ lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon }];
  return Math.min(...noktalar.filter((p) => p.lat != null).map((p) => mesafe(lat, lon, p.lat, p.lon)));
}
async function osrmSure(a, b) {
  try {
    const r = await (await sureliFetch(`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`, null, 9000)).json();
    return r.routes?.[0] ? { dk: Math.round(r.routes[0].duration / 60), km: Math.round(r.routes[0].distance / 100) / 10 } : null;
  } catch (_) { return null; }
}

// Önbellekli: aynı ~100 m'lik nokta (3 ondalık) için 30 gün içindeki sonuç sunucudan gelir
async function cevreVerisi(k, f) {
  if (!k) return null;
  const anahtar = `${(+k.lat).toFixed(3)},${(+k.lon).toFixed(3)}`;
  try {
    const { data } = await sb.from('cevre_onbellek').select('veri, olusturma').eq('anahtar', anahtar).maybeSingle();
    if (data && Date.now() - new Date(data.olusturma) < 30 * 864e5) return { ...data.veri, onbellek: data.olusturma };
  } catch (_) {}
  const s = await cevreVerisiCanli(k, f);
  if (s && !s.hata) sb.from('cevre_onbellek').upsert({ anahtar, veri: s, olusturma: new Date().toISOString() }).then(() => {}, () => {});
  return s;
}
async function cevreVerisiCanli(k, f) {
  const { lat, lon } = k, s = {};
  const [cizgi, nokta] = await Promise.all([
    overpass(`[out:json][timeout:25];(way(around:5000,${lat},${lon})["natural"~"^(coastline|beach)$"];way(around:1000,${lat},${lon})["leisure"~"^(park|garden|nature_reserve)$"];way(around:1000,${lat},${lon})["landuse"~"^(forest|recreation_ground)$"];way(around:1500,${lat},${lon})["highway"~"^(motorway|trunk)$"];way(around:1500,${lat},${lon})["railway"="rail"];way(around:1500,${lat},${lon})["landuse"~"^(industrial|landfill)$"];way(around:800,${lat},${lon})["power"="line"];);out geom;`),
    overpass(`[out:json][timeout:25];(nwr(around:1500,${lat},${lon})["railway"~"^(station|halt|tram_stop|subway_entrance)$"];nwr(around:1500,${lat},${lon})["public_transport"="station"];nwr(around:2500,${lat},${lon})["amenity"="ferry_terminal"];node(around:600,${lat},${lon})["highway"="bus_stop"];nwr(around:5000,${lat},${lon})["amenity"="bus_station"];nwr(around:1500,${lat},${lon})["amenity"~"^(waste_disposal|waste_transfer_station)$"];nwr(around:800,${lat},${lon})["power"="substation"];node(around:500,${lat},${lon})["man_made"~"^(mast|tower)$"];nwr(around:10000,${lat},${lon})["amenity"="hospital"];nwr(around:150000,${lat},${lon})["aeroway"="aerodrome"]["iata"];);out center tags;`)
  ]);
  if (!cizgi && !nokta) return { hata: true };
  const hepsi = [...(cizgi?.elements || []), ...(nokta?.elements || [])].map((e) => ({ e, t: e.tags || {}, m: enYakinMesafe(lat, lon, e) })).filter((x) => isFinite(x.m));
  // Toplu taşıma: türe göre en yakın + sayı
  s.tasima = TASIMA.map(([ad, fn]) => {
    const l = hepsi.filter((x) => fn(x.t)).sort((a, b) => a.m - b.m);
    return { ad, sayi: l.length, enYakin: l[0] ? Math.round(l[0].m) : null, isim: l[0]?.t.name || '', yuruyus: l[0] ? Math.max(1, Math.round(l[0].m / 80)) : null };
  });
  // Çevre: en yakın mesafe
  s.cevre = CEVRE.map(([ad, grup, fn]) => {
    const l = hepsi.filter((x) => fn(x.t) && !(ad === 'Havalimanı' && x.m > 15000)).sort((a, b) => a.m - b.m);
    return { ad, grup, sayi: l.length, enYakin: l[0] ? Math.round(l[0].m) : null };
  });
  // Ulaşım süreleri: il merkezi, en yakın hastane, en yakın havalimanı (araçla)
  const hedefler = [];
  try {
    const p = await (await sureliFetch('https://photon.komoot.io/api/?limit=1&osm_tag=place&q=' + encodeURIComponent(f.il + ', Türkiye'))).json();
    const ft = p.features?.[0]; if (ft) hedefler.push(['İl merkezi (' + f.il + ')', { lat: ft.geometry.coordinates[1], lon: ft.geometry.coordinates[0] }]);
  } catch (_) {}
  const yakin = (fn) => hepsi.filter((x) => fn(x.t)).sort((a, b) => a.m - b.m)[0];
  const hs = yakin((t) => t.amenity === 'hospital'); if (hs) hedefler.push(['En yakın hastane' + (hs.t.name ? ' (' + hs.t.name + ')' : ''), { lat: hs.e.lat ?? hs.e.center?.lat, lon: hs.e.lon ?? hs.e.center?.lon }]);
  const hv = yakin((t) => t.aeroway === 'aerodrome' && t.iata); if (hv) hedefler.push([`En yakın havalimanı (${hv.t.name || hv.t.iata})`, { lat: hv.e.lat ?? hv.e.center?.lat, lon: hv.e.lon ?? hv.e.center?.lon }]);
  s.sureler = (await Promise.all(hedefler.map(async ([ad, n]) => ({ ad, ...(await osrmSure(k, n)) })))).filter((x) => x.dk != null);
  // Open-Meteo (Copernicus DEM); OpenTopoData tarayıcıdan CORS ile engelleniyordu
  try { const r = await (await sureliFetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`, null, 8000)).json(); const z = r.elevation?.[0]; if (z != null) s.rakim = Math.round(z); } catch (_) {}
  // Güneş: gün ışığı süresi (astronomik hesap)
  const gun = (dek) => (24 / Math.PI) * Math.acos(-Math.tan((lat * Math.PI) / 180) * Math.tan((dek * Math.PI) / 180));
  s.gunes = { yaz: gun(23.44), kis: gun(-23.44), ogleYaz: 90 - lat + 23.44, ogleKis: 90 - lat - 23.44 };
  return s;
}

// Geçmiş depremler: USGS kataloğu (FDSN), 1976'dan bugüne, 100 km içinde M≥5
async function depremVerisi(k) {
  const r = await (await sureliFetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${k.lat}&longitude=${k.lon}&maxradiuskm=100&minmagnitude=5&starttime=1976-01-01&orderby=magnitude`, null, 15000)).json();
  const l = (r.features || []).map((e) => {
    const [lon, lat, der] = e.geometry.coordinates;
    return { m: e.properties.mag, t: new Date(e.properties.time), km: Math.round(enYakinMesafe(k.lat, k.lon, { lat, lon }) / 1000), der: Math.round(der) };
  });
  return { sayi: l.length, m6: l.filter((x) => x.m >= 6).length, en: l.slice(0, 6), yakin50: l.filter((x) => x.km <= 50).length };
}
// Yapım yılına göre yürürlükteki deprem yönetmeliği (bina yaşından yaklaşık yıl)
function yonetmelikDonemi(binaYasi) {
  if (binaYasi === '' || binaYasi == null || isNaN(+binaYasi)) return null;
  const yil = new Date().getFullYear() - +binaYasi;
  if (yil >= 2019) return { yil, ad: '2018 Türkiye Bina Deprem Yönetmeliği (TBDY)', not: 'Yürürlükteki en güncel yönetmelik (1 Ocak 2019’dan itibaren). Zemine ve konuma özel tasarım esastır.', seviye: 'Güncel' };
  if (yil >= 2007) return { yil, ad: '2007 Deprem Bölgelerinde Yapılacak Binalar Hakkında Yönetmelik', not: 'Performansa dayalı değerlendirme getiren yönetmelik; denetimli yapılarda iyi düzey beklenir.', seviye: 'İyi' };
  if (yil >= 1999) return { yil, ad: '1998 Afet Bölgelerinde Yapılacak Yapılar Hakkında Yönetmelik', not: '1999 sonrası yapı denetimi (4708 sayılı Kanun, 2001) ile birlikte uygulanmaya başladı; proje ve denetim belgeleri kontrol edilmeli.', seviye: 'Orta' };
  return { yil, ad: '1998 öncesi yönetmelikler (1975 vb.)', not: '1999 depremleri öncesi dönem; yapı denetimi zorunlu değildi. Deprem performans analizi önerilir; riskli yapı tespiti 6306 sayılı Kanun kapsamında yaptırılabilir.', seviye: 'Dikkat' };
}

// Kendi ilanlarımızdan: aylık m² fiyat trendi (son 12 ay), piyasa davranışı
function fiyatTrendi(f) {
  if (f.ana !== 'emlak') return null;
  const temel = S.ilanlar.filter((i) => i.ana === 'emlak' && i.alt === f.alt && i.alanlar?.islem === f.islem && +i.alanlar?.m2net > 0 && i.fiyat > 0);
  const ilce = temel.filter((i) => f.ilce && kucuk(i.ilce) === kucuk(f.ilce) && i.il === f.il), il = temel.filter((i) => i.il === f.il);
  const l = ilce.length >= 6 ? ilce : il.length >= 6 ? il : temel, kapsam = l === ilce ? `${f.ilce}, ${f.il}` : l === il ? `${f.il} geneli` : 'Türkiye geneli';
  const aylar = {};
  l.forEach((i) => { const d = new Date(i.olusturma); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); (aylar[k] = aylar[k] || []).push(i.fiyat / +i.alanlar.m2net); });
  const seri = Object.entries(aylar).sort().slice(-12).filter(([, v]) => v.length >= 2).map(([ay, v]) => ({ ay, deger: medyan(v), n: v.length }));
  return { kapsam, seri };
}
function piyasaDavranisi(f) {
  const l = S.ilanlar.filter((i) => i.ana === f.ana && i.alt === f.alt && i.il === f.il && (f.ana !== 'emlak' || i.alanlar?.islem === f.islem));
  const sat = l.filter((i) => i.durum === 'satildi');
  const fiyatli = sat.filter((i) => i.satis_fiyati > 0);
  const yayin = l.filter((i) => i.durum === 'yayinda');
  const genel = S.ilanlar.filter((i) => i.durum === 'yayinda');
  const ort = (a, fn) => (a.length ? a.reduce((t, x) => t + fn(x), 0) / a.length : null);
  return {
    satilan: sat.length,
    gun: ort(sat.filter((i) => i.guncelleme > i.olusturma), (i) => (i.guncelleme - i.olusturma) / GUN),
    indirim: fiyatli.length ? ort(fiyatli, (i) => (1 - i.satis_fiyati / i.fiyat) * 100) : null, indirimN: fiyatli.length,
    ilgi: ort(yayin, (i) => i.goruntulenme || 0), ilgiGenel: ort(genel, (i) => i.goruntulenme || 0),
    yeni30: l.filter((i) => Date.now() - i.olusturma < 30 * GUN).length
  };
}
function krediHesabi(tutar, faiz, vade, pesinatYuzde) {
  const anapara = tutar * (1 - (pesinatYuzde || 0) / 100), r = faiz / 100;
  const taksit = r > 0 ? (anapara * r) / (1 - Math.pow(1 + r, -vade)) : anapara / vade;
  return { anapara, taksit, toplam: taksit * vade, faizToplam: taksit * vade - anapara, pesinat: tutar - anapara };
}

// ---- Rapor sayfaları ----
const rMesafe = (m) => (m == null ? '—' : m >= 1000 ? String((m / 1000).toFixed(1)).replace('.', ',') + ' km' : m + ' m');
function trendSvg(t) {
  if (!t || t.seri.length < 2) return '';
  const W = 682, H = 190, p = 46, v = t.seri.map((x) => x.deger), lo = Math.min(...v) * 0.95, hi = Math.max(...v) * 1.05;
  const x = (n) => p + (n / (t.seri.length - 1)) * (W - 2 * p), y = (d) => H - 30 - ((d - lo) / (hi - lo || 1)) * (H - 60);
  const yol = t.seri.map((s, n) => `${n ? 'L' : 'M'}${x(n)},${y(s.deger)}`).join(' ');
  const ad = (a) => ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'][+a.slice(5) - 1] + ' ' + a.slice(2, 4);
  const kisa = (d) => new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(d);
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="display:block">
    ${[0, 0.5, 1].map((q) => { const d = lo + q * (hi - lo); return `<line x1="${p}" x2="${W - p}" y1="${y(d)}" y2="${y(d)}" stroke="${R_CIZGI}"/><text x="${p - 6}" y="${y(d) + 4}" font-size="10" fill="${R_SOLUK}" text-anchor="end">${kisa(d)}</text>`; }).join('')}
    <path d="${yol} L${x(t.seri.length - 1)},${H - 30} L${x(0)},${H - 30}Z" fill="${R_ALTIN}" fill-opacity=".18"/><path d="${yol}" fill="none" stroke="${R_ALTIN_K}" stroke-width="3"/>
    ${t.seri.map((s, n) => `<circle cx="${x(n)}" cy="${y(s.deger)}" r="4" fill="${R_MAVI}"/><text x="${x(n)}" y="${H - 12}" font-size="10" fill="${R_SOLUK}" text-anchor="middle">${ad(s.ay)}</text>`).join('')}</svg>`;
}

function raporSayfalari2(f, h) {
  const sayfalar = [], emlak = f.ana === 'emlak', c = h.cevre;
  // A · Toplu taşıma ve ulaşım
  if (emlak && c && !c.hata) {
    sayfalar.push(`${rBaslik('Toplu Taşıma')}
      <table class="r-tablo bolge"><tr><th>Tür</th><th>Sayı</th><th>En yakın</th><th>Yürüyüş</th><th>Durak / istasyon</th></tr>
      ${c.tasima.map((x) => `<tr><th>${x.ad}</th><td>${x.sayi}</td><td>${rMesafe(x.enYakin)}</td><td>${x.yuruyus ? x.yuruyus + ' dk' : '—'}</td><td>${kac(x.isim || '—')}</td></tr>`).join('')}</table>
      <div class="r-not">Arama yarıçapı: raylı sistem 1,5 km, vapur 2,5 km, otobüs durağı 600 m, terminal 5 km. Yürüyüş süresi 80 m/dk kabulüyle kuş uçuşu mesafeden hesaplanır.</div>
      ${c.sureler?.length ? `${rBaslik('Ulaşım Süreleri (araçla)')}<table class="r-tablo bolge"><tr><th>Hedef</th><th>Süre</th><th>Mesafe</th></tr>${c.sureler.map((s) => `<tr><th>${kac(s.ad)}</th><td>${s.dk} dk</td><td>${String(s.km).replace('.', ',')} km</td></tr>`).join('')}</table><div class="r-not">Trafik içermeyen yol ağı süresidir (OSRM, OpenStreetMap).</div>` : ''}
      ${rBaslik('Çevre Analizi')}
      <table class="r-tablo bolge"><tr><th></th><th>En yakın</th><th>Değerlendirme</th></tr>
      ${c.cevre.map((x) => { const yok = x.enYakin == null; const not = x.grup === 'sahil' || x.grup === 'yesil' ? (yok ? 'Yakında yok' : x.enYakin < 500 ? 'Çok yakın (artı)' : x.enYakin < 1500 ? 'Yakın' : 'Uzak') : yok ? 'Yakında yok (artı)' : x.enYakin < 300 ? 'Çok yakın: etkisini yerinde kontrol et' : 'Uzak'; return `<tr><th>${x.ad}</th><td>${yok ? '—' : rMesafe(x.enYakin)}</td><td>${not}</td></tr>`; }).join('')}</table>
      <div class="r-satir3">${c.rakim != null ? `<div class="r-kutu"><b>${c.rakim} m</b><small>Rakım</small></div>` : ''}<div class="r-kutu"><b>${String(c.gunes.yaz.toFixed(1)).replace('.', ',')} sa</b><small>Yaz gün ışığı (21 Haziran)</small></div><div class="r-kutu"><b>${String(c.gunes.kis.toFixed(1)).replace('.', ',')} sa</b><small>Kış gün ışığı (21 Aralık)</small></div></div>
      <div class="r-not">Kışın güneş öğlen ${Math.round(c.gunes.ogleKis)}° yükseklikte; güney cepheli bölümler en çok güneşi alır. Kaynak: OpenStreetMap, Open-Meteo (Copernicus DEM), astronomik hesap. OSM’de eksik kayıt olabilir.${c.onbellek ? ` Çevre verisi ${new Date(c.onbellek).toLocaleDateString('tr-TR')} tarihinde alındı.` : ''}</div>`);
  }
  // Deprem: yönetmelik dönemi + geçmiş depremler
  const yd = emlak ? yonetmelikDonemi(f.binaYasi) : null, dp = h.deprem;
  if (yd || dp) {
    const tarih = (d) => d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
    sayfalar.push(`${rBaslik('Deprem ve Yapı Güvenliği')}
      ${yd ? `<table class="r-tablo bolge"><tr><th>Tahmini yapım yılı</th><td>${yd.yil} (bina yaşı ${kac(String(f.binaYasi))})</td></tr><tr><th>Dönemin yönetmeliği</th><td><b>${yd.ad}</b></td></tr><tr><th>Değerlendirme</th><td><b>${yd.seviye}</b> · ${yd.not}</td></tr></table>` : '<div class="r-not">Bina yaşı girilmediği için yönetmelik dönemi belirlenemedi.</div>'}
      ${dp ? `<div class="r-satir3"><div class="r-kutu"><b>${dp.sayi}</b><small>M≥5 deprem, 100 km içinde (1976–bugün)</small></div><div class="r-kutu"><b>${dp.yakin50}</b><small>Bunların 50 km içindekiler</small></div><div class="r-kutu"><b>${dp.m6}</b><small>M≥6 deprem</small></div></div>
      ${dp.en.length ? `<table class="r-tablo bolge"><tr><th>Büyüklük</th><th>Tarih</th><th>Uzaklık</th><th>Derinlik</th></tr>${dp.en.map((x) => `<tr><th>M ${String(x.m.toFixed(1)).replace('.', ',')}</th><td>${tarih(x.t)}</td><td>${x.km} km</td><td>${x.der} km</td></tr>`).join('')}</table>` : '<div class="r-not">Bu dönemde 100 km içinde M≥5 deprem kaydı yok. Bu, gelecekte deprem olmayacağı anlamına gelmez.</div>'}` : '<div class="r-not">Deprem kataloğuna şu an ulaşılamadı.</div>'}
      <div class="r-not">Kaynak: USGS deprem kataloğu (FDSN), yönetmelik tarihleri. Bu sayfa binanın kendi dayanıklılığını göstermez; beton kalitesi, zemin ve güçlendirme durumu için deprem performans analizi / zemin etüdü yaptırın. Konuma özel deprem tehlikesi: AFAD Türkiye Deprem Tehlike Haritası (tdth.afad.gov.tr).</div>`);
  }
  // B · Piyasa: trend + davranış + resmî göstergeler
  const t = h.trend, pd = h.piyasa, g = h.gostergeler || [];
  sayfalar.push(`${rBaslik(`Aylık m² Fiyat Trendi · ${kac(t?.kapsam || '')}`)}
    ${t && t.seri.length >= 2 ? `<div class="r-kutu">${trendSvg(t)}</div><div class="r-not">Mülküm360’ta o ay yayına giren ilanların m² fiyat ortancası (en az 2 ilanlı aylar). Platform verisi biriktikçe grafik uzar.</div>` : `<div class="r-not">Trend için en az iki ayda yeterli ilan gerekir; Mülküm360 verisi biriktikçe bu bölüm dolacak.</div>`}
    ${pd ? `${rBaslik('Piyasa Davranışı')}<div class="r-satir3">
      <div class="r-kutu"><b>${pd.gun != null ? Math.round(pd.gun) + ' gün' : '—'}</b><small>Ortalama satılma süresi (${pd.satilan} satış)</small></div>
      <div class="r-kutu"><b>${pd.indirim != null ? '%' + String(pd.indirim.toFixed(1)).replace('.', ',') : '—'}</b><small>Ortalama pazarlık payı${pd.indirimN ? ` (${pd.indirimN} gerçekleşen fiyat)` : ''}</small></div>
      <div class="r-kutu"><b>${pd.ilgi != null && pd.ilgiGenel >= 5 ? Math.round((pd.ilgi / pd.ilgiGenel) * 100) : '—'}</b><small>İlgi endeksi (platform ortalaması = 100)</small></div></div>
      <div class="r-not">${kac(f.il)} · son 30 günde ${pd.yeni30} yeni ilan. Pazarlık payı, satıcıların “satıldı” derken girdiği gerçekleşen fiyat ile ilan fiyatı farkıdır.</div>` : ''}
    ${rBaslik('Resmî Göstergeler')}
    ${g.length ? `<table class="r-tablo"><tr><th>Gösterge</th><th>Değer</th><th>Dönem</th><th>Kapsam</th><th>Kaynak</th></tr>${g.map((x) => `<tr><td>${kac(x.gosterge)}</td><td><b>${String(x.deger).replace('.', ',')}${x.birim ? ' ' + kac(x.birim) : ''}</b></td><td>${kac(x.donem)}</td><td>${kac(x.ilce || x.il)}</td><td>${kac(x.kaynak)}</td></tr>`).join('')}</table>`
      : `<div class="r-not">Bu bölge için resmî gösterge (TCMB konut fiyat endeksi, TÜİK konut satışları, AFAD deprem tehlikesi vb.) henüz girilmedi.</div>`}`);
  // İmar, inşaat alanı, rayiç bedel (kullanıcının belgeden girdiği değerlerle hesap)
  const b = h.beyan || {};
  if (emlak && (b.kaks || b.taks || b.rayic || b.imarTipi)) {
    const alan = +b.arsaAlani || (f.alt === 'arsa' ? +f.m2net : 0);
    const insaat = alan && b.kaks ? alan * +b.kaks : null, taban = alan && b.taks ? alan * +b.taks : null;
    const katSayi = b.kaks && b.taks ? +b.kaks / +b.taks : null, hmaxKat = b.hmax ? Math.floor(+b.hmax / 3) : null;
    const rayicDeger = b.rayic ? +b.rayic * (alan || +f.m2net || 0) : null;
    const virgul = (x, d = 2) => String(Number(x).toFixed(d)).replace('.', ',');
    sayfalar.push(`${rBaslik('İmar ve Yapılaşma')}
      <table class="r-tablo iki">${[['İmar durumu', b.imarTipi], ['Arsa alanı', alan ? sayiBicim(alan) + ' m²' : ''], ['KAKS (emsal)', b.kaks && virgul(b.kaks)], ['TAKS', b.taks && virgul(b.taks)], ['Hmax', b.hmax && virgul(b.hmax, 1) + ' m']].filter(([, x]) => x).map(([a, x]) => `<tr><th>${a}</th><td>${kac(x)}</td></tr>`).join('')}</table>
      ${insaat || taban ? `<div class="r-satir3">
        <div class="r-kutu"><b>${insaat ? sayiBicim(Math.round(insaat)) + ' m²' : '—'}</b><small>Toplam inşaat alanı (arsa × KAKS)</small></div>
        <div class="r-kutu"><b>${taban ? sayiBicim(Math.round(taban)) + ' m²' : '—'}</b><small>Taban oturumu (arsa × TAKS)</small></div>
        <div class="r-kutu"><b>${katSayi ? '≈ ' + Math.floor(katSayi) + ' kat' : '—'}</b><small>KAKS/TAKS oranı${hmaxKat ? ` · Hmax ile en çok ≈ ${hmaxKat} kat` : ''}</small></div></div>
        ${insaat && h.birimOrta && f.alt !== 'arsa' ? '' : ''}
        <div class="r-not">Hesap; emsale dahil olmayan alanları (bodrum, çatı, balkon muafiyetleri), çekme mesafelerini ve plan notlarını içermez. Kesin yapılaşma hakkı için belediyeden imar durum belgesi alınmalıdır.</div>` : ''}
      ${rayicDeger ? `${rBaslik('Belediye Rayiç Bedeli')}<div class="r-satir3">
        <div class="r-kutu"><b>${tl(+b.rayic)}</b><small>Rayiç m² birim değeri${b.rayicYil ? ' (' + kac(b.rayicYil) + ')' : ''}</small></div>
        <div class="r-kutu"><b>${tl(rayicDeger)}</b><small>Rayiç değer (${sayiBicim(alan || +f.m2net)} m²)</small></div>
        <div class="r-kutu"><b>${h.orta ? (h.orta / rayicDeger).toFixed(1).replace('.', ',') + ' kat' : '—'}</b><small>Piyasa değeri / rayiç değer</small></div></div>
        <div class="r-not">Rayiç bedel belediyenin emlak vergisi için belirlediği değerdir ve genellikle piyasa değerinin altındadır; tapu harcı ve vergi hesabında alt sınır olarak kullanılır. Değer kullanıcı tarafından girilmiştir.</div>` : ''}`);
  }
  // Saha ve dron görüntüleri
  if (h.saha?.length) sayfalar.push(`${rBaslik('Saha ve Dron Görüntüleri')}<div class="r-galeri r-galeri-${Math.min(h.saha.length, 4)}">${h.saha.map((u) => `<img src="${u}" crossorigin="anonymous" alt="">`).join('')}</div><div class="r-not">Görüntüler rapor sahibi tarafından eklenmiştir.</div>`);
  // C · Kullanıcı beyanı ve kredi
  const k = h.beyan;
  if (k && ['cephe', 'kat', 'manzara', 'otopark', 'site', 'tadilat', 'iskan', 'aidat', 'faiz', 'vade'].some((x) => k[x])) {
    const tutar = h.orta, kr = k.faiz && k.vade && !/Kiralık/.test(f.islem || '') ? krediHesabi(tutar, +k.faiz, +k.vade, +k.pesinat || 0) : null;
    sayfalar.push(`${rBaslik('Mülk Sahibinin Beyanı')}
      <table class="r-tablo iki">${[['Cephe', k.cephe], ['Bulunduğu kat', k.kat], ['Manzara', k.manzara], ['Otopark', k.otopark], ['Site içinde', k.site], ['Tadilat durumu', k.tadilat], ['Tapu / iskân', k.iskan], ['Aylık aidat', k.aidat ? tl(+k.aidat) : '']].filter(([, x]) => x).map(([a, x]) => `<tr><th>${a}</th><td>${kac(x)}</td></tr>`).join('')}</table>
      <div class="r-not">Bu bilgiler kullanıcı beyanıdır, doğrulanmamıştır; değer hesabına sayısal olarak eklenmez, alıcının değerlendirmesi için sunulur.</div>
      ${kr ? `${rBaslik('Konut Kredisi Hesabı')}<div class="r-satir3">
        <div class="r-kutu"><b>${tl(kr.taksit)}</b><small>Aylık taksit (${k.vade} ay, aylık %${String(k.faiz).replace('.', ',')})</small></div>
        <div class="r-kutu"><b>${tl(kr.pesinat)}</b><small>Peşinat (%${k.pesinat || 0})</small></div>
        <div class="r-kutu"><b>${tl(kr.toplam)}</b><small>Toplam geri ödeme · faiz ${tl(kr.faizToplam)}</small></div></div>
        ${k.aidat ? `<div class="r-not">Aylık toplam konut gideri (taksit + aidat): <b>${tl(kr.taksit + +k.aidat)}</b>.</div>` : ''}
        <div class="r-not">Hesap tahmini piyasa değeri (${tl(tutar)}) üzerinden, eşit taksitli kredi formülüyle yapılmıştır; banka masrafları ve vergiler dahil değildir.</div>` : ''}`);
  }
  return sayfalar;
}
