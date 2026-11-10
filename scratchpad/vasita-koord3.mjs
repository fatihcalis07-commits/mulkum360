// Fethiye/Muğla için Nominatim tek atım (önceki turda kanıtlanmış display_name süzgeci ile)
import fs from 'node:fs';
const kuc = (s) => String(s || '').toLocaleLowerCase('tr-TR').replace(/ı/g,'i').replace(/ğ/g,'g');
const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=8&addressdetails=1&countrycodes=tr&q=' + encodeURIComponent('Fethiye, Muğla');
const r = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'mulkum360-harita/1.0 (+https://mulkum360.app)' } });
const j = await r.json();
const aday = j.find((x) => { const d = kuc(x.display_name); return d.includes('fethiye') && d.includes('muğla') && d.includes('türkiye'); });
if (!aday) { console.log('✗ bulunamadı ·', j.length, 'sonuç geldi'); process.exit(0); }
const lat = (+aday.lat).toFixed(6), lon = (+aday.lon).toFixed(6);
console.log('✓ Fethiye:', lat + ',' + lon, '·', aday.type, '·', aday.display_name.slice(0, 90));
fs.appendFileSync('supabase/scratch/vasita-koord.sql',
  `update public.ilanlar set alanlar = alanlar || '{"enlem":${lat},"boylam":${lon}}'::jsonb where durum='yayinda' and ana='vasita' and il='Muğla' and ilce='Fethiye' and not (alanlar ? 'enlem');\n`, 'utf8');
console.log('SQL eklendi → toplam satır:', fs.readFileSync('supabase/scratch/vasita-koord.sql','utf8').split('\n').filter(Boolean).length);
