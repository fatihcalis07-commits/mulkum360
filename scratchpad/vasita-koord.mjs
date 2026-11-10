// Vasıta ilanlarına ilçe-merkezi koordinat ekler (Photon, il+ilçe tutarlılık denetimli). Çıktı: UPDATE SQL.
import fs from 'node:fs';

const İLÇELER = [
  ['Ankara','Yenimahalle'],['Antalya','Muratpaşa'],['Bursa','Nilüfer'],['İstanbul','Ataşehir'],
  ['İzmir','Bornova'],['İzmir','Buca'],['İzmir','Karşıyaka'],['İzmir','Urla'],
  ['Kayseri','Melikgazi'],['Konya','Selçuklu'],['Manisa','Yunusemre'],['Muğla','Fethiye'],
];
const kuc = (s) => String(s || '').toLocaleLowerCase('tr-TR').replace(/ı/g,'i').replace(/ğ/g,'g').trim();
const uyumlu = (p, il, ilce) => p.countrycode === 'TR'
  && [p.state, p.city, p.county].some((x) => kuc(x) === kuc(il))
  && [p.county, p.city, p.district].some((x) => kuc(x) === kuc(ilce));

async function merkez(il, ilce) {
  const url = 'https://photon.komoot.io/api/?limit=8&lang=default&osm_tag=place&q=' + encodeURIComponent(`${ilce}, ${il}`);
  for (let deneme = 0; deneme < 3; deneme++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(9000) });
      if (!r.ok) throw new Error('http ' + r.status);
      const ft = ((await r.json()).features || []).find((x) => uyumlu(x.properties, il, ilce));
      if (ft) return { lat: +ft.geometry.coordinates[1].toFixed(6), lon: +ft.geometry.coordinates[0].toFixed(6) };
      return null;
    } catch (e) { await new Promise((r) => setTimeout(r, 1500 * (deneme + 1))); }
  }
  return null;
}

const satirlar = [];
const ozet = [];
for (const [il, ilce] of İLÇELER) {
  const k = await merkez(il, ilce);
  if (!k) { ozet.push(`✗ ${il}/${ilce}: bulunamadı`); continue; }
  ozet.push(`✓ ${il}/${ilce}: ${k.lat},${k.lon}`);
  const esc = (s) => s.replace(/'/g, "''");
  satirlar.push(`update public.ilanlar set alanlar = alanlar || '{"enlem":${k.lat},"boylam":${k.lon}}'::jsonb where durum='yayinda' and ana='vasita' and il='${esc(il)}' and ilce='${esc(ilce)}' and not (alanlar ? 'enlem');`);
  await new Promise((r) => setTimeout(r, 600));
}
fs.writeFileSync('supabase/scratch/vasita-koord.sql', satirlar.join('\n') + '\n', 'utf8');
console.log(ozet.join('\n'));
console.log('--- SQL satır sayısı:', satirlar.length, '→ supabase/scratch/vasita-koord.sql');
