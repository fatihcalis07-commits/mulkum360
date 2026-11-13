// Business Partner abonelikleri (Google Play).
// İki giriş:
//  1) Uygulama: POST { urun, token } + kullanıcı JWT  → Google'dan doğrula, onayla (acknowledge), ortaklığı güncelle.
//  2) Google RTDN (Pub/Sub push): POST ?anahtar=PLAY_RTDN_ANAHTAR { message: { data: base64(JSON) } } → abonelik durumu değişince güncelle.
// Gerekli gizliler: GOOGLE_PLAY_SA_JSON (play-odeme ile aynı), PLAY_RTDN_ANAHTAR (Pub/Sub push URL'sindeki gizli anahtar).
// Deploy: supabase functions deploy play-abonelik --no-verify-jwt   (RTDN JWT taşımaz; uygulama girişi JWT'yi kendisi doğrular)
import { createClient } from 'npm:@supabase/supabase-js@2';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const yanit = (g: unknown, d = 200) => new Response(JSON.stringify(g), { status: d, headers: { ...CORS, 'Content-Type': 'application/json' } });
const PAKET_ADI = Deno.env.get('PLAY_PAKET_ADI') || 'com.mulkum360.app';

const b64url = (b: Uint8Array | string) => btoa(typeof b === 'string' ? b : String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
let erisim: { jeton: string; bitis: number } | null = null;
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

// subscriptionsv2 durumu → bizim durum adlarımız
const DURUM: Record<string, string> = {
  SUBSCRIPTION_STATE_ACTIVE: 'aktif', SUBSCRIPTION_STATE_IN_GRACE_PERIOD: 'ek_sure', SUBSCRIPTION_STATE_CANCELED: 'iptal_edildi',
  SUBSCRIPTION_STATE_ON_HOLD: 'beklemede', SUBSCRIPTION_STATE_PAUSED: 'duraklatildi', SUBSCRIPTION_STATE_EXPIRED: 'sona_erdi',
  SUBSCRIPTION_STATE_PENDING: 'odeme_bekliyor', SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED: 'sona_erdi',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type Abonelik = { subscriptionState?: string; acknowledgementState?: string; linkedPurchaseToken?: string; latestOrderId?: string;
  externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string };
  lineItems?: { productId: string; expiryTime?: string; autoRenewingPlan?: { autoRenewEnabled?: boolean } }[] };

async function aboneligiGetir(token: string, jeton: string): Promise<Abonelik | null> {
  const r = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PAKET_ADI}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`, { headers: { Authorization: `Bearer ${jeton}` } });
  if (!r.ok) { console.error('subscriptionsv2', r.status, (await r.text()).slice(0, 300)); return null; }
  return await r.json();
}

async function isle(sb: ReturnType<typeof createClient>, kullanici: string, token: string, s: Abonelik, kaynak: string, jeton: string) {
  const kalem = (s.lineItems || [])[0];
  if (!kalem) throw new Error('abonelik kalemi yok');
  const durum = DURUM[s.subscriptionState || ''] || 'sona_erdi';
  const { data, error } = await sb.rpc('play_abonelik_isle', {
    p_kullanici: kullanici, p_urun: kalem.productId, p_token: token, p_durum: durum,
    p_bitis: kalem.expiryTime || null, p_yenileme: !!kalem.autoRenewingPlan?.autoRenewEnabled, p_kaynak: kaynak,
    p_ham: { state: s.subscriptionState, order: s.latestOrderId, linked: s.linkedPurchaseToken ? true : undefined },
  });
  if (error) throw new Error(error.message);
  // Onaylanmayan abonelik 3 günde iade edilir: haklar verildikten sonra sunucu da onaylar (istemcinin finish()'i ile birlikte zararsız)
  if (s.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING' && ['aktif', 'ek_sure'].includes(durum)) {
    await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PAKET_ADI}/purchases/subscriptions/${kalem.productId}/tokens/${encodeURIComponent(token)}:acknowledge`, { method: 'POST', headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' }, body: '{}' }).catch(() => null);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return yanit({ hata: 'yöntem' }, 405);
  if (!Deno.env.get('GOOGLE_PLAY_SA_JSON')) return yanit({ hata: 'Google Play abonelik doğrulaması henüz ayarlanmadı.' }, 503);
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const url = new URL(req.url);
  let g: Record<string, unknown> = {};
  try { g = await req.json(); } catch { return yanit({ hata: 'istek' }, 400); }

  // 2) Google RTDN
  if (url.searchParams.has('anahtar')) {
    const beklenen = Deno.env.get('PLAY_RTDN_ANAHTAR');
    if (!beklenen || url.searchParams.get('anahtar') !== beklenen) return yanit({ hata: 'yetkisiz' }, 401);
    let b: { packageName?: string; subscriptionNotification?: { purchaseToken?: string; notificationType?: number }; testNotification?: unknown } = {};
    try { b = JSON.parse(atob(String((g.message as { data?: string })?.data || ''))); } catch { return yanit({ tamam: true, not: 'çözülemedi' }); }
    if (b.testNotification || !b.subscriptionNotification?.purchaseToken) return yanit({ tamam: true }); // test veya tek seferlik ürün bildirimi
    if (b.packageName && b.packageName !== PAKET_ADI) return yanit({ tamam: true });
    const token = b.subscriptionNotification.purchaseToken;
    try {
      const jeton = await googleJeton();
      const s = await aboneligiGetir(token, jeton);
      if (!s) return yanit({ hata: 'google' }, 500); // Pub/Sub yeniden dener
      let kullanici = s.externalAccountIdentifiers?.obfuscatedExternalAccountId || '';
      if (!UUID.test(kullanici)) {
        const ara = [token, s.linkedPurchaseToken].filter(Boolean) as string[];
        const { data } = await sb.from('is_ortagi').select('kullanici').in('play_token', ara).limit(1).maybeSingle();
        kullanici = (data as { kullanici?: string } | null)?.kullanici || '';
      }
      if (!kullanici) { console.error('RTDN: kullanıcı bulunamadı', b.subscriptionNotification.notificationType); return yanit({ tamam: true, not: 'eşleşmedi' }); }
      await isle(sb, kullanici, token, s, 'rtdn:' + b.subscriptionNotification.notificationType, jeton);
      return yanit({ tamam: true });
    } catch (x) {
      const m = (x as Error).message;
      console.error('RTDN', m);
      // kalıcı iş kuralı hataları yeniden denenmez; geçici hatalarda 500 → Pub/Sub tekrar gönderir
      return /paket|ortakl|uyuşmuyor|başka hesap/.test(m) ? yanit({ tamam: true, not: m }) : yanit({ hata: 'geçici' }, 500);
    }
  }

  // 1) Uygulama
  const sbK = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
  const { data: kul } = await sbK.auth.getUser();
  if (!kul?.user) return yanit({ hata: 'Giriş yapmalısın.' }, 401);
  const urun = String(g.urun || ''), token = String(g.token || '');
  if (!/^ortak_[a-z0-9_]{1,60}$/.test(urun) || token.length < 20 || token.length > 4000) return yanit({ hata: 'Geçersiz satın alma.' }, 400);
  try {
    const jeton = await googleJeton();
    const s = await aboneligiGetir(token, jeton);
    if (!s) return yanit({ hata: 'Abonelik Google Play\'de bulunamadı.' }, 400);
    const hesap = s.externalAccountIdentifiers?.obfuscatedExternalAccountId;
    if (hesap && hesap !== kul.user.id) return yanit({ hata: 'Bu abonelik başka bir hesaba ait.' }, 403);
    if (s.subscriptionState === 'SUBSCRIPTION_STATE_PENDING') return yanit({ hata: 'Ödeme henüz tamamlanmadı; onaylanınca aboneliğin başlar.', bekliyor: true }, 409);
    if ((s.lineItems || [])[0]?.productId !== urun) return yanit({ hata: 'Ürün uyuşmuyor.' }, 400);
    const sonuc = await isle(sb, kul.user.id, token, s, 'uygulama', jeton);
    return yanit(sonuc);
  } catch (x) {
    const m = (x as Error).message; console.error('abonelik doğrula', m);
    if (/ortakl/.test(m)) return yanit({ hata: 'Abonelik için onaylı iş ortaklığı gerekli.' }, 400);
    if (/uyuşmuyor/.test(m)) return yanit({ hata: 'Bu paket hesap türüne uygun değil.' }, 400);
    if (/başka hesap/.test(m)) return yanit({ hata: 'Bu abonelik başka bir hesaba bağlı.' }, 403);
    return yanit({ hata: 'Abonelik şu an doğrulanamadı, biraz sonra tekrar dene.' }, 502);
  }
});
