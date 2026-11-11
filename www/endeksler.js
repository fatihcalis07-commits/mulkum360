// Piyasa Endeksleri (#/endeksler): Mülküm360 Endeks Bankası — son 10 yıl emlak ve otomobil.
// Veri: endeks_veri (endeks-topla edge fonksiyonu, TCMB EVDS + kendi ilanlarımız). 2016-01 = 100 tabanına göre kendi endekslerimiz hesaplanır.
const ENDEKS_ONB = {};
async function endeksSeri(kodlar, bolge = 'TR') {
  const k = kodlar.join(',') + '|' + bolge; if (ENDEKS_ONB[k]) return ENDEKS_ONB[k];
  const { data, error } = await sb.from('endeks_veri').select('kod,donem,deger').in('kod', kodlar).eq('bolge', bolge).gte('donem', '2016-01-01').order('donem').limit(5000);
  if (error) throw error;
  const s = {}; (data || []).forEach((r) => (s[r.kod] = s[r.kod] || []).push([r.donem, +r.deger]));
  return (ENDEKS_ONB[k] = s);
}
// Taban: ilk değer = 100
const tabanla = (l) => { if (!l || !l.length) return []; const b = l[0][1]; return l.map(([d, v]) => [d, (v / b) * 100]); };
// İki seriyi aynı aylarda böl (reel = nominal / TÜFE, dolar = TL / kur)
const bol = (a, b) => { const m = new Map(b.map(([d, v]) => [d, v])); return a.filter(([d]) => m.has(d)).map(([d, v]) => [d, v / m.get(d)]); };
const degisim = (l) => (l && l.length > 1 ? ((l[l.length - 1][1] / l[0][1]) - 1) * 100 : null);
const yuzdeY = (x) => (x == null ? '—' : (x >= 0 ? '+' : '') + Math.round(x).toLocaleString('tr-TR') + '%');
const sayiY = (x) => Math.round(x).toLocaleString('tr-TR');

