// Mülküm360 — Supabase bağlantısı: veriyi yükler, S durumunu doldurur, her değişikliği sunucuya yazar.
'use strict';

const sb = supabase.createClient(SB_URL, SB_ANAHTAR, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' } });
const GOOGLE_DONUS = 'com.mulkum360.prototip://giris';
const ms = (t) => (t ? Date.parse(t) : 0);
const ilanEsle = (r) => ({ ...r, olusturma: ms(r.olusturma), guncelleme: ms(r.guncelleme), kapanis: r.kapanis ? ms(r.kapanis) : null, no: String(r.no) });
const mesajEsle = (m) => ({ id: m.id, sohbet: m.sohbet, kimden: m.kimden, tur: m.tur, metin: m.metin, tutar: m.tutar, durum: m.durum, zaman: ms(m.zaman) });
let sonYukleme = 0, kanal = null;

function hataMetni(e) {
  const m = String(e?.message || e || '');
  if (/Invalid login credentials/i.test(m)) return 'E-posta veya şifre hatalı.';
  if (/already registered|already been registered|User already/i.test(m)) return 'Bu e-posta ile kayıtlı bir hesap var.';
  if (/Password should be|weak/i.test(m)) return 'Şifre çok zayıf; en az 8 karakter ve rakam kullan.';
  if (/rate limit|too many/i.test(m)) return 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'İnternet bağlantısı yok ya da sunucuya ulaşılamadı.';
  if (/Email not confirmed/i.test(m)) return 'E-posta adresin henüz doğrulanmadı.';
  if (/MülkümAI|hakkın doldu|giriş yapmalısın/.test(m)) return m;
  if (m === 'KREDI_YOK') return 'Kredin bitti. Rapor için kredi yükle.';
  if (/provider is not enabled|Unsupported provider/i.test(m)) return 'Google ile giriş henüz açılmadı; şimdilik e-postayla devam et.';
  return 'İşlem yapılamadı: ' + m;
}
async function islem(p) { const { data, error } = await p; if (error) throw error; return data; }

async function profilleriGetir(idler, tazele) {
  idler = [...new Set(idler)].filter((id) => id && (tazele || !S.kullanicilar.some((k) => k.id === id)));
  if (!idler.length) return;
  // Gizlilik sütunları henüz yoksa (veritabanı güncellenmeden) eski alanlarla devam et
  let r = await sb.from('profiller').select('id,ad,olusturma,soyad_gizle,acik_tel,firma,unvan,hakkinda,yetki_no,dogrulanmis,hesap_turu,sektor,foto').in('id', idler);
  if (r.error) r = await sb.from('profiller').select('id,ad,olusturma').in('id', idler);
  const data = await islem(r);
  data.forEach((p) => { const y = ({ id: p.id, ad: p.ad, olusturma: ms(p.olusturma), soyadGizle: !!p.soyad_gizle, acikTel: p.acik_tel || '', firma: p.firma || '', unvan: p.unvan || '', hakkinda: p.hakkinda || '', yetkiNo: p.yetki_no || '', dogrulanmis: !!p.dogrulanmis, ofis: p.hesap_turu === 'ofis', sektor: p.hesap_turu === 'ofis' ? (p.sektor || 'emlak') : '', foto: p.foto || '' }); const n = S.kullanicilar.findIndex((k) => k.id === p.id); if (n < 0) S.kullanicilar.push(y); else if (p.id !== S.oturum) S.kullanicilar[n] = y; });
}

async function veriYukle() {
  const { data: { session } } = await sb.auth.getSession();
  S.oturum = session?.user?.id || null;
  S.AYARLAR.vitrinler = vitrinAyar();
  const [il] = await Promise.all([
    islem(sb.from('ilanlar').select('*').order('olusturma', { ascending: false }).limit(1000)),
    typeof dopingYukle === 'function' ? dopingYukle() : null
  ]);
  S.ilanlar = il.map(ilanEsle);
  if (!S.oturum || !S.kullanicilar.some((k) => k.id === S.oturum)) S.kullanicilar = [];
  await profilleriGetir(S.ilanlar.map((i) => i.sahip), true);
  if (S.oturum) await kisiselYukle(session.user);
  else { S.sohbetler = []; S.kayitliAramalar = []; S.yonetici = false; }
  sonYukleme = Date.now();
  // Bir sonraki açılış için son veri (cihazda kalır; çıkışta silinir)
  setTimeout(() => { try { kvYaz('onbellek', { surum: 1, zaman: Date.now(), oturum: S.oturum, ilanlar: S.ilanlar, kullanicilar: S.kullanicilar, sohbetler: S.sohbetler, kayitliAramalar: S.kayitliAramalar, favSayilari: S.favSayilari, yonetici: !!S.yonetici, bildirimler: S.bildirimler || [], doping: S.DOPING || null }); } catch (_) {} }, 1500);
  canliBaglan();
}

async function kisiselYukle(user) {
  const uid = user.id;
  const [oz, pr, fav, soh, ara, rap, fs, ok] = await Promise.all([
    islem(sb.from('profil_ozel').select('*').eq('id', uid).maybeSingle()),
    islem(sb.from('profiller').select('*').eq('id', uid).maybeSingle()),
    islem(sb.from('favoriler').select('ilan')),
    islem(sb.from('sohbetler').select('*')),
    islem(sb.from('kayitli_aramalar').select('*').order('son', { ascending: false })),
    islem(sb.from('raporlar').select('*').order('zaman', { ascending: false })),
    islem(sb.rpc('favori_sayilari')),
    islem(sb.from('okundu').select('*'))
  ]);
  const mesajlar = soh.length ? await islem(sb.from('mesajlar').select('*').in('sohbet', soh.map((s) => s.id)).order('zaman')) : [];
  S.kullanicilar = S.kullanicilar.filter((k) => k.id !== uid);
  S.kullanicilar.push({
    id: uid, ad: pr?.ad || user.user_metadata?.ad || 'Üye', olusturma: ms(pr?.olusturma || user.created_at), eposta: user.email,
    firma: pr?.firma || '', unvan: pr?.unvan || '', hakkinda: pr?.hakkinda || '', slogan: pr?.slogan || '', soyadGizle: !!pr?.soyad_gizle, acikTel: pr?.acik_tel || '', yetkiNo: pr?.yetki_no || '', dogrulanmis: !!pr?.dogrulanmis, ofis: pr?.hesap_turu === 'ofis', sektor: pr?.hesap_turu === 'ofis' ? (pr?.sektor || 'emlak') : '', foto: pr?.foto || '',
    tel: oz?.tel || '', ileti: !!oz?.ileti, kredi: oz?.kredi ?? 0, favoriler: fav.map((f) => f.ilan),
    raporlar: rap.map((r) => ({ id: r.id, no: r.no, zaman: ms(r.zaman), form: r.form, sonuc: r.sonuc }))
  });
  S.sohbetler = soh.map((s) => ({
    id: s.id, ilanId: s.ilan, alici: s.alici, satici: s.satici, olusturma: ms(s.olusturma),
    mesajlar: mesajlar.filter((m) => m.sohbet === s.id).map(mesajEsle),
    okundu: Object.fromEntries(ok.filter((o) => o.sohbet === s.id).map((o) => [o.kullanici, ms(o.zaman)]))
  }));
  S.kayitliAramalar = ara.map((a) => ({ id: a.id, sahip: a.sahip, q: a.q, ad: a.ad, son: ms(a.son) }));
  S.favSayilari = Object.fromEntries(fs.map((x) => [x.ilan, x.sayi]));
  S.yonetici = !!(await sb.rpc('yonetici')).data;
  if (S.yonetici) {
    const tum = await islem(sb.from('ilanlar').select('*').eq('durum', 'kaldirildi'));
    tum.forEach((r) => { if (!S.ilanlar.some((i) => i.id === r.id)) S.ilanlar.push(ilanEsle(r)); });
  }
  // sohbetteki ama listede olmayan ilanlar (kaldırılmış vb.) ve karşı taraf profilleri
  const eksik = soh.map((s) => s.ilan).filter((id) => !S.ilanlar.some((i) => i.id === id));
  if (eksik.length) (await islem(sb.from('ilanlar').select('*').in('id', eksik))).forEach((r) => S.ilanlar.push(ilanEsle(r)));
  await profilleriGetir(soh.flatMap((s) => [s.alici, s.satici]));
}

function canliBaglan() {
  if (kanal) { sb.removeChannel(kanal); kanal = null; }
  if (!S.oturum) return;
  kanal = sb.channel('mesajlar-' + S.oturum)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mesajlar' }, async (p) => {
      const m = mesajEsle(p.new);
      let s = S.sohbetler.find((x) => x.id === m.sohbet);
      if (!s) { try { await kisiselYukle((await sb.auth.getUser()).data.user); } catch (_) {} s = S.sohbetler.find((x) => x.id === m.sohbet); if (!s) return; }
      const i = s.mesajlar.findIndex((x) => x.id === m.id);
      if (i >= 0) s.mesajlar[i] = m; else s.mesajlar.push(m);
      s.mesajlar.sort((a, b) => a.zaman - b.zaman);
      const h = location.hash;
      if (h.startsWith('#/sohbet/' + s.id) || h.startsWith('#/mesajlar')) ciz();
      else if (m.kimden !== S.oturum && p.eventType === 'INSERT') {
        toast('Yeni mesajın var'); yenileNav();
        const i = ilan(s.ilanId), metin = m.tur === 'teklif' ? 'Teklif: ' + tl(m.tutar) : m.metin || 'Yeni mesaj';
        bildir('mesaj-' + m.id, gorunenAd(kullanici(m.kimden)) + (i ? ' · ' + i.baslik.slice(0, 30) : ''), metin.slice(0, 140), '#/sohbet/' + s.id);
      }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bildirimler', filter: 'alici=eq.' + S.oturum }, (p) => uyeBildirimi(p.new))
    .subscribe();
  bekleyenBildirimler();
  if (typeof pushKur === 'function') pushKur();
}
// Sunucudan gelen üye bildirimleri (ilan onaylandı vb.): telefonda bildirim + uygulama içi uyarı, sonra okundu
const bildirimGosterildi = (id) => { try { const l = JSON.parse(localStorage.getItem('bildirimGosterilen') || '[]'); if (l.includes(id)) return true; localStorage.setItem('bildirimGosterilen', JSON.stringify([...l, id].slice(-200))); } catch (_) {} return false; };
async function uyeBildirimi(b) {
  if (!b || b.okundu) return;
  if (!(S.bildirimler || []).some((x) => x.id === b.id)) (S.bildirimler = S.bildirimler || []).unshift(b);
  if (typeof yenileNav === 'function') yenileNav();
  if (location.hash.startsWith('#/bildirimler')) { ciz(); return; }
  if (bildirimGosterildi(b.id)) return;
  toast(b.baslik); if (!(typeof pushKurulu !== 'undefined' && pushKurulu)) bildir('uye-' + b.id, b.baslik, b.metin || '', b.link || '#/bildirimler');
  if (b.tur === 'ilan_onay' && b.link) { const id = b.link.split('/').pop(), i = ilan(id); if (i) i.durum = 'yayinda'; }
}
// Uygulama kapalıyken gelenler: açılışta okunmamışları göster
async function bekleyenBildirimler() {
  try { const { data } = await sb.from('bildirimler').select('*').eq('alici', S.oturum).order('olusturma', { ascending: false }).limit(50); S.bildirimler = data || []; for (const b of [...S.bildirimler].reverse()) if (!b.okundu) await uyeBildirimi(b); if (typeof yenileNav === 'function') yenileNav(); } catch (_) {}
}
function yenileNav() { const a = nav.querySelector('a.aktif'); navCiz(a ? { '#/': 'kesfet', '#/ara': 'ara', '#/mesajlar': 'mesaj', '#/hesap': 'hesap' }[a.getAttribute('href')] : ''); }

// ---------- Üyelik ----------
async function uyeOl({ ad, eposta, tel, sifre, ileti, ofis = false, sektor = 'emlak', firma = '', yetkiNo = '' }) {
  const d = await islem(sb.auth.signUp({ email: eposta, password: sifre, options: { data: { ad, tel, ileti } } }));
  if (!d.session) throw new Error('Email not confirmed');
  if (ofis) await sb.from('profiller').update({ hesap_turu: 'ofis', sektor, firma: firma || null, yetki_no: yetkiNo || null }).eq('id', d.user.id);
  await veriYukle();
}
// Google ile giriş: tarayıcıda Google onayı -> uygulamaya derin bağlantıyla dönüş -> kod oturuma çevrilir
async function googleGiris() {
  const P = window.Capacitor?.Plugins, yerel = window.Capacitor?.isNativePlatform?.();
  const d = await islem(sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: yerel ? GOOGLE_DONUS : location.origin + location.pathname, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } } }));
  if (yerel && P?.Browser) await P.Browser.open({ url: d.url, presentationStyle: 'popover' });
  else location.href = d.url;
}
async function googleDonus(url) {
  const kod = new URL(url).searchParams.get('code');
  const hata = new URL(url).searchParams.get('error_description');
  try { window.Capacitor?.Plugins?.Browser?.close(); } catch (_) {}
  if (hata) throw new Error(hata);
  if (!kod) return false;
  await islem(sb.auth.exchangeCodeForSession(kod));
  await veriYukle();
  return true;
}
async function girisYap(eposta, sifre) { await islem(sb.auth.signInWithPassword({ email: eposta, password: sifre })); await veriYukle(); }
async function cikisYap() { await sb.auth.signOut(); await veriYukle(); }
async function profilKaydet(b, { ad, tel, ileti, firma = '', unvan = '', hakkinda = '', slogan = '', soyadGizle = false, telGoster = false, yetkiNo = '', ofis = false, sektor = '' }) {
  const acikTel = telGoster ? tel : '';
  await islem(sb.from('profiller').update({ ad, firma: firma || null, unvan: unvan || null, hakkinda: hakkinda || null, slogan: slogan || null, soyad_gizle: soyadGizle, acik_tel: acikTel || null, yetki_no: yetkiNo || null, hesap_turu: ofis ? 'ofis' : 'bireysel', sektor: ofis ? (sektor || 'emlak') : null }).eq('id', b.id));
  await islem(sb.from('profil_ozel').update({ tel, ileti }).eq('id', b.id));
  Object.assign(b, { ad, tel, ileti, firma, unvan, hakkinda, slogan, soyadGizle, acikTel, yetkiNo, ofis, sektor: ofis ? (sektor || 'emlak') : '' });
}
async function sifreDegistir(b, eski, yeni) {
  const { error } = await sb.auth.signInWithPassword({ email: b.eposta, password: eski });
  if (error) throw new Error('Mevcut şifre hatalı.');
  await islem(sb.auth.updateUser({ password: yeni }));
}
async function hesabiSil() {
  const depo = sb.storage.from('ilan-fotolari');
  const { data: dosyalar } = await depo.list(S.oturum, { limit: 1000 });
  if (dosyalar?.length) await islem(depo.remove(dosyalar.map((d) => `${S.oturum}/${d.name}`)));
  await islem(sb.rpc('hesabimi_sil')); await sb.auth.signOut(); await veriYukle();
}

