// Eksik 3 ilçe için Photon'u etiketsiz + sorgu varyasyonlarıyla dener; bulunursa SQL'e EKLER.
import fs from 'node:fs';

const EKSİK = [['Bursa','Nilüfer'],['Manisa','Yunusemre'],['Muğla','Fethiye']];
const kuc = (s) => String(s || '').toLocaleLowerCase('tr-TR').replace(/ı/g,'i').replace(/ğ/g,'g').trim();
const uyumlu = (p, il, ilce) => p.countrycode === 'TR'
  && [p.state, p.city, p.county].some((x) => kuc(x) === kuc(il))
  && [p.county, p.city, p.district].some((x) => kuc(x) === kuc(ilce));

async function ara(q) {
  const url = 'https://photon.komoot.io/api/?limit=10&lang=default&q=' + encodeURIComponent(q);
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (!r.ok) return null;
    return (await r.json()).features || [];
  } catch { return null; }
}

const ek = [];
for (const [il, ilce] of EKSİK) {
  let bulundu = null;
  for (const q of [`${ilce}, ${il}`, `${ilce} İlçesi ${il}`, `${ilce} ${il}`]) {
    const ft = (await ara(q))?.find((x) => uyumlu(x.properties, il, ilce));
    if (ft) { bulundu = { q, lat: +ft.geometry.coordinates[1].toFixed(6), lon: +ft.geometry.coordinates[0].toFixed(6), ad: ft.properties.name, typ: ft.properties.type }; break; }
    await new Promise((r) => setTimeout(r, 1200));
  }
  if (!bulundu) { console.log(`✗ ${il}/${ilce} hâlâ yok`); continue; }
  console.log(`✓ ${il}/${ilce}: ${bulundu.lat},${bulundu.lon} (${bulundu.ad}/${bulundu.typ} · sorgu "${bulundu.q}")`);
  ek.push(`update public.ilanlar set alanlar = alanlar || '{"enlem":${bulundu.lat},"boylam":${bulundu.lon}}'::jsonb where durum='yayinda' and ana='vasita' and il='${il.replace(/'/g, "''")}' and ilce='${ilce.replace(/'/g, "''")}' and not (alanlar ? 'enlem');`);
  await new Promise((r) => setTimeout(r, 1200));
}
if (ek.length) fs.appendFileSync('supabase/scratch/vasita-koord.sql', ek.join('\n') + '\n', 'utf8');
console.log('--- eklenen satır:', ek.length);
