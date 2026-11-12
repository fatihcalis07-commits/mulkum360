// Bölge konut fiyat endeksi kartı (ilan sayfası): TCMB KFE (aylık, 2023=100) ile son 10 yılda değişim,
// il birim fiyatından (TCMB değerleme, TL/m²) geriye doğru tahmini m² fiyatları ve yıllık grafik.
const KFE_BOLGE = {
  TR10: ['İstanbul'], TR21: ['Edirne', 'Kırklareli', 'Tekirdağ'], TR22: ['Balıkesir', 'Çanakkale'], TR31: ['İzmir'],
  TR32: ['Aydın', 'Denizli', 'Muğla'], TR33: ['Afyonkarahisar', 'Kütahya', 'Manisa', 'Uşak'], TR41: ['Bursa', 'Eskişehir', 'Bilecik'],
  TR42: ['Bolu', 'Kocaeli', 'Sakarya', 'Yalova', 'Düzce'], TR51: ['Ankara'], TR52: ['Konya', 'Karaman'], TR61: ['Antalya', 'Burdur', 'Isparta'],
  TR62: ['Adana', 'Mersin'], TR63: ['Hatay', 'Kahramanmaraş', 'Osmaniye'],
  TR7: ['Nevşehir', 'Niğde', 'Kırıkkale', 'Kırşehir', 'Aksaray', 'Kayseri', 'Sivas', 'Yozgat'],
  TR8: ['Zonguldak', 'Karabük', 'Bartın', 'Kastamonu', 'Çankırı', 'Sinop', 'Samsun', 'Tokat', 'Çorum', 'Amasya'],
  TR9: ['Trabzon', 'Ordu', 'Giresun', 'Rize', 'Artvin', 'Gümüşhane'], TRA: ['Erzurum', 'Erzincan', 'Bayburt', 'Ağrı', 'Kars', 'Iğdır', 'Ardahan'],
  TRB: ['Malatya', 'Elazığ', 'Bingöl', 'Tunceli', 'Van', 'Muş', 'Bitlis', 'Hakkari'],
  TRC: ['Gaziantep', 'Adıyaman', 'Kilis', 'Şanlıurfa', 'Diyarbakır', 'Mardin', 'Batman', 'Şırnak', 'Siirt']
};
const kfeBolge = (il) => Object.keys(KFE_BOLGE).find((k) => KFE_BOLGE[k].includes(il)) || 'TR';
const KFE_ONBELLEK = {};