// ---------- İlanlar ----------
// Profil fotoğrafı: küçültülmüş görsel depoya yüklenir, adresi profiller.foto'ya yazılır
async function profilFotoKaydet(dataUrl) {
  const url = dataUrl ? await fotoYukle(dataUrl) : null;
  await islem(sb.from('profiller').update({ foto: url }).eq('id', S.oturum));
  const b = ben(); if (b) b.foto = url || '';
  const k = S.kullanicilar.find((x) => x.id === S.oturum); if (k) k.foto = url || '';
  return url;
}
async function fotoYukle(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  const yol = `${S.oturum}/${yeniId()}.jpg`;
  await islem(sb.storage.from('ilan-fotolari').upload(yol, blob, { contentType: 'image/jpeg', upsert: false }));
  return sb.storage.from('ilan-fotolari').getPublicUrl(yol).data.publicUrl;
}
function depoYolu(url) { const k = '/ilan-fotolari/'; const i = String(url).indexOf(k); return i >= 0 ? decodeURIComponent(url.slice(i + k.length)) : null; }
// Listelerde kullanılan küçük kapak (uzun kenar 480 px): tam boy fotoğraf yerine iner
async function kapakUret(url) {
  const bmp = await createImageBitmap(await (await fetch(url)).blob());
  const o = Math.min(1, 480 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
  c.width = Math.round(bmp.width * o); c.height = Math.round(bmp.height * o); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const kb = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.74)), yol = S.oturum + '/k-' + yeniId() + '.jpg';
  await islem(sb.storage.from('ilan-fotolari').upload(yol, kb, { contentType: 'image/jpeg', upsert: false, cacheControl: '31536000' }));
  return sb.storage.from('ilan-fotolari').getPublicUrl(yol).data.publicUrl;
}
async function ilanKaydet(t, ilerleme) {
  const fotolar = [];
  for (let n = 0; n < t.fotolar.length; n++) {
    ilerleme && ilerleme(`Fotoğraflar yükleniyor (${n + 1}/${t.fotolar.length})…`);
    fotolar.push(t.fotolar[n].startsWith('data:') ? await fotoYukle(t.fotolar[n]) : t.fotolar[n]);
  }
  const satir = { ana: ALT[t.alt].ana, alt: t.alt, baslik: t.baslik, aciklama: t.aciklama || null, fiyat: t.fiyat, il: t.il, ilce: t.ilce || null, alanlar: t.alanlar, fotolar };
  // Kapak değiştiyse küçük sürümü yeniden üret; üretilemezse ilan tam boy kapakla kaydedilir
  try {
    const eskiK = satir.alanlar?.kapakK;
    if (fotolar[0] && satir.alanlar?.kapakKk !== fotolar[0]) { ilerleme && ilerleme('Kapak hazırlanıyor…'); const k = await kapakUret(fotolar[0]); satir.alanlar = { ...satir.alanlar, kapakK: k, kapakKk: fotolar[0] }; if (eskiK && depoYolu(eskiK)) sb.storage.from('ilan-fotolari').remove([depoYolu(eskiK)]); }
    else if (!fotolar[0] && eskiK) { const { kapakK, kapakKk, ...r } = satir.alanlar; satir.alanlar = r; if (depoYolu(eskiK)) sb.storage.from('ilan-fotolari').remove([depoYolu(eskiK)]); }
  } catch (_) {}
  if (t.id) {
    const eski = ilan(t.id);
    // Fiyat indirilince önceki fiyat saklanır ("Fiyat düştü" etiketi); artınca etiket kalkar
    if (eski && t.fiyat < eski.fiyat) satir.alanlar = { ...satir.alanlar, oncekiFiyat: Math.max(eski.fiyat, +eski.alanlar?.oncekiFiyat || 0) };
    else if (eski && t.fiyat > eski.fiyat && satir.alanlar?.oncekiFiyat) { const { oncekiFiyat, ...r } = satir.alanlar; satir.alanlar = r; }
    // Adres değişmediyse çözülmüş koordinatlar korunur; değişirse eski konum geçersizdir, silinir ve yeniden çözülür
    if (eski?.alanlar?.enlem && satir.alanlar) {
      const adresAyni = satir.il === eski.il && satir.ilce === eski.ilce && ['mahalle', 'sokak', 'ada', 'parsel'].every((k) => String(satir.alanlar[k] || '') === String(eski.alanlar[k] || ''));
      if (adresAyni && satir.alanlar?.konumDuzey !== 'isaret') { const { enlem, boylam, konumDuzey, ...eskiAl } = eski.alanlar; satir.alanlar = { ...eskiAl, ...satir.alanlar, enlem, boylam, konumDuzey }; }
    }
    const r = await islem(sb.from('ilanlar').update(satir).eq('id', t.id).select().single());
    const silinen = (eski?.fotolar || []).filter((u) => !fotolar.includes(u)).map(depoYolu).filter(Boolean);
    if (silinen.length) sb.storage.from('ilan-fotolari').remove(silinen);
    Object.assign(eski, ilanEsle(r)); konumFakla(eski); return eski;
  }
  const r = ilanEsle(await islem(sb.from('ilanlar').insert(satir).select().single()));
  S.ilanlar.unshift(r); konumFakla(r); return r;
}
// Emlak ilanın koordinatını arkadan çöz (TKGM parsel → Photon sokak/mahalle/ilçe — ilanın kendi verisi; scrape YOK).
// Alanlar YALNIZ sunucuya yazılır; kullanıcı konumuyla ilgisi yoktur.
function konumFakla(r) {
  if (r.ana !== 'emlak' || +r.alanlar?.enlem > 0) return;
  try {
    ilanKonumu(r).then((k) => {
      if (!k || !k.lat) return; const i = ilan(r.id); if (!i) return;
      const al = { ...i.alanlar, enlem: Math.round(k.lat * 1e6) / 1e6, boylam: Math.round(k.lon * 1e6) / 1e6, konumDuzey: k.duzey || '' };
      islem(sb.from('ilanlar').update({ alanlar: al }).eq('id', r.id)).then(() => { const g = ilan(r.id); if (g) g.alanlar = al; }, () => {});
    }).catch(() => {});
  } catch (_) {}
}
async function ilanDurum(i, durum, satisFiyati) {
  const g = { durum }; if (durum === 'satildi' && satisFiyati > 0) g.satis_fiyati = satisFiyati;
  await islem(sb.from('ilanlar').update(g).eq('id', i.id)); Object.assign(i, g); i.guncelleme = Date.now(); i.kapanis = durum === 'satildi' ? Date.now() : null;
}
// Resmî bölge göstergeleri (TCMB, TÜİK, AFAD...): her gösterge için ilçe varsa ilçenin, yoksa ilin en son dönemi
async function gostergeler(il, ilce) {
  const { data } = await sb.from('bolge_gostergeleri').select('*').eq('il', il).order('donem', { ascending: false });
  const _ilceSuz = (l) => (l || []).filter((d) => !d.ilce || (ilce && kucuk(d.ilce) === kucuk(ilce))); if (data) data.splice(0, data.length, ..._ilceSuz(data));
  const sonuc = {};
  (data || []).forEach((d) => { const k = d.gosterge; const ilceli = ilce && kucuk(d.ilce) === kucuk(ilce); if (!sonuc[k] || (ilceli && !sonuc[k].ilceli)) sonuc[k] = { ...d, ilceli }; });
  return Object.values(sonuc);
}
async function gostergeKaydet(r) { return await islem(sb.from('bolge_gostergeleri').upsert(r, { onConflict: 'il,ilce,donem,gosterge' })); }
async function ilanSil(id) {
  const i = ilan(id);
  await islem(sb.from('ilanlar').delete().eq('id', id));
  const yollar = [...(i?.fotolar || []), ...(i?.alanlar?.deko || []).map((d) => d.url)].map(depoYolu).filter(Boolean);
  if (yollar.length) sb.storage.from('ilan-fotolari').remove(yollar);
  const vyollar = (i?.alanlar?.videolar || []).map((v) => String(v.url || '').split('/ilan-videolari/')[1]).filter(Boolean);
  if (vyollar.length) sb.storage.from('ilan-videolari').remove(vyollar);
  S.ilanlar = S.ilanlar.filter((x) => x.id !== id); S.sohbetler = S.sohbetler.filter((s) => s.ilanId !== id);
}
function ilanGoruntule(id) { sb.rpc('ilan_goruntule', { p_ilan: id }).then(() => {}, () => {}); }
async function favoriDegistir(id) {
  const b = ben();
  if (b.favoriler.includes(id)) { await islem(sb.from('favoriler').delete().eq('ilan', id).eq('kullanici', b.id)); b.favoriler = b.favoriler.filter((x) => x !== id); return false; }
  await islem(sb.from('favoriler').insert({ ilan: id })); b.favoriler.push(id); return true;
}
async function sikayetEt(id, neden) { const { error } = await sb.from('sikayetler').insert({ ilan: id, neden }); if (error && error.code !== '23505') throw error; }

