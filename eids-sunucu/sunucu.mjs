// Mülküm360 EİDS röle sunucusu
// Ticaret Bakanlığı EİDS servisleri yalnız bildirilen SABİT IP'den çağrılabilir; Supabase Edge'in sabit IP'si yok.
// Bu küçük sunucu sabit IP'li bir VPS'te çalışır, Bakanlık ile Mülküm360 veritabanı arasında köprü kurar.
// Bağımlılık yok (Node 20+). Ayarlar ortam değişkenlerinden okunur, bkz. README.md ve .env.ornek
//
// Uçlar:
//   GET  /saglik                 → sunucu + EİDS sağlık durumu
//   POST /eids/baslat            → (Bearer üye JWT) tek kullanımlık oturum açar, e-Devlet adresini döner
//   GET  /eids/oturum?s=<id>     → tarayıcıyı EİDS e-Devlet girişine yönlendirir
//   GET  /eids/donus             → EİDS dönüşü (returnUrl): yetkiKodu → GetKullaniciKodu → eids_uye
//   POST /eids/arac              → (Bearer üye JWT) { ilan } → EidsAracApi yetki sorgusu → ilan yayına
//   POST /eids/tasinmaz          → Faz-2 taşınmaz dokümanı gelene kadar 501 (manuel akış sürer)
//   Saatlik iş                   → yetki süresi dolan ilanları yeniden sorgular, olumsuzsa yayından kaldırır

import http from 'node:http';
import { randomUUID } from 'node:crypto';

const E = process.env;
const AYAR = {
  port: +(E.PORT || 8080),
  supabase: (E.SUPABASE_URL || '').replace(/\/$/, ''),
  servisAnahtari: E.SUPABASE_SERVICE_KEY || '',
  firmaKodu: E.EIDS_FIRMA_KODU || '',            // Bakanlığın verdiği Guid
  apiKullanici: E.EIDS_API_KULLANICI || '',      // Basic Auth
  apiParola: E.EIDS_API_PAROLA || '',
  api: (E.EIDS_API || 'https://ws.gtb.gov.tr:8443').replace(/\/$/, ''),
  eidsGiris: E.EIDS_GIRIS || 'https://eids.ticaret.gov.tr/oturum',
  uygulamaDonus: E.UYGULAMA_DONUS || 'https://mulkum360.com/www/#/hesap',
  appDonus: E.APP_DONUS || 'com.mulkum360.prototip://eids',  // Android uygulaması derin bağlantısı
  izinliKaynak: (E.IZINLI_KAYNAK || 'https://mulkum360.com,capacitor://localhost,https://localhost,http://localhost').split(','),
};
const hazir = () => !!(AYAR.supabase && AYAR.servisAnahtari && AYAR.firmaKodu && AYAR.apiKullanici && AYAR.apiParola);
const basic = () => 'Basic ' + Buffer.from(AYAR.apiKullanici + ':' + AYAR.apiParola).toString('base64');
const log = (...a) => console.log(new Date().toISOString(), ...a); // kimlik/parola ASLA loglanmaz

// ---------- Supabase (service_role, REST) ----------
async function db(yol, { method = 'GET', govde, tercih } = {}) {
  const r = await fetch(AYAR.supabase + '/rest/v1/' + yol, {
    method,
    headers: { apikey: AYAR.servisAnahtari, Authorization: 'Bearer ' + AYAR.servisAnahtari, 'Content-Type': 'application/json', ...(tercih ? { Prefer: tercih } : {}) },
    body: govde ? JSON.stringify(govde) : undefined,
  });
  if (!r.ok) throw new Error('db ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return r.status === 204 ? null : r.json();
}
// Üyenin JWT'sini Supabase'e doğrulatır; auth kullanıcısını (telefon dahil) döner
async function uyeGetir(req) {
  const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!t) return null;
  const r = await fetch(AYAR.supabase + '/auth/v1/user', { headers: { apikey: AYAR.servisAnahtari, Authorization: 'Bearer ' + t } });
  return r.ok ? r.json() : null;
}
async function authKullanici(id) {
  const r = await fetch(AYAR.supabase + '/auth/v1/admin/users/' + id, { headers: { apikey: AYAR.servisAnahtari, Authorization: 'Bearer ' + AYAR.servisAnahtari } });
  return r.ok ? r.json() : null;
}
// EİDS gsmNo: OTP ile doğrulanmış numara, 5XXXXXXXXX biçiminde
const gsm = (u) => (u?.phone && u?.phone_confirmed_at ? String(u.phone).replace(/\D/g, '').replace(/^90/, '').replace(/^0/, '') : '');

