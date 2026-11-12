// Canlı şema denetimi: yeni tablolar/kolonlar gerçekten var mı (yalnız sonuç yazar, anahtar yazmaz)
import { readFileSync } from 'node:fs';
const sb = readFileSync('C:/Users/fcali/vitrin-app/www/sb-ayar.js', 'utf8');
const url = (sb.match(/https:\/\/[\w-]+\.supabase\.co/) || [''])[0];
const key = (sb.match(/sb_publishable_[\w-]+/) || sb.match(/eyJ[\w.-]{40,}/) || [''])[0];
if (!url || !key) { console.log('anahtar/URL bulunamadı'); process.exit(1); }
const H = { apikey: key, Authorization: 'Bearer ' + key };
const tablo = async (t) => {
  const r = await fetch(url + '/rest/v1/' + t + '?select=*&limit=1', { headers: H });
  if (r.status === 200) return t + ' → VAR ✔';
  const b = await r.text();
  return t + ' → ' + (b.includes('PGRST205') || b.includes('does not exist') ? 'YOK ✗' : r.status + ' ' + b.slice(0, 60));
};
const kolon = async (t, k) => {
  const r = await fetch(url + '/rest/v1/' + t + '?select=' + k + '&limit=1', { headers: H });
  if (r.status === 200) return t + '.' + k + ' → VAR ✔';
  const b = await r.text();
  return t + '.' + k + ' → ' + (b.includes('42703') || /column.*does not exist/i.test(b) ? 'YOK ✗' : r.status + ' ' + b.slice(0, 60));
};
for (const t of ['piyasa_m2', 'kullanici_emsal', 'push_jetonlari', 'degerleme_kayitlari', 'degerlendirmeler']) console.log(await tablo(t));
console.log(await kolon('ilan_dogrulama', 'plaka'));
console.log(await kolon('doping_paketleri', 'kredi'));
