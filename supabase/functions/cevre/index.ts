// Çevre sorgusu yedeği: istemci Overpass'a erişemezse aynı sorgu sunucudan yapılır.
// Girdi: { q } (Overpass QL, yalnız "around" sorgusu). Çıktı: sadeleştirilmiş öğeler (etiket + koordinat).
const UC = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  let q = '';
  try { q = String((await req.json()).q || ''); } catch { /* boş */ }
  // Kötüye kullanım sınırı: kısa, yalnız around içeren, out center tags ile biten sorgular
  if (q.length > 2500 || !/^\[out:json\]/.test(q) || !/around:\d{2,4},/.test(q) || /around:\d{5,}/.test(q)) return new Response(JSON.stringify({ hata: 'sorgu' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
  const govde = 'data=' + encodeURIComponent(q);
  try {
    const j = await Promise.any(UC.map(async (u) => {
      const r = await fetch(u, { method: 'POST', body: govde, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mulkum360/1.0 (+https://fatihcalis07-commits.github.io/mulkum360/)', Accept: 'application/json,*/*' }, signal: AbortSignal.timeout(40000) });
      if (!r.ok) throw new Error(u + ' ' + r.status + ' ' + (await r.text()).slice(0, 80)); return r.json();
    }));
    const el = (j.elements || []).map((e: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }) => ({ lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon, tags: e.tags || {} }));
    return new Response(JSON.stringify({ elements: el }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (x) {
    return new Response(JSON.stringify({ hata: 'overpass', ayrinti: String((x as AggregateError).errors || x).slice(0, 300) }), { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