// ---------- Mesajlaşma ----------
async function sohbetGetir(i) {
  const b = ben();
  let s = S.sohbetler.find((x) => x.ilanId === i.id && x.alici === b.id);
  if (s) return s;
  let r = await sb.from('sohbetler').insert({ ilan: i.id, satici: i.sahip }).select().single();
  if (r.error && r.error.code === '23505') r = await sb.from('sohbetler').select('*').eq('ilan', i.id).eq('alici', b.id).single();
  if (r.error) throw r.error;
  s = { id: r.data.id, ilanId: i.id, alici: b.id, satici: i.sahip, olusturma: ms(r.data.olusturma), mesajlar: [], okundu: {} };
  S.sohbetler.push(s); return s;
}
async function mesajGonder(s, m) {
  const r = mesajEsle(await islem(sb.from('mesajlar').insert({ sohbet: s.id, ...m }).select().single()));
  if (!s.mesajlar.some((x) => x.id === r.id)) s.mesajlar.push(r);
}
async function teklifYanitla(s, mesajId, kabul) {
  await islem(sb.rpc('teklif_yanitla', { p_mesaj: mesajId, p_kabul: kabul }));
  const m = await islem(sb.from('mesajlar').select('*').eq('sohbet', s.id).order('zaman'));
  s.mesajlar = m.map(mesajEsle);
}
function okunduYaz(s) {
  s.okundu = s.okundu || {}; s.okundu[S.oturum] = Date.now();
  sb.from('okundu').upsert({ sohbet: s.id, kullanici: S.oturum, zaman: new Date().toISOString() }).then(() => {}, () => {});
}

