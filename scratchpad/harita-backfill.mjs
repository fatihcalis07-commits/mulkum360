// MODÜL 13 FAZ 5 — emlak ilanlarına koordinat doldurma (backfill). İdempotent: yalnız enlem'i olmayan satırları çözer.
// Kaynak YALNIZ ilanın kendi verisi: TKGM parsel edge (ada/parsel) → Photon veya Nominatim (sokak→mahalle→ilçe). Scrape YOK.
// Kullanım: node scratchpad/harita-backfill.mjs [cikti.sql] [nominatim|photon]
//   Photon komoot hız sınırına takılırsa nominatim kullan (1 istek/sn kuralına uyulur, UA tanımlı).
import fs from 'node:fs';
const CIKTI = process.argv[2] || 'harita-backfill.sql';
const SAGLAYICI = process.argv[3] === 'nominatim' ? 'nominatim' : 'photon';
const SB = 'https://klnabwqduyavaqmbzxpo.supabase.co';
const K = 'sb_publishable_3eqaHNFBU3_r4WfYx_qvCg_DZfaor5c'; // herkese açık (publishable) anahtar — RLS güvenli
const BAS = { apikey: K, Authorization: 'Bearer ' + K };
const UA = 'mulkum360-harita/1.0 (+https://mulkum360.app)';
const kuc = (x) => String(x || '').toLocaleLowerCase('tr-TR').trim();
const al = async (u, o) => { try { const r = await fetch(u, { signal: AbortSignal.timeout(15000), ...o }); return r.ok ? await r.json() : null; } catch { return null; } };
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
// i/420 photon'da, i/1150 nominatim'de (1 sn kuralı + tampon)
const ARALIK = SAGLAYICI === 'nominatim' ? 1150 : 420;

const uyumlu = (p, il, ilce) => {
  if (!p || p.countrycode !== 'TR') return false;
  return (!il || [p.state, p.city, p.county].some((x) => kuc(x) === kuc(il))) && (!ilce || [p.county, p.city, p.district].some((x) => kuc(x) === kuc(ilce)));
};
const sorguCoz = async (q, tag) => {
  if (SAGLAYICI === 'photon') {
    const r = await al(`https://photon.komoot.io/api/?limit=6&lang=default${tag ? '&' + tag : ''}&q=${encodeURIComponent(q)}`, { headers: { 'user-agent': UA } });
    const ft = ((r && r.features) || []).find((x) => uyumlu(x.properties, ilG, ilceG));
    return ft ? { lat: ft.geometry.coordinates[1], lon: ft.geometry.coordinates[0] } : null;
  }
  const r = await al(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=tr&addressdetails=1&q=${encodeURIComponent(q)}`, { headers: { 'user-agent': UA } });
  // addressdetail genelde dolu gelir; yine de display_name (her zaman var) ana çapadır. İl ve ilçe adını içermeyi şart koş.
  const ok = (x) => {
    const a = x.address || {};
    const disp = kuc(x.display_name || '');
    if (String(a.country_code || '').toLowerCase() && String(a.country_code || '').toLowerCase() !== 'tr') return false;
    if (disp && !/türk/.test(disp) && !/\btürkiye\b|\bturkiye\b/.test(disp)) return false; // Türkiye dışı elensin
    if (ilG && !disp.includes(kuc(ilG)) && ![a.state, a.city, a.county, a.municipality].some((v) => kuc(v) === kuc(ilG))) return false;
    if (ilceG && !disp.includes(kuc(ilceG)) && ![a.city, a.town, a.village, a.municipality, a.county, a.district].some((v) => kuc(v) === kuc(ilceG))) return false;
    return true;
  };
  const arr = (Array.isArray(r) ? r : []);
  const ft = arr.find(ok);
  return ft ? { lat: +ft.lat, lon: +ft.lon } : null;
};

let ilG = '', ilceG = '';
const satirlar = await al(`${SB}/rest/v1/ilanlar?select=id,il,ilce,alanlar&durum=eq.yayinda&ana=eq.emlak&limit=3000`, { headers: BAS });
if (!Array.isArray(satirlar)) { console.error('REST erişilemedi'); process.exit(1); }
const eksik = satirlar.filter((s) => !(+s.alanlar?.enlem > 0));
console.error(`[${SAGLAYICI}] ilan ${satirlar.length}, koordinatsız ${eksik.length}`);
const onb = new Map();
const sql = []; let cozulen = 0, cozulemedi = 0, artis = 0;
for (const s of eksik) {
  if (++artis % 25 === 0) console.error(`  … ${artis}/${eksik.length} (çözülen ${cozulen})`);
  const f = s.alanlar || {}; ilG = s.il; ilceG = s.ilce;
  let k = null;
  if (f.ada && f.parsel && f.mahalle && s.ilce) {
    const p = await al(`${SB}/functions/v1/parsel`, { method: 'POST', headers: { ...BAS, 'content-type': 'application/json' }, body: JSON.stringify({ il: s.il, ilce: s.ilce, mahalle: f.mahalle, ada: f.ada, parsel: f.parsel }) });
    if (p?.lat) k = { lat: +p.lat, lon: +p.lon, duzey: 'parsel' };
    await bekle(250);
  }
  const denemeler = [];
  if (f.sokak && f.mahalle) denemeler.push([`${f.sokak}, ${f.mahalle}, ${s.ilce}, ${s.il}`, 'highway', 'sokak']);
  if (f.mahalle) { denemeler.push([`${f.mahalle}, ${s.ilce}, ${s.il}`, 'place', 'mahalle']); denemeler.push([`${f.mahalle} Mahallesi ${s.ilce} ${s.il}`, '', 'mahalle']); }
  if (s.ilce) denemeler.push([`${s.ilce}, ${s.il}`, 'place', 'ilçe']);
  for (const [q, tag, duzey] of denemeler) {
    const ak = tag + '¶' + kuc(q);
    if (!onb.has(ak)) {
      const b = await sorguCoz(q, tag);
      onb.set(ak, b ? { lat: b.lat, lon: b.lon, duzey } : null);
      await bekle(ARALIK);
    }
    k = onb.get(ak); if (k) break;
  }
  if (!k) { cozulemedi++; continue; }
  sql.push(`update public.ilanlar set alanlar = jsonb_set(jsonb_set(jsonb_set(coalesce(alanlar,'{}'::jsonb),'{enlem}','${k.lat.toFixed(6)}'),'{boylam}','${k.lon.toFixed(6)}'),'{konumDuzey}','${JSON.stringify(k.duzey)}') where id='${s.id}' and (alanlar->>'enlem' is null or alanlar->>'enlem'='');`);
  cozulen++;
}
fs.writeFileSync(CIKTI, sql.join('\n') + '\n', 'utf8'); // doğrudan UTF-8 — yönlendirme kodlaması sorunu olmaz
console.error(`çözülen ${cozulen}, çözülemeyen ${cozulemedi} → ${CIKTI}`);