// ---------- EİDS çağrıları ----------
async function kullaniciKoduGetir(yetkiKodu, gsmNo, vergiNo) {
  const r = await fetch(AYAR.api + '/EidsApi/Kullanici/GetKullaniciKodu', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: basic() },
    body: JSON.stringify({ yetkiKodu, gsmNo, ...(vergiNo ? { vergiNo } : {}) }),
  });
  return r.json();
}
async function aracYetki(kullaniciKodu, plakaNo, ilanNo, vergiNo) {
  const r = await fetch(AYAR.api + '/EidsAracApi', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: basic() },
    body: JSON.stringify({ firmaKod: AYAR.firmaKodu, kullaniciKodu, plakaNo, ilanNo, ...(vergiNo ? { vergiNo } : {}) }),
  });
  let j = {}; try { j = await r.json(); } catch (_) {}
  return { http: r.status, ...j };
}

// ---------- yardımcılar ----------
const json = (res, kod, veri, kaynak) => { res.writeHead(kod, { 'Content-Type': 'application/json; charset=utf-8', ...cors(kaynak) }); res.end(JSON.stringify(veri)); };
const cors = (k) => (k && AYAR.izinliKaynak.includes(k) ? { 'Access-Control-Allow-Origin': k, 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', Vary: 'Origin' } : {});
const yonlen = (res, url) => { res.writeHead(302, { Location: url }); res.end(); };
const govdeOku = (req) => new Promise((ok) => { let s = ''; req.on('data', (c) => { s += c; if (s.length > 1e4) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch (_) { ok({}); } }); });
const donusUrl = (durum, mesaj, app) => (app ? AYAR.appDonus : AYAR.uygulamaDonus) + ((app ? AYAR.appDonus : AYAR.uygulamaDonus).includes('?') ? '&' : '?') + 'eids=' + durum + (mesaj ? '&m=' + encodeURIComponent(mesaj).slice(0, 300) : '');
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const plakaDuzelt = (p) => String(p || '').toUpperCase().replace(/[^0-9A-Z]/g, '');

// ---------- akışlar ----------
async function baslat(req, res, k) {
  const u = await uyeGetir(req); if (!u) return json(res, 401, { hata: 'Oturum yok' }, k);
  const tam = await authKullanici(u.id);
  if (!gsm(tam)) return json(res, 409, { hata: 'telefon', mesaj: 'Önce telefon numaranı SMS ile doğrula.' }, k);
  const b = await govdeOku(req);
  const vergiNo = /^\d{10}$/.test(String(b.vergiNo || '')) ? String(b.vergiNo) : null;
  const [o] = await db('eids_oturum', { method: 'POST', govde: { kullanici: u.id, vergi_no: vergiNo, donus: b.donus === 'uygulama' ? 'uygulama' : 'web' }, tercih: 'return=representation' });
  json(res, 200, { url: '/eids/oturum?s=' + o.id }, k);
}
async function oturum(res, s) {
  if (!GUID.test(s || '')) return yonlen(res, donusUrl('hata', 'Geçersiz oturum'));
  // EİDS dönüşünde oturumu tanımak için çerez (aynı tarayıcıda döner)
  res.writeHead(302, { Location: AYAR.eidsGiris + '?firmaKodu=' + encodeURIComponent(AYAR.firmaKodu), 'Set-Cookie': `eids_s=${s}; Max-Age=600; Path=/eids; HttpOnly; Secure; SameSite=Lax` });
  res.end();
}
async function donus(req, res, q) {
  const s = /(?:^|;\s*)eids_s=([0-9a-f-]{36})/i.exec(req.headers.cookie || '')?.[1];
  const yetkiKodu = q.get('yetkiKodu') || '', durum = q.get('durum') || '';
  if (!s) return yonlen(res, donusUrl('hata', 'Oturum bulunamadı, tekrar dene'));
  const [o] = await db(`eids_oturum?id=eq.${s}&kullanildi=is.false&olusturma=gte.${new Date(Date.now() - 600e3).toISOString()}&select=*`);
  if (!o) return yonlen(res, donusUrl('hata', 'Oturumun süresi doldu, tekrar dene'));
  await db(`eids_oturum?id=eq.${s}`, { method: 'PATCH', govde: { kullanildi: true } });
  const app = o.donus === 'uygulama';
  if (!/^[0-9a-zA-Z]{20}$/.test(yetkiKodu)) return yonlen(res, donusUrl('hata', durum || 'e-Devlet doğrulaması tamamlanmadı', app));
  const tam = await authKullanici(o.kullanici), no = gsm(tam);
  if (!no) return yonlen(res, donusUrl('hata', 'Telefon doğrulaması bulunamadı', app));
  try {
    const j = await kullaniciKoduGetir(yetkiKodu, no, o.vergi_no); // yetkiKodu 2 dakika geçerli, hemen sorgulanır
    if (!j.kullaniciKodu) { log('GetKullaniciKodu olumsuz', j.hataKodu || j.islemSonucKodu); return yonlen(res, donusUrl('hata', j.hataMesaji || j.islemSonucMesaji || 'Doğrulanamadı', app)); }
    await db('eids_uye', { method: 'POST', tercih: 'resolution=merge-duplicates', govde: { kullanici: o.kullanici, kullanici_kodu: j.kullaniciKodu, ad: j.ad || null, soyad: j.soyad || null, vergi_no: o.vergi_no, gsm: no, dogrulama: new Date().toISOString() } });
    log('üye doğrulandı', o.kullanici);
    yonlen(res, donusUrl('ok', app));
  } catch (e) { log('donus hata', e.message); yonlen(res, donusUrl('hata', 'EİDS servisine ulaşılamadı', app)); }
}
// Araç ilanı yetki sorgusu. Başarılıysa: doğrulama onaylı, marka/model/yıl EİDS'ten kilitli, ilan yayında.
async function aracSorgula(ilanId, kullanici) {
  const [d] = await db(`ilan_dogrulama?ilan=eq.${ilanId}&select=*`);
  if (!d || !d.plaka) return { ok: false, kod: 400, mesaj: 'Önce plaka ile doğrulama talebi oluştur.' };
  const [uye] = await db(`eids_uye?kullanici=eq.${kullanici}&select=*`);
  if (!uye) return { ok: false, kod: 409, hata: 'eids-uye', mesaj: 'Önce e-Devlet ile kimliğini doğrula.' };
  const r = await aracYetki(uye.kullanici_kodu, plakaDuzelt(d.plaka), ilanId, uye.vergi_no);
  const simdi = new Date().toISOString();
  if (r.statusCode === 200 && !r.errors && r.data) {
    const veri = { marka: r.data.markaAdi, model: r.data.ticariAdi, yil: +r.data.modelYili || r.data.modelYili };
    const [i] = await db(`ilanlar?id=eq.${ilanId}&select=alanlar`);
    await db(`ilan_dogrulama?ilan=eq.${ilanId}`, { method: 'PATCH', govde: { sonuc: 'onayli', kaynak: 'eids', eids_veri: r.data, bitis: r.data.ilanSuresi || null, son_sorgu: simdi, eids_ref: 'EidsAracApi', guncelleme: simdi } });
    await db(`ilanlar?id=eq.${ilanId}`, { method: 'PATCH', govde: { alanlar: { ...(i?.alanlar || {}), ...veri, eids: { ...veri, bitis: r.data.ilanSuresi || null, zaman: simdi } }, durum: 'yayinda', dogrulanmis: true } });
    return { ok: true, veri };
  }
  const hata = (r.errors || []).filter((x) => !/^ERR-/.test(x)).join(' ') || 'Yetki doğrulanamadı';
  const kodu = (r.errors || []).find((x) => /^ERR-/.test(x)) || String(r.http);
  await db(`ilan_dogrulama?ilan=eq.${ilanId}`, { method: 'PATCH', govde: { sonuc: kodu === 'ERR-300' ? 'red' : 'bekliyor', karar_notu: 'EİDS: ' + hata, son_sorgu: simdi, guncelleme: simdi } });
  return { ok: false, kod: 422, eidsKodu: kodu, mesaj: hata };
}
async function arac(req, res, k) {
  const u = await uyeGetir(req); if (!u) return json(res, 401, { hata: 'Oturum yok' }, k);
  const { ilan } = await govdeOku(req);
  if (!GUID.test(ilan || '')) return json(res, 400, { hata: 'ilan' }, k);
  const [i] = await db(`ilanlar?id=eq.${ilan}&select=sahip,ana`);
  if (!i || i.sahip !== u.id || i.ana !== 'vasita') return json(res, 403, { hata: 'Kendi taşıt ilanın değil' }, k);
  const s = await aracSorgula(ilan, u.id);
  json(res, s.ok ? 200 : s.kod, s, k);
}
// Saatlik: süresi dolan EİDS yetkilerini yeniden sorgula; olumsuzsa ilanı yayından kaldır (doküman: yetki süresi sonu kuralı)
async function sureKontrol() {
  if (!hazir()) return;
  try {
    const l = await db(`ilan_dogrulama?kaynak=eq.eids&sonuc=eq.onayli&bitis=lt.${new Date().toISOString()}&plaka=not.is.null&select=ilan,sahip&limit=200`);
    for (const d of l) {
      const s = await aracSorgula(d.ilan, d.sahip);
      if (!s.ok) { await db(`ilanlar?id=eq.${d.ilan}`, { method: 'PATCH', govde: { durum: 'onayda' } }); log('yetki sona erdi, ilan yayından alındı', d.ilan); }
    }
  } catch (e) { log('süre kontrolü hata', e.message); }
}

// ---------- sunucu ----------
http.createServer(async (req, res) => {
  const k = req.headers.origin, u = new URL(req.url, 'http://x');
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204, cors(k)); return res.end(); }
    if (u.pathname === '/saglik') {
      let eids = 'bilinmiyor'; try { eids = (await (await fetch(AYAR.api + '/EidsApi/health', { signal: AbortSignal.timeout(5000), headers: hazir() ? { Authorization: basic() } : {} })).text()).trim(); } catch (_) { eids = 'erisilemedi'; }
      return json(res, 200, { sunucu: 'ok', ayarlar: hazir() ? 'tamam' : 'eksik', eids }, k);
    }
    if (!hazir()) return json(res, 503, { hata: 'EİDS ayarları henüz girilmedi' }, k);
    if (u.pathname === '/eids/baslat' && req.method === 'POST') return await baslat(req, res, k);
    if (u.pathname === '/eids/oturum') return await oturum(res, u.searchParams.get('s'));
    if (u.pathname === '/eids/donus') return await donus(req, res, u.searchParams);
    if (u.pathname === '/eids/arac' && req.method === 'POST') return await arac(req, res, k);
    if (u.pathname === '/eids/tasinmaz') return json(res, 501, { hata: 'Taşınmaz yetki servisi dokümanı Bakanlıktan bekleniyor; yönetici doğrulaması sürüyor.' }, k);
    json(res, 404, { hata: 'yok' }, k);
  } catch (e) { log('hata', u.pathname, e.message); json(res, 500, { hata: 'Sunucu hatası' }, k); }
}).listen(AYAR.port, () => log('EİDS röle sunucusu', AYAR.port, hazir() ? 'hazır' : 'AYARLAR EKSİK'));
setInterval(sureKontrol, 3600e3);
