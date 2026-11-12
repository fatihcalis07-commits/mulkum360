// Mülküm360 — FAZ 2: İl yatırım endeksi. TÜİK satış akışı (tuik edge), TCMB KFE, değerleme ve kira verilerinden
// şeffaf, ağırlıklı 0–100 il yatırım skoru üretir. Bileşenlerden biri yoksa ağırlığı diğerlerine dağıtılır
// (eksik veri puanı şişirmesin); güven yüzdesi olarak gösterilir. Bu bir endekstir, yatırım tavsiyesi değildir.
// Bileşenler ve normalizasyon aralıkları (puan 0–100, doğrusal):
//   Fiyat büyümesi  · ağırlık 30 · bölge KFE 12 aylık değişim: %−10 → 0 … %50 → 100
//   Kira getirisi   · ağırlık 25 · brüt kira getirisi: %3 → 0 … %8 → 100
//   Talep momentumu · ağırlık 25 · TÜİK konut satışı yıllık değişim (il): %−30 → 0 … +%30 → 100
//   Kredi erişimi   · ağırlık 12 · ipotekli satış payı: %5 → 0 … %35 → 100
//   Fiyat değerleri · ağırlık  8 · il birim fiyatı / Türkiye ortalaması: 2,0× → 0 … 0,5× → 100 (ucuz = yüksek puan)

const YAT_AGIRLIK = { fiyat: 30, kira: 25, talep: 25, kredi: 12, deger: 8 };
const YAT_ARALIK = {
  fiyat: [-10, 50], kira: [3, 8], talep: [-30, 30], kredi: [5, 35], deger: [2.0, 0.5]
};
const yatPuan = (v, [a, b]) => { if (v === null || v === undefined || v === '' || !Number.isFinite(+v)) return null; const p = (+v - a) / (b - a) * 100; return Math.max(0, Math.min(100, p)); };

// Saf hesap: girdide ne varsa ağırlığı ondan; dönüş { skor, seviye, güven, bilesenler:[{ad,puan,agirlik,deger,birim}] }
function hesaplaYatirimEndeksi(d) {
  const girdi = [
    ['fiyat', 'Fiyat büyümesi', 'Bölge konut fiyat endeksi, son 12 ay', 'kfe', '%'],
    ['kira', 'Kira getirisi', 'Brüt yıllık kira getirisi', 'kira', '%'],
    ['talep', 'Talep momentumu', 'Konut satışı, yıllık değişim', 'satisYoy', '%'],
    ['kredi', 'Kredi erişimi', 'İpotekli satış payı', 'ipotekli', '%'],
    ['deger', 'Fiyat düzeyi', '㎡ fiyat / iller medyanı', 'oran', '×']
  ];
  const bilesenler = [], eksikler = [];
  for (const [k, ad, acik, alan, birim] of girdi) {
    const v = d[alan], puan = yatPuan(v, YAT_ARALIK[k]);
    if (puan == null) { eksikler.push(ad); continue; }
    bilesenler.push({ k, ad, acik, puan: Math.round(puan), agirlik: YAT_AGIRLIK[k], deger: +(+v).toFixed(1), birim });
  }
  const w = bilesenler.reduce((s, x) => s + x.agirlik, 0);
  if (!w) return { skor: null, seviye: 'veri yok', güven: 0, bilesenler: [], eksikler };
  const skor = Math.round(bilesenler.reduce((s, x) => s + x.puan * x.agirlik, 0) / w);
  const seviye = skor >= 75 ? 'güçlü' : skor >= 60 ? 'olumlu' : skor >= 45 ? 'dengeli' : skor >= 30 ? 'temkinli' : 'zayıf';
  return { skor, seviye, guven: Math.round(w / 100 * 100), bilesenler, eksikler };
}