// Sade SVG çizgi grafik: birden çok seri, yıl etiketleri
function cizgiGrafik(seriler, { yukseklik = 170, birim = '' } = {}) {
  const tum = seriler.flatMap((s) => s.l); if (!tum.length) return '<div class="k soluk">Veri yok</div>';
  const G = 320, H = yukseklik, P = 26;
  const t0 = Date.parse(tum.reduce((a, b) => (a[0] < b[0] ? a : b))[0]), t1 = Date.parse(tum.reduce((a, b) => (a[0] > b[0] ? a : b))[0]);
  const vmin = Math.min(...tum.map((x) => x[1])), vmax = Math.max(...tum.map((x) => x[1]));
  const x = (d) => P + ((Date.parse(d) - t0) / Math.max(1, t1 - t0)) * (G - P - 6), y = (v) => 8 + (1 - (v - vmin) / Math.max(1e-9, vmax - vmin)) * (H - 28);
  const yillar = []; for (let yl = new Date(t0).getFullYear(); yl <= new Date(t1).getFullYear(); yl += 2) yillar.push(yl);
  return `<svg viewBox="0 0 ${G} ${H}" class="endeks-grafik" role="img">
    ${[0, 0.5, 1].map((f) => { const v = vmin + (vmax - vmin) * f; return `<line x1="${P}" x2="${G - 4}" y1="${y(v)}" y2="${y(v)}" class="eg-izgara"/><text x="${P - 3}" y="${y(v) + 3}" class="eg-yazi" text-anchor="end">${v >= 10000 ? Math.round(v / 1000) + ' B' : Math.round(v).toLocaleString('tr-TR')}</text>`; }).join('')}
    ${yillar.map((yl) => `<text x="${x(yl + '-01-01')}" y="${H - 4}" class="eg-yazi" text-anchor="middle">${yl}</text>`).join('')}
    ${seriler.filter((s) => s.l.length < 8).map((s) => s.l.map(([d, v]) => `<circle cx="${x(d).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="${s.renk}"/>`).join('')).join('')}
    ${seriler.map((s) => `<polyline fill="none" stroke="${s.renk}" stroke-width="${s.kalin || 2}" stroke-linejoin="round" points="${s.l.map(([d, v]) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>`).join('')}
  </svg><div class="eg-lejant">${seriler.map((s) => `<span><i style="background:${s.renk}"></i>${s.ad}${birim ? '' : ''}</span>`).join('')}</div>`;
}

const ENDEKS_DURUM = { sekme: 'emlak', il: 'İstanbul' };
EKRAN.endeksler = async () => {
  const st = ENDEKS_DURUM;
  app.innerHTML = ustBar('Piyasa endeksleri') + `<div class="ic">
    <div class="segment endeks-sekme">${[['emlak', 'Emlak'], ['otomobil', 'Otomobil']].map(([k, a]) => `<button class="${st.sekme === k ? 'secili' : ''}" data-es="${k}">${a}</button>`).join('')}</div>
    <div id="endeksIc"><div class="bos">Yükleniyor…</div></div>
    <div class="k soluk" style="line-height:1.5">Mülküm360 Endeks Bankası · 2016 = 100. Kaynak: TCMB EVDS (konut fiyat endeksleri, değerleme raporlarına dayalı il birim fiyat ve kiraları, TÜİK tüketici fiyatları, döviz kurları) ve Mülküm360 ilanları. Aylık güncellenir.</div></div>`;
  navCiz();
  app.querySelectorAll('[data-es]').forEach((b) => (b.onclick = () => { st.sekme = b.dataset.es; EKRAN.endeksler(); }));
  const el = $('#endeksIc');
  try { el.innerHTML = st.sekme === 'emlak' ? await emlakEndeksHtml(st) : await otomobilEndeksHtml(); }
  catch (x) { el.innerHTML = bosDurum('uyari', 'Endeksler yüklenemedi', kac(hataMetni(x))); return; }
  const s = $('#endeksIl'); if (s) s.onchange = () => { st.il = s.value; EKRAN.endeksler(); };
};

async function emlakEndeksHtml(st) {
  const tr = await endeksSeri(['TP.KFE.TR', 'TP.YKFE.TR', 'TP.YOKFEND.TR', 'TP.TUKFIY2025.GENEL', 'TP.DK.USD.S.YTL', 'TP.TUKFIY2025.04110', 'TP.AKONUTSAT1.KTRTOPLAM', 'BIRIMFIYAT', 'BK']);
  const il = await endeksSeri(['BIRIMFIYAT', 'BK', 'M360.KONUT.M2', 'BETAM.SATILIK.M2', 'BETAM.KIRALIK.M2', 'ENDEKSA.M2'], st.il);
  const trR = await endeksSeri(['BETAM.SATILIK.M2', 'BETAM.KIRALIK.M2', 'ENDEKSA.M2', 'BIRIMFIYAT']);
  const kfe = tabanla(tr['TP.KFE.TR']), reel = tabanla(bol(tr['TP.KFE.TR'] || [], tr['TP.TUKFIY2025.GENEL'] || [])), dolar = tabanla(bol(tr['TP.KFE.TR'] || [], tr['TP.DK.USD.S.YTL'] || []));
  const fiyat = il.BIRIMFIYAT || [], kira = il.BK || [];
  const sonF = fiyat.at(-1), sonK = kira.at(-1);
  const getiri = sonF && sonK ? (sonK[1] * 12 / sonF[1]) * 100 : null;
  const iller = [...new Set(ILLER)].sort((a, b) => a.localeCompare(b, 'tr'));
  const kutu = (b, a, alt) => `<div class="endeks-kutu"><b>${b}</b><span>${a}</span>${alt ? `<small>${alt}</small>` : ''}</div>`;
  return `<div class="kart"><h3>Mülküm360 konut endeksi</h3>
      <div class="endeks-kutular">${kutu(yuzdeY(degisim(kfe)), 'Nominal (TL)', '2016’dan bu yana')}${kutu(yuzdeY(degisim(reel)), 'Reel', 'Enflasyondan arındırılmış')}${kutu(yuzdeY(degisim(dolar)), 'Dolar bazında', 'USD karşılığı')}</div>
      ${cizgiGrafik([{ ad: 'Reel', l: reel, renk: '#16A34A' }, { ad: 'Dolar bazında', l: dolar, renk: '#7C3AED' }])}
      <div class="k soluk">2016 Ocak = 100. Nominal endeks ${sayiY(kfe.at(-1)?.[1] || 0)} seviyesinde.</div></div>
    <div class="kart"><div class="satir"><h3 class="ara" style="margin:0">İl bazında konut fiyatı ve kira</h3><select id="endeksIl" class="endeks-sec">${iller.map((x) => `<option ${x === st.il ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      ${fiyat.length ? `<div class="endeks-kutular">${kutu(sayiY(sonF[1]) + ' TL', 'm² satış fiyatı', donemAdi(sonF[0]))}${sonK ? kutu(sayiY(sonK[1]) + ' TL', 'm² aylık kira', donemAdi(sonK[0])) : ''}${getiri ? kutu('%' + getiri.toLocaleString('tr-TR', { maximumFractionDigits: 1 }), 'Brüt kira getirisi', Math.round(100 / getiri) + ' yılda amorti') : ''}</div>
      ${cizgiGrafik([{ ad: 'm² fiyatı (TL)', l: fiyat, renk: '#1064BC' }])}
      ${kira.length ? cizgiGrafik([{ ad: 'm² kira (TL/ay)', l: kira, renk: '#EA580C' }], { yukseklik: 130 }) : ''}
      <div class="k soluk">${yuzdeY(degisim(fiyat))} fiyat artışı (${donemAdi(fiyat[0][0])} → ${donemAdi(sonF[0])}). TCMB değerleme raporlarına dayanır.${(il['M360.KONUT.M2'] || []).length ? ` Mülküm360 ilanlarında satılık konut m² ortancası: ${sayiY(il['M360.KONUT.M2'].at(-1)[1])} TL.` : ''}</div>`
      : await bolgeYedekHtml(st.il, tr)}</div>
    ${(() => { const k = ['BIRIMFIYAT', 'BETAM.SATILIK.M2', 'ENDEKSA.M2'].some((x) => (il[x] || []).length) ? il : trR, yer = k === il ? st.il : 'Türkiye';
      const sr = [{ ad: 'TCMB değerleme', l: k.BIRIMFIYAT || [], renk: '#1064BC' }, { ad: 'sahibindex ilan', l: k['BETAM.SATILIK.M2'] || [], renk: '#EA580C' }, { ad: 'Emlakjet & Endeksa', l: k['ENDEKSA.M2'] || [], renk: '#16A34A' }].filter((s) => s.l.length);
      if (!sr.length) return '';
      return `<div class="kart"><h3>Piyasa raporları karşılaştırması</h3><div class="k soluk">${yer} · konut m² fiyatı (TL)</div>${cizgiGrafik(sr)}
        <div class="liste endeks-tablo">${sr.map((s) => `<div class="oge"><span class="ara">${s.ad} <small class="soluk">${donemAdi(s.l.at(-1)[0])}</small></span><b>${sayiY(s.l.at(-1)[1])} TL</b></div>`).join('')}</div>
        <div class="k soluk">İlan fiyatları (sahibindex) pazarlık öncesi istenen fiyattır; TCMB değerleme fiyatları ekspertiz raporlarına dayanır. Kaynaklar kamuya açık aylık raporlardır.</div></div>`; })()}
    ${(() => { const n = S.ilanlar.filter((i) => i.durum === 'yayinda' && !i.ornek && i.ana === 'emlak').length;
      return `<div class="kart"><h3>Mülküm360 ilan verisi</h3><div class="k" style="line-height:1.5">Endeksimize her hafta yalnız gerçek ilanlar katılır (test ilanları hariç). Şu an <b>${n}</b> gerçek emlak ilanı var; bir ilde en az 3 ilan olunca o ilin m² ortancası endekse girer.</div>
        <div class="satir" style="gap:8px;margin-top:8px"><a class="btn tam" href="#/ver" style="flex:1">${ic('arti', 16, '#fff')}İlan ver</a><a class="btn cizgili" href="#/toplu" style="flex:1">Toplu aktarım</a></div></div>`; })()}
    <div class="kart"><h3>Yeni ve ikinci el konut</h3>${cizgiGrafik([{ ad: 'Yeni konut', l: tabanla(tr['TP.YKFE.TR']), renk: '#1064BC' }, { ad: 'İkinci el konut', l: tabanla(tr['TP.YOKFEND.TR']), renk: '#0F766E' }, { ad: 'Kira (TÜFE)', l: tabanla(tr['TP.TUKFIY2025.04110']), renk: '#EA580C' }])}</div>
    <div class="kart"><h3>Türkiye konut satışları (aylık)</h3>${cizgiGrafik([{ ad: 'Satış adedi', l: tr['TP.AKONUTSAT1.KTRTOPLAM'] || [], renk: '#475569', kalin: 1.5 }], { yukseklik: 130 })}
      <div class="k soluk">Son ay: ${sayiY((tr['TP.AKONUTSAT1.KTRTOPLAM'] || []).at(-1)?.[1] || 0)} konut.</div></div>`;
}

async function otomobilEndeksHtml() {
  const s = await endeksSeri(['TP.TUKFIY2025.07111', 'TP.TUKFIY2025.071', 'TP.TUKFIY2025.0722', 'TP.TUKFIY2025.0723', 'TP.TUKFIY2025.07211', 'TP.TUKFIY2025.07244', 'TP.TUKFIY2025.GENEL', 'TP.DK.USD.S.YTL', 'M360.OTOMOBIL.FIYAT']);
  const arac = tabanla(s['TP.TUKFIY2025.07111']), reel = tabanla(bol(s['TP.TUKFIY2025.07111'] || [], s['TP.TUKFIY2025.GENEL'] || [])), dolar = tabanla(bol(s['TP.TUKFIY2025.07111'] || [], s['TP.DK.USD.S.YTL'] || []));
  const kalem = [['TP.TUKFIY2025.0722', 'Akaryakıt', '#EA580C'], ['TP.TUKFIY2025.0723', 'Bakım ve onarım', '#1064BC'], ['TP.TUKFIY2025.07211', 'Lastik', '#475569'], ['TP.TUKFIY2025.07244', 'Araç kiralama', '#7C3AED']];
  const kutu = (b, a, alt) => `<div class="endeks-kutu"><b>${b}</b><span>${a}</span>${alt ? `<small>${alt}</small>` : ''}</div>`;
  const m360 = (s['M360.OTOMOBIL.FIYAT'] || []).at(-1);
  return `<div class="kart"><h3>Mülküm360 otomobil endeksi</h3>
      <div class="endeks-kutular">${kutu(yuzdeY(degisim(arac)), 'Nominal (TL)', '2016’dan bu yana')}${kutu(yuzdeY(degisim(reel)), 'Reel', 'Enflasyondan arındırılmış')}${kutu(yuzdeY(degisim(dolar)), 'Dolar bazında', 'USD karşılığı')}</div>
      ${cizgiGrafik([{ ad: 'Reel', l: reel, renk: '#16A34A' }, { ad: 'Dolar bazında', l: dolar, renk: '#7C3AED' }])}
      <div class="k soluk">Sıfır motorlu taşıt fiyatları (TÜİK TÜFE 07111), 2016 Ocak = 100.${m360 ? ` Mülküm360 otomobil ilanlarında fiyat ortancası: ${sayiY(m360[1])} TL.` : ''}</div></div>
    <div class="kart"><h3>Araç sahibi olma maliyeti</h3>
      <div class="liste endeks-tablo">${kalem.map(([k, ad]) => `<div class="oge"><span class="ara">${ad}</span><b>${yuzdeY(degisim(s[k]))}</b></div>`).join('')}</div>
      ${cizgiGrafik(kalem.map(([k, ad, renk]) => ({ ad, l: tabanla(s[k]), renk })))}
      <div class="k soluk">2016’dan bu yana fiyat değişimi; tüketici fiyat endeksi alt kalemleri.</div></div>`;
}
const donemAdi = (d) => { const t = new Date(d); return t.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }); };

