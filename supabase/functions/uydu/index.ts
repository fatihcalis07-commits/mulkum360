// Rapor uydu görüntüsü: Mapbox Static Images (satellite-v9) üzerinden; anahtar sunucuda (MAPBOX_TOKEN secret), istemciye gitmez.
// Girdi: ?lat=..&lon=..&z=16  Çıktı: 682x420 @2x JPEG. Anahtar yoksa 503 (istemci Sentinel'e döner).
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const t = Deno.env.get('MAPBOX_TOKEN');
  if (!t) return new Response('anahtar yok', { status: 503, headers: CORS });
  const u = new URL(req.url), lat = +(u.searchParams.get('lat') || NaN), lon = +(u.searchParams.get('lon') || NaN), z = Math.max(12, Math.min(18, +(u.searchParams.get('z') || 16)));
  // Yalnız Türkiye ve çevresi (kötüye kullanım sınırı)
  if (!(lat > 34 && lat < 43.5 && lon > 24 && lon < 46)) return new Response('konum', { status: 400, headers: CORS });
  const r = await fetch(`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lon.toFixed(6)},${lat.toFixed(6)},${z},0/682x420@2x?attribution=false&logo=false&access_token=${t}`, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) return new Response('mapbox ' + r.status, { status: 502, headers: CORS });
  return new Response(await r.arrayBuffer(), { headers: { ...CORS, 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=2592000' } });
});