// ---------- MülkümAI (Gemini, sunucu üzerinden) ----------
async function aiSor(gorev, veri) {
  const { data, error } = await sb.functions.invoke('mulkum-ai', { body: { gorev, ...veri } });
  if (error) {
    let m = 'MülkümAI yanıt veremedi.';
    try { m = (await error.context.json()).hata || m; } catch (_) {}
    throw new Error(m);
  }
  return data.metin;
}
// Tam cevap (ör. içe aktarmada fotoğraf listesi de gelir)
async function aiSorTam(gorev, veri) {
  const { data, error } = await sb.functions.invoke('mulkum-ai', { body: { gorev, ...veri } });
  if (error) { let m = 'MülkümAI yanıt veremedi.'; try { m = (await error.context.json()).hata || m; } catch (_) {} throw new Error(m); }
  return data;
}
// Hesap türünü tek başına değiştir (Google ile üye olan emlak ofisi için)
async function hesapTuruYap(ofis, sektor = 'emlak') { await islem(sb.from('profiller').update({ hesap_turu: ofis ? 'ofis' : 'bireysel', sektor: ofis ? sektor : null }).eq('id', S.oturum)); const b = ben(); if (b) { b.ofis = ofis; b.sektor = ofis ? sektor : ''; } }

// ---------- Doğrulama talepleri (emlak ofisi / tapu) ----------
async function dogrulamaIste(tur, ilanId, notu) { const { error } = await sb.from('dogrulama_talepleri').insert({ tur, ilan: ilanId || null, notu: notu || null }); if (error && error.code === '23505') throw new Error('Bu konuda bekleyen bir talebin zaten var.'); if (error) throw error; }
async function dogrulamaTalepleri() { return await islem(sb.from('dogrulama_talepleri').select('*').eq('durum', 'bekliyor').order('olusturma')); }
async function dogrulamaKarar(id, onay) { await islem(sb.rpc('dogrulama_karar', { p_talep: id, p_onay: onay })); }

