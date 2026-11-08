// TKGM Parsel Sorgu (herkese açık MEGSİS servisi): il/ilçe/mahalle adı + ada/parsel → parsel bilgisi ve konumu.
// Girdi: { il, ilce, mahalle, ada, parsel } ya da { lat, lon }. Çıktı: ada, parsel, alan, nitelik, mevkii, zemin, mahalle, merkez, sınır.
const B = 'https://cbsapi.tkgm.gov.tr/megsiswebapi.v3/api';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const yanit = (g: unknown, d = 200) => new Response(JSON.stringify(g), { status: d, headers: { ...CORS, 'Content-Type': 'application/json' } });
const H = { 'User-Agent': 'Mozilla/5.0 (Mulkum360)', Referer: 'https://parselsorgu.tkgm.gov.tr/' };
const k = (s: unknown) => String(s || '').toLocaleLowerCase('tr').replace(/\s+(mahallesi|mah\.?|köyü)$/, '').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]/g, '');
const onbellek = new Map<string, { text: string; id: number }[]>();

async function liste(yol: string) {
  if (onbellek.has(yol)) return onbellek.get(yol)!;
  const r = await fetch(B + yol, { headers: H, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error('TKGM ' + r.status);
  const l = ((await r.json()).features || []).map((f: { properties: { text: string; id: number } }) => ({ text: f.properties.text, id: f.properties.id }));
  onbellek.set(yol, l); return l;
}
function ozetle(j: { geometry?: { coordinates: number[][][] }; properties?: Record<string, unknown> }) {
  const p = j.properties || {}, halka = j.geometry?.coordinates?.[0] || [];
  const lon = halka.reduce((s, c) => s + c[0], 0) / (halka.length || 1), lat = halka.reduce((s, c) => s + c[1], 0) / (halka.length || 1);
  return { ada: p.adaNo, parsel: p.parselNo, alan: p.alan, nitelik: p.nitelik, mevkii: p.mevkii, zemin: p.zeminKmdurum, pafta: p.pafta, il: p.ilAd, ilce: p.ilceAd, mahalle: p.mahalleAd, ozet: p.ozet, lat, lon, sinir: halka.slice(0, 400) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  let g: Record<string, unknown> = {};
  try { g = await req.json(); } catch { /* boş */ }
  try {
    if (g.lat && g.lon) {
      const r = await fetch(`${B}/parsel/${+g.lat}/${+g.lon}/`, { headers: H, signal: AbortSignal.timeout(20000) });
      const j = await r.json(); if (!j.geometry) return yanit({ hata: 'Bu noktada parsel bulunamadı.' }, 404);
      return yanit(ozetle(j));
    }
    const ada = String(g.ada || '').replace(/\D/g, ''), parsel = String(g.parsel || '').replace(/\D/g, '');
    if (!ada || !parsel || !g.il || !g.ilce || !g.mahalle) return yanit({ hata: 'İl, ilçe, mahalle, ada ve parsel gerekli.' }, 400);
    const il = (await liste('/idariYapi/ilListe')).find((x) => k(x.text) === k(g.il)); if (!il) return yanit({ hata: 'İl TKGM listesinde bulunamadı.' }, 404);
    const ilce = (await liste('/idariYapi/ilceListe/' + il.id)).find((x) => k(x.text) === k(g.ilce)); if (!ilce) return yanit({ hata: 'İlçe TKGM listesinde bulunamadı.' }, 404);
    const mahL = await liste('/idariYapi/mahalleListe/' + ilce.id);
    const mah = mahL.find((x) => k(x.text) === k(g.mahalle)) || mahL.find((x) => k(x.text).startsWith(k(g.mahalle)) || k(g.mahalle).startsWith(k(x.text)));
    if (!mah) return yanit({ hata: 'Mahalle TKGM listesinde bulunamadı.' }, 404);
    const r = await fetch(`${B}/parsel/${mah.id}/${ada}/${parsel}`, { headers: H, signal: AbortSignal.timeout(20000) });
    const j = await r.json(); if (!j.geometry) return yanit({ hata: `${mah.text} ${ada} ada ${parsel} parsel bulunamadı.` }, 404);
    return yanit(ozetle(j));
  } catch (x) { return yanit({ hata: 'TKGM servisine ulaşılamadı.', ayrinti: String(x).slice(0, 120) }, 502); }
});
