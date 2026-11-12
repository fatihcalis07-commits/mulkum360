// Emlakçı performansı (#/performans): satılan / kiralanan ilanlar, hacim, süre, pazarlık payı, tahmini komisyon, aylık grafik.
// Kapanış tarihi ilanlar.kapanis (yoksa son güncelleme). Gerçekleşen fiyat ilanlar.satis_fiyati (yoksa ilan fiyatı).
const PERF_DONEM = [['ay', 'Bu ay'], ['3ay', 'Son 3 ay'], ['yil', 'Bu yıl'], ['tum', 'Tümü']];
let perfAyar = { donem: 'yil', satisYuzde: 2, taraf: 1 };
try { Object.assign(perfAyar, JSON.parse(localStorage.getItem('perfAyar') || '{}')); } catch (_) {}

EKRAN.performans = async () => {
  if (girisGerek('Performansını görmek için giriş yap')) return;
  const b = ben();
  app.innerHTML = ustBar('Performans raporu') + `<div class="ic">${bosDurum('grafik', 'Yükleniyor…', '')}</div>`;
  navCiz('hesap');
  let ilanlar;
  try { ilanlar = (await islem(sb.from('ilanlar').select('*').eq('sahip', b.id).order('olusturma', { ascending: false }))).map(ilanEsle); }
  catch (x) { ilanlar = S.ilanlar.filter((i) => i.sahip === b.id); }
  if (!location.hash.startsWith('#/performans')) return;
  perfCiz(ilanlar);
};

