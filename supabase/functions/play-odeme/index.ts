// Google Play satın alımını doğrular; kredi yükler veya doping başlatır.
// Girdi: { urun: 'kredi_15' | 'doping_acil_1', token: purchaseToken, siparis?: orderId, ilan?: uuid (doping için) }. Kullanıcı JWT ile gelir.
// Gerekli gizli: GOOGLE_PLAY_SA_JSON (Play Console'a bağlı hizmet hesabının JSON anahtarı). Paket adı: com.mulkum360.app
import { createClient } from 'npm:@supabase/supabase-js@2';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const yanit = (g: unknown, d = 200) => new Response(JSON.stringify(g), { status: d, headers: { ...CORS, 'Content-Type': 'application/json' } });
const PAKET_ADI = Deno.env.get('PLAY_PAKET_ADI') || 'com.mulkum360.app';

const b64url = (b: Uint8Array | string) => btoa(typeof b === 'string' ? b : String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
let erisim: { jeton: string; bitis: number } | null = null;

// Hizmet hesabıyla OAuth erişim jetonu (JWT bearer, RS256)
async function googleJeton(): Promise<string> {
  if (erisim && erisim.bitis > Date.now() + 60000) return erisim.jeton;
  const sa = JSON.parse(Deno.env.get('GOOGLE_PLAY_SA_JSON')!);
  const simdi = Math.floor(Date.now() / 1000);
  const govde = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: simdi, exp: simdi + 3600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const anahtar = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const imza = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', anahtar, new TextEncoder().encode(govde)));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: govde + '.' + b64url(imza) }) });
  const j = await r.json();
  if (!j.access_token) throw new Error('Google yetkisi alınamadı: ' + JSON.stringify(j).slice(0, 200));
  erisim = { jeton: j.access_token, bitis: Date.now() + (j.expires_in || 3600) * 1000 };
  return erisim.jeton;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!Deno.env.get('GOOGLE_PLAY_SA_JSON')) return yanit({ hata: 'Google Play ödeme doğrulaması henüz ayarlanmadı.' }, 503);
  const sbK = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
  const { data: kul } = await sbK.auth.getUser();
  if (!kul?.user) return yanit({ hata: 'Giriş yapmalısın.' }, 401);
  let g: { urun?: string; token?: string; siparis?: string; ilan?: string } = {};
  try { g = await req.json(); } catch { return yanit({ hata: 'istek' }, 400); }
  const urun = String(g.urun || ''), token = String(g.token || '');
  if (!/^[a-z0-9_.]{1,100}$/.test(urun) || token.length < 20 || token.length > 4000) return yanit({ hata: 'Geçersiz satın alma.' }, 400);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: paket } = await sb.from('kredi_paketleri').select('id').eq('play_urun', urun).maybeSingle();
  // Doping ürünleri: yalnız aktif paketler satılır; satış play_token ile tekilleşir (ilan_doping.play_token — migration 20261110130000).
  const { data: dop } = paket ? { data: null as null | { id: string; tur: string; gun: number } } : await sb.from('doping_paketleri').select('id,tur,gun,aktif').eq('play_urun', urun).maybeSingle();
  if (!paket && !(dop && (dop as { aktif?: boolean }).aktif)) return yanit({ hata: 'Ürün bulunamadı.' }, 400);
  if (dop && !/^[0-9a-f-]{36}$/.test(String(g.ilan || ''))) return yanit({ hata: 'Doping için ilan gerekli.' }, 400);

  let jeton: string;
  try { jeton = await googleJeton(); } catch (x) { console.error((x as Error).message); return yanit({ hata: 'Ödeme şu an doğrulanamadı, biraz sonra tekrar dene.' }, 502); }
  const taban = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PAKET_ADI}/purchases/products/${urun}/tokens/${encodeURIComponent(token)}`;
  const r = await fetch(taban, { headers: { Authorization: `Bearer ${jeton}` } });
  if (!r.ok) { console.error('play doğrula', r.status, (await r.text()).slice(0, 300)); return yanit({ hata: 'Satın alma Google Play\'de bulunamadı.' }, 400); }
  const s = await r.json();
  // purchaseState 0 = satın alındı, 1 = iptal, 2 = beklemede
  if (s.purchaseState === 2) return yanit({ hata: 'Ödeme henüz tamamlanmadı; onaylanınca kredin yüklenir.', bekliyor: true }, 409);
  if (s.purchaseState !== 0) return yanit({ hata: 'Satın alma iptal edilmiş.' }, 400);

  // Tüketilebilir ürün: sunucu da tüketir (istemci de finish() ile tüketir; ikisi birden zararsız)
  const tuket = s.consumptionState === 0 ? fetch(taban + ':consume', { method: 'POST', headers: { Authorization: `Bearer ${jeton}` } }).catch(() => null) : null;

  if (dop) {
    const d = dop as { id: string; tur: string; gun: number };
    const { data: sonuc, error } = await sb.rpc('play_doping_baslat', { p_kullanici: kul.user.id, p_urun: urun, p_token: token, p_ilan: g.ilan, p_order: s.orderId || g.siparis || null });
    if (error) { console.error('doping başlat', error.message); return yanit({ hata: 'Doping başlatılamadı, destekle iletişime geç.', ayrinti: error.message.slice(0, 120) }, 500); }
    await tuket;
    return yanit(sonuc);
  }

  const { data: sonuc, error } = await sb.rpc('play_kredi_yukle', { p_kullanici: kul.user.id, p_urun: urun, p_token: token, p_siparis: s.orderId || g.siparis || null });
  if (error) { console.error('kredi yükle', error.message); return yanit({ hata: 'Kredi yüklenemedi, destekle iletişime geç.' }, 500); }
  await tuket;
  return yanit(sonuc);
});