// ---------- Ofisim (müşteri, görev, not; yalnız sahibi) ----------
async function panelGetir() { return await islem(sb.from('panel_kayit').select('*').order('olusturma', { ascending: false }).limit(1000)); }
async function panelKaydet(k) {
  const satir = { tur: k.tur, veri: k.veri, tarih: k.tarih || null, tamam: !!k.tamam };
  return k.id ? await islem(sb.from('panel_kayit').update(satir).eq('id', k.id).select().single()) : await islem(sb.from('panel_kayit').insert(satir).select().single());
}
async function panelSil(id) { await islem(sb.from('panel_kayit').delete().eq('id', id)); }

// MülkümDeko: oda fotoğrafını seçilen stilde döşer, oluşan görselin adresini döner (ilana eklemez)
async function dekoUret(foto, oda, stil) {
  const { data, error } = await sb.functions.invoke('mulkum-ai', { body: { gorev: 'deko', foto, oda, stil } });
  const krediYaz = (k) => { const b = ben(); if (b && k != null) b.kredi = k; };
  if (error) {
    let m = 'Görsel oluşturulamadı.', j = {};
    try { j = await error.context.json(); m = j.hata || m; } catch (_) {}
    krediYaz(j.kredi);
    const x = new Error(m); x.kredisiz = error.context && error.context.status === 402; throw x;
  }
  krediYaz(data.kredi);
  return data.url;
}
// Deko görselleri ilanın alanlar.deko listesinde tutulur: { url, kaynak, oda, stil }
async function dekoKaydet(i, liste) {
  const alanlar = { ...(i.alanlar || {}), deko: liste };
  await islem(sb.from('ilanlar').update({ alanlar }).eq('id', i.id));
  i.alanlar = alanlar;
}