function perfCiz(ilanlar) {
  const simdi = new Date(), A = perfAyar;
  const bas = A.donem === 'ay' ? new Date(simdi.getFullYear(), simdi.getMonth(), 1) : A.donem === '3ay' ? new Date(simdi.getFullYear(), simdi.getMonth() - 2, 1) : A.donem === 'yil' ? new Date(simdi.getFullYear(), 0, 1) : new Date(0);
  const kapanis = (i) => i.kapanis || i.guncelleme || i.olusturma;
  const kira = (i) => /Kiral/.test((i.alanlar || {}).islem || '');
  const kapali = ilanlar.filter((i) => i.durum === 'satildi' && kapanis(i) >= +bas && !i.ornek);
  const satilan = kapali.filter((i) => !kira(i)), kiralanan = kapali.filter(kira);
  const gercek = (i) => +i.satis_fiyati > 0 ? +i.satis_fiyati : +i.fiyat;
  const top = (l) => l.reduce((s, i) => s + gercek(i), 0);
  const ort = (l, f) => { const v = l.map(f).filter((x) => isFinite(x)); return v.length ? v.reduce((a, c) => a + c, 0) / v.length : null; };
  const gun = (i) => Math.max(0, Math.round((kapanis(i) - i.olusturma) / 864e5));
  const pazarlik = (l) => ort(l.filter((i) => +i.satis_fiyati > 0 && +i.fiyat > 0), (i) => (1 - i.satis_fiyati / i.fiyat) * 100);
  // Tahmini komisyon: satışta fiyatın %X'i (taraf sayısıyla), kirada 1 aylık kira; KDV hariç
  const komSatis = top(satilan) * (A.satisYuzde / 100) * A.taraf, komKira = top(kiralanan) * A.taraf;
  const aktif = ilanlar.filter((i) => i.durum === 'yayinda' && !i.ornek);
  const gor = ilanlar.reduce((s, i) => s + (i.goruntulenme || 0), 0);
  const sohbet = (S.sohbetler || []).filter((s) => ilanlar.some((i) => i.id === s.ilanId && s.mesajlar?.length)).length;
  const oran = ilanlar.filter((i) => !i.ornek).length ? Math.round((ilanlar.filter((i) => i.durum === 'satildi' && !i.ornek).length / ilanlar.filter((i) => !i.ornek).length) * 100) : 0;

  // Son 12 ay: satılan ve kiralanan adet
  const aylar = [...Array(12)].map((_, n) => { const d = new Date(simdi.getFullYear(), simdi.getMonth() - 11 + n, 1); return { d, s: 0, k: 0 }; });
  ilanlar.filter((i) => i.durum === 'satildi' && !i.ornek).forEach((i) => { const t = new Date(kapanis(i)); const a = aylar.find((x) => x.d.getFullYear() === t.getFullYear() && x.d.getMonth() === t.getMonth()); if (a) kira(i) ? a.k++ : a.s++; });
  const enYuksek = Math.max(1, ...aylar.map((a) => a.s + a.k));
  const grafik = `<svg viewBox="0 0 336 150" width="100%" role="img" aria-label="Son 12 ay satılan ve kiralanan ilan sayısı">
    ${aylar.map((a, n) => { const x = 6 + n * 27.5, hs = (a.s / enYuksek) * 108, hk = (a.k / enYuksek) * 108;
      return `<rect x="${x}" y="${118 - hs}" width="18" height="${hs}" rx="3" fill="var(--murekkep)"><title>${a.s} satış</title></rect>
        <rect x="${x}" y="${118 - hs - hk}" width="18" height="${hk}" rx="3" fill="var(--vurgu)"><title>${a.k} kiralama</title></rect>
        ${a.s + a.k ? `<text x="${x + 9}" y="${112 - hs - hk}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--murekkep)">${a.s + a.k}</text>` : ''}
        <text x="${x + 9}" y="136" text-anchor="middle" font-size="9" fill="var(--soluk)">${a.d.toLocaleDateString('tr-TR', { month: 'short' })}</text>`; }).join('')}
    <line x1="0" y1="118.5" x2="336" y2="118.5" stroke="var(--cizgi)"/></svg>`;

  // İlçe kırılımı
  const ilce = {}; kapali.forEach((i) => { const k = [i.ilce, i.il].filter(Boolean).join(', ') || 'Belirtilmemiş'; ilce[k] = (ilce[k] || 0) + 1; });
  const ilceL = Object.entries(ilce).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const kutu = (deger, ad, alt = '') => `<div class="perf-kutu"><b>${deger}</b><span>${ad}</span>${alt ? `<small>${alt}</small>` : ''}</div>`;
  const pS = pazarlik(satilan), gS = ort(satilan, gun), gK = ort(kiralanan, gun);
  app.querySelector('.ic').innerHTML = `
    <div class="ciplar" id="perfDonem">${PERF_DONEM.map(([k, a]) => `<button class="cip ${k === A.donem ? 'secili' : ''}" data-donem="${k}">${a}</button>`).join('')}</div>
    <div class="perf-izgara">
      ${kutu(satilan.length, 'Satılan', satilan.length ? tl(top(satilan)) : '')}
      ${kutu(kiralanan.length, 'Kiralanan', kiralanan.length ? tl(top(kiralanan)) + '/ay' : '')}
      ${kutu(gS != null ? Math.round(gS) + ' gün' : '—', 'Ort. satış süresi')}
      ${kutu(gK != null ? Math.round(gK) + ' gün' : '—', 'Ort. kiralama süresi')}
      ${kutu(pS != null ? '%' + pS.toFixed(1).replace('.', ',') : '—', 'Ort. pazarlık payı', pS != null ? 'ilan fiyatından' : 'gerçekleşen fiyat girilmemiş')}
      ${kutu('%' + oran, 'Kapanma oranı', 'tüm ilanlarına göre')}
    </div>
    <div class="kart"><div class="satir"><h3 class="ara" style="margin:0">Tahmini komisyon</h3><b style="font-size:20px">${tl(komSatis + komKira)}</b></div>
      <div class="k soluk" style="margin:4px 0 8px">Satış: ${tl(komSatis)} · Kira: ${tl(komKira)} (KDV hariç, tahmini)</div>
      <div class="izgara2"><label class="alan">Satış komisyonu %<input id="pYuzde" inputmode="decimal" value="${String(A.satisYuzde).replace('.', ',')}"></label>
      <label class="alan">Taraf<select id="pTaraf"><option value="1" ${A.taraf == 1 ? 'selected' : ''}>Tek taraf</option><option value="2" ${A.taraf == 2 ? 'selected' : ''}>Alıcı + satıcı</option></select></label></div>
      <div class="k soluk" style="font-size:12px">Kirada komisyon 1 aylık kira bedeli olarak hesaplanır. Kendi anlaşmanı yaz; hesap yalnız sende saklanır.</div></div>
    <div class="kart"><h3>Son 12 ay</h3>${grafik}
      <div class="satir k" style="gap:14px;margin-top:4px"><span class="satir" style="gap:6px"><i style="width:12px;height:12px;border-radius:3px;background:var(--murekkep);display:inline-block"></i>Satış</span><span class="satir" style="gap:6px"><i style="width:12px;height:12px;border-radius:3px;background:var(--vurgu);display:inline-block"></i>Kiralama</span></div></div>
    <div class="perf-izgara">
      ${kutu(aktif.length, 'Yayındaki ilan')}
      ${kutu(sayiBicim(gor), 'Toplam görüntülenme')}
      ${kutu(sohbet, 'Mesajlaşma')}
    </div>
    ${ilceL.length ? `<div class="kart"><h3>En çok kapanan bölgeler</h3><div class="bilgi-tablo">${ilceL.map(([k, n]) => `<div><span>${kac(k)}</span><b>${n} ilan</b></div>`).join('')}</div></div>` : ''}
    <div class="kart"><h3>Kapanan ilanlar (${kapali.length})</h3>
      ${kapali.length ? `<div class="bilgi-tablo">${kapali.sort((a, c) => kapanis(c) - kapanis(a)).map((i) => {
        const fark = +i.satis_fiyati > 0 && +i.fiyat > 0 ? (i.satis_fiyati / i.fiyat - 1) * 100 : null;
        return `<a href="#/ilan/${i.id}" style="display:flex;flex-direction:column;gap:2px;padding:11px 2px;border-bottom:1px solid var(--cizgi);text-decoration:none;color:inherit">
          <div class="satir" style="gap:8px"><b class="ara" style="font-size:14px;font-weight:600;text-align:left">${kac(i.baslik)}</b><span style="flex-shrink:0;font-size:12px;font-weight:700;padding:3px 8px;border-radius:999px;background:var(--vurgu-acik);color:var(--vurgu-koyu)">${kira(i) ? 'Kiralandı' : 'Satıldı'}</span></div>
          <span class="k soluk">${tl(gercek(i))}${kira(i) ? '/ay' : ''}${fark != null ? ` · ilan ${tl(+i.fiyat)} (${fark > 0 ? '+' : ''}${fark.toFixed(1).replace('.', ',')}%)` : ''} · ${gun(i)} gün · ${new Date(kapanis(i)).toLocaleDateString('tr-TR')}</span></a>`; }).join('')}</div>`
      : `<div class="k soluk">Bu dönemde kapanan ilan yok. İlanın satılınca ya da kiralanınca ilan sayfasındaki <b>Satıldı / Kiralandı</b> düğmesine bas; istersen gerçekleşen fiyatı da yaz.</div>`}</div>
    <div class="k soluk" style="font-size:12px;margin:8px 2px">Test ilanları hesaba katılmaz. Gerçekleşen fiyat girilmeyen ilanlarda ilan fiyatı kullanılır.</div>`;
  app.querySelectorAll('[data-donem]').forEach((x) => (x.onclick = () => { perfAyar.donem = x.dataset.donem; perfKaydet(); perfCiz(ilanlar); }));
  const y = $('#pYuzde'), t = $('#pTaraf');
  y.onchange = () => { const v = +String(y.value).replace(',', '.'); if (v >= 0 && v <= 20) { perfAyar.satisYuzde = v; perfKaydet(); perfCiz(ilanlar); } else toast('Komisyon 0–20 arasında olmalı'); };
  t.onchange = () => { perfAyar.taraf = +t.value; perfKaydet(); perfCiz(ilanlar); };
}
function perfKaydet() { try { localStorage.setItem('perfAyar', JSON.stringify(perfAyar)); } catch (_) {} }