// Canlı veri topla: TÜİK aylık satış geçmişi (il), ipotekli payı, KFE bölge serisi, birim fiyat, brüt kira getirisi
async function yatirimEndeksi(il) {
  const guncel = Date.now();
  const anahtar = 'yatendeks_' + il;
  try { const k = await kvAl(anahtar); if (k && k.t > guncel - 7 * 864e5 && k.il === il) return k.v; } catch (_) {}
  const bolge = kfeBolge(il);
  const g = await sb.from('bolge_gostergeleri').select('gosterge,donem,deger,birim').eq('il', il).eq('ilce', '')
    .in('gosterge', ['Konut satışı (aylık)', 'İpotekli satış payı', 'Brüt kira getirisi (hesaplanan)', 'Konut birim fiyatı (değerleme)'])
    .order('donem', { ascending: false }).limit(400);
  const rows = (g.data || []);
  const al = (ad, ay) => { const r = rows.find((x) => x.gosterge === ad && (!ay || x.donem === ay)); return r ? +r.deger : null; };
  const satis = rows.filter((x) => x.gosterge === 'Konut satışı (aylık)' && /^\d{4}-\d{2}$/.test(x.donem)).sort((a, b) => a.donem < b.donem ? 1 : -1);
  let satisYoy = null;
  if (satis.length) {
    const [son] = satis, y = +son.donem.slice(0, 4) - 1, m = son.donem.slice(5);
    const gec = satis.find((x) => x.donem === `${y}-${m}`);
    if (gec && +gec.deger > 0) satisYoy = (+son.deger / +gec.deger - 1) * 100;
  }
  const [{ data: kf }, { data: bir }] = await Promise.all([
    sb.from('kfe').select('donem,deger').eq('bolge', bolge).order('donem', { ascending: false }).limit(15),
    sb.from('bolge_gostergeleri').select('il,deger,donem').eq('ilce', '').eq('gosterge', 'Konut birim fiyatı (değerleme)').order('donem', { ascending: false })
  ]);
  let kfe = null;
  if (kf && kf.length >= 13) { const a = +kf[0].deger, b = +kf[12].deger; if (b > 0) kfe = (a / b - 1) * 100; }
  const birim = al('Konut birim fiyatı (değerleme)');
  // iller medyanı: her ilin en yeni ㎡ değerleme fiyatı → medyan (Türkiye geneli ayrı satır yok)
  const enYeni = {}; for (const r of bir || []) { if (!enYeni[r.il]) enYeni[r.il] = +r.deger; }
  const dizi = Object.values(enYeni).filter((v) => v > 0).sort((a, b) => a - b);
  const medyan = dizi.length ? (dizi.length % 2 ? dizi[(dizi.length - 1) / 2] : (dizi[dizi.length / 2 - 1] + dizi[dizi.length / 2]) / 2) : null;
  const d = { kfe, kira: al('Brüt kira getirisi (hesaplanan)'), satisYoy, ipotekli: al('İpotekli satış payı'), oran: birim && medyan ? birim / medyan : null };
  const v = hesaplaYatirimEndeksi(d);
  v.il = il; v.donem = satis[0] ? satis[0].donem : null;
  try { await kvYaz(anahtar, { t: Date.now(), il, v }); } catch (_) {}
  return v;
}

// Rapor/ekran bileşeni: skor rozeti + bileşen çubukları + dürüst kaynak notu
function yatirimEndeksiHtml(e) {
  if (!e || e.skor == null) return '';
  const renk = e.skor >= 60 ? '#2E7D32' : e.skor >= 45 ? '#B58A2B' : '#C8553D';
  const adlar = { guclu: 'güçlü', olumlu: 'olumlu', dengeli: 'dengeli', temkinli: 'temkinli', zayif: 'zayıf' };
  return `<div style="border:1px solid ${R_CIZGI};border-radius:14px;padding:14px 16px;margin:0 0 12px">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px">
      <div style="width:58px;height:58px;border-radius:50%;border:5px solid ${renk};display:flex;align-items:center;justify-content:center;font-size:21px;font-weight:800;color:${renk}">${e.skor}</div>
      <div><b style="font-size:16px">${kac(e.il)} yatırım endeksi: ${adlar[e.seviye] || kac(e.seviye)}</b>
      <div style="font-size:12px;opacity:.7">Bileşen verisinin %${e.guven}'iyle hesaplandı${e.donem ? ' · satış dönemi ' + kac(e.donem) : ''}</div></div>
    </div>
    ${e.bilesenler.map((b) => `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;font-size:12.5px">
      <span style="flex:0 0 108px">${b.ad}</span>
      <span style="flex:1;height:7px;background:${R_CIZGI};border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:${b.puan}%;background:${renk}"></i></span>
      <b style="flex:0 0 52px;text-align:right">${b.deger.toLocaleString('tr-TR')}${b.birim === '%' ? '%' : b.birim === '×' ? '×' : ''}</b>
      <small style="flex:0 0 30px;text-align:right;opacity:.65">${Math.round(b.agirlik / 100 * e.guven) || b.agirlik}p</small></div>`).join('')}
    <div style="font-size:11.5px;opacity:.7;margin-top:8px;line-height:1.5">Bileşenler: TCMB Konut Fiyat Endeksi (bölge, 12 ay), brüt kira getirisi, TÜİK konut satışı yıllık değişimi, ipotekli satış payı ve ㎡ fiyatın Türkiye ortalamasına oranı. Eksik bileşenlerin ağırlığı diğerlerine dağıtılır. Bu bir endeks göstergesidir; <b>yatırım tavsiyesi değildir</b>.</div>
  </div>`;
}