// ---------- Bölge verileri (TÜİK vb. resmî kaynak) ----------
async function bolgeVerisi(il, ilce) {
  const { data } = await sb.from('bolge_verileri').select('*').eq('il', il).order('yil', { ascending: false });
  const _ilceSuz = (l) => (l || []).filter((d) => !d.ilce || (ilce && kucuk(d.ilce) === kucuk(ilce))); if (data) data.splice(0, data.length, ..._ilceSuz(data));
  if (!data?.length) return null;
  const ilS = data.find((d) => !d.ilce) || null, ilceS = ilce ? data.find((d) => kucuk(d.ilce) === kucuk(ilce)) || null : null;
  if (!ilS) return ilceS;
  return ilceS ? { ...ilS, ilceVeri: ilceS } : ilS;
}
// Seçim sonuçları: ilçe varsa ilçenin, yoksa ilin en son yılı; türe göre gruplu
async function secimSonuclari(il, ilce) {
  const { data } = await sb.from('secim_sonuclari').select('*').eq('il', il).order('yil', { ascending: false });
  const _ilceSuz = (l) => (l || []).filter((d) => !d.ilce || (ilce && kucuk(d.ilce) === kucuk(ilce))); if (data) data.splice(0, data.length, ..._ilceSuz(data));
  if (!data?.length) return null;
  const ilceli = data.filter((d) => ilce && kucuk(d.ilce) === kucuk(ilce));
  const l = ilceli.length ? ilceli : data.filter((d) => !d.ilce);
  if (!l.length) return null;
  const yil = l[0].yil, gruplar = {};
  l.filter((d) => d.yil === yil).forEach((d) => (gruplar[d.tur] = gruplar[d.tur] || []).push({ parti: d.parti, oran: +d.oy_orani }));
  Object.values(gruplar).forEach((g) => g.sort((a, b) => b.oran - a.oran));
  return { yil, kapsam: ilceli.length ? `${l[0].ilce}, ${il}` : `${il} geneli`, kaynak: l[0].kaynak, gruplar };
}
async function secimKaydet(satirlar) { return await islem(sb.from('secim_sonuclari').upsert(satirlar, { onConflict: 'il,ilce,yil,tur,parti' })); }
async function bolgeKaydet(r) { return await islem(sb.from('bolge_verileri').upsert(r, { onConflict: 'il,ilce,yil' }).select().single()); }

