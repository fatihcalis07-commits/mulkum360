// MODÜL 13 FAZ 5 — emlak ilanlarına koordinat doldurma (backfill).
// Kaynak YALNIZ ilanın kendi verisi: TKGM parsel edge (ada/parsel) → Photon (sokak→mahalle→ilçe). Scrape YOK.
// Çalışma: node scratchpad/harita-backfill.mjs > %TEMP%\harita-backfill.sql   →   supabase db query --linked -f ...
// İdempotent: yalnız enlem'i olmayan satırları üretir; Photon sonuçları soru bazında tekillenir (hız sınırı dostu).
const SB = 'https://klnabwqduyavaqmbzxpo.supabase.co';
const K = 'sb_publishable_3eqaHNFBU3_r4WfYx_qvCg_DZfaor5c'; // herkese açık (publishable) anahtar — RLS güvenli
const BAS = { apikey: K, Authorization: 'Bearer ' + K };
const kuc = (x) => String(x || '').toLocaleLowerCase('tr-TR').trim();
const al = async (u, o) => { try { const r = await fetch(u, { signal: AbortSignal.timeout(12000), ...o }); return r.ok ? await r.json() : null; } catch { return null; } };
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const uyumlu = (p, il, ilce) => p && p.countrycode === 'TR' && (!il || [p.state, p.city, p.county].some((x) => kuc(x) === kuc(il))) && (!ilce || [p.county, p.city, p.district].some((x) => kuc(x) === kuc(ilce)));

const satirlar = await al(`${SB}/rest/v1/ilanlar?select=id,il,ilce,alanlar&durum=eq.yayinda&ana=eq.emlak&limit=3000`, { headers: BAS });
if (!Array.isArray(satirlar)) { console.error('REST erişilemedi'); process.exit(1); }
const eksik = satirlar.filter((s) => !(+s.alanlar?.enlem > 0));
console.error(`ilan ${satirlar.length}, koordinatsız ${eksik.length}`);
const onb = new Map();
const sql = []; let cozulen = 0, cozulemedi = 0;
for (const s of eksik) {
  const f = s.alanlar || {};
  let k = null;
  if (!k && f.ada && f.parsel && f.mahalle && s.ilce) {
    const p = await al(`${SB}/functions/v1/parsel`, { method: 'POST', headers: { ...BAS, 'content-type': 'application/json' }, body: JSON.stringify({ il: s.il, ilce: s.ilce, mahalle: f.mahalle, ada: f.ada, parsel: f.parsel }) });
    if (p?.lat) k = { lat: +p.lat, lon: +p.lon, duzey: 'parsel' };
    await bekle(250);
  }
  const denemeler = [];
  if (f.sokak && f.mahalle) denemeler.push([`${f.sokak}, ${f.mahalle}, ${s.ilce}, ${s.il}`, 'osm_tag=highway', 'sokak']);
  if (f.mahalle) { denemeler.push([`${f.mahalle}, ${s.ilce}, ${s.il}`, 'osm_tag=place', 'mahalle']); denemeler.push([`${f.mahalle} Mahallesi ${s.ilce} ${s.il}`, '', 'mahalle']); }
  if (s.ilce) denemeler.push([`${s.ilce}, ${s.il}`, 'osm_tag=place', 'ilçe']);
  for (const [q, tag, duzey] of denemeler) {
    const ak = tag + '¶' + kuc(q);
    if (!onb.has(ak)) {
      const r = await al(`https://photon.komoot.io/api/?limit=6&lang=default${tag ? '&' + tag : ''}&q=${encodeURIComponent(q)}`, { headers: { 'user-agent': 'mulkum360-harita/1.0 (+https://mulkum360.app)' } });
      const ft = ((r && r.features) || []).find((x) => uyumlu(x.properties, s.il, s.ilce));
      onb.set(ak, ft ? { lat: ft.geometry.coordinates[1], lon: ft.geometry.coordinates[0], duzey } : null);
      await bekle(420);
    }
    k = onb.get(ak); if (k) break;
  }
  if (!k) { cozulemedi++; continue; }
  sql.push(`update public.ilanlar set alanlar = jsonb_set(jsonb_set(jsonb_set(coalesce(alanlar,'{}'::jsonb),'{enlem}','${k.lat.toFixed(6)}'),'{boylam}','${k.lon.toFixed(6)}'),'{konumDuzey}','${k.duzey}') where id='${s.id}' and (alanlar->>'enlem' is null or alanlar->>'enlem'='');`);
  cozulen++;
}
console.error(`çözülen ${cozulen}, çözülemeyen ${cozulemedi}`);
console.log(sql.join('\n'));