// Mahalle m² fiyatı: uygulamadaki aynı mahalle → ilçe → il satılık konut ilanları (satılanlarda gerçekleşen fiyat).
// En az 3 ilan olan ilk düzey kullanılır; test ilanları da sayılır (yayına çıkınca silinecekler).
function mahalleM2(i) {
  const f = i.alanlar || {}, ortanca = (l) => medyan(l), ortancaEski = (l) => { const s = [...l].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
  const uygun = S.ilanlar.filter((x) => x.ana === 'emlak' && x.alt === i.alt && x.il === i.il && /Satılık/.test((x.alanlar || {}).islem || '') && +(x.alanlar || {}).m2net > 0 && ['yayinda', 'satildi'].includes(x.durum));
  const m2 = (x) => (+x.satis_fiyati > 0 ? +x.satis_fiyati : +x.fiyat) / +x.alanlar.m2net;
  const duzey = [
    f.mahalle && i.ilce ? [`${f.mahalle} Mahallesi`, 'mahalle', uygun.filter((x) => x.ilce === i.ilce && (x.alanlar || {}).mahalle === f.mahalle)] : null,
    i.ilce ? [i.ilce, 'ilçe', uygun.filter((x) => x.ilce === i.ilce)] : null,
    [i.il, 'il', uygun]
  ].filter(Boolean);
  for (const [ad, tur, l] of duzey) { const v = l.filter((x) => x.id !== i.id).map(m2).filter((x) => x > 100 && x < 5e6); if (v.length >= 3) return { ad, tur, deger: ortanca(v), n: v.length }; }
  return null;
}

async function endeksKartiYukle(i) {
  const kap = document.getElementById('endeksK'); if (!kap) return;
  const bolge = kfeBolge(i.il), mh = mahalleM2(i), f0 = i.alanlar || {};
  const ad = f0.mahalle ? `${f0.mahalle} Mahallesi` : i.ilce || i.il;
  try {
    const getir = async (b) => KFE_ONBELLEK[b] = KFE_ONBELLEK[b] || (await islem(sb.from('kfe').select('donem,deger').eq('bolge', b).order('donem'))).map((r) => ({ t: new Date(r.donem), v: +r.deger }));
    const [seri, tr, bf] = await Promise.all([getir(bolge), bolge === 'TR' ? null : getir('TR'),
      sb.from('bolge_gostergeleri').select('deger,donem').eq('il', i.il).eq('ilce', '').eq('gosterge', 'Konut birim fiyatı (değerleme)').order('donem', { ascending: false }).limit(1)]);
    if (!document.getElementById('endeksK') || !seri.length) { kap.remove(); return; }
    const son = seri[seri.length - 1];
    const once = (yil, s = seri) => { const h = new Date(son.t); h.setFullYear(h.getFullYear() - yil); return s.find((x) => x.t >= h) || null; };
    const degisim = (yil, s = seri) => { const o = once(yil, s); return o ? (s[s.length - 1].v / o.v - 1) * 100 : null; };
    const yuzde = (x) => x == null ? '—' : (x >= 0 ? '+' : '') + '%' + Math.round(x).toLocaleString('tr-TR');
    const kat = (yil) => { const o = once(yil); return o ? son.v / o.v : null; };
    const ilBirim = bf && bf.data && bf.data[0] ? +bf.data[0].deger : null;
    // Geriye tahmin için başlangıç: mahalle (ya da ilçe) ortancası, yoksa TCMB il değerleme birim fiyatı
    const birim = mh ? mh.deger : ilBirim;
    // Yıllık grafik: her yılın son ayı (son 10 yıl + bu yıl), bölge ve Türkiye 10 yıl önce = 100'e göre
    const yillar = []; for (let y = son.t.getFullYear() - 10; y <= son.t.getFullYear(); y++) yillar.push(y);
    const yilSonu = (s, y) => { const l = s.filter((x) => x.t.getFullYear() === y); return l.length ? l[l.length - 1].v : null; };
    const b0 = yilSonu(seri, yillar[0]), t0 = tr ? yilSonu(tr, yillar[0]) : null;
    const nb = yillar.map((y) => { const v = yilSonu(seri, y); return v && b0 ? (v / b0) * 100 : null; });
    const nt = tr ? yillar.map((y) => { const v = yilSonu(tr, y); return v && t0 ? (v / t0) * 100 : null; }) : [];
    const ust = Math.max(...nb.filter(Boolean), ...nt.filter(Boolean)), W = 320, H = 140, x = (n) => 22 + n * ((W - 34) / (yillar.length - 1)), yk = (v) => H - 22 - (v / ust) * (H - 40);
    const cizgi = (l) => l.map((v, n) => v == null ? '' : `${n && l[n - 1] != null ? 'L' : 'M'}${x(n).toFixed(1)},${yk(v).toFixed(1)}`).join('');
    const grafik = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${ad} konut fiyat endeksi, son 10 yıl">
      ${tr ? `<path d="${cizgi(nt)}" fill="none" stroke="var(--soluk)" stroke-width="2" stroke-dasharray="4 4"/>` : ''}
      <path d="${cizgi(nb)}" fill="none" stroke="var(--vurgu-ikon)" stroke-width="3" stroke-linejoin="round"/>
      ${nb.map((v, n) => v == null ? '' : `<circle cx="${x(n)}" cy="${yk(v)}" r="3" fill="var(--vurgu-ikon)"><title>${yillar[n]}: ${Math.round(v)} (10 yıl önce = 100)</title></circle>`).join('')}
      ${yillar.map((y, n) => n % 2 === 0 || n === yillar.length - 1 ? `<text x="${x(n)}" y="${H - 6}" text-anchor="middle" font-size="9" fill="var(--soluk)">${y}</text>` : '').join('')}
      <line x1="16" y1="${H - 21.5}" x2="${W - 8}" y2="${H - 21.5}" stroke="var(--cizgi)"/></svg>`;
    const m2 = i.ana === 'emlak' && +(i.alanlar || {}).m2net > 0 ? i.fiyat / i.alanlar.m2net : null;
    const tahmin = (yil) => birim && kat(yil) ? birim / kat(yil) : null;
    const bolgeAd = bolge === 'TR' ? 'Türkiye' : KFE_BOLGE[bolge].length === 1 ? KFE_BOLGE[bolge][0] : `${i.il} bölgesi`;
    kap.innerHTML = `<h3>${kac(ad)} konut endeksi</h3>
      <div class="k soluk" style="margin:-4px 0 10px">${[i.ilce, i.il].filter(Boolean).map(kac).join(', ')} · fiyat değişimi TCMB endeksi, ${son.t.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</div>
      ${mh ? `<div class="satir" style="gap:12px;background:var(--vurgu-acik);border-radius:14px;padding:12px 14px;margin-bottom:10px"><div class="ara"><div class="k" style="font-weight:600">${kac(mh.ad)} ortalama m²</div><div class="k soluk" style="font-size:12px">${mh.n} ilanın ortalaması${mh.tur !== 'mahalle' ? ` · mahallede yeterli ilan yok, ${mh.tur} geneli` : ''}</div></div><b style="font-size:20px">${tl(mh.deger)}</b></div>` : ''}
      ${mh && f0.kat && typeof katEtki === 'function' && katEtki(f0.kat) !== 1 ? `<div class="k soluk" style="margin:-4px 0 10px">${kac(f0.kat)} için kat etkisi ${katYuzde(f0.kat)} · bu kat için beklenen m² <b>${tl(mh.deger * katEtki(f0.kat))}</b></div>` : ''}
      <div class="perf-izgara" style="grid-template-columns:repeat(3,1fr);margin:0 0 10px">
        ${[[1, 'Son 1 yıl'], [5, 'Son 5 yıl'], [10, 'Son 10 yıl']].map(([y, a]) => { const k = kat(y), d = degisim(y);
          // %200'ü aşan artış "kat" olarak (kutuya sığsın, daha anlaşılır olsun), yüzde alt satırda
          return `<div class="perf-kutu"><b>${k == null ? '—' : k >= 3 ? (k >= 10 ? Math.round(k) : k.toFixed(1).replace('.', ',')) + ' kat' : yuzde(d)}</b><span>${a}</span>${k != null && k >= 3 ? `<small>${yuzde(d)}</small>` : ''}</div>`; }).join('')}
      </div>
      ${grafik}
      <div class="satir k" style="gap:14px;margin:2px 0 8px"><span class="satir" style="gap:6px"><i style="width:14px;height:3px;background:var(--vurgu-ikon);display:inline-block"></i>${kac(bolgeAd)}</span>${tr ? '<span class="satir" style="gap:6px"><i style="width:14px;border-top:2px dashed var(--soluk);display:inline-block"></i>Türkiye</span>' : ''}</div>
      ${birim ? `<div class="bilgi-tablo">
        ${mh ? '' : `<div><span>${kac(i.il)} ortalama m² (bugün)</span><b>${tl(birim)}</b></div>`}
        ${[1, 5, 10].map((y) => tahmin(y) ? `<div><span>${kac(mh ? mh.ad : i.il)} m², ${son.t.getFullYear() - y} (tahmini)</span><b>${tl(tahmin(y))}</b></div>` : '').join('')}
        ${m2 ? `<div><span>Bu ilanın m² fiyatı</span><b>${tl(m2)} <small class="soluk" style="font-weight:500">(${m2 >= birim ? '+' : ''}%${Math.round((m2 / birim - 1) * 100)})</small></b></div>` : ''}
        ${mh && ilBirim ? `<div><span>${kac(i.il)} geneli m² (TCMB)</span><b>${tl(ilBirim)}</b></div>` : ''}
      </div>` : ''}
      <div class="k soluk" style="font-size:12px;margin-top:8px;line-height:1.5">${mh ? `Bugünkü m² fiyatı Mülküm360'taki ${kac(mh.ad)} satılık ilanlarından hesaplanır.` : `Bugünkü m² fiyatı TCMB'nin ${kac(i.il)} değerleme verisidir; mahallede yeterli ilan olunca mahalle fiyatı gösterilir.`} Mahalle düzeyinde resmî endeks yayımlanmadığından geçmiş fiyatlar, TCMB Konut Fiyat Endeksi'nin ${bolge === 'TR' ? 'Türkiye geneli' : KFE_BOLGE[bolge].length > 1 ? `${KFE_BOLGE[bolge].join(', ')} bölgesi` : `${KFE_BOLGE[bolge][0]}`} değişimiyle geriye hesaplanan tahminlerdir. Rakamlar enflasyondan arındırılmamıştır.</div>`;
  } catch (x) { console.error('endeks', x); kap.remove(); }
  // İl yatırım endeksi şeridi (FAZ 2, TÜİK+TCMB): kartı bloklamadan sonuna eklenir
  if (i.il && typeof yatirimEndeksi === 'function') yatirimEndeksi(i.il).then((e) => { const k2 = document.getElementById('endeksK'); if (k2 && e && e.skor != null && !k2.querySelector('.yat-endeks')) { const d = document.createElement('div'); d.className = 'yat-endeks'; d.innerHTML = yatirimEndeksiHtml(e); k2.appendChild(d); } }).catch(() => {});
}