// ---------- Yönetim (yalnız yönetici; sunucu kuralları da denetler) ----------
async function sikayetleriGetir() {
  const l = await islem(sb.from('sikayetler').select('*').order('zaman', { ascending: false }));
  await profilleriGetir(l.map((x) => x.kim));
  return l.map((x) => ({ ...x, zaman: ms(x.zaman) }));
}
async function uyeler(arama) { return (await islem(sb.rpc('yonetim_uyeler', { p_arama: arama || '' }))).map((u) => ({ ...u, kayit: ms(u.kayit), son_giris: ms(u.son_giris) })); }
async function uyeHareketleri(id) { return (await islem(sb.rpc('yonetim_hareketler', { p_uye: id }))).map((h) => ({ ...h, zaman: ms(h.zaman) })); }
async function krediYukleId(id, miktar, aciklama) { return await islem(sb.rpc('kredi_yukle_id', { p_uye: id, p_miktar: miktar, p_aciklama: aciklama })); }
async function sikayetKapat(ilanId) { await islem(sb.from('sikayetler').delete().eq('ilan', ilanId)); }
async function istatistik() {
  const say = async (t, f) => { let q = sb.from(t).select('*', { count: 'exact', head: true }); if (f) q = f(q); const { count } = await q; return count || 0; };
  const [uye, yayinda, satildi, mesaj] = await Promise.all([say('profiller'), say('ilanlar', (q) => q.eq('durum', 'yayinda')), say('ilanlar', (q) => q.eq('durum', 'satildi')), say('sikayetler')]);
  return { uye, yayinda, satildi, sikayet: mesaj };
}