// TCMB'nin il verisi yayınlamadığı iller (Ardahan, Bayburt, Gümüşhane, Hakkari, Tunceli): bölge ortalaması
async function bolgeYedekHtml(il, tr) {
  const b = typeof kfeBolge === 'function' ? kfeBolge(il) : 'TR';
  const komsu = (typeof KFE_BOLGE !== 'undefined' && KFE_BOLGE[b] ? KFE_BOLGE[b] : []).filter((x) => x !== il);
  const { data: kf } = await sb.from('kfe').select('donem,deger').eq('bolge', b).gte('donem', '2016-01-01').order('donem');
  const kfe = (kf || []).map((r) => [r.donem, +r.deger]);
  const son = {}; // komşu illerin son m² fiyat ve kirası
  if (komsu.length) {
    const { data } = await sb.from('endeks_veri').select('kod,bolge,donem,deger').in('kod', ['BIRIMFIYAT', 'BK']).in('bolge', komsu).order('donem', { ascending: false }).limit(400);
    (data || []).forEach((r) => { const k = r.kod + '|' + r.bolge; if (!son[k]) son[k] = r; });
  }
  const ort = (kod) => { const l = Object.values(son).filter((r) => r.kod === kod); return l.length ? [l.reduce((t, r) => t + +r.deger, 0) / l.length, l[0].donem, l.length] : null; };
  const f = ort('BIRIMFIYAT'), k = ort('BK');
  const reel = tabanla(bol(kfe, tr['TP.TUKFIY2025.GENEL'] || []));
  const kutu = (x, y, z) => `<div class="endeks-kutu"><b>${x}</b><span>${y}</span>${z ? `<small>${z}</small>` : ''}</div>`;
  return `<div class="bilgi-k" style="margin:8px 0">${ic('bilgi', 16)}<div>TCMB ${kac(il)} için il düzeyinde veri yayınlamıyor (değerleme sayısı az). Aşağıdaki değerler <b>bölge ortalamasıdır</b>${(() => { const v = [...new Set(Object.values(son).map((r) => r.bolge))]; return v.length ? ` (${v.map(kac).join(', ')})` : ''; })()}.</div></div>
    ${f ? `<div class="endeks-kutular">${kutu(sayiY(f[0]) + ' TL', 'm² fiyatı · bölge ort.', donemAdi(f[1]))}${k ? kutu(sayiY(k[0]) + ' TL', 'm² kira · bölge ort.', donemAdi(k[1])) : ''}${f && k ? kutu('%' + ((k[0] * 12 / f[0]) * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 }), 'Brüt kira getirisi', 'bölge ortalaması') : ''}</div>` : ''}
    ${kfe.length ? `${cizgiGrafik([{ ad: 'Bölge konut fiyat endeksi (2016=100)', l: tabanla(kfe), renk: '#1064BC' }, { ad: 'Reel', l: reel, renk: '#16A34A' }])}
    <div class="k soluk">TCMB bölgesel konut fiyat endeksi: 2016'dan bu yana nominal ${yuzdeY(degisim(kfe))}, reel ${yuzdeY(degisim(reel))}.</div>` : '<div class="k soluk">Bu il için veri bulunamadı.</div>'}`;
}
