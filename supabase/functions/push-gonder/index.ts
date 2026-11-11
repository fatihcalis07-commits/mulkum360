// Bildirim satırını alıcının telefonlarına FCM HTTP v1 ile gönderir. Girdi: { id } (yalnız veritabanı tetikleyicisi çağırır).
// FCM_SA secret'ı (Firebase hizmet hesabı JSON'u) yoksa hiçbir şey yapmaz.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const b64u = (b: ArrayBuffer | string) => btoa(typeof b === 'string' ? b : String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function erisimJetonu(sa: { client_email: string; private_key: string }) {
  const simdi = Math.floor(Date.now() / 1000);
  const bas = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const govde = b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: simdi, exp: simdi + 3600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const anahtar = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const imza = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', anahtar, new TextEncoder().encode(bas + '.' + govde));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + bas + '.' + govde + '.' + b64u(imza) });
  return (await r.json()).access_token as string;
}

Deno.serve(async (req) => {
  const ham = Deno.env.get('FCM_SA');
  if (!ham) return Response.json({ atlandi: 'FCM_SA yok' });
  let id = ''; try { id = String((await req.json()).id || ''); } catch { /* */ }
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ hata: 'id' }, { status: 400 });
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: b } = await sb.from('bildirimler').select('alici,baslik,metin,link').eq('id', id).maybeSingle();
  if (!b) return Response.json({ hata: 'yok' }, { status: 404 });
  const { data: jl } = await sb.from('push_jetonlari').select('token').eq('kullanici', b.alici);
  if (!jl?.length) return Response.json({ gonderilen: 0 });
  const sa = JSON.parse(ham), jeton = await erisimJetonu(sa);
  let n = 0;
  for (const { token } of jl) {
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + jeton, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { token, notification: { title: b.baslik, body: b.metin || '' }, data: { link: b.link || '#/bildirimler', id }, android: { priority: 'high', notification: { channel_id: 'genel', icon: 'ic_stat_bildirim', color: '#E89B1A' } } } })
    });
    if (r.ok) n++; else if (r.status === 404 || r.status === 400) await sb.from('push_jetonlari').delete().eq('token', token); // geçersiz jeton
  }
  return Response.json({ gonderilen: n });
});