// ---------- Kayıtlı arama ve raporlar ----------
async function aramaKaydet(q, ad) { const r = await islem(sb.from('kayitli_aramalar').insert({ q, ad }).select().single()); S.kayitliAramalar.unshift({ id: r.id, sahip: r.sahip, q, ad, son: ms(r.son) }); }
async function aramaSil(id) { await islem(sb.from('kayitli_aramalar').delete().eq('id', id)); S.kayitliAramalar = S.kayitliAramalar.filter((a) => a.id !== id); }
function aramaGoruldu(a) { a.son = Date.now(); sb.from('kayitli_aramalar').update({ son: new Date().toISOString() }).eq('id', a.id).then(() => {}, () => {}); }
// MülkümAI raporu: sunucu 1 kredi düşer; bakiye yetmezse hata verir
async function raporKaydet(r) {
  const { data, error } = await sb.rpc('rapor_olustur', { p_no: r.no, p_form: r.form, p_sonuc: r.sonuc });
  if (error) throw /yetersiz kredi/.test(error.message) ? new Error('KREDI_YOK') : error;
  r.id = data; const b = ben(); b.raporlar.unshift(r); b.kredi = Math.max(0, (b.kredi || 0) - 1); return r;
}
async function krediHareketleri() { return (await islem(sb.from('kredi_hareketleri').select('*').order('zaman', { ascending: false }).limit(50))).map((h) => ({ ...h, zaman: ms(h.zaman) })); }
async function krediYukle(eposta, miktar, aciklama) { return await islem(sb.rpc('kredi_yukle', { p_eposta: eposta, p_miktar: miktar, p_aciklama: aciklama || 'Yönetici yüklemesi' })); }
async function raporSil(id) { await islem(sb.from('raporlar').delete().eq('id', id)); ben().raporlar = ben().raporlar.filter((x) => x.id !== id); }
