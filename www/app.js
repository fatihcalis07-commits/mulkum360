// İlan başına en çok fotoğraf (veritabanı kuralıyla aynı)
const FOTO_SINIR = 40;
// Telefonda hangi APK'nın kurulu olduğunu görmek için (Hesabım → Uygulama sürümü)
const SURUM = '9.9 · 13.11.2026 03:45';
// Tanılama: aktarma adımlarını istemci_kayit tablosuna yazar (hata ayıklama için; yalnız giriş yapmış kullanıcı)
const KAYIT_OTURUM = Math.random().toString(36).slice(2, 8);
function kayit(olay, ayrinti = '') { try { if (typeof sb === 'undefined' || !ben()) return; sb.from('istemci_kayit').insert({ surum: SURUM, oturum: KAYIT_OTURUM, olay: String(olay).slice(0, 60), ayrinti: String(ayrinti).slice(0, 500) }).then(() => {}, () => {}); } catch (_) {} }
// Beklenmeyen hatalar tanılama tablosuna düşer (oturum başına en çok 5)
let hataSay = 0;
const hataKaydet = (m) => { if (hataSay++ < 5) kayit('hata', (location.hash.split('?')[0] || '#/') + ' ' + m); };
addEventListener('error', (e) => hataKaydet((e.message || '') + ' @' + String(e.filename || '').split('/').pop() + ':' + (e.lineno || 0)));
addEventListener('unhandledrejection', (e) => hataKaydet('söz: ' + (e.reason?.message || e.reason || '')));
addEventListener('offline', () => typeof toast === 'function' && toast('İnternet bağlantısı kesildi'));
addEventListener('online', () => { if (typeof toast === 'function') toast('Bağlantı geri geldi'); if (typeof veriYukle === 'function') veriYukle().then(() => !location.hash.startsWith('#/ver') && ciz(), () => {}); });
// Satıcının açık telefonu: arama ve WhatsApp bağlantısı (yalnız satıcı telefonunu herkese açtıysa)
const telTemiz = (t) => String(t || '').replace(/[^\d+]/g, '');
function waBaglanti(tel, i) {
  let d = String(tel || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '90' + d.slice(1); else if (d.length === 10 && d.startsWith('5')) d = '90' + d;
  const metin = `Merhaba, Mülküm360'taki "${i.baslik}" ilanınız (İlan no ${i.no || i.id.slice(-6).toUpperCase()}) hakkında yazıyorum.`;
  return `https://wa.me/${d}?text=${encodeURIComponent(metin)}`;
}
const WA_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>';// Mülküm360 — uygulama: yönlendirme, ekranlar, üyelik, ilanlar, mesajlar, değerleme ve PDF rapor
'use strict';

const app = $('#app'), nav = $('#nav'), sheetEl = $('#sheet'), toastEl = $('#toast');
let taslak = null;          // ilan verme sihirbazı
let sonDegerleme = null;    // rapora gidecek hesap

// ---------- Ortak ----------
const ben = () => S.kullanicilar.find((k) => k.id === S.oturum) || null;
const kullanici = (id) => S.kullanicilar.find((k) => k.id === id) || { ad: 'Silinmiş üye', id };
const ilan = (id) => S.ilanlar.find((i) => i.id === id);
// Soyadını gizleyen üye başkalarına "Fatih Ç." olarak görünür
const gorunenAd = (k) => { if (!k?.soyadGizle || k.id === S.oturum) return k?.ad || ''; const p = String(k.ad).trim().split(/\s+/); return p.length < 2 ? k.ad : p.slice(0, -1).join(' ') + ' ' + p[p.length - 1][0].toLocaleUpperCase('tr-TR') + '.'; };
// Emlak ofisi rozeti: firma ya da yetki belgesi beyan eden üyeler
const kurumAd = (k, ana) => (k?.sektor ? k.sektor === 'galeri' : ana === 'vasita') ? 'Oto galeri' : 'Emlak ofisi';
const rozet = (k, ana = 'emlak') => k?.dogrulanmis ? `<span class="rozet kurum dogru">${ic('kalkan', 12)}Doğrulanmış ${kurumAd(k, ana) === 'Oto galeri' ? 'galeri' : 'ofis'}</span>` : k?.ofis || k?.firma || k?.yetkiNo ? `<span class="rozet kurum">${ic('kalkan', 12)}${kurumAd(k, ana)}</span>` : '';
// İlanın kimden olduğu: emlakta ilan sahibinin hesap türü, vasıtada ilandaki alan
const kimden = (i) => (i.ana === 'emlak' ? (kullanici(i.sahip).ofis ? 'Emlak ofisinden' : 'Sahibinden') : i.alanlar?.kimden || '');
const basHarf = (ad) => kac(String(ad || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toLocaleUpperCase('tr-TR'));
function git(h) { if (location.hash === h) ciz(); else location.hash = h; }
function toast(m) {
  toastEl.textContent = m; toastEl.classList.add('acik'); clearTimeout(toast.z); toast.z = setTimeout(() => toastEl.classList.remove('acik'), 2400);
  if (/Hayırlı olsun|yayında!|Rapor hazır|ilan yayınlandı|ilana eklendi/.test(m)) kutla();
}
// Başarı anlarında kısa konfeti ve titreşim (hareket azaltma tercihine saygılı)
function kutla() {
  try { navigator.vibrate?.([30, 40, 30]); } catch (_) {}
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const renk = ['#FFC72C', '#0B1B33', '#0F766E', '#FFD24D', '#1E3A66'], k = document.createElement('div');
  k.className = 'konfeti';
  k.innerHTML = Array.from({ length: 36 }, (_, n) => `<i style="left:${Math.random() * 100}%;background:${renk[n % renk.length]};animation-delay:${Math.random() * 0.3}s;--x:${(Math.random() - 0.5) * 160}px;--d:${0.9 + Math.random() * 0.8}s"></i>`).join('');
  document.body.appendChild(k); setTimeout(() => k.remove(), 2200);
}
// ---------- Bildirimler (Capacitor yerel bildirim) ----------
// Mesaj ve kayıtlı arama bildirimleri uygulama açıkken/arka plandayken gelir; görev hatırlatmaları
// telefona önceden kurulur, uygulama kapalıyken de çalar. Tarayıcıda (önizleme) sessizce atlanır.
const BLD = window.Capacitor?.Plugins?.LocalNotifications;
const bldId = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 2000000000; };
const bldAcik = () => { try { return localStorage.getItem('bildirim') !== 'kapali'; } catch (_) { return true; } };
async function bildirimIzni(sor = true) {
  if (!BLD) return false;
  try { let p = await BLD.checkPermissions(); if (p.display !== 'granted' && sor) p = await BLD.requestPermissions(); return p.display === 'granted'; } catch (_) { return false; }
}
// Bildirim başlığı: her kelimenin ilk harfi büyük (bağlaçlar dahil), kelimenin geri kalanı korunur
const baslikBuyut = (t) => String(t || '').split(' ').map((w) => w.replace(/^([^\p{L}\p{N}]*)(\p{L})/u, (m, o, h) => o + h.toLocaleUpperCase('tr-TR'))).join(' ');
async function bildir(anahtar, baslik, metin, hash, zaman) {
  baslik = baslikBuyut(baslik);
  if (!BLD || !bldAcik() || !(await bildirimIzni(false))) return;
  try { await BLD.schedule({ notifications: [{ id: bldId(anahtar), title: baslik, body: metin, extra: { hash }, ...(zaman ? { schedule: { at: zaman, allowWhileIdle: true } } : {}) }] }); } catch (_) {}
}
if (BLD) BLD.addListener('localNotificationActionPerformed', (a) => { const h = a.notification?.extra?.hash; if (h) git(h); });
// Görev hatırlatmaları: her görev için saatinden 30 dk önce (yakınsa tam saatinde) bir bildirim
async function gorevHatirlatKur() {
  if (!BLD || !PANEL) return;
  try {
    const bekleyen = (await BLD.getPending()).notifications.filter((n) => n.extra?.gorev).map((n) => ({ id: n.id }));
    if (bekleyen.length) await BLD.cancel({ notifications: bekleyen });
    if (!bldAcik() || !(await bildirimIzni(false))) return;
    const simdi = Date.now(), l = PANEL.filter((g) => g.tur === 'gorev' && !g.tamam && g.tarih && new Date(g.tarih) > simdi).slice(0, 60).map((g) => {
      const t = new Date(g.tarih).getTime(), at = new Date(Math.max(simdi + 5000, t - (+g.veri.hatirlat || 30) * 60000));
      return { id: bldId('gorev-' + g.id), title: 'Hatırlatma: ' + g.veri.baslik, body: new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + (g.veri.musteri ? ' · ' + g.veri.musteri : ''), schedule: { at, allowWhileIdle: true }, extra: { hash: '#/panel/gorev', gorev: true } };
    });
    if (l.length) await BLD.schedule({ notifications: l });
  } catch (_) {}
}
// Kayıtlı aramalara gelen yeni ilanlar: her ilan için bir kez bildirilir
function aramaBildir() {
  const b = ben(); if (!b || !BLD) return;
  let goruldu = {}; try { goruldu = JSON.parse(localStorage.getItem('aramaBildirilen') || '{}'); } catch (_) {}
  for (const a of S.kayitliAramalar.filter((x) => x.sahip === b.id)) {
    const esik = Math.max(a.son || 0, goruldu[a.id] || 0), yeni = aramaYap(a.q).filter((i) => i.olusturma > esik && i.sahip !== b.id);
    if (!yeni.length) continue;
    goruldu[a.id] = Math.max(...yeni.map((i) => i.olusturma));
    bildir('arama-' + a.id + '-' + goruldu[a.id], `"${aramaAdi(Object.fromEntries(new URLSearchParams(a.q)))}" aramana ${yeni.length} yeni ilan`, yeni[0].baslik + ' · ' + tl(yeni[0].fiyat), '#/ara?' + a.q);
  }
  try { localStorage.setItem('aramaBildirilen', JSON.stringify(goruldu)); } catch (_) {}
}

// Türkçe başlık yazımı: kutu, başlık, düğme ve menü adlarında kelime baş harfi büyük (i → İ),
// bağlaçlar (ve, ile, veya…) küçük, tireli kelimelerde yalnız ilk parça (E-posta). CSS capitalize Türkçeyi bilmiyor.
const BASLIK_SECICI = '.haber-bas b,details.katla>summary small,.katla-tumu,.ilan-yonet,.sheet .liste .ara > b,details.katla>summary .ara,.ayar-d span,.kv-dugme a,.kv-dugme button,.cuzdan-btn,.kart.satir .ara > b,.ipucu b,.hero-baslik,.paket-k .ara > b,.alan,.ust h1,.bolum-bas h2,.bolum-bas a,.kart h3,.sheet h2,.ozellik-izgara span,.panel-ozet span,.kisayol,.segment button,.secim button,.btn,.cip,.liste > a,.liste > button,.nav a,.kat-k b,.kat-k small,.ozellik-k b,.deger-k .ust-yazi,.hero-selam';
const KUCUK_KAL = new Set([]); // kullanıcı kuralı: her kelimenin baş harfi büyük (bağlaçlar dahil)
const basHarfBuyuk = (s) => s.replace(/(^|[\s(/])([^\s(/]+)/g, (m, on, w, i) => {
  const k = w.toLocaleLowerCase('tr-TR');
  if (i > 0 && KUCUK_KAL.has(k)) return on + k;
  if (/^[\d+%₺㎡]/.test(w) || /^[A-ZÇĞİÖŞÜ]{2,}/.test(w) || /^(m²|m³|km|cm|mm|kg|cc|hp|kW|kWh|dk|sn)[.,;:)]?$/.test(w)) return on + w; // sayı, birim, kısaltma (PDF, AI)
  return on + w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1);
});
function baslikDuzelt(kok = document) {
  // Türkçe büyük harf kuralı yalnız Türkçe arayüzde (İngilizce/Rusçada "i"yi "İ" yapmasın)
  if ((document.documentElement.lang || 'tr') !== 'tr') return;
  const hedef = [...(kok.matches?.(BASLIK_SECICI) ? [kok] : []), ...kok.querySelectorAll(BASLIK_SECICI)];
  hedef.forEach((el) => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement.closest('input,select,textarea,option,datalist,.alan small,.alan span,.k,.soluk,[data-duzen]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    for (let n; (n = w.nextNode());) { const y = basHarfBuyuk(n.nodeValue); if (y !== n.nodeValue) n.nodeValue = y; }
  });
}
// Kapak fotoğrafları ekrana yaklaşınca yüklenir (uzun listelerde yüzlerce görsel birden inmesin)
const bgYukle = (el) => { const u = el.dataset.bg; if (!u) return; el.style.backgroundImage = "url('" + u.replace(/'/g, '%27') + "')"; el.removeAttribute('data-bg'); bgGoz?.unobserve(el); };
const bgGoz = 'IntersectionObserver' in window ? new IntersectionObserver((l) => l.forEach((e) => e.isIntersecting && bgYukle(e.target)), { rootMargin: '600px' }) : null;
const bgIzle = (kok) => [...(kok.matches?.('[data-bg]') ? [kok] : []), ...kok.querySelectorAll('[data-bg]')].forEach((el) => (bgGoz ? bgGoz.observe(el) : bgYukle(el)));
new MutationObserver((l) => { for (const m of l) for (const n of m.addedNodes) if (n.nodeType === 1) { baslikDuzelt(n); bgIzle(n); } }).observe(document.documentElement, { childList: true, subtree: true });
// Kartlardaki kalp: ilanı açmadan favoriye ekle/çıkar
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-kfav]'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  b.classList.add('atim'); setTimeout(() => b.classList.remove('atim'), 400);
  await favDegis(b.dataset.kfav);
  const v = favMi(b.dataset.kfav); b.classList.toggle('dolu', v); b.innerHTML = ic('kalp', 16, v ? '#fff' : 'currentColor');
}, true);
// Dokunulan düğme ve kartlarda hafif titreşim
document.addEventListener('click', (e) => { if (e.target.closest('.btn,.cip,.ilan-k,.kat-k,.ozellik-k')) try { navigator.vibrate?.(8); } catch (_) {} }, true);
function girisGerek(neden) {
  if (ben()) return false;
  S.donus = location.hash; S.girisNeden = neden || ''; kaydet();
  toast(neden || 'Bunun için giriş yapmalısın');
  git('#/giris');
  return true;
}
function sheetAc(html, baglan) {
  sheetEl.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="tutamak"></div>${html}</div>`;
  sheetEl.hidden = false;
  sheetEl.onclick = (e) => { if (e.target === sheetEl) sheetKapat(); };
  if (baglan) baglan($('.sheet', sheetEl));
}
function sheetKapat() { sheetEl.hidden = true; sheetEl.innerHTML = ''; }
function onayla(baslik, metin, dugme, tehlike) {
  return new Promise((ok) => sheetAc(`<h2 style="font-size:19px;font-weight:800">${kac(baslik)}</h2><p class="soluk" style="margin:0;line-height:1.5">${kac(metin)}</p>
    <div class="izgara2"><button class="btn sade" data-h="0">Vazgeç</button><button class="btn ${tehlike ? 'tehlike' : ''}" data-h="1">${kac(dugme)}</button></div>`,
    (s) => s.querySelectorAll('[data-h]').forEach((b) => (b.onclick = () => { sheetKapat(); ok(b.dataset.h === '1'); }))));
}
function okunmamis() {
  const b = ben(); if (!b) return 0;
  return S.sohbetler.filter((s) => s.alici === b.id || s.satici === b.id)
    .reduce((t, s) => t + s.mesajlar.filter((m) => m.kimden !== b.id && m.zaman > (s.okundu?.[b.id] || 0)).length, 0);
}
function favMi(id) { const b = ben(); return !!b && (b.favoriler || []).includes(id); }
async function favDegis(id) {
  if (girisGerek('Favorilere eklemek için giriş yap')) return;
  try { toast((await favoriDegistir(id)) ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı'); } catch (x) { toast(hataMetni(x)); }
}
const googleDugme = () => `<button type="button" class="btn tam google" data-google><svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>Google ile devam et</button>`;
async function googleBasla(b) {
  b.disabled = true;
  try { await googleGiris(); } catch (x) { toast(hataMetni(x)); }
  setTimeout(() => (b.disabled = false), 1500);
}
// "Satıldı" derken gerçekleşen fiyatı sor (isteğe bağlı): undefined = vazgeçildi, null = boş bırakıldı
function satisFiyatiSor(i) {
  const kira = /Kiralık/.test(i.alanlar?.islem || '');
  return new Promise((ok) => {
    sheetAc(`<h2 style="font-size:19px;font-weight:700">Hayırlı olsun! ${kira ? 'Kaça kiralandı?' : 'Kaça satıldı?'}</h2>
      <div class="k soluk" style="line-height:1.5">İsteğe bağlı. Gerçekleşen fiyat yalnız istatistikte (bölge ortalaması, pazarlık payı) kullanılır, ilanında ya da profilinde gösterilmez.</div>
      <form id="sff" class="ic" style="padding:0"><label class="alan">${kira ? 'Aylık kira' : 'Satış fiyatı'} (TL)<input name="f" inputmode="numeric" placeholder="İlan fiyatı: ${tl(i.fiyat)}"></label>
      <div class="izgara2"><button type="button" class="btn sade" id="sfAtla">Boş bırak</button><button class="btn">Kaydet</button></div></form>`, (s) => {
      const fy = $('[name=f]', s); fy.oninput = () => { const n = fy.value.replace(/\D/g, ''); fy.value = n ? sayiBicim(+n) : ''; };
      $('#sfAtla', s).onclick = () => { sheetKapat(); ok(null); };
      $('#sff', s).onsubmit = (e) => { e.preventDefault(); sheetKapat(); ok(+fy.value.replace(/\D/g, '') || null); };
      sheetEl.onclick = (e) => { if (e.target === sheetEl) { sheetKapat(); ok(undefined); } };
    });
  });
}
async function dene(fn, basari) {
  try { const r = await fn(); if (basari) toast(basari); return r ?? true; } catch (x) { console.error(x); toast(hataMetni(x)); return false; }
}
// Bina yaşı grupları (filtre ve ilan detayında)
const YAS_GRUPLARI = ['0', '1', '2', '3', '4', '5-10', '11-15', '16-20', '21-25', '26-30', '31 ve üzeri'];
// Bina yaşı artık "5-10" gibi grup olabilir; hesaplar için sayıya çevir (grup ortası, "31 ve üzeri" = 35)
function yasSayi(y) { if (y === '' || y == null) return NaN; const s = String(y); if (/üzeri/.test(s)) return 35; const m = s.match(/^(\d+)\s*-\s*(\d+)$/); return m ? (+m[1] + +m[2]) / 2 : +s.replace(/[^\d]/g, ''); }
function yasGrubu(y) { if (YAS_GRUPLARI.includes(String(y))) return String(y); y = yasSayi(y); if (isNaN(y)) return ''; return y <= 4 ? String(Math.round(y)) : y <= 10 ? '5-10' : y <= 15 ? '11-15' : y <= 20 ? '16-20' : y <= 25 ? '21-25' : y <= 30 ? '26-30' : '31 ve üzeri'; }
const yayinda = () => S.ilanlar.filter((i) => i.durum === 'yayinda');
const kapak = (i) => (i.fotolar && i.fotolar[0]) || '';
function fotoKutu(i, boy = 40) {
  const a = ALT[i.alt] || ALT.konut;
  return kapak(i) ? '' : `<span class="foto-yok">${ic(a.ikon, boy, 'currentColor', 1.4)}</span>`;
}
function konum(i) { return [i.alanlar?.mahalle && i.alanlar.mahalle + ' Mah.', i.ilce, i.il].filter(Boolean).map(kac).join(', '); }
function ozetSatir(i) {
  const f = i.alanlar || {};
  if (i.ana === 'emlak') return [f.islem, f.oda, f.m2net && f.m2net + ' m²'].filter(Boolean).map(kac).join(' · ');
  return [f.yil, f.km != null && f.km !== '' && sayiBicim(f.km) + ' km', f.vites].filter(Boolean).map(kac).join(' · ');
}
function etiketHtml(i) {
  if (i.durum === 'satildi') return `<span class="etiket satildi">${i.ana === 'emlak' && i.alanlar?.islem === 'Kiralık' ? 'Kiralandı' : 'Satıldı'}</span>`;
  if (i.durum === 'onayda') return eidsOnayda();
  if (i.ornek) return `<span class="etiket" style="background:#0B1B33;color:#fff">Test ilanı</span>`;
  const e = emsalDurumu(i);
  if (+i.alanlar?.oncekiFiyat > i.fiyat) return `<span class="etiket uygun">Fiyat düştü</span>`;
  if (e && e.konum < 0.35) return `<span class="etiket uygun">Fiyatı uygun</span>`;
  if (Date.now() - i.olusturma < 86400000) return `<span class="etiket yeni">Yeni</span>`;
  return '';
}
function ilanKart(i) {
  return `<a class="ilan-k" href="#/ilan/${i.id}">
    <div class="foto"${kapak(i) ? ` data-bg="${kac(kapak(i))}"` : ''} style="position:relative">${fotoKutu(i)}<div class="kart-alt">${dopingRozet(i)}${(i.fotolar || []).length > 1 ? `<span>${ic('foto', 11)}${i.fotolar.length}</span>` : ''}${(i.alanlar?.deko || []).length ? `<span>${ic('yildiz', 11)}AI dekor</span>` : ''}${i.ana === 'emlak' && i.id !== 'onizleme' && kullanici(i.sahip).ofis ? '<span>Emlak ofisi</span>' : ''}${i.dogrulanmis ? '<span>Tapu doğrulandı</span>' : ''}${i.alanlar?.video ? '<span>Video</span>' : ''}${i.alanlar?.tur360 ? '<span>360°</span>' : ''}</div></div>
    ${etiketHtml(i)}
    ${S.oturum && S.oturum !== i.sahip && i.id !== 'onizleme' ? `<button class="kart-kalp ${favMi(i.id) ? 'dolu' : ''}" data-kfav="${i.id}" aria-label="Favori">${ic('kalp', 16, favMi(i.id) ? '#fff' : 'currentColor')}</button>` : ''}
    <div class="bilgi"><div class="fiyat">${tl(i.fiyat)}</div><div class="baslik">${kac(i.baslik)}</div><div class="k soluk">${konum(i)}</div></div>
  </a>`;
}
function ilanSatir(i, ek = '') {
  return `<a class="ilan-satir" href="#/ilan/${i.id}">
    <div class="foto"${kapak(i) ? ` data-bg="${kac(kapak(i))}"` : ' style="display:flex;align-items:center;justify-content:center"'}>${fotoKutu(i, 32)}</div>
    <div class="bilgi"><div class="fiyat">${tl(i.fiyat)}</div><div class="baslik">${kac(i.baslik)}</div>
    <div class="k soluk">${ozetSatir(i)}</div><div class="k soluk">${konum(i)} · ${gecen(i.olusturma)}</div>${ek}</div>
  </a>`;
}
// MülkümAI serbest düğmesi: sağ altta başlar, sürüklenip istenen yere bırakılır, yeri hatırlanır
function aiDugme() {
  let d = document.getElementById('aiFab');
  if (!d) {
    d = document.createElement('button'); d.id = 'aiFab'; d.setAttribute('aria-label', 'MülkümAI asistan');
    d.innerHTML = `${ic('yildiz', 22, '#fff')}<span>AI</span>`; document.body.appendChild(d);
    let k = null; try { k = JSON.parse(localStorage.getItem('aiKonum')); } catch (_) {}
    const yerlestir = (x, y) => { x = Math.max(8, Math.min(innerWidth - 64, x)); y = Math.max(60, Math.min(innerHeight - 140, y)); d.style.left = x + 'px'; d.style.top = y + 'px'; return { x, y }; };
    k ? yerlestir(k.x, k.y) : yerlestir(innerWidth - 68, innerHeight - 160);
    let bas = null, oynadi = false;
    d.addEventListener('pointerdown', (e) => { bas = { x: e.clientX, y: e.clientY, l: d.offsetLeft, t: d.offsetTop }; oynadi = false; d.setPointerCapture(e.pointerId); });
    d.addEventListener('pointermove', (e) => { if (!bas) return; const dx = e.clientX - bas.x, dy = e.clientY - bas.y; if (Math.abs(dx) + Math.abs(dy) > 6) oynadi = true; if (oynadi) { d.classList.add('surukle'); yerlestir(bas.l + dx, bas.t + dy); } });
    d.addEventListener('pointerup', () => { if (oynadi) { try { localStorage.setItem('aiKonum', JSON.stringify({ x: d.offsetLeft, y: d.offsetTop })); } catch (_) {} } bas = null; d.classList.remove('surukle'); });
    d.addEventListener('click', (e) => { if (oynadi) { e.preventDefault(); oynadi = false; return; } git('#/ai'); });
    addEventListener('resize', () => yerlestir(d.offsetLeft, d.offsetTop));
    // Aşağı kaydırırken içeriğin üstünden çekilir, yukarı kaydırınca ya da durunca geri gelir
    let sonY = scrollY, zmn = null;
    addEventListener('scroll', () => {
      const y = scrollY; if (Math.abs(y - sonY) < 8) return;
      d.classList.toggle('gizle', y > sonY && y > 120); sonY = y;
      clearTimeout(zmn); zmn = setTimeout(() => d.classList.remove('gizle'), 1200);
    }, { passive: true });
  }
  d.hidden = document.body.classList.contains('navsiz') || location.hash.startsWith('#/ai');
}
function navCiz(aktif) {
  setTimeout(aiDugme);
  const n = okunmamis();
  const o = (h, ad, ik, k) => `<a href="${h}" class="${aktif === k ? 'aktif' : ''}">${ic(ik, 22)}${ad}</a>`;
  nav.innerHTML = o('#/ara', 'Ara', 'ara', 'ara') + o('#/favori', 'Favoriler', 'kalp', 'favori') +
    `<a href="#/ver" class="arti" aria-label="İlan ver">${ic('arti', 26, '#fff', 2.5)}</a>` +
    o('#/', 'Keşfet', 'pusula', 'kesfet') +
    `<a href="#/hesap" class="${aktif === 'hesap' ? 'aktif' : ''}">${ic('kisi', 22)}Hesabım${n ? `<span class="rozet">${n}</span>` : ''}</a>`;
}
function ustBar(baslik, sag = '', geri = true) {
  return `<header class="ust">${geri ? `<button class="ikon-btn dolu" aria-label="Geri" data-geri>${ic('geri')}</button>` : ''}<h1>${baslik}</h1>${sag}</header>`;
}
function bosDurum(ikon, baslik, metin, dugme = '') {
  return `<div class="bos">${ic(ikon, 44, 'var(--soluk)', 1.6)}<h3>${baslik}</h3><div style="line-height:1.5">${metin}</div>${dugme}</div>`;
}
function sorgu() { const q = location.hash.split('?')[1] || ''; return Object.fromEntries(new URLSearchParams(q)); }
function sorguYap(o) { const p = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => v !== '' && v != null && p.set(k, v)); return p.toString(); }

// ---------- Emsal ve değerleme ----------
const TEST_DAHIL = false; // Test ilanları (ornek) değerlemeye, bölge analizine ve trende katılmaz
// Piyasa referansı: il bazında TCMB değerleme birim fiyatı ve sahibindex/Betam ilan m² fiyatı; ikisinden yüksek olanı
// TCMB konut fiyat endeksiyle (KFE, Türkiye) bugüne taşınır. Gerçek emsal azsa değer buna dayanır.
async function piyasaRefYukle() {
  if (S.PIYASA) return S.PIYASA;
  try {
    const [{ data: v }, { data: k }, { data: pm }, { data: ke }] = await Promise.all([
      sb.from('endeks_veri').select('kod,bolge,donem,deger').in('kod', ['BIRIMFIYAT', 'BK', 'BETAM.SATILIK.M2', 'BETAM.KIRALIK.M2']).gte('donem', '2024-01-01').order('donem', { ascending: false }).limit(5000),
      sb.from('kfe').select('donem,deger').eq('bolge', 'TR').gte('donem', '2023-01-01').order('donem'),
      sb.from('piyasa_m2').select('il,ilce,mahalle,islem,m2_fiyat,kaynak,donem').order('donem', { ascending: false }).limit(3000),
      sb.from('kullanici_emsal').select('il,ilce,mahalle,islem,m2net,fiyat,olusturma').gte('olusturma', new Date(Date.now() - 365 * 864e5).toISOString()).limit(5000)
    ]);
    const son = {}; (v || []).forEach((r) => { const key = r.kod + '|' + r.bolge; if (!son[key]) son[key] = r; });
    const kfe = Object.fromEntries((k || []).map((r) => [r.donem.slice(0, 7), +r.deger])), kfeSon = (k || []).at(-1);
    S.PIYASA = { son, kfe, kfeSon: kfeSon ? [kfeSon.donem.slice(0, 7), +kfeSon.deger] : null, yerel: pm || [], emsal: ke || [] };
  } catch (_) { S.PIYASA = { son: {}, kfe: {}, kfeSon: null, yerel: [], emsal: [] }; }
  return S.PIYASA;
}
function piyasaRef(il, islem, ilce = '', mahalle = '') {
  const P = S.PIYASA; if (!P) return null;
  const kira = islem === 'Kiralık' || islem === 'Günlük Kiralık', isl = kira ? 'Kiralık' : 'Satılık', k = (x) => kucuk(x || '');
  const tarihAd = (d) => new Date(d).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  if (il !== 'TR' && ilce) {
    // 1) Yönetici tablosu: mahalle, sonra ilçe (en yeni kayıt)
    for (const [mh, ad] of (mahalle ? [[mahalle, mahalle + ' Mah., ' + ilce]] : []).concat([['', ilce + ' ilçesi']])) {
      const r = (P.yerel || []).find((x) => x.il === il && k(x.ilce) === k(ilce) && k(x.mahalle) === k(mh) && x.islem === isl);
      if (r) { const ay = String(r.donem).slice(0, 7), f = P.kfeSon && P.kfe[ay] ? Math.max(1, Math.min(P.kfeSon[1] / P.kfe[ay], 1.5)) : 1; return { birim: +r.m2_fiyat * f, kaynak: `${ad} piyasa m² fiyatı (${r.kaynak}, ${tarihAd(r.donem)}${f > 1.005 ? ', bugüne güncellendi' : ''})`, yerel: true }; }
    }
    // 2) Kullanıcı emsalleri: aynı ilçe (mahalle varsa önce mahalle), en az 3 kayıt, ortanca
    const em = (P.emsal || []).filter((x) => x.il === il && k(x.ilce) === k(ilce) && x.islem === isl);
    const emM = mahalle ? em.filter((x) => k(x.mahalle) === k(mahalle)) : [];
    const l = emM.length >= 3 ? emM : em.length >= 3 ? em : null;
    if (l) return { birim: medyan(l.map((x) => +x.fiyat / +x.m2net)), kaynak: `${l === emM ? mahalle + ' Mah.' : ilce} için kullanıcıların girdiği ${l.length} emsal (son 12 ay)`, yerel: true };
  }
  const guncelle = (r) => { if (!r) return null; const f = P.kfeSon && P.kfe[r.donem.slice(0, 7)] ? P.kfeSon[1] / P.kfe[r.donem.slice(0, 7)] : 1; return { deger: +r.deger * Math.max(1, Math.min(f, 2)), donem: r.donem, ham: +r.deger }; };
  const bul = (kod) => guncelle(P.son[kod + '|' + il]) || null;
  const aday = [[kira ? 'BK' : 'BIRIMFIYAT', 'TCMB değerleme birim fiyatı'], [kira ? 'BETAM.KIRALIK.M2' : 'BETAM.SATILIK.M2', 'sahibindex ilan fiyatı (Betam)']]
    .map(([kod, ad]) => { const x = bul(kod); return x ? { ...x, ad } : null; }).filter(Boolean).sort((x, y) => y.deger - x.deger);
  if (!aday.length) return il !== 'TR' ? piyasaRef('TR', islem) : null;
  return { birim: aday[0].deger, kaynak: `${aday[0].ad}, ${il === 'TR' ? 'Türkiye ortalaması' : il} (${new Date(aday[0].donem).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}, bugüne güncellendi)`, adaylar: aday };
}
function emsaller(o) {
  // o: {ana, alt, il, ilce, mahalle, sokak, islem, oda, m2net, marka, model, yil, haric}
  let l = S.ilanlar.filter((i) => i.ana === o.ana && i.id !== o.haric && i.fiyat > 0 && (TEST_DAHIL || !i.ornek));
  if (o.ana === 'emlak') {
    // Kademeli kapsam: sokak -> mahalle -> ilçe -> il -> Türkiye geneli (her kademe en az 3 emsal); kapsam sonuca yazılır
    const tur = l.filter((i) => i.alt === o.alt && i.alanlar?.islem === o.islem && +i.alanlar?.m2net > 0);
    const ilde = tur.filter((i) => i.il === o.il);
    const ilcede = ilde.filter((i) => o.ilce && kucuk(i.ilce) === kucuk(o.ilce));
    const yolAd = (x) => kucuk(String(x || '')).replace(/\s+/g, ' ').replace(/\s*(soka(ğ|g)(ı|i)?|sok(a|ı)k|caddesi|cadd\.?|cad\.?|cd\.?|sok\.?|sk\.?|bulvar(ı|i)?|bulvar|kavşak(ı|i)?|şerit|şeridi)$/, '').trim();
    const mahallece = o.mahalle ? ilcede.filter((i) => kucuk(i.alanlar?.mahalle) === kucuk(o.mahalle)) : [];
    const sokakta = o.sokak && o.mahalle ? mahallece.filter((i) => yolAd(i.alanlar?.sokak) === yolAd(o.sokak)) : [];
    let kapsam;
    if (sokakta.length >= 3) { l = sokakta; kapsam = `${o.sokak}, ${o.mahalle} Mah., ${o.ilce} (aynı sokak)`; }
    else if (mahallece.length >= 3) { l = mahallece; kapsam = `${o.mahalle} Mah., ${o.ilce}`; }
    else if (o.ilce) { l = ilcede; kapsam = `${o.ilce}, ${o.il}`; } // emsal ilçe dışına çıkmaz; yetersizse değer ilçe/mahalle piyasa verisine dayanır
    else { l = ilde; kapsam = `${o.il} geneli`; }
    const odali = l.filter((i) => o.oda && i.alanlar?.oda === o.oda);
    if (odali.length >= 3) { l = odali; kapsam += ` · ${o.oda}`; }
    // Kullanıcının kendi bulduğu emsaller (başka sitede gördüğü ilan vb.) havuza eklenir
    const el = (o.elEmsal || []).filter((x) => +x.fiyat > 0 && +x.m2net > 0).map((x, n) => ({ id: 'el-' + n, el: true, baslik: 'Kullanıcının eklediği emsal' + (x.not ? ' · ' + x.not : ''), il: o.il, ilce: x.mahalle || o.ilce, fiyat: +x.fiyat, alanlar: { m2net: x.m2net, oda: x.oda, islem: o.islem, mahalle: x.mahalle } }));
    if (el.length) { l = [...el, ...l]; kapsam += ` · ${el.length} kullanıcı emsali`; }
    const r = l.map((i) => ({ i, birim: i.fiyat / +i.alanlar.m2net }));
    r.kapsam = kapsam; r.genis = kapsam.startsWith('Türkiye'); r.ilSayi = ilde.length;
    return r;
  }
  l = l.filter((i) => kucuk(i.alanlar?.marka) === kucuk(o.marka) && kucuk(i.alanlar?.model).split(' ')[0] === kucuk(o.model).split(' ')[0] && Math.abs(+i.alanlar?.yil - +o.yil) <= 2);
  return l.map((i) => ({ i, birim: i.fiyat }));
}
// Bulunduğu katın fiyata etkisi (ara katlar = 1). Piyasa ortalaması; emsaller de aynı ölçekle eşitlenir.
function katEtki(k) {
  if (!k) return 1; const s = String(k).toLocaleLowerCase('tr-TR').trim();
  if (/bodrum/.test(s)) return 0.85; if (/bahçe/.test(s)) return 0.95; if (/yüksek/.test(s)) return 0.96;
  if (/giriş|zemin/.test(s)) return 0.92; if (/çatı/.test(s)) return 0.95; if (/villa/.test(s)) return 1.05;
  const n = parseInt(s, 10); if (isNaN(n)) return 1; if (n < 0) return 0.85; if (n === 0) return 0.92; if (n === 1) return 0.98; if (n <= 5) return 1; return 1.02;
}
const katYuzde = (k) => { const e = katEtki(k); return e === 1 ? 'etkisiz (ara kat)' : (e > 1 ? '+' : '−') + '%' + Math.round(Math.abs(e - 1) * 100); };
// Marka adı ya da yaygın kısaltması → listedeki marka
const MARKA_TAKMA = { vw: 'Volkswagen', volkswagon: 'Volkswagen', mercedes: 'Mercedes-Benz', merso: 'Mercedes-Benz', mb: 'Mercedes-Benz', bmv: 'BMW', citroen: 'Citroën', alfa: 'Alfa Romeo', range: 'Land Rover', 'range rover': 'Land Rover', landrover: 'Land Rover', tofaş: 'Fiat', tofas: 'Fiat', skoda: 'Skoda', hyundaı: 'Hyundai', chevy: 'Chevrolet', ssangyong: 'SsangYong', kgm: 'KG Mobility' };
function markaBul(x) { const s = String(x || '').trim(); if (!s) return ''; return secenekBul(MARKALAR, s) || MARKA_TAKMA[s.toLocaleLowerCase('tr-TR')] || MARKA_TAKMA[s.toLowerCase()] || secenekBul(MARKALAR, s.split(/s+/)[0]) || ''; }
// Serbest model yazısını markanın bilinen serisine eşler; bulamazsa düzgün yazımla döndürür
function aracModelEsle(marka, model) {
  const m = String(model || '').trim(); if (!m) return '';
  const l = (typeof ARAC_MODELLER !== 'undefined' && ARAC_MODELLER[marka]) || [], k = m.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i');
  const s = l.filter((x) => k.startsWith(x.toLowerCase())).sort((a, b) => b.length - a.length)[0];
  return s || (m === m.toUpperCase() ? m.toLowerCase().replace(/(^|\s)(\S)/g, (a, b, c) => b + c.toUpperCase()) : m).slice(0, 60);
}
// Marka seçilince model listesini doldurur (select ise seçenek, input ise öneri listesi)
function aracModelBagla(markaEl, modelEl, bos = 'Seç') {
  if (!markaEl || !modelEl) return;
  const doldur = () => {
    const l = (typeof ARAC_MODELLER !== 'undefined' && ARAC_MODELLER[markaEl.value]) || [], v = modelEl.value;
    if (modelEl.tagName === 'SELECT') modelEl.innerHTML = `<option value="">${markaEl.value ? bos : 'Önce marka seç'}</option>` + (v && !l.includes(v) ? [v, ...l] : l).map((x) => `<option ${x === v ? 'selected' : ''}>${kac(x)}</option>`).join('');
    else { let d = document.getElementById('dl-model-on'); if (!d) { d = document.createElement('datalist'); d.id = 'dl-model-on'; modelEl.after(d); } modelEl.setAttribute('list', 'dl-model-on'); d.innerHTML = l.map((x) => `<option value="${kac(x)}">`).join(''); }
  };
  markaEl.addEventListener('change', () => { if (modelEl.tagName === 'SELECT') modelEl.value = ''; doldur(); });
  markaEl.addEventListener('input', doldur);
  doldur();
}
// TSB kasko değeri: marka + model + model yılı için tiplerin ortancası ve aralığı
async function kaskoDegeri(marka, model, yil) {
  if (!marka || !model || !yil) return null;
  const adlar = (typeof ARAC_KASKO_AD !== 'undefined' && ARAC_KASKO_AD[marka]) || [marka];
  const md = String(model).trim().split(/\s+/)[0];
  try {
    const { data } = await sb.from('arac_kasko').select('deger,tip,donem').in('marka', adlar).ilike('model', md + '%').eq('yil', +yil).order('donem', { ascending: false }).limit(400);
    if (!data?.length) return null;
    const son = data[0].donem, l = data.filter((x) => x.donem === son).map((x) => +x.deger).sort((a, b) => a - b);
    return { orta: medyan(l), alt: yuzdelik(l, 0.25), ust: yuzdelik(l, 0.75), en: l[0], ek: l[l.length - 1], tipSayi: l.length, donem: son };
  } catch (_) { return null; }
}
// Her değerleme isteği kendi veri bankamıza (kimlik bilgisi olmadan) yazılır
function degerlemeKaydet(v, h, kasko) {
  try {
    if (v.ana === 'emlak' && v.il && ben() && (v.elEmsal || []).length) sb.from('kullanici_emsal').insert(v.elEmsal.filter((x) => +x.fiyat > 0 && +x.m2net >= 10).map((x) => ({ il: v.il, ilce: v.ilce || '', mahalle: x.mahalle || v.mahalle || '', islem: v.islem === 'Kiralık' ? 'Kiralık' : 'Satılık', alt: v.alt || null, oda: x.oda || null, m2net: +x.m2net, fiyat: +x.fiyat }))).then(() => { S.PIYASA = null; }, () => {});
    const k = { ana: v.ana, alt: v.alt || null, islem: v.islem || null, il: v.il || null, ilce: v.ilce || null, mahalle: v.mahalle || null,
      m2net: +v.m2net || null, oda: v.oda || null, kat: v.kat || null, bina_yasi: v.binaYasi || null,
      marka: v.marka || null, model: v.model || null, yil: +v.yil || null, km: +v.km || null, hasar: v.hasar || null,
      emsal_sayi: h?.sayi ?? null, sonuc_orta: h?.yeterli ? Math.round(h.orta) : null, kasko_orta: kasko ? Math.round(kasko.orta) : null };
    sb.from('degerleme_kayitlari').insert(k).then(() => {}, () => {});
  } catch (_) {}
}
function hesapla(o) {
  const e = emsaller(o);
  if (o.ana === 'emlak') {
    const ref = piyasaRef(o.il, o.islem, o.ilce, o.mahalle);
    // Emsal ilçe/mahalle düzeyinde mi? (il ya da Türkiye geneline düştüyse yerel fiyatı aşağı çekmesin)
    const emsalYerel = !e.genis && !/geneli/.test(e.kapsam || '');
    const gercek = e.genis || (ref?.yerel && !emsalYerel) ? [] : e;
    if (ref && (gercek.length < 8 || (ref.yerel && !emsalYerel))) {
      const katli = !!o.kat, kat = katli ? katEtki(o.kat) : 1;
      const n = gercek.length >= 3 ? gercek.length : 0, w = n / (n + 8);
      const eb = n ? medyan(gercek.map((x) => katli ? x.birim / katEtki((x.i.alanlar || {}).kat) : x.birim)) : 0;
      const birim = (w * eb + (1 - w) * ref.birim) * kat, m2 = +o.m2net;
      const orta = birim * m2;
      const kullanilan = n ? gercek : []; kullanilan.kapsam = e.kapsam;
      return { yeterli: true, sayi: kullanilan.length, emsal: kullanilan, orta, alt: orta * 0.9, ust: orta * 1.1, birimOrta: birim, guven: n ? 'Orta' : 'Orta (resmî veri)', kapsam: n ? `${e.kapsam} + il piyasa verisi` : `${o.il} il geneli piyasa verisi`, genis: false, ilSayi: e.ilSayi, katEtkisi: katli ? katYuzde(o.kat) : null, refKaynak: ref.kaynak, refBirim: ref.birim, emsalAgirlik: Math.round(w * 100) };
    }
  }
  if (e.length < 3) return { yeterli: false, sayi: e.length, emsal: e, kapsam: e.kapsam, ilSayi: e.ilSayi };
  const katli = o.ana === 'emlak' && !!o.kat;
  const b = e.map((x) => katli ? x.birim / katEtki((x.i.alanlar || {}).kat) : x.birim);
  const carp = o.ana === 'emlak' ? +o.m2net * (katli ? katEtki(o.kat) : 1) : 1;
  let orta = medyan(b) * carp, alt = yuzdelik(b, 0.25) * carp, ust = yuzdelik(b, 0.75) * carp;
  if (o.ana === 'vasita' && o.km) {
    // aynı model içinde km farkına göre küçük düzeltme: emsallerin km ortancasından her 10.000 km için %1
    const kmler = e.map((x) => +x.i.alanlar.km).filter((x) => x >= 0);
    if (kmler.length) { const d = Math.max(-0.15, Math.min(0.15, ((medyan(kmler) - +o.km) / 10000) * 0.01)); orta *= 1 + d; alt *= 1 + d; ust *= 1 + d; }
  }
  // Türkiye geneline genişlediyse bölge farkı büyük olabilir: güven en fazla "Düşük"
  const guven = e.genis ? 'Düşük' : e.length >= 10 ? 'Yüksek' : e.length >= 5 ? 'Orta' : 'Düşük';
  return { yeterli: true, sayi: e.length, emsal: e, orta, alt, ust, birimOrta: medyan(b), guven, kapsam: e.kapsam, genis: !!e.genis, ilSayi: e.ilSayi, katEtkisi: katli ? katYuzde(o.kat) : null };
}
function emsalDurumu(i) {
  if (i.durum !== 'yayinda') return null;
  const f = i.alanlar || {};
  const o = i.ana === 'emlak'
    ? { ana: 'emlak', alt: i.alt, il: i.il, ilce: i.ilce, mahalle: f.mahalle, sokak: f.sokak, islem: f.islem, oda: f.oda, m2net: f.m2net, kat: f.kat, haric: i.id }
    : { ana: 'vasita', marka: f.marka, model: f.model, yil: f.yil, km: f.km, haric: i.id };
  if (i.ana === 'emlak' && !(+f.m2net > 0)) return null;
  const h = hesapla(o);
  if (!h.yeterli || h.genis || (h.emsal || []).length < 3) return null; // ilan sayfasında yalnız gerçek bölgesel emsalle karşılaştırma
  const birim = i.ana === 'emlak' ? i.fiyat / +f.m2net : i.fiyat;
  const b = h.emsal.map((x) => x.birim), en = Math.min(...b), ek = Math.max(...b);
  const konum = ek === en ? 0.5 : Math.max(0, Math.min(1, (birim - en) / (ek - en)));
  return { ...h, konum, bantSol: (yuzdelik(b, 0.25) - en) / (ek - en || 1), bantSag: (yuzdelik(b, 0.75) - en) / (ek - en || 1) };
}

// ---------- Ekranlar ----------
const EKRAN = {};

EKRAN.karsilama = () => {
  document.body.classList.add('navsiz'); nav.innerHTML = '';
  app.innerHTML = `<div class="karsilama">
    <img src="logo.png" alt="Mülküm360 logosu">
    <h1>Hayalindekine<br><b>bir adım.</b></h1>
    <p>Ev, arsa, işyeri ve araç ilanları. Değerini öğren, raporunu al, güvenle al-sat.</p>
    <div class="madde"><span>${ic('kalem', 18)}</span><div><b>Bir dakikada ilan ver.</b><br>Fotoğrafını çek, bilgileri adım adım gir, yayınla.</div></div>
    <div class="madde"><span>${ic('grafik', 18)}</span><div><b>Ne kadar eder?</b><br>Benzer ilanlara göre değer aralığı ve PDF rapor.</div></div>
    <div class="madde"><span>${ic('kalkan', 18)}</span><div><b>Güvenli iletişim.</b><br>Mesaj ve teklif uygulamanın içinde; dolandırıcılık uyarıları yanında.</div></div>
    <div style="margin-top:auto;display:flex;flex-direction:column;gap:10px">
      ${googleDugme()}
      <a class="btn tam" href="#/kayit">E-postayla üye ol</a>
      <a class="btn cizgili tam" href="#/giris">Giriş yap</a>
      <button class="btn tam" style="background:transparent;color:#C9CCD3" id="gozat">Üye olmadan göz at</button>
    </div></div>`;
  $('#gozat').onclick = () => { S.karsilandi = true; kaydet(); git('#/'); };
};

EKRAN.giris = () => {
  document.body.classList.add('navsiz'); nav.innerHTML = '';
  app.innerHTML = ustBar('Giriş yap') + `<form class="ic" id="f" novalidate>
    <div class="satir" style="gap:12px;margin:8px 0"><img src="logo.png" alt="" style="width:48px;height:48px;border-radius:14px"><div><b style="font-size:18px">Tekrar hoş geldin</b><div class="k soluk">E-posta adresinle giriş yap</div></div></div>
    ${(() => { const n = S.girisNeden; S.girisNeden = ''; return n ? `<div class="bilgi-k">${ic('kilit', 18)}<div>${kac(n)}. Üyelik ücretsiz; yeni üyeye 1 kredi hediye.</div></div>` : ''; })()}
    ${googleDugme()}<div class="ayrac">veya e-postayla</div>
    <label class="alan">E-posta<input name="kim" type="email" autocomplete="username" required></label>
    <label class="alan">Şifre<input name="sifre" type="password" autocomplete="current-password" required></label>
    <div class="hata-yazi" id="hata" role="alert"></div>
    <button class="btn tam">Giriş yap</button>
    <button type="button" class="btn sade tam" id="unuttum">Şifremi unuttum</button>
    <p class="soluk" style="text-align:center;margin:8px 0">Hesabın yok mu? <a href="#/kayit"><b>Üye ol</b></a></p></form>`;
  $('#unuttum').onclick = () => sheetAc(`<h2 style="font-size:19px;font-weight:800">Şifre sıfırlama</h2><p class="soluk" style="margin:0;line-height:1.5">Şifre sıfırlama e-postası, uygulamanın kendi e-posta gönderim altyapısı kurulduğunda açılacak. O zamana kadar destek için uygulama yöneticisine başvur.</p><button class="btn tam" onclick="sheetKapat()">Tamam</button>`);
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    if (!v.kim.trim() || !v.sifre) { $('#hata').textContent = 'E-posta ve şifreni yaz.'; return; }
    const btn = e.target.querySelector('button.btn:not([data-google])'); btn.disabled = true; btn.textContent = 'Giriş yapılıyor…';
    try { await girisYap(kucuk(v.kim).trim(), v.sifre); } catch (x) { $('#hata').textContent = hataMetni(x); btn.disabled = false; btn.textContent = 'Giriş Yap'; return; }
    const k = ben(); S.karsilandi = true; kaydet();
    toast('Hoş geldin, ' + k.ad.split(' ')[0]); davetUygula();
    const d = S.donus; S.donus = null; git(d && !d.includes('giris') && !d.includes('kayit') ? d : '#/');
  };
};

EKRAN.kayit = () => {
  document.body.classList.add('navsiz'); nav.innerHTML = '';
  app.innerHTML = ustBar('Üye ol') + `<form class="ic" id="f" novalidate>
    <div class="alan">Hesap türü<div class="tur-sec"><button type="button" class="secili" data-tur="bireysel">${ic('kisi', 22)}<b>Bireysel</b><small>Kendi evimi, aracımı satıyorum ya da arıyorum</small></button><button type="button" data-tur="emlak">${ic('ev', 22)}<b>Emlak ofisi</b><small>Portföy, müşteri ve randevu yönetiyorum</small></button><button type="button" data-tur="galeri">${ic('araba', 22)}<b>Oto galeri</b><small>Araç alıp satıyorum, stok ve müşteri yönetiyorum</small></button></div><input type="hidden" name="tur" value="bireysel"></div>
    <div id="ofisAlan" hidden><div class="izgara2"><label class="alan">Firma adı<input name="firma" maxlength="80"></label><label class="alan">Yetki belgesi no <span style="font-weight:500">(isteğe bağlı)</span><input name="yetkiNo" maxlength="20"></label></div></div>
    <label class="alan">Davet kodu <span style="font-weight:500">(varsa; ikinize de 3 kredi)</span><input name="davet" maxlength="8" autocapitalize="characters" value="${kac(sorgu().davet || '')}"></label>
    ${googleDugme()}<div class="ayrac">veya e-postayla</div>
    <label class="alan">Ad soyad<input name="ad" autocomplete="name" required></label>
    <label class="alan">E-posta<input name="eposta" type="email" autocomplete="email" required></label>
    <label class="alan">Cep telefonu<input name="tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="05xx xxx xx xx" required></label>
    <label class="alan">Şifre<input name="sifre" type="password" autocomplete="new-password" required><small>En az 8 karakter, bir rakam içersin.</small></label>
    <label class="satir k" style="align-items:flex-start"><input type="checkbox" name="kvkk" style="width:22px;height:22px;flex-shrink:0"><span style="line-height:1.5"><a href="#/metin/kosullar">Kullanım koşullarını</a> ve <a href="#/metin/kvkk">KVKK aydınlatma metnini</a> okudum, kabul ediyorum.</span></label>
    <label class="satir k" style="align-items:flex-start"><input type="checkbox" name="ileti" style="width:22px;height:22px;flex-shrink:0"><span style="line-height:1.5">Kampanya ve kayıtlı arama bildirimleri almak istiyorum (isteğe bağlı).</span></label>
    <div class="hata-yazi" id="hata" role="alert"></div>
    <button class="btn tam">Hesap oluştur</button>
    <div class="bilgi-k">${ic('kilit', 18)}<div>Şifren güvenli sunucuda şifrelenmiş olarak saklanır; biz dahil kimse göremez. Telefon numaran ilanlarında gösterilmez.</div></div>
    <p class="soluk" style="text-align:center;margin:8px 0">Zaten üye misin? <a href="#/giris"><b>Giriş yap</b></a></p></form>`;
  app.querySelectorAll('[data-tur]').forEach((b) => (b.onclick = () => {
    app.querySelectorAll('[data-tur]').forEach((x) => x.classList.toggle('secili', x === b));
    $('[name=tur]').value = b.dataset.tur; $('#ofisAlan').hidden = b.dataset.tur === 'bireysel';
    try { localStorage.setItem('kayitTuru', b.dataset.tur); } catch (_) {}
  }));
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target)), h = $('#hata');
    const eposta = kucuk(v.eposta).trim(), tel = v.tel.replace(/\D/g, '');
    if (v.ad.trim().split(/\s+/).length < 2) return hataGoster(h, 'Adını ve soyadını yaz.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta)) return hataGoster(h, 'Geçerli bir e-posta yaz.');
    if (!/^(90)?0?5\d{9}$/.test(tel)) return hataGoster(h, 'Geçerli bir cep telefonu yaz (05xx…).');
    if (v.sifre.length < 8 || !/\d/.test(v.sifre)) return hataGoster(h, 'Şifre en az 8 karakter olmalı ve rakam içermeli.');
    if (!v.kvkk) return hataGoster(h, 'Devam etmek için koşulları kabul etmelisin.');
    if (v.tur !== 'bireysel' && !v.firma.trim()) return hataGoster(h, (v.tur === 'galeri' ? 'Galeri' : 'Emlak ofisi') + ' için firma adını yaz.');
    const btn = e.target.querySelector('button.btn:not([data-google])'); btn.disabled = true; btn.textContent = 'Hesap oluşturuluyor…';
    try { await uyeOl({ ad: v.ad.trim().replace(/\s+/g, ' '), eposta, tel: '0' + tel.slice(-10), sifre: v.sifre, ileti: !!v.ileti, ofis: v.tur !== 'bireysel', sektor: v.tur === 'galeri' ? 'galeri' : 'emlak', firma: v.firma.trim(), yetkiNo: v.yetkiNo.trim() }); }
    catch (x) { h.textContent = hataMetni(x); btn.disabled = false; btn.textContent = 'Hesap oluştur'; return; }
    if ((v.davet || '').trim()) { try { localStorage.setItem('davetKodu', v.davet.trim()); } catch (_) {} davetUygula(); }
    S.karsilandi = true; kaydet();
    toast('Hesabın oluşturuldu');
    const d = S.donus; S.donus = null; git(d && !d.includes('giris') && !d.includes('kayit') ? d : '#/');
  };
};

EKRAN.kesfet = () => {
  const b = ben(); let l = dopingSirala(yayinda().sort((x, y) => y.olusturma - x.olusturma));
  const yeniKayitli = b ? S.kayitliAramalar.filter((a) => a.sahip === b.id).reduce((t, a) => t + aramaYap(a.q).filter((i) => i.olusturma > a.son).length, 0) : 0;
  const gorulen = S.gorulen.map(ilan).filter((i) => i && i.durum === 'yayinda').slice(0, 10);
  const ana = S.kesfetAna || 'emlak';
  const saat = new Date().getHours(), selam = saat < 6 ? 'İyi geceler' : saat < 12 ? 'Günaydın' : saat < 18 ? 'İyi günler' : 'İyi akşamlar';
  const ornek = ana === 'emlak' ? ['3+1 satılık Çankaya', 'Kadıköy kiralık 2+1', 'Antalya sezonluk yazlık'] : ['2019 otomatik dizel', 'Clio 900 bin altı', 'elektrikli SUV'];
  // Vitrinler (gerçek verilerden türetilir; doping sistemi gelince "Öne çıkan" dopingli ilanlara devredilir)
  const indirim = (i) => { const o = +(i.alanlar?.oncekiFiyat || 0); return o > i.fiyat ? 1 - i.fiyat / o : 0; };
  const yay = () => yayinda().filter((i) => i.ana === ana);
  const dusen = () => yay().filter((i) => indirim(i) > 0).sort((x, y) => indirim(y) - indirim(x));
  const oncikan = () => { const dop = yay().filter((i) => dopingBilgi(i)), d = yay().filter((i) => !dopingBilgi(i) && i.dogrulanmis), z = yay().filter((i) => !dopingBilgi(i) && !i.dogrulanmis && (i.fotolar || []).length >= 5).sort((x, y) => (y.goruntulenme || 0) - (x.goruntulenme || 0)); return [...dop, ...d, ...z].slice(0, 8); };
  const projeler = () => yay().filter((i) => i.alanlar?.proje);
  const vitr = (ad, liste, href) => liste.length >= 3 ? `<div class="bolum-bas"><h2>${ad}</h2><a href="${href}">Tümü</a></div><div class="ciplar" style="gap:10px">${liste.slice(0, 8).map((i) => `<div style="width:160px;flex-shrink:0">${ilanKart(i)}</div>`).join('')}</div>` : '';
  const va = S.AYARLAR && S.AYARLAR.vitrinler;
  const vAd = (k, vars) => (va && va.ad && va.ad[k]) || vars;
  const VITRINLER = { onecikan: () => vitr(vAd('onecikan', 'Öne çıkan ilanlar'), oncikan(), '#/ara?ana=' + ana), firsat: () => vitr(vAd('firsat', 'Fırsat ilanları'), dusen().filter((i) => indirim(i) >= 0.07), '#/ara?ana=' + ana + '&dusen=1'), dusen: () => vitr(vAd('dusen', 'Fiyatı düşen ilanlar'), dusen(), '#/ara?ana=' + ana + '&dusen=1'), proje: () => vitr(vAd('proje', 'Proje vitrini'), projeler(), '#/proje') };
  const vsira = ((va && va.sira) || Object.keys(VITRINLER)).filter((k) => VITRINLER[k] && (!va || !va.aktif || va.aktif[k] !== false));
  const kisayol = (href, ikon, ad, alt) => `<a class="kat-k" href="${href}"><span class="kat-ikon ${ana}">${ic(ikon, 22)}</span><b>${ad}</b><small>${alt}</small></a>`;
  app.innerHTML = `<header class="ust ust-hero"><button class="ikon-btn dolu" aria-label="Menü" id="menuBtn">${ic('menu')}</button><div class="logo"><img src="logo.png" alt=""><span>mülküm<b>360</b></span></div>
      <button class="ikon-btn" data-dilac aria-label="Dil" style="font-weight:800;font-size:12px;letter-spacing:.5px">${DIL.toUpperCase()}</button>
      ${b ? `<a class="kredi-hap" href="#/kredi" aria-label="Kredin ${b.kredi ?? 0}, kredi al">${ic('kredi', 15)}${b.kredi ?? 0}<span class="hap-arti">+</span></a>` : `<a class="kredi-hap" href="#/giris">Giriş</a>`}
      <a class="ikon-btn" href="#/mesajlar" aria-label="Mesajlar">${ic('mesaj')}${okunmamis() ? `<span class="rozet">${okunmamis()}</span>` : ''}</a><a class="ikon-btn" href="#/bildirimler" aria-label="Bildirimler">${ic('zil')}${yeniKayitli + okunmamisBildirim() ? `<span class="rozet">${yeniKayitli + okunmamisBildirim()}</span>` : ''}</a></header>
    <section class="hero">
      <div class="hero-selam">${selam}${b ? ', ' + kac(b.ad.split(' ')[0]) : ''}</div>
      <h1 class="hero-baslik">Hayalindekine<br><b>bir adım.</b></h1>
      <div class="segment" role="tablist">${Object.entries(ANA).map(([k, a]) => `<button role="tab" aria-selected="${k === ana}" class="${k === ana ? 'secili' : ''}" data-ana="${k}">${ic(a.ikon, 16)}${a.ad}</button>`).join('')}</div>
      <form id="araF" role="search" class="ai-arama"><span class="ai-isaret">${ic('yildiz', 16)}</span><input name="q" aria-label="MülkümAI ile ara" placeholder="${ana === 'emlak' ? 'örn. 3+1 satılık, metroya yakın' : 'örn. 2019 otomatik dizel'}" enterkeyhint="search"><button class="btn kucuk" aria-label="Ara">${ic('ara', 18, '#fff')}</button></form>
      <div class="ciplar">${ornek.map((o) => `<button class="cip cip-koyu" data-ornek="${kac(o)}">${kac(o)}</button>`).join('')}</div>
    </section>
    <div class="ic">
      <div class="kat-serit">${ana === 'emlak' ? kisayol('#/harita?ana=emlak', 'konum', 'Haritada ara', 'yarıçap · il/ilçe') + kisayol('#/ara?ana=emlak&islem=Satılık', 'ev', 'Satın al', 'satılık ilanlar') + kisayol('#/ara?ana=emlak&islem=Kiralık', 'kiralik', 'Kiralayın', 'kiralık ilanlar') + kisayol('#/ara?ana=emlak&islem=Sezonluk', 'deniz', 'Sezonluk', 'yazlık, sezonluk') + kisayol('#/ara?ana=emlak&dusen=1', 'simsek', 'Fırsatlar', 'fiyatı düşenler') + (projeler().length ? kisayol('#/proje', 'proje', 'Projeler', 'yeni konut') : '') + kisayol('#/danisman', 'kisi', 'Danışman bulun', 'doğrulanmış ofisler') + kisayol('#/ai', 'yildiz', 'MülkümAI ile ara', 'doğal dille') + kisayol('#/degerle', 'grafik', 'Konut değerleme', 'değer raporu')
        : kisayol('#/harita?ana=vasita', 'konum', 'Haritada ara', 'yarıçap · il/ilçe') + kisayol('#/ara?ana=vasita&islem=Satılık', 'araba', 'Satın al', 'satılık araçlar') + kisayol('#/ara?ana=vasita&islem=Kiralık', 'kiralik', 'Kiralayın', 'kiralık araçlar') + kisayol('#/ara?ana=vasita&dusen=1', 'simsek', 'Fırsatlar', 'fiyatı düşenler') + kisayol('#/ara?ana=vasita', 'vasita', 'Tüm vasıtalar', 'sıfır ve ikinci el') + kisayol('#/ai', 'yildiz', 'MülkümAI ile ara', 'doğal dille') + kisayol('#/degerle', 'grafik', 'Araç değerleme', 'değer raporu')}</div>
      ${vsira.map((k) => VITRINLER[k]()).join('')}
      <div class="kat-serit">${altlari(ana).map((x) => [x, yayinda().filter((i) => i.alt === x).length]).sort((p, q) => (q[1] > 0) - (p[1] > 0)).map(([x, n]) => `<a class="kat-k" href="${n ? '#/ara?alt=' + x : '#/ver'}"><span class="kat-ikon ${ana}">${ic(ALT[x].ikon, 22)}</span><b>${ALT[x].ad}</b><small>${n ? n + ' ilan' : 'İlk ilanı ver'}</small></a>`).join('')}</div>
      <div class="ikili">
        <a class="ozellik-k koyu" href="#/ai"><span class="oz-ikon">${ic('yildiz', 20)}</span><b>MülkümAI asistan</b><small>Sor, karşılaştır, açıklama yazdır</small></a>
        <a class="ozellik-k turuncu" href="#/degerle"><span class="oz-ikon">${ic('grafik', 20)}</span><b>Ne kadar eder?</b><small>Değer aralığı ve PDF rapor</small></a>
      </div>
      <div class="kart haber-k" id="haberK"><div class="haber-bas">${ic('belge', 18)}<b>Piyasa gündemi</b></div><div class="k soluk">Yükleniyor…</div></div>
      ${yeniKayitli ? `<a class="kart satir" href="#/kayitli" style="text-decoration:none;color:inherit">${ic('zil', 22, 'var(--vurgu-ikon)')}<div class="ara"><b>Kayıtlı aramalarına ${yeniKayitli} yeni ilan</b><div class="k soluk">Görmek için dokun</div></div>${ic('geri', 18, 'var(--soluk)')}</a>` : ''}
      ${gorulen.length ? `<div class="bolum-bas"><h2>Son baktıkların</h2></div><div class="ciplar" style="gap:10px">${gorulen.map((i) => `<div style="width:160px;flex-shrink:0">${ilanKart(i)}</div>`).join('')}</div>` : ''}
      <div class="bolum-bas"><h2>Yeni ${ANA[ana].ad.toLocaleLowerCase('tr-TR')} ilanları</h2>${l.length ? `<a href="#/ara?ana=${ana}">Tümünü gör</a>` : ''}</div>
      ${(l = l.filter((i) => i.ana === ana)).length ? `<div class="ilan-izgara">${l.slice(0, 20).map(ilanKart).join('')}</div>`
        : bosDurum('ev', 'Henüz ilan yok', 'Mülküm360 yeni açıldı. İlk ilanı sen ver, binlerce kişiye ulaşsın.', `<a class="btn" href="#/ver">${ic('arti', 18, '#fff')}İlan ver</a>`)}
    </div>`;
  $('#araF').onsubmit = (e) => { e.preventDefault(); const q = e.target.q.value.trim(); q ? akilliAra(q, { ana }) : git('#/ara?ana=' + ana); };
  app.querySelectorAll('[data-ornek]').forEach((x) => (x.onclick = () => akilliAra(x.dataset.ornek, { ana })));
  app.querySelectorAll('[data-ana]').forEach((x) => (x.onclick = () => { S.kesfetAna = x.dataset.ana; ciz(); }));
  $('#menuBtn').onclick = menuAc;
  haberleriYukle();
  if (Date.now() - sonYukleme > 60000) veriYukle().then(() => { if (location.hash === '' || location.hash === '#/') ciz(); }, () => {});
  navCiz('kesfet');
};

// Ana kategori satırları: simge, ad, alt kategoriler, ilan sayısı
function anaSatirlari() {
  return Object.entries(ANA).map(([k, a]) => {
    const n = yayinda().filter((i) => i.ana === k).length;
    return `<a href="#/kategori/${k}" style="align-items:center"><span class="kat-ikon ${k}">${ic(a.ikon, 22)}</span>
      <div class="ara" style="min-width:0"><div style="font-size:16px;font-weight:700">${a.ad}</div><div class="k soluk" style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${altlari(k).map((x) => ALT[x].ad).join(', ')}</div></div>
      <span class="k soluk">${n || ''}</span>${ic('ok', 18, 'var(--soluk)')}</a>`;
  }).join('');
}
// Akıllı arama (MülkümAI): ilan no -> doğrudan ilan; cümle -> filtre
function akilliAra(q, mevcut) {
  q = String(q || '').trim();
  const no = q.replace(/\D/g, '');
  if (/^#?\s*\d{6,}$/.test(q)) {
    const i = S.ilanlar.find((x) => x.no === no);
    if (i) return git('#/ilan/' + i.id);
    return toast(no + ' numaralı ilan bulunamadı');
  }
  const { f, anlasilan, kalan } = sorguCoz(q);
  git('#/ara?' + sorguYap({ ...mevcut, ...f, q: kalan, ai: anlasilan.join('|'), sirala: mevcut.sirala }));
}
function menuAc() {
  const b = ben();
  sheetAc(`<div class="satir" style="gap:12px"><img src="logo.png" alt="" style="width:44px;height:44px;border-radius:12px"><div class="ara"><b style="font-size:17px">mülküm<span style="color:var(--vurgu)">360</span></b><div class="k soluk">${b ? kac(b.ad) : 'Misafir'}</div></div></div>
    ${b ? cuzdanKarti(b, true) : `<a class="btn tam" href="#/giris">Giriş yap / Üye ol</a>`}
    ${katla('Akıllı araçlar', 'yildiz', `<div class="liste">${menuSatir('#/ai', 'yildiz', 'MülkümAI asistan')}${menuSatir('#/degerle', 'grafik', 'Değerleme ve PDF rapor')}${menuSatir('#/endeksler', 'grafik', 'Piyasa endeksleri')}${menuSatir('#/bankakredi', 'kredi', 'Kredi hesaplama')}</div>`, '', true)}
    ${Object.entries(ANA).map(([k, a]) => katla(a.ad, a.ikon, `<a class="katla-tumu" href="#/ara?ana=${k}">Tüm ${a.ad.toLocaleLowerCase('tr-TR')} ilanları ›</a><div class="liste">${altlari(k).map((x) => menuSatir('#/ara?alt=' + x, ALT[x].ikon, ALT[x].ad, yayinda().filter((i) => i.alt === x).length || '')).join('')}</div>`, yayinda().filter((i) => i.ana === k).length + ' ilan')).join('')}
    ${katla('Destek ve dil', 'yardim', `<div class="liste">${dilSatiri()}${menuSatir('#/yardim', 'belge', 'Toplu ilan aktarım rehberi')}${menuSatir('#/metin/guvenlik', 'kalkan', 'Güvenli alım satım rehberi')}${menuSatir('#/metin/kosullar', 'belge', 'Kullanım koşulları')}${menuSatir('#/metin/kvkk', 'kilit', 'KVKK aydınlatma metni')}</div>`)}`,
  (s) => s.querySelectorAll('a').forEach((a) => a.addEventListener('click', sheetKapat)));
}
EKRAN.proje = () => {
  const g = {};
  yayinda().filter((i) => i.ana === 'emlak' && String(i.alanlar?.proje || '').trim()).forEach((i) => { const a = kucuk(i.alanlar.proje); (g[a] = g[a] || { ad: String(i.alanlar.proje).trim().slice(0, 60), l: [] }).l.push(i); });
  const liste = Object.values(g).sort((a, b) => b.l.length - a.l.length);
  app.innerHTML = ustBar('Konut projeleri') + `<div class="ic">
    ${liste.length ? liste.map((p) => { const kapakI = p.l.find((i) => (i.fotolar || []).length) || p.l[0]; return `<a class="kart satir" href="#/ara?q=${encodeURIComponent(p.ad)}" style="text-decoration:none;color:inherit">${kapakI && (kapakI.fotolar || []).length ? `<img src="${kac(kapakI.fotolar[0])}" alt="" style="width:64px;height:64px;border-radius:12px;object-fit:cover;flex-shrink:0">` : `<span class="kat-ikon emlak">${ic('proje', 22)}</span>`}<div class="ara" style="min-width:0"><b style="font-size:15px">${kac(p.ad)}</b><div class="k soluk">${p.l.length} ilanda ${tl(Math.min(...p.l.map((i) => i.fiyat)))} – ${tl(Math.max(...p.l.map((i) => i.fiyat)))}</div></div><span class="ok">›</span></a>`; }).join('')
      : bosDurum('proje', 'Henüz proje ilanı yok', 'Yeni konut projelerini "İlan ver → Proje adı" alanıyla işaretleyin; burada toplanır.', '<a class="btn" href="#/ver">İlan ver</a>')}
  </div>`;
  navCiz();
};
EKRAN.danisman = () => {
  const l = S.kullanicilar.filter((k) => k.ofis || k.yetkiNo || k.dogrulanmis)
    .map((k) => ({ k, n: yayinda().filter((i) => i.sahip === k.id).length }))
    .sort((a, b) => (b.k.dogrulanmis - a.k.dogrulanmis) || b.n - a.n);
  app.innerHTML = ustBar('Emlak danışmanları') + `<div class="ic">
    ${l.length ? `<div class="liste">${l.map(({ k, n }) => `<a class="oge" href="#/uye/${k.id}" style="text-decoration:none;color:inherit">${k.foto ? `<img src="${kac(k.foto)}" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0">` : `<div class="avatar" style="width:44px;height:44px">${basHarf(k.ad)}</div>`}<div class="ara" style="min-width:0"><b>${kac(gorunenAd(k))}</b> ${rozet(k)}<div class="k soluk">${kac([k.firma, k.unvan].filter(Boolean).join(' · ') || 'Emlak danışmanı')}${n ? ` · ${n} yayında ilan` : ''}</div></div><span class="ok">›</span></a>`).join('')}</div>`
      : bosDurum('kisi', 'Henüz doğrulanmış danışman yok', 'Emlak ofisleri yetki belgelerini doğrulattıkça burada listelenir.', '<a class="btn" href="#/degerle">Değerleme yap</a>')}
    <div class="k soluk" style="margin-top:10px;line-height:1.5">Doğrulanmış ofis rozeti, işletme kimliği ve yetki belgesinin resmî kayıttan (TTBS) teyit edildiği anlamına gelir.</div>
  </div>`;
  navCiz();
};
EKRAN.kategori = (ana) => {
  const a = ANA[ana]; if (!a) return git('#/');
  app.innerHTML = ustBar(a.ad) + `<div class="ic">
    <form class="satir" id="araF" role="search"><label class="arama-kutu">${ic('ara', 20, 'var(--soluk)')}<input name="q" aria-label="${a.ad} içinde ara" placeholder="${a.ad} içinde ara" enterkeyhint="search"></label></form>
    <div class="liste">${menuSatir('#/ara?ana=' + ana, a.ikon, 'Tüm ' + a.ad.toLocaleLowerCase('tr-TR') + ' ilanları', yayinda().filter((i) => i.ana === ana).length)}
    ${altlari(ana).map((x) => menuSatir('#/ara?alt=' + x, ALT[x].ikon, ALT[x].ad, yayinda().filter((i) => i.alt === x).length || '')).join('')}</div>
    ${ana === 'emlak' ? `<div class="ciplar">${['Satılık', 'Kiralık', 'Günlük Kiralık'].map((s) => `<a class="cip" href="#/ara?${sorguYap({ alt: 'konut', islem: s })}">Konut · ${s}</a>`).join('')}</div>` : ''}
  </div>`;
  $('#araF').onsubmit = (e) => { e.preventDefault(); akilliAra(e.target.q.value, { ana }); };
  navCiz('kesfet');
};

function aramaYap(q) {
  const o = typeof q === 'string' ? Object.fromEntries(new URLSearchParams(q)) : q;
  const kelimeler = kucuk(o.q || '').split(/\s+/).filter(Boolean);
  let l = yayinda().filter((i) => {
    if (o.ana && i.ana !== o.ana) return false;
    if (o.alt && i.alt !== o.alt) return false;
    if (o.il && i.il !== o.il) return false;
    if (o.ilce && i.ilce !== o.ilce) return false;
    if (o.mahalle && i.alanlar?.mahalle !== o.mahalle) return false;
    if (o.min && i.fiyat < +o.min) return false;
    if (o.max && i.fiyat > +o.max) return false;
    const f = i.alanlar || {};
    if (o.islem && f.islem !== o.islem) return false;
    if (o.dusen && !(+f.oncekiFiyat > i.fiyat)) return false;
    if (o.oda && f.oda !== o.oda) return false;
    if (o.yas && yasGrubu(f.binaYasi) !== o.yas) return false;
    if (o.aidatmax && !(f.aidat !== undefined && f.aidat !== '' && +f.aidat <= +o.aidatmax)) return false;
    for (const k of ['site', 'asansor', 'otopark', 'esya']) if (o[k] && f[k] !== o[k]) return false;
    if (o.kimden && kimden(i) !== o.kimden) return false;
    if (o.kat && f.kat !== o.kat) return false;
    if (o.marka && f.marka !== o.marka) return false;
    if (o.model && !kucuk(f.model || '').includes(kucuk(o.model))) return false;
    if (o.yilmax && +f.yil > +o.yilmax) return false;
    if (o.kmmin && !(+f.km >= +o.kmmin)) return false;
    for (const k of ['kasa', 'hasar', 'takas']) if (o[k] && f[k] !== o[k]) return false;
    if (o.agirhasar && (o.agirhasar === 'Evet') !== (f.hasar === 'Ağır hasar kayıtlı')) return false;
    if (o.renk && !kucuk(f.renk || '').includes(kucuk(o.renk))) return false;
    if (o.yilmin && +f.yil < +o.yilmin) return false;
    if (o.kmmax && +f.km > +o.kmmax) return false;
    if (o.yakit && f.yakit !== o.yakit) return false;
    if (o.vites && f.vites !== o.vites) return false;
    if (kelimeler.length) {
      const yigin = kucuk([i.baslik, i.aciklama, i.il, i.ilce, ALT[i.alt]?.ad, ...Object.values(f)].join(' '));
      return kelimeler.every((k) => yigin.includes(k) || (k === 'satılık' && f.islem === 'Satılık') || (k === 'kiralık' && f.islem === 'Kiralık') || (k === 'sezonluk' && f.islem === 'Sezonluk'));
    }
    return true;
  });
  const s = o.sirala || 'yeni';
  l.sort(s === 'ucuz' ? (a, b) => a.fiyat - b.fiyat : s === 'pahali' ? (a, b) => b.fiyat - a.fiyat : (a, b) => b.olusturma - a.olusturma);
  return dopingSirala(l);
}

EKRAN.ara = () => {
  const o = sorgu(), l = aramaYap(o);
  const filtreSay = ['il', 'ilce', 'mahalle', 'min', 'max', 'islem', 'oda', 'yas', 'aidatmax', 'site', 'asansor', 'otopark', 'esya', 'kimden', 'yilmin', 'kmmax', 'yakit', 'vites', 'kat', 'marka', 'model', 'yilmax', 'kmmin', 'kasa', 'hasar', 'takas', 'renk', 'agirhasar'].filter((k) => o[k]).length;
  const cip = (ad, deg) => `<button class="cip ${deg.secili ? 'secili' : ''}" data-q='${kac(JSON.stringify(deg.q))}'>${ad}</button>`;
  const ilkAdet = Math.max(30, (GERI_DONUS && KAYDIR[location.hash]?.n) || 0);
  const seciliAna = o.ana || (o.alt && ALT[o.alt]?.ana) || '';
  const altlar = seciliAna ? Object.entries(ALT).filter(([, a]) => a.ana === seciliAna) : [];
  app.innerHTML = `<header class="ust" style="flex-wrap:wrap">
      <button class="ikon-btn dolu" aria-label="Geri" data-geri>${ic('geri')}</button>
      <form id="araF" class="arama-kutu" role="search" style="height:44px">${ic('ara', 18, 'var(--soluk)')}<input name="q" aria-label="Ara" value="${kac(o.q || '')}" placeholder="Ne arıyorsun?" enterkeyhint="search"></form>
    </header>
    <div class="ic" style="padding-top:12px">
      <div class="ciplar">
        <button class="cip ${filtreSay ? 'secili' : ''}" id="filtreBtn">${ic('filtre', 16)}Filtre${filtreSay ? ' · ' + filtreSay : ''}</button>
        ${cip('Tümü', { secili: !o.ana && !o.alt, q: { ana: '', alt: '' } })}${cip('Emlak', { secili: o.ana === 'emlak' && !o.alt, q: { ana: 'emlak', alt: '' } })}${cip('Vasıta', { secili: o.ana === 'vasita' && !o.alt, q: { ana: 'vasita', alt: '' } })}
      </div>
      <div class="ciplar">${altlar.map(([k, a]) => cip(a.ad, { secili: o.alt === k, q: { alt: o.alt === k ? '' : k, ana: a.ana } })).join('')}</div>
      ${o.ai ? `<div class="bilgi-k" style="align-items:center">${ic('yildiz', 18)}<div><b>MülkümAI anladı:</b> ${o.ai.split('|').map(kac).join(' · ')}${o.q ? ` · “${kac(o.q)}”` : ''}</div></div>` : ''}
      <div class="satir"><div class="ara k soluk" style="font-weight:600;white-space:nowrap">${sayiBicim(l.length)} ilan</div>
        <select id="sirala" aria-label="Sırala" class="cip" style="appearance:auto"><option value="yeni">En yeni</option><option value="ucuz">En düşük fiyat</option><option value="pahali">En yüksek fiyat</option></select>
        <button class="cip" id="kaydetBtn">${ic('zil', 16)}Aramayı kaydet</button></div>
      ${l.length ? l.slice(0, ilkAdet).map((i) => ilanSatir(i)).join('') + (l.length > ilkAdet ? '<div id="dahaFazla" style="height:1px"></div>' : '') : bosDurum('ara', 'Sonuç bulunamadı', 'Filtreleri azaltmayı ya da farklı kelimeler denemeyi dene. Aramayı kaydedersen yeni ilan gelince haber veririz.')}
    </div>`;
  // Listenin kalanı sona yaklaşıldıkça eklenir
  const son = $('#dahaFazla');
  if (son && 'IntersectionObserver' in window) {
    let adet = ilkAdet; const h = location.hash; (KAYDIR[h] = KAYDIR[h] || { y: 0 }).n = adet;
    const goz = new IntersectionObserver((g) => {
      if (!g.some((e) => e.isIntersecting)) return;
      if (!son.isConnected) return goz.disconnect();
      son.insertAdjacentHTML('beforebegin', l.slice(adet, adet + 30).map((i) => ilanSatir(i)).join('')); adet += 30; (KAYDIR[h] = KAYDIR[h] || { y: 0 }).n = adet;
      if (adet >= l.length) { goz.disconnect(); son.remove(); }
    }, { rootMargin: '900px' });
    goz.observe(son);
  } else if (son) son.outerHTML = l.slice(ilkAdet).map((i) => ilanSatir(i)).join('');
  $('#sirala').value = o.sirala || 'yeni';
  $('#sirala').onchange = (e) => git('#/ara?' + sorguYap({ ...o, sirala: e.target.value }));
  $('#araF').onsubmit = (e) => { e.preventDefault(); akilliAra(e.target.q.value, { ana: o.ana, alt: o.alt, sirala: o.sirala }); };
  app.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => git('#/ara?' + sorguYap({ ...o, ...JSON.parse(b.dataset.q) }))));
  $('#filtreBtn').onclick = () => filtreSheet(o);
  $('#kaydetBtn').onclick = async () => {
    if (girisGerek('Aramayı kaydetmek için giriş yap')) return;
    const q = sorguYap({ ...o, sirala: '' });
    if (S.kayitliAramalar.some((a) => a.sahip === ben().id && a.q === q)) return toast('Bu arama zaten kayıtlı');
    await dene(() => aramaKaydet(q, aramaAdi(o)), 'Arama kaydedildi. Yeni ilanlar Keşfet’te görünecek.');
  };
  navCiz('ara');
};
function aramaAdi(o) {
  return [o.q, o.alt ? ALT[o.alt].ad : o.ana === 'emlak' ? 'Emlak' : o.ana === 'vasita' ? 'Vasıta' : '', o.islem, o.oda, o.yas && 'Bina ' + o.yas, o.mahalle, o.ilce, o.il, o.max && '≤ ' + tl(+o.max)].filter(Boolean).join(' · ') || 'Tüm ilanlar';
}
function filtreSheet(o) {
  const ana = o.ana || (o.alt && ALT[o.alt].ana) || '';
  const sec = (ad, ad2, ops, ozel = '') => `<label class="fs-satir"><span>${ad2}</span><select name="${ad}" ${ozel}><option value="">Farketmez</option>${ops.map((x) => `<option ${o[ad] === x ? 'selected' : ''}>${kac(x)}</option>`).join('')}</select></label>`;
  const sayi = (ad, ad2, ph, ek = '') => `<label class="fs-satir"><span>${ad2}</span><input name="${ad}" inputmode="numeric" placeholder="${ph}" value="${kac(o[ad] || '')}" ${ek}></label>`;
  const grup = (baslik, ic2) => `<div class="fs-grup"><div class="fs-baslik">${baslik}</div><div class="fs-liste">${ic2}</div></div>`;
  const aktif = ['kimden', 'il', 'ilce', 'mahalle', 'min', 'max', 'islem', 'oda', 'yas', 'site', 'asansor', 'otopark', 'esya', 'aidatmax', 'yilmin', 'kmmax', 'yakit', 'vites', 'kat', 'marka', 'model', 'yilmax', 'kmmin', 'kasa', 'hasar', 'takas', 'renk', 'agirhasar'].filter((k) => o[k]).length;
  sheetAc(`<div class="fs-ust"><h2 style="font-size:19px;font-weight:800;margin:0">Filtrele</h2>${aktif ? `<span class="fs-say">${aktif} filtre</span>` : ''}</div><form id="ff" class="fs-form">
    ${grup('Konum', sec('il', 'İl', ILLER) + `<label class="fs-satir"><span>İlçe</span><select name="ilce" data-bos="Farketmez"><option value="">Farketmez</option>${o.ilce ? `<option selected>${kac(o.ilce)}</option>` : ''}</select></label><label class="fs-satir"><span>Mahalle</span><select name="mahalle" data-bos="Farketmez"><option value="">Farketmez</option>${o.mahalle ? `<option selected>${kac(o.mahalle)}</option>` : ''}</select></label>`)}
    ${grup('Fiyat (TL)', `<div class="fs-satir fs-ikili"><input name="min" inputmode="numeric" placeholder="En az" value="${kac(o.min || '')}"><i>–</i><input name="max" inputmode="numeric" placeholder="En çok" value="${kac(o.max || '')}"></div>`)}
    ${ana !== 'vasita' ? grup('Emlak', sec('islem', 'İşlem', ['Satılık', 'Kiralık', 'Günlük Kiralık', 'Sezonluk', 'Devren']) + sec('oda', 'Oda sayısı', ALANLAR.emlak[2][3]) + sec('yas', 'Bina yaşı', YAS_GRUPLARI) + sec('kat', 'Bulunduğu kat', ONERI.kat) + sec('kimden', 'Kimden', ['Sahibinden', 'Emlak ofisinden']))
      + grup('Özellikler', sec('site', 'Site içinde', ['Evet', 'Hayır']) + sec('asansor', 'Asansör', ['Var', 'Yok']) + sec('otopark', 'Otopark', ['Kapalı', 'Açık', 'Yok']) + sec('esya', 'Eşya', ['Eşyasız', 'Eşyalı']) + sayi('aidatmax', 'En çok aidat (TL)', 'Farketmez', `list="on-aidat" autocomplete="off"`) + `<datalist id="on-aidat">${ONERI.aidat.map((x) => `<option value="${x}">`).join('')}</datalist>`) : ''}
    ${ana !== 'emlak' ? grup('Araç', sec('marka', 'Marka', MARKALAR) + `<label class="fs-satir"><span>Model / seri</span><select name="model"><option value="">Farketmez</option>${o.model ? `<option selected>${kac(o.model)}</option>` : ''}</select></label>` + sec('kasa', 'Kasa tipi', ALANLAR.vasita[6][3]))
      + grup('Model yılı', `<div class="fs-satir fs-ikili"><input name="yilmin" inputmode="numeric" placeholder="En eski" value="${kac(o.yilmin || '')}"><i>–</i><input name="yilmax" inputmode="numeric" placeholder="En yeni" value="${kac(o.yilmax || '')}"></div>`)
      + grup('Kilometre', `<div class="fs-satir fs-ikili"><input name="kmmin" inputmode="numeric" placeholder="En az" value="${kac(o.kmmin || '')}"><i>–</i><input name="kmmax" inputmode="numeric" placeholder="En çok" value="${kac(o.kmmax || '')}"></div>`)
      + grup('Teknik ve durum', sec('yakit', 'Yakıt', ALANLAR.vasita[4][3]) + sec('vites', 'Vites', ALANLAR.vasita[5][3]) + sec('agirhasar', 'Ağır hasar kayıtlı', ['Evet', 'Hayır']) + sec('hasar', 'Boya / değişen', ALANLAR.vasita[8][3]) + `<label class="fs-satir"><span>Renk</span><input name="renk" maxlength="20" placeholder="Farketmez" value="${kac(o.renk || '')}"></label>` + sec('takas', 'Takas', ALANLAR.vasita[9][3]) + (ana === 'vasita' ? sec('kimden', 'Kimden', ['Sahibinden', 'Galeriden']) : '')) : ''}
    <div class="fs-alt"><button type="button" class="btn sade" id="temizle">Temizle</button><button class="btn">Sonuçları göster</button></div></form>`, (s) => {
    konumSecBagla($('[name=il]', s), $('[name=ilce]', s), $('[name=mahalle]', s));
    aracModelBagla($('[name=marka]', s), $('[name=model]', s), 'Farketmez');
    $('#temizle', s).onclick = () => { sheetKapat(); git('#/ara?' + sorguYap({ q: o.q, ana: o.ana, alt: o.alt })); };
    $('#ff', s).onsubmit = (e) => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(e.target));
      ['min', 'max', 'yilmin', 'yilmax', 'kmmin', 'kmmax', 'aidatmax'].forEach((k) => v[k] && (v[k] = v[k].replace(/\D/g, '')));
      sheetKapat(); git('#/ara?' + sorguYap({ ...o, ...v }));
    };
  });
}

EKRAN.ilan = (id) => {
  const i = ilan(id);
  if (!i) { app.innerHTML = ustBar('İlan detayı') + bosDurum('uyari', 'İlan bulunamadı', 'Bu ilan kaldırılmış olabilir.', '<a class="btn" href="#/">Keşfet’e dön</a>'); navCiz(); return; }
  const b = ben(), sahip = b && b.id === i.sahip, s = kullanici(i.sahip);
  if (!sahip && !(ilan.bakilan || (ilan.bakilan = new Set())).has(id)) { ilan.bakilan.add(id); i.goruntulenme = (i.goruntulenme || 0) + 1; ilanGoruntule(id); }
  S.gorulen = [id, ...S.gorulen.filter((x) => x !== id)].slice(0, 20); kaydet();
  const f = i.alanlar || {}, tanim = ALANLAR[i.ana];
  const e = emsalDurumu(i);
  const fotolar = i.fotolar || [];
  const satildi = i.durum === 'satildi';
  document.body.classList.add('navsiz'); nav.innerHTML = '';
  app.innerHTML = `<div class="galeri">
      ${fotolar.length ? `<div class="seritler" id="serit">${fotolar.map((u, n) => `<img src="${u}" alt="Fotoğraf ${n + 1}"${n ? ' loading="lazy"' : ''} decoding="async">`).join('')}</div>` : `<div style="height:100%;display:flex;align-items:center;justify-content:center">${fotoKutu(i, 72)}</div>`}
      <div class="ust-dugme" style="left:12px"><button class="ikon-btn" aria-label="Geri" data-geri>${ic('geri')}</button></div>
      <div class="ust-dugme" style="right:12px"><button class="ikon-btn" aria-label="Paylaş" id="paylas">${ic('paylas')}</button>
        ${sahip ? '' : `<button class="ikon-btn" aria-label="Favori" id="fav">${ic('kalp', 20, favMi(id) ? 'var(--vurgu)' : 'currentColor')}</button>`}</div>
      ${fotolar.length > 1 ? `<span class="sayac" id="sayac">1 / ${fotolar.length}</span>` : ''}
    </div>
    <div class="ic" style="padding-bottom:110px">
      ${satildi ? `<div class="uyari-k">${ic('uyari', 18)}<div>Bu ilan ${f.islem === 'Kiralık' ? 'kiralandı' : 'satıldı'} olarak işaretlendi.</div></div>` : ''}
      ${i.ornek ? `<div class="uyari-k">${ic('uyari', 18)}<div>Bu bir <b>test ilanıdır</b>; ekranları denemek için eklendi, gerçek değildir.</div></div>` : ''}
      <div style="display:flex;flex-direction:column;gap:4px">
        <div style="font-size:26px;font-weight:800;letter-spacing:-.5px">${tl(i.fiyat)}${f.islem === 'Kiralık' ? '<span class="soluk" style="font-size:14px;font-weight:500"> / ay</span>' : ''}</div>
        ${+f.oncekiFiyat > i.fiyat || (i.ana === 'emlak' && +f.m2net > 0) ? `<div class="k soluk">${+f.oncekiFiyat > i.fiyat ? `<s>${tl(+f.oncekiFiyat)}</s> <b style="color:var(--guven)">%${Math.round((1 - i.fiyat / f.oncekiFiyat) * 100)} indirim</b>` : ''}${+f.oncekiFiyat > i.fiyat && +f.m2net > 0 ? ' · ' : ''}${i.ana === 'emlak' && +f.m2net > 0 ? `<span class="m2-hap">${tl(i.fiyat / f.m2net)} / m²</span> <span class="soluk">net ${sayiBicim(+f.m2net)} m²${+f.m2brut > 0 ? ' · brüt ' + sayiBicim(+f.m2brut) + ' m²' : ''}</span>` : ''}</div>` : ''}
        <h2 style="font-size:17px;font-weight:600" id="ilanBaslik">${kac(i.baslik)}</h2>
        ${DIL !== 'tr' ? `<button class="btn sade kucuk" id="orjBtn" data-cevirme style="margin:2px 0 6px">${ic('dil', 14)}<span>Orijinalini göster</span></button>` : ''}
        ${i.dogrulanmis ? `<div><span class="rozet dogru">${ic('kalkan', 12)}Tapu bilgisi doğrulandı</span></div>` : ''}
        ${f.eids ? `<div><span class="rozet" style="background:#E8F1FB;color:#1064BC">${ic('kalkan', 12)}EİDS ilan doğrulama no: ${kac(f.eids)}</span></div>` : ''}
        <div class="konum-yol">${ic('konum', 14)}${[i.il, i.ilce, f.mahalle && f.mahalle + ' Mah.'].filter(Boolean).map((x) => `<span>${kac(x)}</span>`).join('<span class="soluk">›</span>')}</div>
        <div class="k soluk satir" style="gap:6px;flex-wrap:wrap">İlan no ${i.no || i.id.slice(-6).toUpperCase()} · ${new Date(i.olusturma).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} · ${ic('goz', 14)} ${i.goruntulenme || 0}</div>
      </div>
      <div class="sekmeler" id="sekmeler" role="tablist">${[['bilgi', 'İlan Bilgileri'], ['aciklama', 'Açıklama'], ['konum', 'Konumu'], ...(i.ana === 'emlak' ? [['cevre', 'Çevre']] : [])].map(([k, a], n) => `<button role="tab" data-sekme="${k}" class="${n ? '' : 'secili'}" aria-selected="${!n}">${a}</button>`).join('')}</div>
      <div data-panel="bilgi">
      ${(() => {
        // Öne çıkan bilgiler: alıcının ilk baktığı 4 değer
        const one = i.ana === 'emlak'
          ? [['ev', 'Oda', f.oda], ['bina', 'Net m²', f.m2net ? `${f.m2net} ㎡` : ''], ['numara', 'Kat', f.kat], ['takvim', 'Bina yaşı', f.binaYasi !== undefined && f.binaYasi !== '' ? f.binaYasi : '']]
          : [['takvim', 'Yıl', f.yil], ['pusula', 'Km', f.km ? sayiBicim(f.km) : ''], ['simsek', 'Yakıt', f.yakit], ['ayar', 'Vites', f.vites]];
        const dolu = one.filter(([, , v]) => v !== undefined && v !== '');
        return dolu.length ? `<div class="one-serit">${dolu.map(([ik, ad, v]) => `<div>${ic(ik, 20, 'var(--vurgu-ikon)')}<b>${kac(String(v))}</b><span>${ad}</span></div>`).join('')}</div>` : '';
      })()}
      ${i.aciklama ? `<div class="kart" style="cursor:pointer" id="ozetAc"><h3>Açıklama</h3><div class="aciklama-metin kisa" style="max-height:4.8em">${kac(i.aciklama)}</div><div class="k" style="font-weight:700;color:var(--vurgu-koyu);margin-top:6px">Tamamını oku ›</div></div>` : ''}
      <div class="kart"><h3>İlan bilgileri</h3><div class="bilgi-tablo">
        <div><span>İlan no</span><b>${i.no || i.id.slice(-6).toUpperCase()}</b></div>
        <div><span>İlan tarihi</span><b>${new Date(i.olusturma).toLocaleDateString('tr-TR')}</b></div>
        <div><span>Kategori</span><b>${ALT[i.alt].ad}</b></div>
        ${i.ana === 'emlak' ? `<div><span>Kimden</span><b>${kimden(i)}</b></div>` : ''}
        ${tanim.filter(([k]) => f[k] !== undefined && f[k] !== '').map(([k, ad]) => `<div><span>${ad}</span><b>${kac(k === 'km' ? sayiBicim(f[k]) : f[k])}${k.startsWith('m2') ? ' ㎡' : ''}</b></div>`).join('')}
        ${f.mahalle ? `<div><span>Mahalle</span><b>${kac(f.mahalle)}</b></div>` : ''}${f.sokak ? `<div><span>Sokak / cadde</span><b>${kac(f.sokak)}</b></div>` : ''}
      </div></div>
      ${i.ana === 'emlak' && f.ada && f.parsel ? `<div class="kart" id="parselK"><h3>Ada / Parsel (TKGM)</h3><div class="bilgi-tablo"><div><span>Ada / parsel</span><b>${kac(f.ada)} / ${kac(f.parsel)}</b></div></div><div class="k soluk" style="margin-top:6px">Tapu ve Kadastro kayıtları yükleniyor…</div></div>` : ''}
      <a class="kart satir" href="#/uye/${s.id}" style="text-decoration:none;color:inherit">${avatarHtml(s, 44)}<div class="ara"><b>${kac(gorunenAd(s))}</b> ${rozet(s, i.ana)}${s.firma ? `<div class="k">${kac(s.firma)}</div>` : ''}<div class="k soluk">${s.olusturma ? 'Üyelik: ' + new Date(s.olusturma).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }) + ' · ' : ''}${S.ilanlar.filter((x) => x.sahip === s.id && x.durum === 'yayinda').length} ilan${s.acikTel ? ' · ' + kac(s.acikTel) : ''}</div></div><span class="ok">›</span></a>
      </div>
      <div data-panel="aciklama" hidden>
        ${i.aciklama ? `<div class="kart"><h3>Açıklama</h3><div class="aciklama-metin">${kac(i.aciklama)}</div></div>` : bosDurum('belge', 'Açıklama yazılmamış', 'Satıcı bu ilana açıklama eklememiş. Merak ettiklerini mesajla sorabilirsin.')}
      </div>
      <div data-panel="konum" hidden>
        <div class="kart" id="konumK"><h3>Konumu</h3><div class="konum-yol" style="margin-bottom:8px">${ic('konum', 14)}${[i.il, i.ilce, f.mahalle && f.mahalle + ' Mah.', f.sokak].filter(Boolean).map((x) => `<span>${kac(x)}</span>`).join('<span class="soluk">›</span>')}</div><div class="k soluk">Harita yükleniyor…</div></div>
        ${i.ana === 'emlak' ? '<div class="kart" id="endeksK"><h3>Konut endeksi</h3><div class="k soluk">Yükleniyor…</div></div>' : ''}
      </div>
      ${i.ana === 'emlak' ? '<div data-panel="cevre" hidden><div class="kart" id="cevreK"><h3>Çevre</h3><div class="k soluk">Yükleniyor…</div></div></div>' : ''}
      ${e ? `<div class="kart"><div class="satir"><b class="ara">Fiyat, benzer ilanlara göre</b><span class="etiket" style="position:static;background:${e.konum < 0.35 ? 'var(--guven-acik)' : e.konum > 0.7 ? 'var(--uyari-acik)' : 'var(--yuzey2)'};color:${e.konum < 0.35 ? 'var(--guven)' : e.konum > 0.7 ? 'var(--uyari)' : 'var(--murekkep)'}">${e.konum < 0.35 ? 'Uygun' : e.konum > 0.7 ? 'Yüksek' : 'Ortalama'}</span></div>
        <div class="fiyat-cubuk"><div class="bant" style="left:${e.bantSol * 100}%;width:${(e.bantSag - e.bantSol) * 100}%"></div><div class="nokta" style="left:${e.konum * 100}%"></div></div>
        <div class="k soluk">${e.sayi} benzer ilanın ortalaması: ${i.ana === 'emlak' ? tl(e.birimOrta) + '/m²' : tl(e.birimOrta)}. Uygulamadaki ilanlarla hesaplanır.</div></div>` : ''}
      ${[['video', 'Videoyu izle', 'Satıcının eklediği tanıtım videosu'], ['tur360', '360° sanal tur', 'Evi sanal olarak gez']].filter(([k]) => /^https:\/\//.test(f[k] || '')).map(([k, b, a]) => `<a class="kart satir" href="${kac(f[k])}" target="_blank" rel="noopener nofollow" style="text-decoration:none;color:inherit">${ic(k === 'video' ? 'foto' : 'pusula', 22, 'var(--vurgu-ikon)')}<div class="ara"><b>${b}</b><div class="k soluk">${a} · dış bağlantı</div></div><span class="ok">›</span></a>`).join('')}
      ${i.ana === 'emlak' && f.islem === 'Satılık' ? `<div class="kart" id="krediK"><h3>Kredi hesabı</h3><div class="izgara3"><label class="alan">Peşinat %<input id="kPes" inputmode="numeric" value="20"></label><label class="alan">Vade (ay)<input id="kVade" inputmode="numeric" value="120" list="kVadeOn"><datalist id="kVadeOn"><option value="60"><option value="120"><option value="180"></datalist></label><label class="alan">Aylık faiz %<input id="kFaiz" inputmode="decimal" placeholder="bankanınki"></label></div><div id="kSonuc" class="k soluk">Bankanın güncel aylık faiz oranını yaz; taksit hesaplansın.</div></div>` : ''}
      ${sahip ? `<div class="bolum-bas"><h2>İlanını güçlendir</h2><a href="#/kredi">${b.kredi ?? 0} kredi · Kredi al</a></div><div class="kart" id="dopingK"><div class="k soluk">Görünürlük paketleri yükleniyor…</div></div>` : ''}
      ${(sahip && fotolar.length) || (f.videolar || []).length ? '<div class="kart" id="videoK"><div class="k soluk">Videolar yükleniyor…</div></div>' : ''}
      ${sahip && fotolar.length && i.ana === 'emlak' ? `<button class="kart satir" id="dekoAc" style="text-align:left;width:100%;border:0;font:inherit;color:inherit;cursor:pointer">${ic('yildiz', 22, 'var(--vurgu-ikon)')}<div class="ara"><b>MülkümDeko ile fotoğraf oluştur</b><div class="k soluk">Odalarını Modern, Klasik, İskandinav ya da Rustik stilde yapay zekâyla döşe · görsel başına 1 kredi</div></div><span class="ok">›</span></button>` : ''}
      ${sahip && eidsAcik() && i.durum === 'onayda' ? `<button class="kart satir" data-eids="${i.id}" style="text-align:left;width:100%;font:inherit;color:inherit;cursor:pointer">${ic('kalkan', 22, 'var(--guven)')}<div class="ara"><b>EİDS doğrulaması sürüyor</b><div class="k soluk">Onaylanınca ilanın otomatik yayına çıkar; bilgileri güncellemek için talebi yenileyebilirsin</div></div><span class="ok">›</span></button>` : sahip && i.ana === 'emlak' && !i.dogrulanmis ? `<button class="kart satir" id="tapuIste" style="text-align:left;width:100%;font:inherit;color:inherit;cursor:pointer">${ic('kalkan', 22, 'var(--guven)')}<div class="ara"><b>Tapu doğrulaması iste</b><div class="k soluk">Onaylanırsa ilanında "Tapu bilgisi doğrulandı" rozeti çıkar; alıcı güveni artar</div></div><span class="ok">›</span></button>` : ''}
      ${!sahip && !satildi ? `<button class="kart satir" id="randevu" style="text-align:left;width:100%;font:inherit;color:inherit;cursor:pointer">${ic('takvim', 22, 'var(--vurgu-ikon)')}<div class="ara"><b>Yerinde görmek için randevu iste</b><div class="k soluk">Uygun zamanını seç, satıcıya mesaj olarak gitsin</div></div><span class="ok">›</span></button>` : ''}
      ${(f.deko || []).length ? `<div class="kart" id="dekoKart"><h3>Yapay zekâ ile dekorasyon önerileri</h3>
        <div class="ciplar">${f.deko.map((d, n) => `<button class="cip ${n ? '' : 'secili'}" data-deko="${n}">${kac(d.oda)} · ${kac(d.stil)}</button>`).join('')}</div>
        <div id="dekoGoster">${dekoKarsilastir(f.deko[0])}</div>
        <div class="k soluk">Görseldeki mobilya ve eşyalar ilana dahil değildir. Görseller dekorasyon fikri vermek için yapay zekâyla oluşturuldu; gerçeği birebir yansıtmayabilir.</div></div>` : ''}
      ${i.ana === 'emlak' ? `<a class="kart satir" href="#/degerle?ilan=${i.id}" style="text-decoration:none;color:inherit">${ic('belge', 22, 'var(--vurgu-ikon)')}<div class="ara"><b>Bu mülkün değer raporu</b><div class="k soluk">Benzer ilanlara göre değer aralığı, PDF</div></div></a>` : `<a class="kart satir" href="#/degerle?ilan=${i.id}" style="text-decoration:none;color:inherit">${ic('belge', 22, 'var(--vurgu-ikon)')}<div class="ara"><b>Bu aracın değeri</b><div class="k soluk">TSB kasko değeri ve benzer ilanlara göre aralık</div></div></a>`}
      ${sahip ? '' : `<div class="kart" id="aiKart"><button class="btn sade tam" id="aiOzet">${ic('yildiz', 18)}MülkümAI bu ilanı değerlendirsin</button></div>`}
      ${i.ana === 'vasita' ? aracKontrolKarti(i) : ''}
      <div class="uyari-k">${ic('kalkan', 18)}<div>Görmeden kapora gönderme. Ödeme ve konuşmaları uygulama içinde tut; kaporayı ya da ödemeyi başka bir siteye veya hesaba yönlendirenlere dikkat et.</div></div>
      ${(() => { const bz = yayinda().filter((x) => x.id !== i.id && x.alt === i.alt && x.il === i.il && (x.alanlar?.islem || '') === (f.islem || '') && x.fiyat >= i.fiyat * 0.7 && x.fiyat <= i.fiyat * 1.3).sort((x, y) => (x.ilce === i.ilce ? -1 : 0) - (y.ilce === i.ilce ? -1 : 0) || Math.abs(x.fiyat - i.fiyat) - Math.abs(y.fiyat - i.fiyat)).slice(0, 6); return bz.length ? `<div class="bolum-bas"><h2>Benzer ilanlar</h2></div><div class="ciplar" style="gap:10px">${bz.map((x) => `<div style="width:170px;flex-shrink:0">${ilanKart(x)}</div>`).join('')}</div>` : ''; })()}
      ${sahip ? '' : `<button class="btn sade tam" id="sikayet">${ic('bayrak', 18)}İlanı şikayet et</button>`}
    </div>
    <div class="alt-bar"><div class="alt-bar-ic">${sahip
      ? `<button class="btn sade" id="oneCikar">${ic('yildiz', 16)}Öne çıkar</button><a class="btn cizgili" href="#/ver/${i.id}">${ic('kalem', 18)}Düzenle</a><button class="btn ${satildi ? '' : 'guven'}" id="durum">${satildi ? 'Yeniden yayınla' : f.islem === 'Kiralık' ? 'Kiralandı' : 'Satıldı'}</button>`
      : satildi ? `<a class="btn sade" href="#/ara?alt=${i.alt}">Benzer ilanları gör</a>`
      : `<button class="btn cizgili" id="teklif">Teklif ver</button><button class="btn" id="mesaj" style="flex:1.4">${ic('mesaj', 18, '#fff')}Mesaj gönder</button>${s.acikTel ? `<a class="btn iletisim-ara" href="tel:${kac(telTemiz(s.acikTel))}" aria-label="Ara">${ic('telefon', 20, '#fff')}</a><a class="btn iletisim-wa" href="${waBaglanti(s.acikTel, i)}" target="_blank" rel="noopener" aria-label="WhatsApp ile yaz">${WA_SVG}</a>` : ''}`}</div></div>`;
  if (typeof endeksKartiYukle === 'function') endeksKartiYukle(i);
  const oc = $('#oneCikar'); if (oc) oc.onclick = () => { if (!girisGerek()) dopingAlimSheet(i); };
  if ($('#dopingK') && typeof dopingKartiYukle === 'function') dopingKartiYukle(i);
  if (typeof sekmeBagla === 'function') sekmeBagla(i);
  if (typeof parselKartiYukle === 'function') parselKartiYukle(i);
  if (typeof videoKartiYukle === 'function') videoKartiYukle(i);
  if (i.ana === 'vasita') webBagla();
  const acD = $('#acDevam'); if (acD) acD.onclick = () => { const m = $('#acMetin'), k = m.classList.toggle('kisa'); acD.textContent = k ? 'Devamını oku' : 'Daha az göster'; if (k) $('#aciklamaK').scrollIntoView({ block: 'start', behavior: 'smooth' }); };
  const serit = $('#serit');
  if (serit) serit.querySelectorAll('img').forEach((im, n) => (im.onclick = () => fotoGoster(fotolar, n)));
  if (serit && $('#sayac')) serit.onscroll = () => ($('#sayac').textContent = Math.round(serit.scrollLeft / serit.clientWidth) + 1 + ' / ' + fotolar.length);
  $('#paylas').onclick = () => paylas(`${i.baslik} — ${tl(i.fiyat)}${f.islem === 'Kiralık' ? ' / ay' : ''} (${[i.ilce, i.il].filter(Boolean).join(', ')})
Mülküm360 ilan no: ${i.no || i.id.slice(-6).toUpperCase()} (uygulamada arama kutusuna bu numarayı yaz)
Uygulama: https://fatihcalis07-commits.github.io/mulkum360/`);
  const fv = $('#fav'); if (fv) fv.onclick = async () => { await favDegis(id); fv.innerHTML = ic('kalp', 20, favMi(id) ? 'var(--vurgu)' : 'currentColor'); };
  const mj = $('#mesaj'); if (mj) mj.onclick = async () => { if (girisGerek('Mesaj göndermek için giriş yap')) return; const s = await dene(() => sohbetGetir(i)); if (s) git('#/sohbet/' + s.id); };
  const tk = $('#teklif'); if (tk) tk.onclick = async () => { if (girisGerek('Teklif vermek için giriş yap')) return; const s = await dene(() => sohbetGetir(i)); if (s) teklifSheet(s); };
  const dr = $('#durum'); if (dr) dr.onclick = async () => {
    if (satildi) { if (await dene(() => ilanDurum(i, 'yayinda'), 'İlan yeniden yayında')) ciz(); return; }
    const fiyat = await satisFiyatiSor(i); if (fiyat === undefined) return;
    if (await dene(() => ilanDurum(i, 'satildi', fiyat), 'Hayırlı olsun!')) ciz();
  };
  const ao = $('#aiOzet'); if (ao) ao.onclick = async () => {
    if (girisGerek('MülkümAI için giriş yap')) return;
    ao.disabled = true; ao.textContent = 'MülkümAI inceliyor…';
    try {
      const m = await aiSor('ilan_ozet', { ilan: { kategori: ALT[i.alt].ad, baslik: i.baslik, fiyat: i.fiyat, il: i.il, ilce: i.ilce, ...alanVeri(f), aciklama: (i.aciklama || '').slice(0, 1500), fiyatKarsilastirma: e ? { benzerIlanSayisi: e.sayi, ortanca: Math.round(e.birimOrta), konum: e.konum < 0.35 ? 'uygun' : e.konum > 0.7 ? 'yüksek' : 'ortalama' } : 'yeterli emsal yok' } });
      $('#aiKart').innerHTML = `<div class="k" style="font-weight:700;color:var(--vurgu-koyu);letter-spacing:.4px;margin-bottom:6px">MÜLKÜMAI DEĞERLENDİRMESİ</div><div style="white-space:pre-wrap;line-height:1.55;font-size:14px">${kac(m)}</div><div class="k soluk" style="margin-top:8px">Yapay zekâ üretimidir; ilanı yerinde görmeden karar verme.</div>`;
    } catch (x) { toast(x.message); ao.disabled = false; ao.innerHTML = ic('yildiz', 18) + 'MülkümAI bu ilanı değerlendirsin'; }
  };
  app.querySelectorAll('[data-deko]').forEach((x) => (x.onclick = () => {
    app.querySelectorAll('[data-deko]').forEach((y) => y.classList.toggle('secili', y === x));
    $('#dekoGoster').innerHTML = dekoKarsilastir(f.deko[+x.dataset.deko]); dekoBagla($('#dekoGoster'));
  }));
  if ($('#dekoGoster')) dekoBagla($('#dekoGoster'));
  const da = $('#dekoAc'); if (da) da.onclick = () => dekoSheet(i);
  const kH = () => { const pes = Math.min(90, +$('#kPes').value || 0) / 100, n = +$('#kVade').value || 0, r = +String($('#kFaiz').value).replace(',', '.') / 100, P = i.fiyat * (1 - pes);
    $('#kSonuc').innerHTML = r > 0 && n > 0 ? `Kredi tutarı <b>${tl(P)}</b> · aylık taksit <b>${tl((P * r) / (1 - Math.pow(1 + r, -n)))}</b> · toplam geri ödeme ${tl(((P * r) / (1 - Math.pow(1 + r, -n))) * n)}<br>Peşinat ${tl(i.fiyat * pes)}. Masraf, sigorta ve vergiler dahil değildir.` : 'Bankanın güncel aylık faiz oranını yaz; taksit hesaplansın.'; };
  if ($('#krediK')) { if (typeof ilanKrediTeklifleri === 'function') ilanKrediTeklifleri(i); else ['kPes', 'kVade', 'kFaiz'].forEach((x) => ($('#' + x).oninput = kH)); }
  const oj = $('#orjBtn'); if (oj) oj.onclick = () => { const kok = $('#ilanBaslik').closest('.ic'), ac = !kok.dataset.orj, w = () => document.createTreeWalker(kok, NodeFilter.SHOW_TEXT); if (ac) { kok.dataset.orj = '1'; for (let n, d = w(); (n = d.nextNode());) if (n.__ham) { n.parentElement.dataset.cevirme = ''; n.nodeValue = n.__ham; } toast('Türkçe orijinal'); } else { delete kok.dataset.orj; for (let n, d = w(); (n = d.nextNode());) { n.parentElement.removeAttribute('data-cevirme'); if (n.__ham) n.nodeValue = n.__ham; } toast('Çeviri'); } };
  const ti = $('#tapuIste'); if (ti) ti.onclick = () => sheetAc(`<h2 style="font-size:19px;font-weight:700">Tapu doğrulaması</h2><div class="k soluk" style="line-height:1.5">İlan verme yetkin resmî kaynaktan (EİDS · e-Devlet / TKGM barkodlu belge) kontrol edilir; gerekirse seninle mesajlaşırız. Tapu belgesinin fotoğrafını yükleme, şifreni asla istemeyiz.</div>
    <label class="alan">Taşınmaz no <span style="font-weight:500">(e-Devlet → Tapu Bilgileri Sorgulama)</span><input id="tNo" maxlength="40" placeholder="örn. 34123456789"></label>
    <label class="alan">Ada / parsel ve not <span style="font-weight:500">(isteğe bağlı)</span><textarea id="tNot" maxlength="500" placeholder="örn. 1234 ada 5 parsel, kat mülkiyetli"></textarea></label><button class="btn tam" id="tGonder">Talep gönder</button>`, (s) => ($('#tGonder', s).onclick = async () => { const no = $('#tNo', s).value.trim(), nt = $('#tNot', s).value.trim(); if (no && !/^[0-9]{8,20}$/.test(no)) return toast('Taşınmaz no en az 8 haneli rakam olmalı.'); if (await dene(() => dogrulamaIste('ilan', i.id, (no ? 'Taşınmaz No: ' + no : '') + (nt ? (no ? ' · ' : '') + nt : '')), 'Talebin alındı; sonuç ilanında görünecek')) sheetKapat(); }));
  const rv = $('#randevu'); if (rv) rv.onclick = () => {
    if (girisGerek('Randevu için giriş yap')) return;
    const gun = (g) => { const d = new Date(); d.setDate(d.getDate() + g); return d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }); };
    sheetAc(`<h2 style="font-size:19px;font-weight:700">Randevu iste</h2><div class="k soluk">Gün ve saat seç; satıcıya mesaj olarak gider, o onaylar ya da başka saat önerir.</div>
      <div class="alan">Gün<div class="secim">${[1, 2, 3, 4, 5, 6].map((g) => `<button type="button" data-rg="${gun(g)}">${gun(g)}</button>`).join('')}</div></div>
      <div class="alan">Saat<div class="secim">${['10:00', '12:00', '14:00', '16:00', '18:00', '19:30'].map((s) => `<button type="button" data-rs="${s}">${s}</button>`).join('')}</div></div>
      <button class="btn tam" id="rGonder" disabled>Randevu isteği gönder</button>`, (s) => {
      const sec = { g: '', s: '' }, kontrol = () => ($('#rGonder', s).disabled = !(sec.g && sec.s));
      s.querySelectorAll('[data-rg],[data-rs]').forEach((b) => (b.onclick = () => { const k = b.dataset.rg ? 'g' : 's'; sec[k] = b.dataset.rg || b.dataset.rs; b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('secili', x === b)); kontrol(); }));
      $('#rGonder', s).onclick = async () => { const so = await dene(() => sohbetGetir(i)); if (!so) return; if (await dene(() => mesajGonder(so, { tur: 'metin', metin: `Merhaba, ilanınızı yerinde görmek istiyorum. ${sec.g}, saat ${sec.s} uygun mu?` }), 'Randevu isteğin gönderildi')) { sheetKapat(); git('#/sohbet/' + so.id); } };
    });
  };
  const sk = $('#sikayet'); if (sk) sk.onclick = () => {
    if (girisGerek('Şikayet için giriş yap')) return;
    sheetAc(`<h2 style="font-size:19px;font-weight:800">İlanı şikayet et</h2><div class="liste">${['Dolandırıcılık şüphesi', 'Yanlış fiyat / bilgi', 'Satılmış ya da kiralanmış', 'Uygunsuz içerik', 'Aynı ilan birden fazla'].map((n) => `<button class="oge" data-n="${n}">${n}<span class="ok">›</span></button>`).join('')}</div>`, (s) =>
      s.querySelectorAll('[data-n]').forEach((x) => (x.onclick = async () => { sheetKapat(); await dene(() => sikayetEt(i.id, x.dataset.n), 'Şikayetin alındı. Teşekkürler.'); })));
  };
};

// Tam ekran fotoğraf: kaydırarak gez, dokununca kapanır
function fotoGoster(l, bas = 0) {
  const el = document.createElement('div');
  el.className = 'tam-foto';
  el.innerHTML = `<div class="tf-serit">${l.map((u) => `<img src="${u}" alt="">`).join('')}</div><span class="tf-sayac">${bas + 1} / ${l.length}</span><button class="ikon-btn tf-kapat" aria-label="Kapat">${ic('kapat')}</button>`;
  document.body.appendChild(el);
  const s = el.querySelector('.tf-serit'); s.scrollLeft = s.clientWidth * bas;
  s.onscroll = () => (el.querySelector('.tf-sayac').textContent = Math.round(s.scrollLeft / s.clientWidth) + 1 + ' / ' + l.length);
  const kapat = () => { el.classList.add('cik'); setTimeout(() => el.remove(), 180); removeEventListener('hashchange', kapat); };
  el.querySelector('.tf-kapat').onclick = kapat; s.onclick = kapat; addEventListener('hashchange', kapat);
}

// Sayı ve metin alanları için dokunarak seçilebilen hazır değerler
const ONERI = {
  m2net: ['45', '60', '75', '85', '90', '100', '110', '120', '135', '150', '180', '220'], m2brut: ['55', '75', '90', '100', '110', '125', '140', '160', '180', '220', '260'],
  binaYasi: ['0', '1', '2', '3', '4', '5', '8', '10', '15', '20', '25', '30', '40'],
  kat: ['Bodrum', 'Bahçe katı', 'Giriş katı', 'Zemin', 'Yüksek giriş', '1', '2', '3', '4', '5', '6', '7', '8', '10', '12', '15', 'Çatı katı', 'Villa katı'],
  yil: Array.from({ length: 26 }, (_, n) => String(new Date().getFullYear() - n)), km: ['0', '15000', '30000', '50000', '75000', '100000', '125000', '150000', '200000', '250000'],
  katSayisi: ['1', '2', '3', '4', '5', '6', '8', '10', '12', '15', '20', '25'], aidat: ['0', '250', '500', '750', '1000', '1500', '2000', '3000', '5000'],
  renk: ['Beyaz', 'Siyah', 'Gri', 'Gümüş gri', 'Füme', 'Lacivert', 'Mavi', 'Kırmızı', 'Bordo', 'Yeşil', 'Bej', 'Kahverengi', 'Turuncu', 'Sarı'],
  model: ['Clio', 'Egea', 'Corolla', 'Megane', 'Passat', 'Golf', 'Focus', 'Civic', 'i20', 'Astra', 'Fiesta', '3 Serisi', 'C Serisi', 'Duster', 'Tucson', 'Qashqai', 'Polo', 'Linea', 'Symbol', 'Doblo']
};

// İlan gücü: fotoğraf, başlık, açıklama ve bilgilerin doluluğuna göre 0-100 ve bir sonraki öneri
function ilanGucu(t) {
  const f = t.alanlar || {}, ana = ALT[t.alt]?.ana || 'emlak', foto = (t.fotolar || []).length, acik = (t.aciklama || '').length;
  const dolu = ALANLAR[ana].filter(([k]) => f[k] !== undefined && f[k] !== '').length / ALANLAR[ana].length;
  const p = [[Math.min(foto, 8) / 8, 35, foto < 8 ? `${8 - foto} fotoğraf daha ekle` : ''], [(t.baslik || '').length >= 25 ? 1 : (t.baslik || '').length / 25, 10, (t.baslik || '').length < 25 ? 'Başlığa öne çıkan bir özellik ekle' : ''],
    [Math.min(acik, 400) / 400, 25, acik < 400 ? 'Açıklamayı uzat (MülkümAI yazabilir)' : ''], [dolu, 20, dolu < 1 ? 'Boş bilgi alanlarını doldur' : ''], [ana === 'emlak' ? (f.mahalle ? 1 : 0) : 1, 10, ana === 'emlak' && !f.mahalle ? 'Mahalle seç' : '']];
  return { puan: Math.round(p.reduce((s, [o, a]) => s + o * a, 0)), oneri: p.filter((x) => x[2]).sort((a, b) => b[1] * (1 - b[0]) - a[1] * (1 - a[0]))[0]?.[2] || 'Harika, ilanın hazır!' };
}
function gucHtml(t) {
  const g = ilanGucu(t), r = g.puan >= 80 ? 'var(--guven)' : g.puan >= 50 ? 'var(--vurgu)' : 'var(--uyari)';
  return `<div class="kart guc"><div class="satir"><b class="ara">İlan gücü</b><b style="color:${r}">${g.puan}/100</b></div><div class="guc-cubuk"><i style="width:${g.puan}%;background:${r}"></i></div><div class="k soluk">${kac(g.oneri)}</div></div>`;
}

// Keşfet: emlak haberleri (haberler edge fonksiyonu; yayıncı RSS'inden başlık + bağlantı). Oturum boyunca önbellekte.
let HABERLER = null, HABER_KAT = 'emlak';
const HABER_KATLAR = [['emlak', 'Emlak'], ['otomobil', 'Otomobil'], ['ekonomi', 'Ekonomi']];
async function haberleriYukle() {
  const k = document.getElementById('haberK'); if (!k) return;
  const ciz2 = () => {
    const el = document.getElementById('haberK'); if (!el) return;
    const v = HABERLER || {}; if (!HABER_KATLAR.some(([x]) => (v[x] || []).length)) { el.remove(); return; }
    const l = v[HABER_KAT] || [];
    const once = (t) => { const d = Math.round((Date.now() - t) / 60000); return d < 60 ? d + ' dk önce' : d < 1440 ? Math.round(d / 60) + ' sa önce' : Math.round(d / 1440) + ' gün önce'; };
    el.innerHTML = `<div class="haber-bas">${ic('belge', 18)}<b>Piyasa gündemi</b></div>
      <div class="segment haber-sekme">${HABER_KATLAR.map(([x, ad]) => `<button class="${x === HABER_KAT ? 'secili' : ''}" data-hkat="${x}">${ad}</button>`).join('')}</div>
      <div class="haber-liste">${l.length ? l.slice(0, 5).map((h) => `<button class="haber-satir" data-haber="${kac(h.link)}"><span>${kac(h.baslik)}</span><small>${kac(h.kaynak)}${h.tarih ? ' · ' + once(h.tarih) : ''}</small></button>`).join('') : '<div class="k soluk" style="padding:10px 0">Şu an haber yok.</div>'}</div>`;
    el.querySelectorAll('[data-haber]').forEach((x) => (x.onclick = () => webAc(x.dataset.haber)));
    el.querySelectorAll('[data-hkat]').forEach((x) => (x.onclick = () => { HABER_KAT = x.dataset.hkat; ciz2(); }));
  };
  if (HABERLER) return ciz2();
  try { const { data } = await sb.functions.invoke('haberler', { body: {} }); HABERLER = (data && data.kategoriler) || { emlak: (data && data.haberler) || [] }; } catch (_) { HABERLER = {}; }
  ciz2();
}
// Keşfet'te her gün değişen kısa ipucu (artık kullanılmıyor; haberler gösteriliyor)
const IPUCLARI = ['8+ fotoğraflı ilanlar çok daha fazla mesaj alıyor; ilk fotoğrafı salondan çek.', 'Kapora istemek dolandırıcılığın en yaygın işareti; görmeden ödeme yapma.', 'MülkümDeko ile boş odayı farklı stillerde döşeyip alıcıya fikir verebilirsin.', 'Değer raporu; TCMB, TÜİK, deprem ve çevre verisini tek PDF\'te toplar.', 'Kayıtlı arama oluştur; aradığın ilan gelince ilk sen gör.', 'Fiyatı benzer ilanlara göre "Uygun" görünen ilanlar daha hızlı satılıyor.', 'İlanını Excel/CSV ile toplu yükleyebilirsin: Hesabım → Emlak ofisleri için.'];

// ---------- Ofisim: kısayollar, görevler, müşteri talepleri, notlar ----------
let PANEL = null;
const telLink = (t) => String(t || '').replace(/\D/g, '').replace(/^0/, '90');
function musteriEslesen(m) {
  const v = m.veri || {};
  if (v.alan === 'vasita') return yayinda().filter((i) => i.ana === 'vasita' && (!v.marka || i.alanlar?.marka === v.marka) && (!v.il || i.il === v.il) && (!v.ilce || i.ilce === v.ilce) && (!+v.butce || i.fiyat <= +v.butce * 1.05));
  return yayinda().filter((i) => i.ana === 'emlak' && (!v.islem || i.alanlar?.islem === v.islem) && (!v.il || i.il === v.il) && (!v.ilce || i.ilce === v.ilce) && (!v.oda || i.alanlar?.oda === v.oda) && (!+v.butce || i.fiyat <= +v.butce * 1.05));
}
EKRAN.panel = async (sekme) => {
  if (girisGerek('Ofisim için giriş yap')) return;
  sekme = sekme || 'portfoy';
  const b = ben();
  if (PANEL && PANEL.sahip !== b.id) PANEL = null;
  if (!PANEL) { app.innerHTML = ustBar('Ofisim') + `<div class="ic">${bosDurum('belge', 'Yükleniyor…', '')}</div>`; try { PANEL = await panelGetir(); } catch (x) { toast(hataMetni(x)); PANEL = []; } PANEL.sahip = b.id; gorevHatirlatKur(); if (!location.hash.startsWith('#/panel')) return; }
  const benim = S.ilanlar.filter((i) => i.sahip === b.id), aktif = benim.filter((i) => i.durum === 'yayinda');
  const gorevler = PANEL.filter((k) => k.tur === 'gorev'), musteriler = PANEL.filter((k) => k.tur === 'musteri'), notlar = PANEL.filter((k) => k.tur === 'not');
  const bugunSon = new Date(); bugunSon.setHours(23, 59, 59, 999);
  const bekleyen = gorevler.filter((g) => !g.tamam).sort((x, y) => new Date(x.tarih || 8.64e15) - new Date(y.tarih || 8.64e15));
  const bugun = bekleyen.filter((g) => g.tarih && new Date(g.tarih) <= bugunSon).length;
  const mesaj = S.sohbetler.filter((s) => s.satici === b.id && s.mesajlar.length).length;
  const tarihY = (t) => t ? new Date(t).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Tarihsiz';
  const kisa = (h, ik, ad) => `<a class="kisayol" href="${h}"><span>${ic(ik, 20)}</span>${ad}</a>`;
  let govde = '';
  if (sekme === 'portfoy') {
    const dur = sorgu().d === 'satildi' ? 'satildi' : 'yayinda', l = benim.filter((i) => i.durum === dur).sort((x, y) => y.olusturma - x.olusturma);
    govde = `<div class="ciplar"><a class="cip ${dur === 'yayinda' ? 'secili' : ''}" href="#/panel/portfoy">Yayında · ${aktif.length}</a><a class="cip ${dur === 'satildi' ? 'secili' : ''}" href="#/panel/portfoy?d=satildi">Satıldı / kiralandı · ${benim.length - aktif.length}</a><a class="cip" href="#/ver">${ic('arti', 14)}Yeni ilan</a></div>
      ${l.length ? l.map((i) => `<div style="display:flex;flex-direction:column;gap:6px">${ilanSatir(i, `<div class="perf"><span>${ic('goz', 12)} ${i.goruntulenme || 0}</span><span>${ic('kalp', 12)} ${(S.favSayilari || {})[i.id] || 0}</span><span>${ic('mesaj', 12)} ${S.sohbetler.filter((s) => s.ilanId === i.id && s.mesajlar.length).length}</span><span>${Math.max(1, Math.round((Date.now() - i.olusturma) / 86400000))}. gün</span></div>`)}</div>`).join('') : bosDurum('ev', dur === 'yayinda' ? 'Portföyün boş' : 'Kapanan ilan yok', dur === 'yayinda' ? 'İlan ver ya da toplu yükle; portföyün burada listelenir.' : 'Satılan ve kiralanan ilanların burada görünür.', dur === 'yayinda' ? '<a class="btn" href="#/ver">İlan ver</a><a class="btn cizgili" href="#/toplu">Toplu yükle</a>' : '')}`;
  } else if (sekme === 'gorev') govde = ajandaHtml(gorevler);
  else if (sekme === 'musteri') { const malS = sorgu().m === 'mal', ms = musteriler.filter((m) => (m.veri.rol === 'Mal sahibi') === malS); govde = `<div class="ciplar"><a class="cip ${malS ? '' : 'secili'}" href="#/panel/musteri">Arayanlar · ${musteriler.filter((m) => m.veri.rol !== 'Mal sahibi').length}</a><a class="cip ${malS ? 'secili' : ''}" href="#/panel/musteri?m=mal">${b.sektor === 'galeri' ? 'Araç sahipleri (stok)' : 'Mal sahipleri (portföy)'} · ${musteriler.filter((m) => m.veri.rol === 'Mal sahibi').length}</a></div>
    <button class="btn tam" data-yeni="musteri">${ic('arti', 18)}${malS ? (b.sektor === 'galeri' ? 'Araç sahibi ekle' : 'Mal sahibi ekle') : b.sektor === 'galeri' ? 'Alıcı ekle' : 'Alıcı / kiracı ekle'}</button>
    ${ms.length ? `<div class="liste">${ms.map((m) => { const v = m.veri, mal = v.rol === 'Mal sahibi', e = mal ? 0 : musteriEslesen(m).length, il = v.ilan && ilan(v.ilan); return `<div class="oge panel-oge" style="align-items:flex-start"><div class="ara" data-duzen="${m.id}"><b>${kac(v.ad)}</b><div class="k soluk">${kac([v.mulk, v.marka, v.islem, v.oda, [v.ilce, v.il].filter(Boolean).join(' / '), +v.butce ? '≤ ' + tl(+v.butce) : ''].filter(Boolean).join(' · '))}</div>${mal ? (il ? `<a class="k" href="#/ilan/${il.id}" style="font-weight:700">İlanı: ${kac(il.baslik.slice(0, 30))} →</a>` : `<a class="k" href="#/ver" style="font-weight:700">Portföye ilan olarak ekle →</a>`) : e ? `<a class="k" href="#/ara?${sorguYap(v.alan === 'vasita' ? { ana: 'vasita', marka: v.marka, il: v.il, ilce: v.ilce, max: v.butce } : { ana: 'emlak', islem: v.islem, il: v.il, ilce: v.ilce, oda: v.oda, max: v.butce })}" style="font-weight:700">${e} uygun ilan →</a>` : '<div class="k soluk">Şu an uygun ilan yok</div>'}</div>
      ${v.tel ? `<div class="satir" style="gap:6px"><a class="ikon-btn" href="tel:${kac(v.tel)}" aria-label="Ara">${ic('telefon', 18)}</a><a class="ikon-btn" href="https://wa.me/${telLink(v.tel)}" aria-label="WhatsApp">${ic('mesaj', 18)}</a></div>` : ''}</div>`; }).join('')}</div>` : (malS ? bosDurum('ev', 'Mal sahibi yok', 'Satmak ya da kiralamak için sana mülk veren müşterilerini kaydet; mülk bilgisi ve ilanı burada bir arada durur.', typeof ornekVarMi === 'function' && !ornekVarMi() ? '<button class="btn cizgili" data-ornek-yukle>Örnek verilerle dene</button>' : '') : bosDurum('kisi', 'Arayan müşteri yok', 'Alıcı ve kiracıların ne aradığını kaydet; uygun ilan gelince burada sayısını görürsün.', typeof ornekVarMi === 'function' && !ornekVarMi() ? '<button class="btn cizgili" data-ornek-yukle>Örnek verilerle dene</button>' : ''))}
    <div class="k soluk">Müşteri bilgileri yalnız sana görünür. Kişisel verileri müşterinin onayıyla kaydet (KVKK).</div>`; }
  else govde = `<button class="btn tam" data-yeni="not">${ic('arti', 18)}Not ekle</button>
    ${notlar.length ? `<div class="liste">${notlar.map((n) => `<div class="oge panel-oge"><div class="ara" data-duzen="${n.id}"><div style="white-space:pre-wrap;line-height:1.5">${kac(n.veri.metin)}</div><div class="k soluk">${new Date(n.olusturma).toLocaleDateString('tr-TR')}</div></div></div>`).join('')}</div>` : bosDurum('kalem', 'Not yok', 'Portföy, mal sahibi görüşmeleri ve fiyat pazarlıkları için kısa notlar.', typeof ornekVarMi === 'function' && !ornekVarMi() ? '<button class="btn cizgili" data-ornek-yukle>Örnek verilerle dene</button>' : '')}`;
  app.innerHTML = ustBar('Ofisim', '', false) + `<div class="ic">
    <div class="panel-ozet">
      <a href="#/panel/portfoy"><b>${sayiBicim(aktif.reduce((s, i) => s + (i.goruntulenme || 0), 0))}</b><span>Görüntülenme</span></a>
      <a href="#/mesajlar"><b>${mesaj}</b><span>Sohbet</span></a>
      <a href="#/panel/gorev"><b style="${bugun ? 'color:var(--vurgu-koyu)' : ''}">${bugun}</b><span>Bugün ajandada</span></a>
    </div>
    <div class="kisayollar dortlu renkli">${kisa('#/ver', 'arti', 'İlan ver')}${kisa('#/toplu', 'indir', 'Toplu aktarım')}${kisa('#/performans', 'grafik', 'Performans')}<button class="kisayol" id="pDavet"><span>${ic('davet', 20)}</span>Davet et</button></div>
    <div class="segment dort" role="tablist">${[['portfoy', 'Portföy', aktif.length], ['gorev', 'Ajanda', bekleyen.length], ['musteri', 'Müşteriler', musteriler.length], ['not', 'Notlar', notlar.length]].map(([k, a, n]) => `<button role="tab" class="${sekme === k ? 'secili' : ''}" data-sekme="${k}">${a}${n ? ` · ${n}` : ''}</button>`).join('')}</div>
    ${govde}</div>`;
  navCiz('ofis');
  $('#pDavet').onclick = () => paylas(davetMetni());
  app.querySelectorAll('[data-sekme]').forEach((x) => (x.onclick = () => git('#/panel/' + x.dataset.sekme)));
  app.querySelectorAll('[data-tamam]').forEach((x) => (x.onclick = async () => { const k = PANEL.find((y) => y.id === x.dataset.tamam); const r = await dene(() => panelKaydet({ ...k, tamam: !k.tamam })); if (r) { Object.assign(k, r); if (r.tamam) kutla(); ciz(); gorevHatirlatKur(); } }));
  app.querySelectorAll('[data-yeni]').forEach((x) => (x.onclick = () => panelForm({ tur: x.dataset.yeni, veri: x.dataset.yeni === 'musteri' ? { rol: sorgu().m === 'mal' ? 'Mal sahibi' : 'Alıcı / kiracı' } : {} })));
  app.querySelectorAll('[data-duzen]').forEach((x) => (x.onclick = (e) => { if (e.target.closest('a')) return; panelForm(PANEL.find((y) => y.id === x.dataset.duzen)); }));
  if (typeof ajandaBagla === 'function') ajandaBagla();
};
function panelForm(k) {
  const v = k.veri || {}, tarihYerel = k.tarih ? new Date(new Date(k.tarih).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
  const secim = (ad, ops) => `<div class="secim">${ops.map((o) => `<button type="button" class="${v[ad] === o ? 'secili' : ''}" data-ps="${ad}" data-d="${kac(o)}">${kac(o)}</button>`).join('')}</div><input type="hidden" name="${ad}" value="${kac(v[ad] || '')}">`;
  const benim = S.ilanlar.filter((i) => i.sahip === S.oturum && i.durum === 'yayinda');
  const arac = k.tur === 'musteri' && (v.alan ? v.alan === 'vasita' : ben()?.sektor === 'galeri');
  const form = k.tur === 'gorev' ? `<label class="alan">Ne yapılacak?<input name="baslik" required maxlength="120" value="${kac(v.baslik || '')}" list="gorevOn" autocomplete="off"><datalist id="gorevOn">${(ben()?.sektor === 'galeri' ? ['Araç gösterme', 'Test sürüşü', 'Müşteri araması', 'Ekspertiz randevusu', 'Noter satışı', 'Fotoğraf çekimi', 'Araç teslimi', 'Muayene / sigorta'] : ['Yer gösterme', 'Müşteri araması', 'Mal sahibiyle görüşme', 'Tapu randevusu', 'Ekspertiz', 'Fotoğraf çekimi', 'Sözleşme imzası', 'Kira tahsilatı']).map((o) => `<option value="${o}">`).join('')}</datalist></label>
      <label class="alan">Tarih ve saat<input type="datetime-local" name="tarih" value="${tarihYerel}"></label>
      <div class="ciplar">${[['Bugün 18:00', 0, 18], ['Yarın 10:00', 1, 10], ['Yarın 14:00', 1, 14], ['Haftaya', 7, 10]].map(([a, g, s]) => `<button type="button" class="cip" data-hizli="${g},${s}">${a}</button>`).join('')}</div>
      <label class="alan">Müşteri <span style="font-weight:500">(isteğe bağlı)</span><input name="musteri" maxlength="80" value="${kac(v.musteri || '')}" list="musOn" autocomplete="off"><datalist id="musOn">${PANEL.filter((x) => x.tur === 'musteri').map((m) => `<option value="${kac(m.veri.ad)}">`).join('')}</datalist></label>
      <label class="alan">Hatırlat<select name="hatirlat">${AJANDA_HATIRLAT.map(([m, ad]) => `<option value="${m}" ${+(v.hatirlat || 30) === m ? 'selected' : ''}>${ad}</option>`).join('')}</select></label>
      <label class="alan">Not <span style="font-weight:500">(isteğe bağlı)</span><input name="not" maxlength="300" value="${kac(v.not || '')}"></label>
      ${benim.length ? `<label class="alan">İlgili ilan <span style="font-weight:500">(isteğe bağlı)</span><select name="ilan"><option value="">—</option>${benim.map((i) => `<option value="${i.id}" ${v.ilan === i.id ? 'selected' : ''}>${kac(i.baslik)}</option>`).join('')}</select></label>` : ''}`
    : k.tur === 'musteri' ? `<div class="alan">Müşteri türü${secim('rol', ['Alıcı / kiracı', 'Mal sahibi'])}</div>
      <label class="alan">Ad soyad<input name="ad" required maxlength="80" value="${kac(v.ad || '')}"></label>
      <label class="alan">Telefon<input name="tel" type="tel" maxlength="20" value="${kac(v.tel || '')}"></label>
      <div class="alan">İşlem${secim('islem', ['Satılık', 'Kiralık'])}</div>
      ${arac ? `<input type="hidden" name="alan" value="vasita"><div class="alan">Araç türü${secim('mulk', ['Otomobil', 'SUV / Pick-up', 'Ticari', 'Motosiklet'])}</div>
      <label class="alan">Marka<select name="marka"><option value="">Farketmez</option>${(MARKALAR.includes(v.marka) || !v.marka ? MARKALAR : [v.marka, ...MARKALAR]).map((x) => `<option ${v.marka === x ? 'selected' : ''}>${kac(x)}</option>`).join('')}</select></label>` : `<div class="alan">Mülk türü${secim('mulk', ['Daire', 'Villa', 'Arsa', 'İşyeri'])}</div>
      <div class="alan">Oda${secim('oda', ['1+1', '2+1', '3+1', '4+1', '5+1'])}</div>`}
      <div class="izgara2"><label class="alan">İl<select name="il"><option value="">—</option>${ILLER.map((x) => `<option ${v.il === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label class="alan">İlçe<select name="ilce"><option value="">—</option>${v.ilce ? `<option selected>${kac(v.ilce)}</option>` : ''}</select></label></div>
      <label class="alan">Bütçe ya da beklenen fiyat (TL)<input name="butce" inputmode="numeric" value="${+v.butce ? sayiBicim(+v.butce) : ''}" list="butceOn" autocomplete="off"><datalist id="butceOn">${['15.000', '25.000', '2.000.000', '3.000.000', '5.000.000', '7.500.000', '10.000.000'].map((o) => `<option value="${o}">`).join('')}</datalist></label>
      ${benim.length ? `<label class="alan">Portföydeki ilanı <span style="font-weight:500">(mal sahibiyse)</span><select name="ilan"><option value="">—</option>${benim.map((i) => `<option value="${i.id}" ${v.ilan === i.id ? 'selected' : ''}>${kac(i.baslik)}</option>`).join('')}</select></label>` : ''}
      <label class="alan">Not<textarea name="not" maxlength="1000">${kac(v.not || '')}</textarea></label>`
    : `<label class="alan">Not<textarea name="metin" required maxlength="3000" style="min-height:160px">${kac(v.metin || '')}</textarea></label>`;
  sheetAc(`<h2 style="font-size:19px;font-weight:700">${k.id ? 'Düzenle' : k.tur === 'gorev' ? 'Ajandaya ekle' : k.tur === 'musteri' ? 'Yeni müşteri' : 'Yeni not'}</h2>
    <form id="pf2" class="ic" style="padding:0">${form}<div class="izgara2">${k.id ? '<button type="button" class="btn tehlike" id="pSil">Sil</button>' : '<span></span>'}<button class="btn">Kaydet</button></div></form>`, (s) => {
    s.querySelectorAll('[data-ps]').forEach((b) => (b.onclick = () => { const g = s.querySelector(`[name="${b.dataset.ps}"]`), ayni = g.value === b.dataset.d; g.value = ayni ? '' : b.dataset.d; b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('secili', !ayni && x === b)); }));
    s.querySelectorAll('[data-hizli]').forEach((b) => (b.onclick = () => { const [g, sa] = b.dataset.hizli.split(',').map(Number), d = new Date(); d.setDate(d.getDate() + g); d.setHours(sa, 0, 0, 0); s.querySelector('[name=tarih]').value = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }));
    if (s.querySelector('[name=ilce]')) konumSecBagla(s.querySelector('[name=il]'), s.querySelector('[name=ilce]'), null);
    const bt = s.querySelector('[name=butce]'); if (bt) bt.oninput = () => { const n = bt.value.replace(/\D/g, ''); bt.value = n ? sayiBicim(+n) : ''; };
    const sl = s.querySelector('#pSil'); if (sl) sl.onclick = async () => { if (!sl.dataset.emin) { sl.dataset.emin = '1'; sl.textContent = 'Emin misin? Sil'; setTimeout(() => { if (sl.isConnected) { delete sl.dataset.emin; sl.textContent = 'Sil'; } }, 4000); return; } if (await dene(() => panelSil(k.id), 'Silindi')) { const s0 = PANEL.sahip; PANEL = PANEL.filter((x) => x.id !== k.id); PANEL.sahip = s0; sheetKapat(); ciz(); } };
    s.querySelector('#pf2').onsubmit = async (e) => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
      const tarih = f.tarih ? new Date(f.tarih).toISOString() : null; delete f.tarih;
      if (f.butce) f.butce = f.butce.replace(/\D/g, '');
      const r = await dene(() => panelKaydet({ id: k.id, tur: k.tur, veri: f, tarih: k.tur === 'gorev' ? tarih : null, tamam: k.tamam }), 'Kaydedildi');
      if (r) { const s0 = PANEL.sahip; PANEL = k.id ? PANEL.map((x) => (x.id === r.id ? r : x)) : [r, ...PANEL]; PANEL.sahip = s0; sheetKapat(); ciz(); if (k.tur === 'gorev' && tarih) await bildirimIzni(true); gorevHatirlatKur(); }
    };
  });
}

// Google ile üye olurken "Emlak ofisi" seçildiyse yeni hesabı ofis yap ve firma bilgisine yönlendir
async function kayitTuruUygula() {
  let tur = null; try { tur = localStorage.getItem('kayitTuru'); localStorage.removeItem('kayitTuru'); } catch (_) {}
  const b = ben(); if (!['ofis', 'emlak', 'galeri'].includes(tur) || !b || b.ofis || Date.now() - b.olusturma > 15 * 60000) return;
  if (await dene(() => hesapTuruYap(true, tur === 'galeri' ? 'galeri' : 'emlak'))) { toast('Kurumsal hesabın hazır; firma bilgilerini tamamla'); git('#/profil'); davetUygula(); }
}
// Davet kodu (kayıtta yazıldıysa) ilk oturumda bir kez kullanılır: yeni ofise ve davet edene 3'er kredi
async function davetUygula(kod) {
  try { kod = kod || localStorage.getItem('davetKodu'); } catch (_) {}
  if (!kod || !ben()) return false;
  try {
    const d = await islem(sb.rpc('davet_kullan', { p_kod: kod }));
    try { localStorage.removeItem('davetKodu'); } catch (_) {}
    if (d && d.kredi != null) ben().kredi = d.kredi;
    toast('Davet hediyesi: 3 kredi hesabına yüklendi'); return true;
  } catch (x) {
    if (!/giriş/.test(x.message)) { try { localStorage.removeItem('davetKodu'); } catch (_) {} }
    toast(hataMetni(x)); return false;
  }
}
const davetMetni = () => DAVET_METNI + `\nDavet kodum: ${(ben()?.id || '').slice(0, 8).toUpperCase()} (üye olurken Davet kodu kutusuna yaz; ikimize de 3 kredi)`;

// ---------- Emlak ofisleri: davet ve toplu ilan yükleme ----------
const DAVET_METNI = `Merhaba, evini, arsanı ya da aracını Mülküm360'ta ücretsiz ilan verebilirsin.
• Başka sitedeki ilanını bağlantıyla aktar, MülkümAI açıklamasını yazsın
• Evinin ya da aracının değerini ücretsiz öğren (TCMB, TÜİK ve TSB kasko verisiyle)
• PDF değer raporu (yeni üyeye 1 rapor hediye)
• Emlak ofisleri ve galeriler için kurumsal profil, toplu ilan yükleme ve ajanda
Uygulama: https://fatihcalis07-commits.github.io/mulkum360/`;

// Excel'in "CSV olarak kaydet" çıktısı: ; ya da , ayraçlı, tırnaklı alanlar desteklenir
function csvOku(metin) {
  metin = metin.replace(/^﻿/, '');
  const ilk = metin.split('\n')[0], ayrac = (ilk.match(/;/g) || []).length > (ilk.match(/,/g) || []).length ? ';' : ilk.includes('\t') ? '\t' : ',';
  const satirlar = []; let s = [], h = '', tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) { if (c === '"' && metin[i + 1] === '"') { h += '"'; i++; } else if (c === '"') tirnak = false; else h += c; }
    else if (c === '"') tirnak = true;
    else if (c === ayrac) { s.push(h.trim()); h = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && metin[i + 1] === '\n') i++; s.push(h.trim()); h = ''; if (s.some(Boolean)) satirlar.push(s); s = []; }
    else h += c;
  }
  s.push(h.trim()); if (s.some(Boolean)) satirlar.push(s);
  return satirlar;
}
// Portalların dışa aktarma başlıkları farklı; yaygın adlar alanlara eşlenir
const SUTUN = { baslik: ['başlık', 'baslik', 'ilan başlığı', 'title'], fiyat: ['fiyat', 'fiyatı', 'price', 'tutar'], il: ['il', 'şehir', 'sehir', 'city'], ilce: ['ilçe', 'ilce', 'district'], mahalle: ['mahalle', 'semt / mahalle', 'neighbourhood'],
  islem: ['işlem', 'islem', 'ilan tipi', 'satılık/kiralık', 'emlak tipi'], tip: ['tip', 'konut tipi', 'kategori'], oda: ['oda', 'oda sayısı', 'oda sayisi', 'rooms'], m2brut: ['brüt m2', 'm² (brüt)', 'brut m2', 'brüt m²'], m2net: ['net m2', 'm² (net)', 'net m²', 'm2'],
  binaYasi: ['bina yaşı', 'bina yasi'], kat: ['bulunduğu kat', 'kat'], isitma: ['ısıtma', 'isitma'], aciklama: ['açıklama', 'aciklama', 'description'], no: ['ilan no', 'ilan numarası', 'ilan no.', 'no', 'referans', 'ref no'] };
// XML etiket adları (ofis yazılımları, ilan portalı beslemeleri, OpenImmo) aynı alanlara eklenir
[['baslik', ['ilan_basligi', 'ilanbasligi', 'baslik', 'objekttitel', 'headline']], ['fiyat', ['fiyat', 'price', 'ilan_fiyati', 'satis_fiyati', 'kaufpreis', 'kaltmiete', 'warmmiete', 'nettokaltmiete', 'amount']],
  ['il', ['il', 'sehir', 'şehir', 'city', 'province', 'il_adi', 'bundesland', 'state', 'region']], ['ilce', ['ilce', 'ilçe', 'district', 'county', 'town', 'ilce_adi', 'ort']], ['mahalle', ['mahalle', 'semt', 'neighborhood', 'neighbourhood', 'mahalle_adi', 'regionaler_zusatz']],
  ['islem', ['islem', 'işlem', 'ilan_tipi', 'listing_type', 'satis_tipi', 'offer_type']], ['tip', ['tip', 'emlak_tipi', 'konut_tipi', 'kategori', 'property_type', 'objektart']], ['oda', ['oda', 'oda_sayisi', 'odasayisi', 'rooms', 'room_count', 'anzahl_zimmer']],
  ['m2brut', ['brut_m2', 'brutm2', 'm2_brut', 'gross_area', 'gross_m2']], ['m2net', ['net_m2', 'netm2', 'm2_net', 'net_area', 'area', 'size', 'm2', 'wohnflaeche', 'nutzflaeche']], ['binaYasi', ['bina_yasi', 'binayasi', 'building_age']],
  ['kat', ['bulundugu_kat', 'kat', 'floor', 'etage']], ['isitma', ['isitma', 'ısıtma', 'heating', 'heizungsart']], ['aciklama', ['aciklama', 'açıklama', 'description', 'objektbeschreibung', 'detail', 'details']],
  ['no', ['ilan_no', 'ilanno', 'ilan_id', 'listing_id', 'ref', 'referans', 'objektnr_extern', 'objektnr_intern', 'id']]].forEach(([k, l]) => l.forEach((x) => SUTUN[k].includes(x) || SUTUN[k].push(x)));

// XML besleme: tekrar eden kayıt öğesini bulur, her kaydı düz anahtar→değer satırına çevirir.
// OpenImmo (<immobilie>) dahil. Fotoğraf bağlantıları (jpg/png/webp) ayrıca toplanır.
function xmlOku(metin) {
  const doc = new DOMParser().parseFromString(metin.replace(/^﻿/, ''), 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('XML dosyası okunamadı.');
  const say = {};
  doc.querySelectorAll('*').forEach((e) => { if ([...e.children].some((c) => c.children.length === 0 && c.textContent.trim())) say[e.tagName] = (say[e.tagName] || 0) + 1; });
  const tercih = ['immobilie', 'ilan', 'listing', 'property', 'item', 'emlak', 'advert', 'ad', 'realty'];
  const aday = Object.entries(say).filter(([, n]) => n >= 1).sort((a, b) => (tercih.includes(kucuk(b[0])) - tercih.includes(kucuk(a[0]))) || b[1] - a[1]);
  if (!aday.length) throw new Error('XML içinde ilan bulunamadı.');
  // Kayıt öğesi: tercih edilen ad ya da en çok tekrar eden; iç içe alt öğe değil, en dıştaki
  // Bilinen kayıt adı belgede varsa (OpenImmo'da <immobilie> doğrudan değer taşımaz) o seçilir
  const bilinen = tercih.find((t) => [...doc.getElementsByTagName('*')].some((e) => kucuk(e.tagName) === t && e.children.length > 1));
  let ad = bilinen ? [...doc.getElementsByTagName('*')].find((e) => kucuk(e.tagName) === bilinen).tagName : aday[0][0]; const kayitlar = [...doc.getElementsByTagName(ad)].filter((e) => !e.parentElement || e.parentElement.closest(ad) === null);
  const anahtar = (s) => kucuk(String(s)).replace(/^.*:/, '').replace(/[\s-]+/g, '_');
  const satirlar = kayitlar.map((k) => {
    const o = {}, resim = [];
    const gez = (e) => {
      [...e.attributes].forEach((a) => { const v = a.value.trim(); if (/^https?:\/\/\S+\.(jpe?g|png|webp)(\?\S*)?$/i.test(v)) resim.push(v); else if (!o[anahtar(a.name)]) o[anahtar(a.name)] = v; });
      if (!e.children.length) {
        const v = e.textContent.trim(); if (!v) return;
        if (/^https?:\/\/\S+\.(jpe?g|png|webp)(\?\S*)?$/i.test(v) || (/^https?:\/\//.test(v) && /resim|foto|image|picture|photo|pfad|img/i.test(e.tagName))) resim.push(v);
        else if (!o[anahtar(e.tagName)]) o[anahtar(e.tagName)] = v;
      } else [...e.children].forEach(gez);
    };
    gez(k);
    // OpenImmo: <vermarktungsart KAUF="true"/> ya da fiyat etiketinden işlem
    if (!o.islem) o.islem = o.kauf === 'true' || o.kaufpreis ? 'Satılık' : o.miete_pacht === 'true' || o.kaltmiete || o.warmmiete ? 'Kiralık' : '';
    return { o, resim: [...new Set(resim)].slice(0, FOTO_SINIR) };
  });
  const bas = [...new Set(satirlar.flatMap((s) => Object.keys(s.o)))];
  return { bas, satirlar: satirlar.map((s) => bas.map((b) => s.o[b] || '')), resimler: satirlar.map((s) => s.resim), kayit: ad };
}
// Bağlantıdaki fotoğrafı indirip yükleme için dosyaya çevirir (izin vermeyen sunucuda atlanır)
async function urlDosya(u) {
  const ad = u.split('/').pop().split('?')[0] || 'foto.jpg';
  // Telefonda yerel HTTP (tarayıcı CORS kısıtına takılmaz); web sürümünde normal fetch
  const H = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp;
  if (H) {
    const r = await H.request({ url: u, method: 'GET', responseType: 'blob', connectTimeout: 15000, readTimeout: 20000 });
    if (r.status < 200 || r.status >= 300 || !r.data) throw new Error('foto');
    const tur = (r.headers && (r.headers['Content-Type'] || r.headers['content-type'])) || 'image/jpeg';
    if (!/^image\//.test(tur)) throw new Error('foto');
    const ikili = atob(String(r.data).replace(/^data:[^,]+,/, '')), b = new Uint8Array(ikili.length);
    for (let i = 0; i < ikili.length; i++) b[i] = ikili.charCodeAt(i);
    if (b.length > 15e6) throw new Error('foto');
    return new File([b], ad, { type: tur.split(';')[0] });
  }
  const r = await fetch(u, { signal: AbortSignal.timeout(15000) }); if (!r.ok) throw new Error('foto');
  const b = await r.blob(); if (!/^image\//.test(b.type) || b.size > 15e6) throw new Error('foto');
  return new File([b], ad, { type: b.type });
}
// Tamamı büyük harf başlık ("YENİGÜNDE 2+1 GENİŞ DAİRE") → normal yazım ("Yenigünde 2+1 geniş daire"); kısa kısaltmalar (AVM, TL) korunur
function buyukHarfDuzelt(s) {
  s = String(s || '').trim(); const h = s.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '');
  if (h.length < 8 || h.replace(/[^A-ZÇĞİÖŞÜ]/g, '').length / h.length < 0.7) return s;
  const k = s.toLocaleLowerCase('tr-TR').replace(/\b(avm|tl|m2|wc|tem|e-5|e5)\b/gi, (x) => x.toLocaleUpperCase('tr-TR'));
  return k.charAt(0).toLocaleUpperCase('tr-TR') + k.slice(1);
}
function satirIlan(bas, r) {
  // Sütun sırası SUTUN listesindeki önceliğe göre: önce daha belirgin ad, dolu olan alınır
  const al = (k) => { for (const ad of SUTUN[k]) { const n = bas.indexOf(ad); if (n >= 0 && (r[n] || '').trim()) return r[n].trim(); } return ''; };
  const islemHam = kucuk(al('islem')), tipHam = al('tip'), fiyat = sayiCoz(al('fiyat').replace(/\.00?$|,00?$/, ''));
  const alt = /arsa|tarla|bağ|bahçe/i.test(tipHam) ? 'arsa' : /dükkan|ofis|depo|işyeri|iş yeri/i.test(tipHam) ? 'isyeri' : /yazlık/i.test(tipHam) ? 'yazlik' : 'konut';
  const il = ILLER.find((x) => kucuk(x) === kucuk(al('il'))) || '';
  const alanlar = { islem: islemHam.includes('kira') ? 'Kiralık' : islemHam.includes('devren') ? 'Devren' : 'Satılık' };
  ['oda', 'kat', 'isitma', 'mahalle'].forEach((k) => al(k) && (alanlar[k] = al(k)));
  ['m2brut', 'm2net', 'binaYasi'].forEach((k) => { const v = al(k).replace(/[^\d]/g, ''); if (v) alanlar[k] = v; });
  if (tipHam && ALANLAR.emlak[0][3].includes(tipHam)) alanlar.tip = tipHam;
  let baslik = buyukHarfDuzelt(al('baslik')).slice(0, 80);
  if (baslik.length < 10) baslik = [alanlar.oda, alanlar.islem, tipHam || 'Daire', al('ilce')].filter(Boolean).join(' ').slice(0, 80);
  const hata = !(fiyat > 0) ? 'fiyat yok' : !il ? 'il tanınmadı' : baslik.length < 10 ? 'başlık kısa' : '';
  return { no: al('no').replace(/\s/g, ''), t: { alt, baslik, fiyat, il, ilce: al('ilce'), aciklama: al('aciklama').slice(0, 3000), alanlar, fotolar: [] }, hata };
}
EKRAN.toplu = () => {
  if (girisGerek('Toplu yükleme için giriş yap')) return;
  app.innerHTML = ustBar('Toplu ilan aktarımı') + `<div class="ic">
    <a class="kart satir" href="#/yardim" style="text-decoration:none;color:inherit">${ic('belge', 22, 'var(--vurgu-ikon)')}<div class="ara"><b>Adım adım rehber</b><div class="k soluk">Toplu yükleme nasıl yapılır, madde madde</div></div><span class="ok">›</span></a>
    <div class="kart"><b>XML ile (önerilen)</b><div class="k soluk" style="line-height:1.6">Ofis yazılımın ya da portal panelin ilanlarını <b>XML</b> olarak verebiliyorsa (ilan besleme, OpenImmo) o dosyayı seç. Başlık, fiyat, konum, özellikler, açıklama ve fotoğraf bağlantıları otomatik alınır.</div></div>
    <div class="kart"><b>Excel / CSV ile</b><div class="k soluk" style="line-height:1.6">1. Portalın kurumsal panelinden ilan listeni Excel olarak dışa aktar.<br>2. Excel'de <b>Farklı kaydet → CSV</b> seç.<br>3. Fotoğrafların adını ilan numarasıyla başlat: <b>1326396201_1.jpg</b>, <b>1326396201_2.jpg</b>… (CSV'de "İlan No" sütunu olmalı).<br>4. CSV ile fotoğrafları <b>birlikte</b> seç; her fotoğraf kendi ilanına eklenir (ilan başına en çok 40).</div></div>
    <div class="k soluk" style="margin:4px 2px 10px">Yalnız kendi ilanlarını ve fotoğraflarını yükle. Şimdilik yalnız Türkiye'deki ilanlar yayınlanabilir.</div>
    <label class="btn tam">${ic('belge', 18, '#fff')}XML / CSV ve fotoğrafları seç<input type="file" id="csv" accept=".xml,text/xml,application/xml,.csv,text/csv,.txt,image/*" multiple hidden></label>
    <div id="onizle"></div></div>`;
  navCiz('hesap');
  $('#csv').onchange = async (e) => {
    const dosyalar = [...e.target.files], d = dosyalar.find((f) => /\.(xml|csv|txt)$/i.test(f.name) || /xml|csv|text/.test(f.type));
    if (!d) return toast('Seçimde bir XML ya da CSV dosyası olmalı.');
    const metin = await d.text(), xml = /\.xml$/i.test(d.name) || /^\s*(﻿)?<\?xml|^\s*</.test(metin);
    // Fotoğraflar adlarının başındaki ilan numarasına göre gruplanır: 1326396201_2.jpg
    const resimler = dosyalar.filter((f) => f !== d && /^image\//.test(f.type)).sort((a, b) => a.name.localeCompare(b.name, 'tr', { numeric: true }));
    const fotoGrubu = (no) => (no ? resimler.filter((f) => f.name.split(/[_\-. ]/)[0] === no) : []).slice(0, FOTO_SINIR);
    let bas, govde, urlResim = [];
    if (xml) {
      let x; try { x = xmlOku(metin); } catch (h) { return toast(h.message); }
      bas = x.bas; govde = x.satirlar; urlResim = x.resimler;
    } else {
      const satir = csvOku(metin);
      if (satir.length < 2) return toast('Dosyada ilan satırı bulunamadı.');
      bas = satir[0].map((b) => kucuk(b).replace(/\s+/g, ' ').trim()); govde = satir.slice(1);
    }
    if (!govde.length) return toast('Dosyada ilan bulunamadı.');
    const l = govde.slice(0, 100).map((r, n) => {
      const x = satirIlan(bas, r);
      // CSV ile gelen ilan metninde Türkçe olmayan değerler olabilir: sayı ve seçenekler normalize edilir
      const tipSec = ALANLAR.emlak.find(([k]) => k === 'tip')[3], odaSec = ALANLAR.emlak.find(([k]) => k === 'oda')[3];
      if (!x.t.alanlar.tip) { const t = secenekBul(tipSec, (r[bas.findIndex((b) => SUTUN.tip.includes(b))] || '')); if (t) x.t.alanlar.tip = t; }
      // Yalnız sayı gelen oda (OpenImmo "4" = salon dahil) → 3+1
      if (/^\d+(\.0)?$/.test(x.t.alanlar.oda || '')) { const o = parseInt(x.t.alanlar.oda, 10); x.t.alanlar.oda = o <= 1 ? 'Stüdyo (1+0)' : o >= 7 ? '6+ oda' : `${o - 1}+1`; }
      if (x.t.alanlar.oda) x.t.alanlar.oda = secenekBul(odaSec, x.t.alanlar.oda) || x.t.alanlar.oda;
      x.t.aciklama = aciklamaSec(x.t.aciklama, '');
      x.resim = fotoGrubu(x.no); x.url = (urlResim[n] || []).slice(0, Math.max(0, FOTO_SINIR - x.resim.length));
      return x;
    }), iyi = l.filter((x) => !x.hata);
    const eslesen = l.reduce((s, x) => s + x.resim.length, 0), urlSay = l.reduce((s, x) => s + x.url.length, 0);
    $('#onizle').innerHTML = `<div class="kart"><b>${l.length} ilan okundu · ${iyi.length} ilan yüklenmeye hazır</b>${xml ? '<div class="k soluk">Biçim: XML</div>' : ''}${resimler.length ? `<div class="k soluk">${resimler.length} fotoğraftan ${eslesen} tanesi ilanlarla eşleşti.</div>` : ''}${urlSay ? `<div class="k soluk">XML'de ${urlSay} fotoğraf bağlantısı var; yüklerken indirilecek.</div>` : ''}${govde.length > 100 ? '<div class="k soluk">Tek seferde en çok 100 ilan yüklenir.</div>' : ''}
      <div class="liste" style="max-height:340px;overflow:auto">${l.map((x) => `<div class="oge" style="flex-direction:column;align-items:flex-start;gap:2px"><b class="k">${kac(x.t.baslik || '—')}</b><span class="k soluk">${x.t.fiyat ? tl(x.t.fiyat) : '—'} · ${kac([x.t.alanlar.mahalle, x.t.ilce, x.t.il].filter(Boolean).join(', '))}${x.resim.length + x.url.length ? ' · ' + (x.resim.length + x.url.length) + ' fotoğraf' : ''}${x.hata ? ` · <b style="color:var(--hata)">${x.hata}</b>` : ''}</span></div>`).join('')}</div></div>
      ${iyi.length ? `<label class="satir k"><input type="checkbox" id="onay" style="width:22px;height:22px">Bu ilanların bana ait olduğunu ve yayınlama yetkim bulunduğunu onaylıyorum.</label><button class="btn tam" id="yukle">${iyi.length} ilanı yayınla</button>` : ''}`;
    const y = $('#yukle'); if (y) y.onclick = async () => {
      if (!$('#onay').checked) return toast('Önce onay kutusunu işaretle.');
      y.disabled = true; let n = 0, hata = 0;
      for (const x of iyi) {
        y.textContent = `Yükleniyor ${n + hata + 1}/${iyi.length}…`;
        try {
          x.t.fotolar = [];
          for (const f of x.resim) { try { x.t.fotolar.push(await fotoKucult(f)); } catch (_) {} }
          for (const u of x.url) { try { x.t.fotolar.push(await fotoKucult(await urlDosya(u))); } catch (_) {} }
          await ilanKaydet(x.t); n++;
        } catch (_) { hata++; }
      }
      toast(`${n} ilan yayınlandı${hata ? `, ${hata} ilan yüklenemedi` : ''}`); git('#/hesap');
    };
  };
};

// ---------- Üye profili (satıcının görünmesini istediği bilgiler ve ilanları) ----------
EKRAN.uye = (id) => {
  const k = kullanici(id), l = yayinda().filter((i) => i.sahip === id);
  const gecmis = S.ilanlar.filter((i) => i.sahip === id && i.durum === 'satildi');
  app.innerHTML = ustBar(kac(gorunenAd(k))) + `<div class="ic">
    <div class="kart satir">${k.foto ? `<img src="${kac(k.foto)}" alt="" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0">` : `<div class="avatar" style="width:56px;height:56px;font-size:20px">${basHarf(k.ad)}</div>`}<div class="ara">
      <b style="font-size:17px">${kac(gorunenAd(k))}</b> ${rozet(k)}
      ${k.unvan || k.firma ? `<div class="k">${kac([k.unvan, k.firma].filter(Boolean).join(' · '))}</div>` : ''}
      <div class="k soluk">${k.olusturma ? 'Üyelik: ' + new Date(k.olusturma).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }) + ' · ' : ''}${l.length} yayında ilan${gecmis.length ? ` · ${gecmis.length} satıldı` : ''}</div>
      ${k.yetkiNo ? `<div class="k soluk">Yetki belgesi no: ${kac(k.yetkiNo)} (üye beyanı)</div>` : ''}
      ${k.acikTel ? `<a class="k" href="tel:${kac(k.acikTel)}" style="font-weight:700">${kac(k.acikTel)}</a>` : ''}
    </div></div>
    ${k.hakkinda ? `<div class="kart"><h3>Hakkında</h3><div style="white-space:pre-wrap;line-height:1.55;font-size:14px">${kac(k.hakkinda)}</div></div>` : ''}
    <div class="bolum-bas"><h2>İlanları</h2></div>
    ${l.length ? `<div class="ilan-izgara">${l.map(ilanKart).join('')}</div>` : bosDurum('ev', 'Yayında ilanı yok', 'Bu üyenin şu an yayında ilanı bulunmuyor.')}
    ${gecmis.length ? `<div class="bolum-bas"><h2>Satılanlar</h2></div><div class="ilan-izgara">${gecmis.map(ilanKart).join('')}</div>` : ''}
  </div>`;
  navCiz();
};

// ---------- İl / ilçe / mahalle listeleri (turkey-neighbourhoods, MIT; il başına ayrı dosya) ----------
const MAH = {};
async function mahalleVeri(il) {
  try {
    MAH.kod = MAH.kod || await (await fetch('mahalle/iller.json')).json();
    const k = MAH.kod[il]; if (!k) return {};
    return MAH[k] = MAH[k] || await (await fetch(`mahalle/${k}.json`)).json();
  } catch (_) { return {}; }
}
// İl değişince ilçeler, ilçe değişince mahalleler dolar; mevcut seçim korunur
function konumSecBagla(ilEl, ilceEl, mahEl, degisti = () => {}) {
  const doldur = (el, l, v) => { el.innerHTML = '<option value="">' + (el.dataset.bos || 'Seç') + '</option>' + l.map((x) => `<option ${x === v ? 'selected' : ''}>${kac(x)}</option>`).join(''); };
  const ilceDoldur = async () => { const v = await mahalleVeri(ilEl.value); doldur(ilceEl, Object.keys(v).sort((a, b) => a.localeCompare(b, 'tr')), ilceEl.value); mahDoldur(); };
  const mahDoldur = async () => { if (!mahEl) return; const v = await mahalleVeri(ilEl.value); doldur(mahEl, v[ilceEl.value] || [], mahEl.value); };
  ilEl.addEventListener('change', () => { ilceEl.value = ''; ilceDoldur(); degisti(); });
  ilceEl.addEventListener('change', () => { if (mahEl) mahEl.value = ''; mahDoldur(); degisti(); });
  if (ilEl.value) ilceDoldur();
}

// "4.500.000 TL", "4,5 milyon", "120 m²", 4500000 → sayı
function sayiCoz(x) {
  if (typeof x === 'number') return Math.round(x) || 0;
  let s = String(x || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ');
  const carpan = /milyar/.test(s) ? 1e9 : /milyon/.test(s) ? 1e6 : /\bbin\b/.test(s) ? 1e3 : 1;
  const m = s.match(/\d[\d.,]*/); if (!m) return 0;
  let n = m[0];
  if (carpan > 1) n = n.replace(/\./g, '').replace(',', '.');
  else n = n.replace(/[.,](?=\d{3}(\D|$))/g, '').replace(',', '.');
  return Math.round(parseFloat(n) * carpan) || 0;
}
// Serbest değeri seçenek listesindeki karşılığına eşle ("3+1 daire" → "3+1", "kombi" → "Doğalgaz (kombi)")
function secenekBul(sec, x) {
  const k = (y) => String(y).toLocaleLowerCase('tr').replace(/[()]/g, '').trim(), d = k(x);
  // Yönler: "Kuzey, Batı" / "Batı - Kuzey" → "Kuzeybatı" (seçeneklerde birleşik yön varsa)
  const yon = d.match(/kuzey|güney|doğu|batı/g);
  if (yon && yon.length >= 2) {
    const dik = yon.find((y) => y === 'kuzey' || y === 'güney'), yat = yon.find((y) => y === 'doğu' || y === 'batı');
    const bir = dik && yat ? sec.find((s) => k(s) === dik + yat) : null; if (bir) return bir;
  }
  const sikis = (y) => k(y).replace(/[\s,\/&-]+/g, '');
  // Önce tam eşleşme, sonra metnin içinde geçen en uzun seçenek ("3+1 daire" → "3+1", "Kuzeybatı cephe" → "Kuzeybatı")
  return sec.find((s) => k(s) === d) || sec.find((s) => sikis(s) === sikis(d))
    || [...sec].sort((a, b) => b.length - a.length).find((s) => { const n = d.indexOf(k(s)); return n >= 0 && !/\d/.test(d[n - 1] || '') && !/\d/.test(d[n + k(s).length] || ''); })
    || sec.find((s) => k(s).includes(d) && d.length >= 3) || '';
}

// İçe aktarmada açıklama: MülkümAI boş ya da çok kısa döndürürse yapıştırılan metnin kendisi kullanılır
// (telefon, e-posta ve bağlantılar temizlenir)
function aciklamaSec(ai, ham) {
  const temizle = (x) => String(x || '').replace(/https?:\/\/\S+/g, '').replace(/\S+@\S+\.\S+/g, '').replace(/(\+?90[\s-]?)?\(?0?5\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  const a = temizle(ai);
  return (a.length >= 80 || !ham ? a : temizle(ham)).slice(0, 3000);
}

// İlan sayfasında benzer ilanların görselleri de olur: ilanın kendi galerisi aynı klasörde durur.
// İlk görselin (og:image / kapak) klasörü, yoksa en kalabalık klasör seçilir.
function galeriSec(liste) {
  if (liste.length <= 2) return liste;
  // Klasör derinliği 1, 2, 3 üst düzey denenir (bazı siteler her fotoğrafı ayrı alt klasöre koyar)
  for (let d = 1; d <= 3; d++) {
    const klasor = (u) => { try { const x = new URL(u); return x.host + x.pathname.split('/').slice(0, -d).join('/'); } catch (_) { return ''; } };
    const say = {}; liste.forEach((u) => { const k = klasor(u); say[k] = (say[k] || 0) + 1; });
    const kapak = klasor(liste[0]), enCok = Object.entries(say).sort((a, b) => b[1] - a[1])[0];
    const k = say[kapak] >= 2 ? kapak : enCok[1] >= 2 ? enCok[0] : null;
    if (k) return liste.filter((u) => klasor(u) === k);
  }
  return liste.slice(0, 1);
}
// Uygulama içi tarayıcı (cordova-plugin-inappbrowser) yalnız telefonda var
const tarayiciVar = () => !!(window.cordova && window.cordova.InAppBrowser);
// İlanı kullanıcının telefonunda açar; kullanıcı sayfayı kendisi görür ve "Mülküm360'a aktar"a basar.
// Basınca yalnız o sayfanın görünen metni ve büyük fotoğraf adresleri alınır (tek sayfa, kullanıcının isteğiyle).
function sayfadanOku(link) {
  return new Promise((ok, red) => {
    kayit('tarayici_ac', link);
    const ref = window.cordova.InAppBrowser.open(link, '_blank', 'location=yes,toolbarcolor=#0B1B33,closebuttoncolor=#ffffff,closebuttoncaption=✓ Aktar,navigationbuttoncolor=#ffffff,hidenavigationbuttons=no,zoom=no,footer=no');
    const DUGME = `(function(){if(!document.body||document.getElementById('m360a'))return;var b=document.createElement('button');b.id='m360a';b.textContent="Mülküm360'a aktar";b.style.cssText='position:fixed;left:16px;right:16px;bottom:96px;z-index:2147483647;padding:16px;border:0;border-radius:14px;background:#FFC72C;color:#0B1B33;font:700 17px sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.35)';b.onclick=function(){b.textContent='Okunuyor…';window.__m360=1};document.documentElement.appendChild(b)})()`;
    // Hafif okuma: yalnız görünen metin ve img/og görselleri (tüm HTML taranmaz; telefonda uygulamayı kilitliyordu)
    const OKU = `(function(){var b=document.getElementById('m360a');if(b)b.remove();var og=document.querySelector('meta[property="og:title"]');var t=document.title+'\\n'+(og?og.content:'')+'\\n'+(document.body?document.body.innerText:'');var f=[],ek=function(u){try{if(!u)return;if(u.indexOf('//')===0)u='https:'+u;u=new URL(u,location.href).href;if(!/^https:/.test(u)||!/\\.(jpe?g|png|webp)(\\?|$)/i.test(u))return;if(/logo|icon|avatar|sprite|banner|favicon|placeholder|blank|loading/i.test(u))return;if(f.indexOf(u)<0)f.push(u)}catch(e){}};var o=document.querySelectorAll('meta[property^="og:image"]');for(var i=0;i<o.length;i++)ek(o[i].content);var im=document.querySelectorAll('img');for(var j=0;j<im.length&&j<400&&f.length<60;j++){var e=im[j];if(e.naturalWidth&&e.naturalWidth<150)continue;ek(e.getAttribute('data-src')||e.getAttribute('data-original')||e.getAttribute('data-lazy'));var ss=e.getAttribute('srcset')||e.getAttribute('data-srcset');if(ss){var p=ss.split(',');ek(p[p.length-1].trim().split(' ')[0])}ek(e.currentSrc||e.src)}return JSON.stringify({t:t.slice(0,12000),f:f.slice(0,40)})})()`;
    const KAYDIR = `(function(){var h=document.body.scrollHeight,a=0;var t=setInterval(function(){a+=Math.max(500,h/5);window.scrollTo(0,a);if(a>=h){clearInterval(t);window.scrollTo(0,0)}},300)})()`;
    // Akış: son yüklemeden 3 sn sonra bir kez aşağı kaydır (geç yüklenen fotoğraflar), 3,5 sn sonra bir kez oku ve kapat.
    // Sürekli tarama yok. Sarı düğme ya da üstteki "✓ Aktar" ile beklemeden de aktarılır.
    let bitti = false, son = null, plan = null, okunuyor = false, otoDeneme = 0;
    const yeterli = (x) => x && x.t && x.t.replace(/\s/g, '').length > 400;
    const bitir = (hata, deger) => { if (bitti) return; kayit('tarayici_bitti', hata ? 'hata: ' + hata.message : 'tamam ' + (deger && deger.t ? deger.t.length : 0) + ' karakter, ' + ((deger && deger.f) || []).length + ' foto'); bitti = true; clearInterval(saat); clearTimeout(sinir); clearTimeout(plan); try { ref.close(); } catch (_) {} hata ? red(hata) : ok(deger); };
    const oku = (neden) => {
      if (okunuyor || bitti) return; okunuyor = true;
      // Cevap gelmezse (sayfa hâlâ yükleniyor olabilir) otomatik okuma 3 kez daha denenir
      const zaman = setTimeout(() => { okunuyor = false; kayit('okuma', neden + ': cevap gelmedi'); if (neden === 'otomatik' && ++otoDeneme <= 3) setTimeout(() => oku('otomatik'), 2500); }, 7000);
      ref.executeScript({ code: OKU }, (r) => {
        clearTimeout(zaman); okunuyor = false;
        let x = null; try { x = JSON.parse(r && r[0]); } catch (_) {}
        kayit('okuma', neden + ': ' + (x && x.t ? x.t.length + ' karakter, ' + x.f.length + ' foto' : 'boş'));
        if (yeterli(x)) { son = x; bitir(null, x); }
      });
    };
    const planla = () => { clearTimeout(plan); plan = setTimeout(() => { if (bitti) return; ref.executeScript({ code: KAYDIR }); plan = setTimeout(() => oku('otomatik'), 3500); }, 3000); };
    ref.addEventListener('loadstop', (e) => { kayit('loadstop', e && e.url); ref.executeScript({ code: DUGME }); planla(); });
    ref.addEventListener('loaderror', (e) => kayit('loaderror', (e && e.code) + ' ' + (e && e.message)));
    // Sarı düğmeye basıldı mı (çok hafif kontrol)
    const saat = setInterval(() => ref.executeScript({ code: 'window.__m360?1:0' }, (r) => { if (r && r[0] === 1) oku('düğme'); }), 1500);
    const sinir = setTimeout(() => (yeterli(son) ? bitir(null, son) : bitir(new Error('Sayfa açılamadı (site doğrulama istiyor olabilir). İlan metnini kopyalayıp yapıştırabilirsin.'))), 45000);
    ref.addEventListener('exit', () => (yeterli(son) ? bitir(null, son) : bitir(new Error('Sayfa okunmadan kapatıldı. Biraz bekleyip tekrar dene; sayfa yüklenince kendiliğinden kapanır.'))));
  });
}

// Form uyarısı: alt çubuğun arkasında kalmasın; toast olarak da göster ve uyarıya kaydır
function hataGoster(h, metin) {
  h.textContent = metin; toast(metin);
  h.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return false;
}

// Sokak önerisi: OSM (Photon, ücretsiz, anahtarsız) içinde il/ilçe/mahalle ile süzülmüş yol adları
function sokakOneriBagla() {
  const g = $('#sokak'), dl = $('#sokakOn'); if (!g || !dl) return;
  let zam, son = '';
  g.oninput = () => {
    clearTimeout(zam); const q = g.value.trim(); if (q.length < 2 || q === son) return;
    zam = setTimeout(async () => {
      son = q; const il = $('#il').value, ilce = $('#ilce').value;
      try {
        const r = await (await fetch('https://photon.komoot.io/api/?limit=15&lang=default&osm_tag=highway&q=' + encodeURIComponent([q, ilce, il].filter(Boolean).join(' ')), { signal: AbortSignal.timeout(6000) })).json();
        const adlar = [...new Set((r.features || []).map((f) => f.properties).filter((p) => p.name && (!il || [p.state, p.county, p.city].some((x) => x && x.toLocaleLowerCase('tr').includes(il.toLocaleLowerCase('tr'))))).map((p) => p.name))];
        dl.innerHTML = adlar.map((a) => `<option value="${kac(a)}">`).join('');
      } catch (_) { /* öneri gelmezse elle yazılır */ }
    }, 350);
  };
}

// ---------- MülkümDeko ----------
const DEKO_ODA = ['Oturma odası', 'Yatak odası', 'Mutfak', 'Banyo'];
const DEKO_STIL = ['Modern', 'Klasik', 'İskandinav', 'Rustik'];
// AI istemlerine deko görsel listesi gitmesin
const alanVeri = (f) => { const { deko, videolar, ...r } = f || {}; return r; };
// Önce/sonra: kaydırıcı sola çekildikçe orijinal fotoğraf açılır
function dekoKarsilastir(d) {
  return `<div class="deko-kar" style="--k:50%"><img src="${d.url}" alt="${kac(d.stil)} öneri"><img class="once" src="${d.kaynak}" alt="Orijinal fotoğraf">
    <span class="deko-cizgi"></span><span class="deko-et sol">Orijinal</span><span class="deko-et sag">Yapay zekâ</span>
    <input type="range" min="0" max="100" value="50" aria-label="Karşılaştır"></div>`;
}
function dekoBagla(el) { el.querySelectorAll('.deko-kar').forEach((k) => { const r = k.querySelector('input'); r.oninput = () => k.style.setProperty('--k', r.value + '%'); }); }
function dekoSheet(i) {
  const s = { foto: i.fotolar[0], oda: DEKO_ODA[0], stil: DEKO_STIL[0], sonuc: null };
  const cizS = (el) => {
    const mevcut = (i.alanlar.deko || []);
    el.innerHTML = `<h2 style="font-size:19px;font-weight:800">MülkümDeko</h2>
      <div class="k soluk">Bir oda fotoğrafı, oda türü ve stil seç. Duvarlar, pencereler ve ölçüler korunur; yalnız mobilya ve dekorasyon değişir.</div>
      <div class="deko-fotolar">${i.fotolar.map((u) => `<button data-f="${u}" class="${u === s.foto ? 'secili' : ''}" style="background-image:url('${u}')" aria-label="Fotoğraf seç"></button>`).join('')}</div>
      <div class="ciplar">${DEKO_ODA.map((o) => `<button class="cip ${o === s.oda ? 'secili' : ''}" data-o="${o}">${o}</button>`).join('')}</div>
      <div class="ciplar">${DEKO_STIL.map((o) => `<button class="cip ${o === s.stil ? 'secili' : ''}" data-s="${o}">${o}</button>`).join('')}</div>
      <div id="dekoSonuc">${s.sonuc ? dekoKarsilastir(s.sonuc) : ''}</div>
      ${s.sonuc ? `<button class="btn tam" id="dekoEkle">İlana ekle</button>` : (ben()?.kredi || 0) < 1
        ? `<div class="bilgi-k">${ic('kredi', 18)}<div>Kredin yok. MülkümDeko her görsel için <b>1 kredi</b> kullanır.</div></div><a class="btn tam" href="#/kredi">${ic('kredi', 18, '#fff')}Kredi al</a>`
        : `<button class="btn tam" id="dekoUret">${ic('yildiz', 18, '#fff')}Görseli oluştur · 1 kredi</button><div class="k soluk" style="text-align:center">Bakiyen: <b>${ben().kredi} kredi</b></div>`}
      ${mevcut.length ? `<div class="k soluk" style="margin-top:6px">İlanda ${mevcut.length} deko görseli var.</div><div class="liste">${mevcut.map((d, n) => `<div class="oge">${kac(d.oda)} · ${kac(d.stil)}<button class="btn sade" data-kaldir="${n}" style="margin-left:auto">İlandan kaldır</button></div>`).join('')}</div>` : ''}
      <div class="k soluk">Oluşturulan görseller ilanda "yapay zekâ ile oluşturuldu" uyarısıyla gösterilir. Her görsel 1 kredi; görsel oluşturulamazsa kredi iade edilir.</div>`;
    el.querySelectorAll('[data-f]').forEach((x) => (x.onclick = () => { s.foto = x.dataset.f; s.sonuc = null; cizS(el); }));
    el.querySelectorAll('[data-o]').forEach((x) => (x.onclick = () => { s.oda = x.dataset.o; s.sonuc = null; cizS(el); }));
    el.querySelectorAll('[data-s]').forEach((x) => (x.onclick = () => { s.stil = x.dataset.s; s.sonuc = null; cizS(el); }));
    dekoBagla(el);
    const u = el.querySelector('#dekoUret'); if (u) u.onclick = async () => {
      u.disabled = true; u.textContent = 'Oluşturuluyor… (10-30 sn)';
      try { s.sonuc = { url: await dekoUret(s.foto, s.oda, s.stil), kaynak: s.foto, oda: s.oda, stil: s.stil }; cizS(el); }
      catch (x) { toast(x.message); cizS(el); }
    };
    const e = el.querySelector('#dekoEkle'); if (e) e.onclick = async () => {
      if (await dene(() => dekoKaydet(i, [...mevcut, s.sonuc].slice(-16)), 'Görsel ilana eklendi')) { sheetKapat(); ciz(); }
    };
    el.querySelectorAll('[data-kaldir]').forEach((x) => (x.onclick = async () => {
      if (await dene(() => dekoKaydet(i, mevcut.filter((_, n) => n !== +x.dataset.kaldir)), 'Görsel ilandan kaldırıldı')) cizS(el);
    }));
  };
  sheetAc('<div id="dekoS"></div>', (el) => cizS(el.querySelector('#dekoS')));
}

async function paylas(metin) {
  const P = window.Capacitor?.Plugins?.Share;
  try {
    if (P) await P.share({ title: 'Mülküm360', text: metin, dialogTitle: 'Paylaş' });
    else if (navigator.share) await navigator.share({ title: 'Mülküm360', text: metin });
    else { await navigator.clipboard.writeText(metin); toast('İlan bilgisi kopyalandı'); }
  } catch (_) {}
}

// ---------- Mesajlaşma ----------
function teklifSheet(s) {
  const i = ilan(s.ilanId);
  sheetAc(`<h2 style="font-size:19px;font-weight:800">Teklif ver</h2><div class="k soluk">İlan fiyatı: <b>${tl(i?.fiyat)}</b></div>
    <form id="tf" class="ic" style="padding:0"><label class="alan">Teklifin (TL)<input name="t" inputmode="numeric" required autofocus></label>
    <div class="ciplar">${[0.95, 0.9, 0.85].map((k) => `<button type="button" class="cip" data-t="${Math.round((i?.fiyat || 0) * k / 1000) * 1000}">%${Math.round((1 - k) * 100)} indirim</button>`).join('')}</div>
    <div class="hata-yazi" id="th"></div><button class="btn tam">Teklifi gönder</button>
    <div class="k soluk">Teklif 48 saat geçerli. Satıcı kabul ederse sohbette görünür; bağlayıcı bir satış sözleşmesi değildir.</div></form>`, (sh) => {
    sh.querySelectorAll('[data-t]').forEach((x) => (x.onclick = () => ($('[name=t]', sh).value = sayiBicim(+x.dataset.t))));
    $('#tf', sh).onsubmit = async (e) => {
      e.preventDefault();
      const t = +e.target.t.value.replace(/\D/g, '');
      if (!t) return ($('#th', sh).textContent = 'Bir tutar yaz.');
      e.target.querySelector('button.btn').disabled = true;
      if (await dene(() => mesajGonder(s, { tur: 'teklif', tutar: t, durum: 'bekliyor' }), 'Teklifin gönderildi')) { sheetKapat(); git('#/sohbet/' + s.id); }
      else e.target.querySelector('button.btn').disabled = false;
    };
  });
}

EKRAN.mesajlar = () => {
  if (girisGerek('Mesajların için giriş yap')) return;
  const b = ben();
  const l = S.sohbetler.filter((s) => (s.alici === b.id || s.satici === b.id) && s.mesajlar.length)
    .sort((x, y) => y.mesajlar[y.mesajlar.length - 1].zaman - x.mesajlar[x.mesajlar.length - 1].zaman);
  app.innerHTML = ustBar('Mesajlar', '', false) + `<div class="ic">${l.length ? `<div class="liste">${l.map((s) => {
    const i = ilan(s.ilanId), o = kullanici(s.alici === b.id ? s.satici : s.alici), son = s.mesajlar[s.mesajlar.length - 1];
    const yeni = s.mesajlar.filter((m) => m.kimden !== b.id && m.zaman > (s.okundu?.[b.id] || 0)).length;
    return `<a href="#/sohbet/${s.id}" style="align-items:flex-start"><div class="foto" style="width:52px;height:52px;border-radius:12px;flex-shrink:0;background:var(--yuzey2) center/cover;${i && kapak(i) ? `background-image:url('${kapak(i)}')` : ''}"></div>
      <div class="ara" style="min-width:0"><div class="satir"><b class="ara" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${kac(gorunenAd(o))}</b><span class="k soluk" style="font-weight:500">${gecen(son.zaman)}</span></div>
      <div class="k soluk" style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${kac(i?.baslik || 'Kaldırılmış ilan')}</div>
      <div class="k" style="font-weight:${yeni ? 700 : 500};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${son.tur === 'teklif' ? 'Teklif: ' + tl(son.tutar) : son.tur === 'sistem' ? kac(son.metin) : kac(son.metin)}</div></div>
      ${yeni ? `<span class="rozet" style="position:static">${yeni}</span>` : ''}</a>`;
  }).join('')}</div>` : bosDurum('mesaj', 'Henüz mesajın yok', 'Bir ilana mesaj ya da teklif gönderdiğinde konuşmaların burada görünür.', '<a class="btn" href="#/">İlanlara göz at</a>')}</div>`;
  navCiz('mesaj');
};

EKRAN.sohbet = (id) => {
  if (girisGerek()) return;
  const b = ben(), s = S.sohbetler.find((x) => x.id === id);
  if (!s || (s.alici !== b.id && s.satici !== b.id)) { git('#/mesajlar'); return; }
  const i = ilan(s.ilanId), o = kullanici(s.alici === b.id ? s.satici : s.alici), saticiyim = s.satici === b.id;
  okunduYaz(s);
  const eskiGiris = app.dataset.sohbet === id ? $('#mf [name=m]') : null, yarim = eskiGiris ? eskiGiris.value : '', odakli = !!eskiGiris && document.activeElement === eskiGiris;
  app.dataset.sohbet = id;
  let sonGun = '';
  const gunAyrac = (t) => { const g = new Date(t).toDateString(); if (g === sonGun) return ''; sonGun = g; const fark = Math.round((new Date(new Date().toDateString()) - new Date(g)) / 86400000); return '<div class="gun-ayrac"><span>' + (fark === 0 ? 'Bugün' : fark === 1 ? 'Dün' : new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: fark > 300 ? 'numeric' : undefined })) + '</span></div>'; };
  document.body.classList.add('navsiz'); nav.innerHTML = '';
  const saat = (t) => new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  app.innerHTML = ustBar(kac(gorunenAd(o))) + `
    ${i ? `<a href="#/ilan/${i.id}" class="satir" style="padding:10px 16px;background:var(--yuzey);border-bottom:1px solid var(--cizgi);text-decoration:none;color:inherit"><div style="width:44px;height:44px;border-radius:10px;background:var(--yuzey2) center/cover;${kapak(i) ? `background-image:url('${kapak(i)}')` : ''}"></div><div class="ara" style="min-width:0"><div class="k" style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${kac(i.baslik)}</div><b>${tl(i.fiyat)}</b></div></a>` : ''}
    <div style="padding:12px 16px 0"><div class="uyari-k">${ic('uyari', 18)}<div>Kapora isteyen, IBAN ya da başka uygulamaya yönlendiren mesajlara dikkat. Kişisel bilgilerini paylaşma.</div></div></div>
    <div class="balonlar" id="balonlar" style="padding-bottom:150px">
      ${s.mesajlar.length ? '' : `<div class="soluk k" style="text-align:center;padding:20px">İlk mesajını yaz. Hazır sorulardan birini de seçebilirsin.</div>`}
      ${s.mesajlar.map((m) => {
        const benim = m.kimden === b.id, gun = gunAyrac(m.zaman);
        if (m.tur === 'sistem') return gun + `<div class="k soluk" style="text-align:center;padding:4px">${kac(m.metin)}</div>`;
        if (m.tur === 'teklif') return gun + `<div class="teklif-k ${benim ? '' : 'o'}"><div class="k soluk" style="font-weight:700">${benim ? 'TEKLİFİN' : 'GELEN TEKLİF'}</div><div style="font-size:22px;font-weight:800">${tl(m.tutar)}</div>
          <div class="k" style="font-weight:600;color:${m.durum === 'kabul' ? 'var(--guven)' : m.durum === 'red' ? 'var(--hata)' : 'var(--soluk)'}">${m.durum === 'kabul' ? 'Kabul edildi' : m.durum === 'red' ? 'Reddedildi' : Date.now() - m.zaman > 172800000 ? 'Süresi doldu' : 'Yanıt bekleniyor'}</div>
          ${!benim && saticiyim && m.durum === 'bekliyor' && Date.now() - m.zaman <= 172800000 ? `<div class="izgara2"><button class="btn guven kucuk" data-kabul="${m.id}">Kabul et</button><button class="btn sade kucuk" data-red="${m.id}">Reddet</button></div>` : ''}
          <span class="k soluk">${saat(m.zaman)}</span></div>`;
        return gun + `<div class="balon ${benim ? 'ben' : 'o'}">${kac(m.metin)}<span class="zaman">${saat(m.zaman)}</span></div>`;
      }).join('')}
    </div>
    <form class="mesaj-yaz" id="mf"><div class="alt-bar-ic" style="flex-direction:column;gap:8px">
      <div class="ciplar">${(saticiyim ? ['Evet, hâlâ satılık.', 'Ne zaman görmek istersiniz?', 'Fiyatta pazarlık payı az.'] : ['Merhaba, ilan hâlâ geçerli mi?', 'Görmeye ne zaman gelebilirim?', 'Son fiyat nedir?']).map((t) => `<button type="button" class="cip" data-hazir="${t}">${t}</button>`).join('')}
        ${saticiyim || !i || i.durum !== 'yayinda' ? '' : `<button type="button" class="cip" id="teklifBtn" style="border-color:var(--vurgu);color:var(--vurgu-koyu)">Teklif ver</button>`}</div>
      <div class="satir"><label class="arama-kutu" style="height:48px"><input name="m" aria-label="Mesaj yaz" placeholder="Mesaj yaz" autocomplete="off" maxlength="1000"></label>
      <button class="ikon-btn" style="background:var(--vurgu);border:0;color:#fff;width:48px;height:48px" aria-label="Gönder">${ic('gonder', 20, '#fff')}</button></div></div></form>`;
  scrollTo(0, document.body.scrollHeight);
  const giris = $('#mf [name=m]'); if (yarim) giris.value = yarim; if (odakli) giris.focus({ preventScroll: true });
  let gidiyor = false;
  const gonder = async (metin, formdan) => {
    metin = metin.trim(); if (!metin || gidiyor) return;
    gidiyor = true;
    if (await dene(() => mesajGonder(s, { tur: 'metin', metin }))) {
      const g = $('#mf [name=m]'); if (formdan && g && g.value.trim() === metin) g.value = '';
      if (/\b(iban|tr\d{2}\s?\d{4}|kapora|whatsapp)\b/i.test(metin)) toast('Güvenliğin için ödeme ve iletişimi uygulama içinde tut.');
      ciz();
    }
    gidiyor = false;
  };
  $('#mf').onsubmit = (e) => { e.preventDefault(); gonder(e.target.m.value, true); };
  app.querySelectorAll('[data-hazir]').forEach((x) => (x.onclick = () => gonder(x.dataset.hazir)));
  const tb = $('#teklifBtn'); if (tb) tb.onclick = () => teklifSheet(s);
  app.querySelectorAll('[data-kabul],[data-red]').forEach((x) => (x.onclick = async () => {
    x.disabled = true;
    if (await dene(() => teklifYanitla(s, x.dataset.kabul || x.dataset.red, !!x.dataset.kabul))) ciz(); else x.disabled = false;
  }));
};

// ---------- İlan ver / düzenle ----------
EKRAN.ver = (id) => {
  if (girisGerek('İlan vermek için giriş yap')) return;
  if (id) {
    const i = ilan(id);
    if (!i || i.sahip !== ben().id) { git('#/hesap'); return; }
    if (!taslak || taslak.id !== id) taslak = JSON.parse(JSON.stringify({ ...i, adim: 1 }));
  } else if (!taslak || taslak.id) {
    taslak = { adim: 0, fotolar: [], alanlar: {} };
    try {
      const k = JSON.parse(localStorage.getItem('ilanTaslak') || 'null');
      if (k && k.sahip === ben().id && Date.now() - k.zaman < 14 * 86400000 && k.t && ALT[k.t.alt]) { taslak = { ...k.t, fotolar: [], alanlar: k.t.alanlar || {}, adim: Math.min(k.t.adim || 1, 2) }; setTimeout(() => toast(k.foto ? 'Yarım kalan ilanın geri yüklendi; fotoğrafları yeniden ekle' : 'Yarım kalan ilanın geri yüklendi'), 300); }
    } catch (_) {}
  }
  if (!taslak.id) try { if (taslak.adim > 0 && (taslak.baslik || taslak.fiyat || Object.keys(taslak.alanlar || {}).length)) localStorage.setItem('ilanTaslak', JSON.stringify({ sahip: ben().id, zaman: Date.now(), foto: (taslak.fotolar || []).length, t: { ...taslak, fotolar: [], eids: undefined } })); } catch (_) {}
  const t = taslak, ADIM = ['Kategori', 'Fotoğraf ve başlık', 'Bilgiler ve fiyat', 'Önizleme'];
  document.body.classList.add('navsiz'); nav.innerHTML = '';
  const bas = `<header class="ust"><button class="ikon-btn dolu" aria-label="Kapat" id="kapat">${ic('kapat')}</button><h1>${t.id ? 'İlanı düzenle' : 'İlan ver'}</h1><span class="k soluk" style="font-weight:600">Adım ${t.adim + 1} / 4</span></header>
    <div style="padding:12px 16px 0;background:var(--yuzey)"><div class="adimlar" style="grid-template-columns:repeat(4,1fr)">${ADIM.map((_, n) => `<i class="${n <= t.adim ? 'tamam' : ''}"></i>`).join('')}</div><div class="k soluk" style="padding:8px 0 12px;font-weight:600">${ADIM[t.adim]}</div></div>`;
  let govde = '';
  if (t.adim === 0) {
    const kutu = (k) => { const a = ALT[k]; return `<button class="kat ${a.ana}" data-alt="${k}" style="${t.alt === k ? 'outline:2px solid var(--vurgu)' : ''}"><span>${ic(a.ikon, 20)}</span>${a.ad}</button>`; };
    govde = `<button type="button" class="kart satir" id="belgeOku" style="text-align:left;width:100%;border:0;font:inherit;color:inherit;cursor:pointer">${ic('foto', 22, 'var(--vurgu-ikon)')}<div class="ara"><b>Tapu veya ruhsat fotoğrafından ilan ver</b><div class="k soluk">Fotoğrafı çek, kalan bilgileri MülkümAI doldursun</div></div><span class="ok">›</span></button>
<button type="button" class="kart satir" id="iceAktar" style="text-align:left;width:100%;border:0;font:inherit;color:inherit;cursor:pointer">${ic('yildiz', 22, 'var(--vurgu-ikon)')}<div class="ara"><b>Başka sitedeki ilanını aktar</b><div class="k soluk">İlan metnini yapıştır, MülkümAI bilgileri doldursun</div></div><span class="ok">›</span></button>
      <div class="bolum-bas"><h2>Emlak</h2></div><div class="kat-izgara">${altlari('emlak').map(kutu).join('')}</div>
      <div class="bolum-bas"><h2>Vasıta</h2></div><div class="kat-izgara">${altlari('vasita').map(kutu).join('')}</div>`;
  } else if (t.adim === 1) {
    govde = `<div class="foto-izgara">${t.fotolar.map((u, n) => `<div class="f" style="background-image:url('${u}')">${n === 0 ? '<span class="kapak">Kapak</span>' : ''}<button type="button" data-sil="${n}" aria-label="Fotoğrafı sil">×</button></div>`).join('')}
      ${t.fotolar.length < FOTO_SINIR ? `<label class="foto-ekle" aria-label="Fotoğraf ekle">${ic('foto', 24)}<input type="file" accept="image/*" multiple hidden id="dosya"></label>` : ''}</div>
      <div class="k soluk">${t.fotolar.length}/${FOTO_SINIR} fotoğraf. İlk fotoğraf kapak olur; bir fotoğrafa dokunup kapak yapabilirsin. Fotoğraflı ilanlar çok daha fazla görüntülenir.</div>
      <label class="alan">İlan başlığı<input id="baslik" maxlength="80" value="${kac(t.baslik || '')}" placeholder="${ALT[t.alt].ana === 'emlak' ? 'örn. Metroya yakın, bakımlı 3+1 daire' : 'örn. Hatasız, tek elden 2019 Clio'}"></label>
      <div class="${ALT[t.alt].ana === 'emlak' ? 'izgara2' : ''}"><label class="alan">Video bağlantısı <span style="font-weight:500">(isteğe bağlı)</span><input id="video" inputmode="url" placeholder="YouTube bağlantısı" value="${kac(t.alanlar.video || '')}"></label>${ALT[t.alt].ana === 'emlak' ? `<label class="alan">360° tur bağlantısı <span style="font-weight:500">(isteğe bağlı)</span><input id="tur360" inputmode="url" placeholder="Matterport, Kuula…" value="${kac(t.alanlar.tur360 || '')}"></label>` : ''}</div>
      <div class="k soluk">Açıklamayı bir sonraki adımda yazacaksın; istersen MülkümAI senin için taslak hazırlar.</div>`;
  } else if (t.adim === 2) {
    const ana = ALT[t.alt].ana;
    const alan = ([k, ad, tur, ops, zor]) => {
      const v = t.alanlar[k] ?? '';
      const e = `${ad}${zor ? '' : ' <span style="font-weight:500">(isteğe bağlı)</span>'}`;
      // Az seçenekli alanlar tek dokunuşla seçilen düğmeler; çok seçenekliler liste
      if (tur === 'sec' && ops.length <= 7) return `<div class="alan alan-tam">${e}<input type="hidden" data-alan="${k}" value="${kac(v)}"><div class="secim">${ops.map((o) => `<button type="button" class="${v === o ? 'secili' : ''}" data-secim="${k}" data-deger="${kac(o)}">${kac(o)}</button>`).join('')}</div></div>`;
      if (tur === 'sec') return `<label class="alan">${e}<select data-alan="${k}"><option value="">Seç</option>${(v && !ops.includes(v) ? [v, ...ops] : ops).map((o) => `<option ${v === o ? 'selected' : ''}>${kac(o)}</option>`).join('')}</select></label>`;
      if (tur === 'liste') return `<label class="alan">${e}<input data-alan="${k}" list="dl-${k}" value="${kac(v)}"><datalist id="dl-${k}">${ops.map((o) => `<option value="${kac(o)}">`).join('')}</datalist></label>`;
      const on = ONERI[k] ? `list="on-${k}"` : '';
      return `<label class="alan">${e}<input data-alan="${k}" ${tur === 'sayi' ? 'inputmode="numeric"' : ''} ${on} value="${kac(v)}" autocomplete="off">${ONERI[k] ? `<datalist id="on-${k}">${ONERI[k].map((o) => `<option value="${o}">`).join('')}</datalist>` : ''}</label>`;
    };
    let alanlar = ALANLAR[ana];
    if (t.alt === 'arsa') alanlar = alanlar.filter(([k]) => !['oda', 'kat', 'binaYasi', 'isitma', 'esya', 'katSayisi', 'aidat', 'site', 'otopark', 'asansor', 'balkon'].includes(k));
    govde = `<div class="izgara2">${alanlar.map(alan).join('')}</div>
      <div class="izgara2"><label class="alan">İl<select id="il"><option value="">Seç</option>${ILLER.map((x) => `<option ${t.il === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label class="alan">İlçe<select id="ilce"><option value="">Seç</option>${t.ilce ? `<option selected>${kac(t.ilce)}</option>` : ''}</select></label></div>
      ${ana === 'emlak' ? `<div class="izgara2"><label class="alan">Mahalle<select id="mahalle" data-bos="${t.ilce ? 'Seç' : 'Önce ilçe seç'}"><option value="">${t.ilce ? 'Seç' : 'Önce ilçe seç'}</option>${t.alanlar.mahalle ? `<option selected>${kac(t.alanlar.mahalle)}</option>` : ''}</select></label>
      <label class="alan">Sokak / cadde <span style="font-weight:500">(isteğe bağlı)</span><input id="sokak" list="sokakOn" maxlength="80" autocomplete="off" placeholder="Yazmaya başla" value="${kac(t.alanlar.sokak || '')}"><datalist id="sokakOn"></datalist></label></div>
      <div class="k soluk" style="font-size:12px;margin-top:-4px">Kapı numarası yazma; ilanda yalnız sokak adı görünür.</div>` : ''}
      <label class="alan">Fiyat (TL)<input id="fiyat" inputmode="numeric" value="${t.fiyat ? sayiBicim(t.fiyat) : ''}" style="font-weight:800"></label>
      <div id="oneri"></div>
      <label class="alan">Açıklama<textarea id="aciklama" maxlength="3000" placeholder="Durumunu, öne çıkan özelliklerini ve neden sattığını anlat.">${kac(t.aciklama || '')}</textarea></label>
      <button type="button" class="btn sade tam" id="aiAciklama">${ic('yildiz', 18)}MülkümAI ile açıklama yaz</button>`;
  } else {
    const i = { ...t, ana: ALT[t.alt].ana, olusturma: t.olusturma || Date.now(), durum: 'yayinda', id: t.id || 'onizleme' };
    govde = `<div style="max-width:220px">${ilanKart(i).replace('href="#/ilan/onizleme"', '')}</div>
      <div class="kart"><b>${kac(t.baslik)}</b><div class="k soluk" style="margin-top:4px">${ALT[t.alt].ad} · ${ozetSatir(i)} · ${konum(i)}</div><div class="k soluk">${t.fotolar.length} fotoğraf</div></div>
      <label class="satir k" style="align-items:flex-start"><input type="checkbox" id="dogru" style="width:22px;height:22px;flex-shrink:0"><span style="line-height:1.5">Bilgilerin doğru olduğunu, ${i.ana === 'emlak' ? 'mülkün sahibi ya da yetkili temsilcisi' : 'aracın sahibi ya da yetkili satıcısı'} olduğumu ve <a href="#/metin/kosullar">ilan kurallarını</a> kabul ettiğimi onaylıyorum.</span></label>
      ${i.ana === 'emlak' ? (eidsAcik() ? `<div class="bilgi-k">${ic('kalkan', 18)}<div><b>EİDS doğrulaması zorunlu.</b> İlanın, kimlik ve mülkiyet/yetki doğrulandıktan sonra yayına çıkar. Taşınmaz numarasını e-Devlet "Tapu Bilgileri Sorgulama" hizmetinden veya yeni tip tapu senedinden alabilirsin.</div></div>
      <label class="alan">İlanı kim veriyor?<select id="eYontem"><option value="sahibim" ${t.eids?.yontem === 'sahibim' || !t.eids ? 'selected' : ''}>Taşınmazın sahibiyim</option><option value="hisim" ${t.eids?.yontem === 'hisim' ? 'selected' : ''}>Eşim ya da 1./2. derece kan hısmımın taşınmazı</option>${ben()?.ofis ? `<option value="yetkili" ${t.eids?.yontem === 'yetkili' ? 'selected' : ''}>Yetkili emlak işletmesiyim (sahibi e-Devlet'ten yetkilendirdi)</option>` : ''}</select></label>
      <label class="alan">Taşınmaz numarası <span style="font-weight:500">(zorunlu)</span><input id="eNo" inputmode="numeric" maxlength="20" value="${kac(t.eids?.no || '')}"></label>
      <label class="alan" id="eYetkiK"${t.eids?.yontem === 'yetkili' ? '' : ' hidden'}>Yetki belge numarası <span style="font-weight:500">(yetkili işletme için)</span><input id="eYetki" maxlength="20" value="${kac(t.eids?.yetki || '')}"></label>` : `<div class="bilgi-k">${ic('belge', 18)}<div>Emlak ilanlarında, yürürlükteki mevzuat gereği ilan sahibinin tapu bilgisiyle doğrulanması istenebilir. Bu doğrulama sunucu bağlantısıyla eklenecek.</div></div>`) : eidsAcik() ? `<div class="bilgi-k">${ic('kalkan', 18)}<div><b>EİDS doğrulaması zorunlu.</b> Taşıt ilanları, ilan verenin aracın sahibi, eşi ya da 1./2. derece akrabası veya yetkili galeri olduğu doğrulandıktan sonra yayına çıkar. Galeriler araç sahibinden e-Devlet üzerinden satış yetkisi almalıdır.</div></div>${eidsTasitAlanlari(t.eids || {}, !!ben()?.ofis)}` : ''}`;
  }
  app.innerHTML = bas + `<div class="ic" style="padding-bottom:110px">${t.adim > 0 ? `<div id="guc">${gucHtml(t)}</div>` : ''}${govde}<div class="hata-yazi" id="hata" role="alert"></div></div>
    <div class="alt-bar"><div class="alt-bar-ic">${t.adim > (t.id ? 1 : 0) ? `<button class="btn sade" id="geriAdim" style="flex:.6">Geri</button>` : ''}<button class="btn" id="ileri">${t.adim === 3 ? (t.id ? 'Değişiklikleri kaydet' : 'İlanı yayınla') : 'Devam et'}</button></div></div>`;

  const topla = () => {
    if (t.adim === 1) { t.baslik = $('#baslik').value.trim(); for (const k of ['video', 'tur360']) { if (!$('#' + k)) { delete t.alanlar[k]; continue; } const v = $('#' + k).value.trim(); if (/^https:\/\/\S+$/i.test(v)) t.alanlar[k] = v.slice(0, 300); else delete t.alanlar[k]; } }
    if (t.adim === 2) t.aciklama = $('#aciklama').value.trim();
    if (t.adim === 2) {
      app.querySelectorAll('[data-alan]').forEach((x) => { let v = x.value.trim(); if (['m2net', 'm2brut', 'yil', 'km', 'aidat', 'katSayisi'].includes(x.dataset.alan)) v = v.replace(/\D/g, ''); t.alanlar[x.dataset.alan] = v; });
      t.il = $('#il').value; t.ilce = $('#ilce').value.trim(); if (ALT[t.alt].ana !== 'emlak') { delete t.alanlar.mahalle; delete t.alanlar.sokak; } else t.alanlar.mahalle = $('#mahalle').value; if ($('#sokak')) t.alanlar.sokak = $('#sokak').value.replace(/\s*(no|numara|kapı)\s*[:.]?\s*\d+.*$/i, '').trim().slice(0, 80); t.fiyat = +$('#fiyat').value.replace(/\D/g, '') || 0;
    }
  };
  const oneriCiz = () => {
    const el = $('#oneri'); if (!el) return; topla(); if ($('#guc')) $('#guc').innerHTML = gucHtml(t);
    const f = t.alanlar, ana = ALT[t.alt].ana;
    const h = ana === 'emlak' ? (+f.m2net > 0 && f.islem && t.il ? hesapla({ ana, alt: t.alt, il: t.il, ilce: t.ilce, islem: f.islem, oda: f.oda, m2net: f.m2net, haric: t.id }) : null)
      : (f.marka && f.model && f.yil ? hesapla({ ana, marka: f.marka, model: f.model, yil: f.yil, km: f.km, haric: t.id }) : null);
    el.innerHTML = h && h.yeterli ? `<div class="bilgi-k">${ic('grafik', 18)}<div>${h.sayi} benzer ilana göre fiyat aralığı: <b>${tl(h.alt)} – ${tl(h.ust)}</b>. Ortası ${tl(h.orta)}.</div></div>`
      : h ? `<div class="k soluk">Fiyat önerisi için uygulamada yeterli benzer ilan yok (${h.sayi}/3).</div>` : '';
  };
  const aiA = $('#aiAciklama'); if (aiA) aiA.onclick = async () => {
    topla(); aiA.disabled = true; aiA.textContent = 'MülkümAI yazıyor…';
    try { const m = await aiSor('aciklama', { ilan: { kategori: ALT[t.alt].ad, baslik: t.baslik, il: t.il, ilce: t.ilce, ...alanVeri(t.alanlar) } }); $('#aciklama').value = m; t.aciklama = m; toast('Taslak hazır; dilediğin gibi düzenle'); }
    catch (x) { toast(x.message); }
    aiA.disabled = false; aiA.innerHTML = ic('yildiz', 18) + 'MülkümAI ile açıklama yaz';
  };
  app.querySelectorAll('[data-secim]').forEach((b) => (b.onclick = () => {
    const g = app.querySelector(`[data-alan="${b.dataset.secim}"]`), ayni = g.value === b.dataset.deger;
    g.value = ayni ? '' : b.dataset.deger; b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('secili', !ayni && x === b));
    g.dispatchEvent(new Event('change'));
  }));
  const bi = $('#baslik'); if (bi) bi.oninput = () => { t.baslik = bi.value.trim(); $('#guc').innerHTML = gucHtml(t); };
  const ac = $('#aciklama'); if (ac) ac.addEventListener('input', () => { t.aciklama = ac.value.trim(); $('#guc').innerHTML = gucHtml(t); });
  if (t.adim === 2) { konumSecBagla($('#il'), $('#ilce'), $('#mahalle'), () => { oneriCiz(); const m = $('#mahalle'); if (m) m.dataset.bos = $('#ilce').value ? 'Seç' : 'Önce ilçe seç'; }); oneriCiz(); sokakOneriBagla(); app.querySelectorAll('[data-alan],#il,#ilce').forEach((x) => (x.onchange = oneriCiz)); const fy = $('#fiyat'); fy.oninput = () => { const n = fy.value.replace(/\D/g, ''); fy.value = n ? sayiBicim(+n) : ''; }; aracModelBagla($('[data-alan=marka]'), $('[data-alan=model]')); }
  if (t.adim === 3) { const ey = $('#eYontem'); if (ey) ey.onchange = () => { const k = $('#eYetkiK'); if (k) k.hidden = ey.value !== 'yetkili'; }; }
  if (typeof belgeOkuBagla === 'function') belgeOkuBagla();
  const ia = $('#iceAktar'); if (ia) ia.onclick = () => sheetAc(`<h2 style="font-size:19px;font-weight:800">İlanını aktar</h2>
      <div class="segment" role="tablist" id="iaTur"><button type="button" role="tab" aria-selected="true" class="secili" data-iatur="emlak">${ic('ev', 16)}Emlak ilanı</button><button type="button" role="tab" aria-selected="false" data-iatur="vasita">${ic('araba', 16)}Araç ilanı</button></div>
      <div class="k soluk">${tarayiciVar() ? 'İlanının bağlantısını yapıştır (sahibinden dahil). İlan açılır, okunur ve kendiliğinden kapanır; başlık, fiyat, m², özellikler, açıklama ve fotoğraflar otomatik gelir. İstersen ilan metnini de yapıştırabilirsin.' : 'İlanının bağlantısını ya da başlık, fiyat, özellikler ve açıklama metnini yapıştır. Bazı siteler (ör. sahibinden) bağlantıdan okumaya izin vermez; o zaman metni kopyala.'}</div>
      <textarea id="iaMetin" maxlength="3000" style="min-height:180px" placeholder="Bağlantı (https://…) ya da ilan metni"></textarea>
      <div id="iaYardim" class="kart k" hidden style="line-height:1.55;background:var(--krem, #FFF4CC)"></div>
      <button class="btn tam" id="iaGit">${ic('yildiz', 18, '#fff')}Bilgileri doldur</button>`, (s) => {
    let iaAna = 'emlak';
    s.querySelectorAll('[data-iatur]').forEach((x) => (x.onclick = () => { iaAna = x.dataset.iatur; s.querySelectorAll('[data-iatur]').forEach((y) => { y.classList.toggle('secili', y === x); y.setAttribute('aria-selected', y === x); }); }));
    $('#iaGit', s).onclick = async () => {
      const metin = $('#iaMetin', s).value.trim(), b = $('#iaGit', s);
      const link = (metin.match(/https?:\/\/\S+/) || [])[0];
      const yalnizLink = link && metin.replace(link, '').trim().length < 30;
      if (!yalnizLink && metin.length < 30) return toast('İlan bağlantısını ya da ilan metnini yapıştır.');
      kayit('aktar_basla', (yalnizLink ? 'link ' + link : 'metin ' + metin.length) + ' · tarayici:' + tarayiciVar());
      const korumali = yalnizLink && /(^|\.)(sahibinden\.com|shbd\.io)\//i.test(link.replace(/^https?:\/\//, '').replace(/\/.*/, '') + '/');
      // Telefonda: ilan uygulama içi tarayıcıda açılır, kullanıcı "Mülküm360'a aktar"a basınca ekrandaki sayfa okunur
      let sayfa = null;
      // Bilgi ekranı: hangi adımda olduğu beklerken görünür
      let ek = null; const ekKapat = () => { if (ek) { ek.kapat(); ek = null; } };
      const ekAc = () => { if (!ek) ek = aktarIlerleme(yalnizLink ? ['ac', 'oku', 'ai', 'foto', 'form'] : ['ai', 'form'], s); return ek; };
      const tarayicidaAc = async () => {
        ekAc().simdi('ac', 'İlan açılacak ve bilgiler okununca kendiliğinden kapanacak. Beklemek istemezsen üstteki ✓ Aktar düğmesine bas.');
        await new Promise((r) => setTimeout(r, 1200)); ek.gizle(true);
        try { return await sayfadanOku(link); } finally { if (ek) { ek.gizle(false); ek.simdi('oku', 'Sayfa okundu'); } }
      };
      if (yalnizLink && tarayiciVar()) {
        if (korumali) {
          try { b.disabled = true; b.textContent = 'İlan açılıyor…'; sayfa = await tarayicidaAc(); }
          catch (x) { ekKapat(); b.disabled = false; b.innerHTML = ic('yildiz', 18, '#fff') + 'Bilgileri doldur'; return toast(x.message); }
        }
      } else if (korumali) {
        // Web sürümü: uygulama içi tarayıcı yok, kopyala-yapıştır yönlendirmesi
        const y = $('#iaYardim', s);
        y.hidden = false;
        y.innerHTML = `<b>Sahibinden bağlantıdan okumaya izin vermiyor.</b><br>1. Aşağıdaki düğmeyle ilanı aç.<br>2. İlan başlığına, fiyata ve açıklamaya uzun bas, <b>Tümünü seç → Kopyala</b>.<br>3. Buraya dön, kutudaki bağlantıyı silip metni yapıştır, <b>Bilgileri doldur</b>'a bas.
          <a class="btn tam" style="margin-top:8px" href="${kac(link)}" target="_blank" rel="noopener">İlanı sahibinden'de aç</a>`;
        return;
      }
      b.disabled = true; b.textContent = sayfa ? 'MülkümAI okuyor…' : yalnizLink ? 'İlan sayfası okunuyor…' : 'MülkümAI okuyor…';
      try {
        // Sunucu bağlantıyı okuyamazsa (bot koruması) telefonda uygulama içi tarayıcıya geçilir
        ekAc();
        if (yalnizLink && !sayfa) ek.simdi('oku', 'İlan sayfası sunucudan okunuyor');
        if (yalnizLink && !sayfa && tarayiciVar()) {
          try { await aiSor('ice_aktar', { url: link, sadeceDene: true }); } catch (x) { if (/izin vermiyor|okunamad|geçersiz/i.test(x.message)) { b.textContent = 'İlan açılıyor…'; sayfa = await tarayicidaAc(); b.textContent = 'MülkümAI okuyor…'; } }
        }
        ek.simdi('ai', 'Yapay zekâ ilan metnini alanlara ayırıyor (10–30 sn)');
        // Alan şablonu uygulamanın kendi listelerinden: seçenekli alanlar yalnız bu değerleri alır
        const sema = [iaAna].map((a) => `[${a === 'emlak' ? 'EMLAK ilanıysa' : 'VASITA (araç) ilanıysa'}]\n` + ALANLAR[a].map(([k, ad, tur, sec]) => `${k} (${ad.replace(/<[^>]+>/g, '')}): ${k === 'marka' ? 'markanın tam adı (ör. Volkswagen, Mercedes-Benz)' : k === 'model' ? 'seri ve paket (ör. Jetta 1.6 TDI Comfortline)' : sec ? sec.slice(0, 40).join(' | ') : tur === 'sayi' ? 'yalnız rakam' : 'metin'}`).join('\n')).join('\n')
          + `\nBu bir ${iaAna === 'emlak' ? 'EMLAK' : 'ARAÇ (vasıta)'} ilanıdır. alt (kategori) yalnız şunlardan biri: ${altlari(iaAna).map((k) => k + '=' + ALT[k].ad).join(', ')}.${iaAna === 'vasita' ? ' m², oda, kat, mahalle ve sokak yazma; marka, model, yıl, km, yakıt, vites, kasa, renk, boya/değişen (hasar) alanlarını doldur.' : ''}`;
        const cevap = await aiSorTam('ice_aktar', sayfa ? { metin: sayfa.t, sayfa: true, sema } : yalnizLink ? { url: link, sema } : { metin, sema });
        const ham = cevap.metin || '';
        if (!sayfa && (cevap.fotolar || []).length) sayfa = { f: cevap.fotolar };
        const v = JSON.parse(ham.slice(ham.indexOf('{'), ham.lastIndexOf('}') + 1));
        const aracMi = !!(v.marka || v.km || v.vites || v.yakit) && !(+v.m2net > 0 || v.oda);
        const alt = ALT[v.alt]?.ana === iaAna ? v.alt : iaAna === 'vasita' ? 'otomobil' : 'konut', ana = iaAna, al = {}; void aracMi;
        ALANLAR[ana].forEach(([k, , tur, sec]) => {
          if (v[k] == null || v[k] === '') return;
          if (tur === 'sayi') { const n = sayiCoz(v[k]); if (n) al[k] = String(n); }
          else if (sec) { const s = secenekBul(sec, v[k]); if (s) al[k] = s; }
          else al[k] = String(v[k]).slice(0, 80);
        });
        if (ana === 'emlak' && v.mahalle) al.mahalle = String(v.mahalle).replace(/\s*(mahallesi|mah\.?)$/i, '');
        if (ana === 'emlak' && v.sokak) al.sokak = String(v.sokak).slice(0, 80);
        if (ana === 'vasita') { const mk = markaBul(v.marka); if (mk) al.marka = mk; if (al.model || v.model) al.model = aracModelEsle(al.marka, al.model || v.model); }
        const il = ILLER.find((x) => x.toLocaleLowerCase('tr') === String(v.il || '').trim().toLocaleLowerCase('tr')) || '';
        taslak = { adim: 1, fotolar: [], alt, baslik: buyukHarfDuzelt(String(v.baslik || '')).slice(0, 80), fiyat: sayiCoz(v.fiyat), il, ilce: String(v.ilce || '').trim(), aciklama: aciklamaSec(v.aciklama, yalnizLink ? '' : metin), alanlar: al };
        // Sayfadaki ilan fotoğrafları (izin veren sunucudan) indirilir; olmazsa kullanıcı ekler
        const dolu = [taslak.baslik && 'başlık', taslak.fiyat && 'fiyat', al.m2net && 'm²', al.oda && 'oda', al.marka && 'marka', al.model && 'model', al.yil && 'yıl', al.km && 'km', taslak.il && 'konum', taslak.aciklama && 'açıklama'].filter(Boolean);
        if (sayfa && sayfa.f && sayfa.f.length) {
          let n = 0; sayfa.f = galeriSec(sayfa.f); const N = Math.min(FOTO_SINIR, sayfa.f.length);
          for (const u of sayfa.f.slice(0, FOTO_SINIR)) { ++n; b.textContent = `Fotoğraflar alınıyor ${n}/${N}…`; ek.simdi('foto', `${n} / ${N} · ${taslak.fotolar.length} eklendi`); try { taslak.fotolar.push(await fotoKucult(await urlDosya(u))); } catch (_) {} }
        } else if (yalnizLink) ek.simdi('foto', 'Sayfada fotoğraf bulunamadı; sonra telefonundan ekleyebilirsin');
        ek.simdi('form', `Bulunan: ${dolu.join(', ') || 'yok'}${taslak.fotolar.length ? ` · ${taslak.fotolar.length} fotoğraf` : ''}`);
        await new Promise((r) => setTimeout(r, 900));
        kayit('aktar_tamam', dolu.join(',') + ' · ' + taslak.fotolar.length + ' foto');
        ekKapat(); sheetKapat(); toast(`Bilgiler dolduruldu${taslak.fotolar.length ? `, ${taslak.fotolar.length} fotoğraf eklendi` : ''}; kontrol et`); ciz();
      } catch (x) { kayit('aktar_hata', x && x.message); ekKapat(); toast(x && x.message && !/JSON|Unexpected/.test(x.message) ? x.message : 'Metin okunamadı; bilgileri elle girebilirsin.'); b.disabled = false; b.innerHTML = ic('yildiz', 18, '#fff') + 'Bilgileri doldur'; }
    };
  });
  app.querySelectorAll('[data-alt]').forEach((x) => (x.onclick = () => { if (t.alt && ALT[t.alt].ana !== ALT[x.dataset.alt].ana) t.alanlar = {}; t.alt = x.dataset.alt; t.adim = 1; ciz(); }));
  const ds = $('#dosya'); if (ds) ds.onchange = async () => {
    topla(); const yer = FOTO_SINIR - t.fotolar.length;
    for (const d of [...ds.files].slice(0, yer)) { try { t.fotolar.push(await fotoKucult(d)); } catch (_) { toast('Bir fotoğraf okunamadı'); } }
    ciz();
  };
  app.querySelectorAll('[data-sil]').forEach((x) => (x.onclick = (e) => { e.stopPropagation(); topla(); t.fotolar.splice(+x.dataset.sil, 1); ciz(); }));
  app.querySelectorAll('.foto-izgara .f').forEach((x, n) => (x.onclick = () => { if (!n) return; topla(); t.fotolar.unshift(t.fotolar.splice(n, 1)[0]); ciz(); toast('Kapak fotoğrafı değişti'); }));
  $('#kapat').onclick = async () => { if (t.adim > 0 && !(await onayla('Çıkılsın mı?', t.id ? 'Kaydedilmemiş değişiklikler silinecek.' : 'Taslak bu oturum boyunca saklanır; dilediğinde devam edebilirsin.', 'Çık'))) return; if (t.id) taslak = null; history.length > 1 ? history.back() : git('#/'); };
  const gb = $('#geriAdim'); if (gb) gb.onclick = () => { topla(); t.adim--; ciz(); };
  $('#ileri').onclick = async () => {
    topla(); const h = $('#hata'); h.textContent = '';
    if (t.adim === 0) return hataGoster(h, 'Bir kategori seç.');
    if (t.adim === 1) {
      if (t.baslik.length < 10) return hataGoster(h, 'Başlık en az 10 karakter olmalı.');
      if (/(\d[\s-]?){10,}|@|whatsapp/i.test(t.baslik)) return hataGoster(h, 'Başlığa telefon, e-posta ya da yönlendirme yazma.');
    }
    if (t.adim === 2) {
      const ana = ALT[t.alt].ana;
      const eksik = ALANLAR[ana].filter(([k, , , , z]) => z && !(t.alt === 'arsa' && k === 'oda') && !t.alanlar[k]).map(([, ad]) => ad.replace(/<[^>]+>/g, ''));
      if (!t.il) eksik.push('İl');
      if (!(t.fiyat > 0)) eksik.push('Fiyat');
      if (eksik.length) return hataGoster(h, 'Eksik: ' + eksik.join(', '));
      if (ana === 'vasita' && (+t.alanlar.yil < 1950 || +t.alanlar.yil > new Date().getFullYear() + 1)) return hataGoster(h, 'Model yılını kontrol et.');
    }
    if (t.adim === 3) {
      if (!$('#dogru').checked) return hataGoster(h, 'Yayınlamak için onay kutusunu işaretle.');
      let eid = null;
      if (eidsAcik() && ALT[t.alt].ana === 'vasita') {
        const p = plakaDuzelt($('#ePlaka')?.value), sa = ($('#eSasi')?.value || '').trim().toUpperCase().replace(/\s/g, ''), yt = $('#eYontem')?.value || 'sahibim', yk = ($('#eYetki')?.value || '').trim();
        if (!t.id || p || yk || yt !== 'sahibim') {
          if (!plakaGecerli(p)) return hataGoster(h, 'EİDS doğrulaması için plakayı yaz (ör. 34 ABC 123).');
          if (!sasiGecerli(sa)) return hataGoster(h, 'Şasi numarası 17 karakter olmalı ya da boş bırak.');
          if (yt === 'yetkili' && yk.length < 6) return hataGoster(h, 'Yetki belge numarasını gir.');
          eid = { tasit: true, yontem: yt, plaka: p, sasi: sa, yetki: yk }; t.eids = eid;
        }
      }
      if (eidsAcik() && ALT[t.alt].ana === 'emlak') {
        const no = ($('#eNo')?.value || '').replace(/\D/g, ''), yt = $('#eYontem')?.value || 'sahibim', yk = ($('#eYetki')?.value || '').trim();
        if (!t.id || no || yk || yt !== 'sahibim') {
          if (!/^[0-9]{8,20}$/.test(no)) return hataGoster(h, 'EİDS doğrulaması için taşınmaz numarası (8–20 hane) gerekli — e-Devlet Tapu Bilgileri Sorgulama.');
          if (yt === 'yetkili' && yk.length < 6) return hataGoster(h, 'Yetki belge numarasını gir.');
          eid = { yontem: yt, no, yetki: yk }; t.eids = eid;
        }
      }
      const btn = $('#ileri'); btn.disabled = true; btn.textContent = 'Kaydediliyor…';
      const duzenleme = !!t.id;
      const i = await dene(() => ilanKaydet(t, (m) => (btn.textContent = m)));
      if (!i) { btn.disabled = false; btn.textContent = duzenleme ? 'Değişiklikleri kaydet' : 'İlanı yayınla'; return; }
      let eidsOldu = false;
      if (eid) { try { if (eid.tasit) await eidsIsteTasit(i.id, eid.yontem, eid.plaka, eid.sasi, eid.yetki); else await eidsIste(i.id, eid.yontem, eid.no, eid.yetki); eidsOldu = true; } catch (x) { toast('İlan kaydedildi; doğrulama talebi gönderilemedi: ' + hataMetni(x)); } }
      taslak = null; if (!duzenleme) try { localStorage.removeItem('ilanTaslak'); } catch (_) {}
      toast(duzenleme ? (eidsOldu ? 'Kaydedildi — doğrulama sonrası yayına çıkacak' : 'İlan güncellendi') : eidsOldu ? 'İlanın doğrulamaya alındı — onaylanınca otomatik yayına çıkacak' : 'İlanın yayında!'); git('#/ilan/' + i.id);
      if (!duzenleme && !eid) setTimeout(() => yayinSonrasi(ilan(i.id) || i), 900);
      return;
    }
    t.adim++; ciz();
  };
};

// Yeni ilan yayınlanınca: ilanı güçlendirme önerileri (kredi satışının en doğal anı)
function yayinSonrasi(i) {
  if (!i || !location.hash.startsWith('#/ilan/')) return;
  const foto = (i.fotolar || []).length, b = ben();
  const secenek = [
    foto && i.ana === 'emlak' ? ['foto', 'MülkümVideo Drone', 'Dış cephe fotoğrafından havadan görünüm · 3 kredi', 'video'] : null,
    foto && i.ana === 'emlak' ? ['yildiz', 'MülkümDeko ile odaları döşe', 'Boş ya da eski odayı lüks stilde göster · 1 kredi', 'deko'] : null,
    foto ? ['foto', i.ana === 'emlak' ? 'MülkümVideo Tanıtım' : 'MülkümVideo Araç Tanıtımı', i.ana === 'emlak' ? 'Fotoğrafından kısa video; Reels ve WhatsApp durumu için dikey video · 3 kredi' : 'Araç fotoğrafından hareketli tanıtım videosu; Reels ve WhatsApp durumu için · 3 kredi', 'video'] : null,
    i.ana === 'vasita' ? ['grafik', 'Fiyatın piyasaya göre nerede?', 'TSB kasko değeri ve benzer ilanlarla karşılaştır · ücretsiz', 'deger'] : null,
    ['paylas', 'İlanını paylaş', 'WhatsApp, Instagram ve gruplarında ücretsiz duyur', 'paylas']
  ].filter(Boolean);
  sheetAc(`<h2 style="font-size:19px;font-weight:800">İlanın yayında</h2><div class="k soluk">Fotoğrafları güçlü ilanlar daha çok mesaj alıyor. Bir sonraki adım:</div>
    <div class="liste">${secenek.map(([ik, b2, a, k]) => `<button class="oge" data-ys="${k}" style="align-items:flex-start">${ic(ik, 20)}<div class="ara" style="text-align:left"><b>${b2}</b><div class="k soluk">${a}</div></div><span class="ok">›</span></button>`).join('')}</div>
    ${b ? `<div class="k soluk" style="text-align:center">Bakiyen: <b>${b.kredi ?? 0} kredi</b> · <a href="#/kredi">Kredi al</a></div>` : ''}
    <button class="btn sade tam" id="ysKapat">Şimdilik geç</button>`, (s) => {
    $('#ysKapat', s).onclick = sheetKapat;
    s.querySelector('a[href="#/kredi"]')?.addEventListener('click', sheetKapat);
    s.querySelectorAll('[data-ys]').forEach((x) => (x.onclick = () => {
      sheetKapat(); const k = x.dataset.ys;
      setTimeout(() => { if (k === 'video' && typeof videoSheet === 'function') videoSheet(i); else if (k === 'deko') dekoSheet(i); else if (k === 'deger') git('#/degerle?ilan=' + i.id); else if (k === 'paylas') $('#paylas')?.click(); }, 250);
    }));
  });
}

// ---------- Favoriler, kayıtlı aramalar ----------
EKRAN.favori = () => {
  if (girisGerek('Favorilerin için giriş yap')) return;
  const l = (ben().favoriler || []).map(ilan).filter(Boolean);
  app.innerHTML = ustBar('Favorilerim') + `<div class="ic">${l.length ? `<div class="ilan-izgara">${l.map((i) => ilanKart(i)).join('')}</div>` : bosDurum('kalp', 'Favorin yok', 'Beğendiğin ilanlarda kalbe dokun; fiyat ve durum değişikliklerini buradan takip et.', '<a class="btn" href="#/">İlanlara göz at</a>')}</div>`;
  navCiz('favori');
};
// ---------- Bildirimler (gelen kutusu) ----------
const okunmamisBildirim = () => (S.bildirimler || []).filter((x) => !x.okundu).length;
EKRAN.bildirimler = () => {
  if (girisGerek('Bildirimler için giriş yap')) return;
  const l = S.bildirimler || [], yeni = l.filter((x) => !x.okundu).map((x) => x.id);
  const ikon = { onay_bekliyor: 'kalkan', ilan_onay: 'tik', ilan_red: 'uyari', piyasa: 'grafik', doping_talep: 'yildiz', doping_onay: 'yildiz', doping_red: 'uyari' };
  const zaman = (t) => new Date(t).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  app.innerHTML = ustBar('Bildirimler') + `<div class="ic">
    <a class="kart satir" href="#/kayitli" style="text-decoration:none;color:inherit">${ic('zil', 22, 'var(--vurgu-ikon)')}<div class="ara"><b>Kayıtlı aramalarım</b><div class="k soluk">Yeni ilan çıkınca haber veririz</div></div><span class="ok">›</span></a>
    ${l.length ? `<div class="liste">${l.map((x) => `<a class="oge" href="${kac(x.link || '#/')}" style="text-decoration:none;color:inherit;align-items:flex-start${x.okundu ? '' : ';background:var(--vurgu-acik)'}">${ic(ikon[x.tur] || 'zil', 20)}<div class="ara"><b>${kac(x.baslik)}</b><div class="k soluk" style="line-height:1.45">${kac(x.metin || '')}</div><div class="k soluk" style="font-size:11.5px;margin-top:2px">${zaman(x.olusturma)}</div></div><span class="ok">›</span></a>`).join('')}</div>` : bosDurum('zil', 'Bildirim yok', 'İlanın onaylandığında ya da yeni bir gelişme olduğunda burada görünür.')}
  </div>`;
  navCiz();
  if (yeni.length) { l.forEach((x) => { if (yeni.includes(x.id)) x.okundu = true; }); sb.from('bildirimler').update({ okundu: true }).in('id', yeni).then(() => {}, () => {}); }
};
EKRAN.kayitli = () => {
  if (girisGerek('Kayıtlı aramaların için giriş yap')) return;
  const l = S.kayitliAramalar.filter((a) => a.sahip === ben().id);
  app.innerHTML = ustBar('Kayıtlı aramalar') + `<div class="ic">${l.length ? `<div class="liste">${l.map((a) => {
    const yeni = aramaYap(a.q).filter((i) => i.olusturma > a.son).length;
    return `<div class="satir" style="padding:10px 14px;border-bottom:1px solid var(--yuzey2)"><button class="oge ara" data-ac="${a.id}" style="border:0;background:none;text-align:left;padding:6px 0;cursor:pointer"><b style="font-size:14px">${kac(a.ad)}</b><div class="k ${yeni ? '' : 'soluk'}" style="color:${yeni ? 'var(--vurgu-koyu)' : ''};font-weight:600">${yeni ? yeni + ' yeni ilan' : 'Yeni ilan yok'}</div></button>
      <button class="ikon-btn" data-sil="${a.id}" aria-label="Aramayı sil">${ic('cop', 18)}</button></div>`;
  }).join('')}</div>` : bosDurum('zil', 'Kayıtlı araman yok', 'Arama sonuçlarında “Kaydet”e dokun; yeni ilanlar geldiğinde Keşfet’te haber verelim.', '<a class="btn" href="#/ara">Aramaya başla</a>')}</div>`;
  app.querySelectorAll('[data-ac]').forEach((x) => (x.onclick = () => { const a = S.kayitliAramalar.find((y) => y.id === x.dataset.ac); aramaGoruldu(a); git('#/ara?' + a.q); }));
  app.querySelectorAll('[data-sil]').forEach((x) => (x.onclick = async () => { if (await dene(() => aramaSil(x.dataset.sil), 'Arama silindi')) ciz(); }));
  navCiz('hesap');
};

// ---------- Hesabım ----------
const WEB_ARACLAR = [
  ['arsa', 'TAKBİS parsel sorgulama', 'Ada · parsel · pafta — kadastro haritasında açılır', 'https://parselsorgu.tkgm.gov.tr/'],
  ['kilit', 'Web Tapu', 'Tapu işlemleri, satış başvurusu ve tapu bilgileri (e-Devlet ile giriş)', 'https://webtapu.tkgm.gov.tr/'],
  ['kalkan', 'e-Devlet', 'Tapu, imar ve resmî sorgular için kapı', 'https://www.turkiye.gov.tr/'],
  ['bina', 'Tapu ve Kadastro (TKGM)', 'Resmî duyuru ve bilgilendirme hizmetleri', 'https://www.tkgm.gov.tr/'],
  ['belge', 'DASK poliçe doğrulama', 'Zorunlu deprem sigortası sorgusu', 'https://www.dask.gov.tr/'],
  ['numara', 'GİB emlak vergisi', 'Rayiç ve emlak vergisi sorguları', 'https://www.gib.gov.tr/'],
];
const ARAC_ARACLAR = [
  ['grafik', 'Kasko değeri (Mülküm360)', 'Marka, model, yıl ve km ile TSB kasko değerine göre fiyat aralığı', '#/degerle?ana=vasita'],
  ['belge', 'TSB Kasko Değer Listesi', 'Türkiye Sigorta Birliği aylık resmî liste, Excel indir', 'https://www.tsb.org.tr/tr/kasko-deger-listesi'],
  ['kalkan', 'Trafik cezası sorgulama', 'Plakaya yazılan ceza (e-Devlet)', 'https://www.turkiye.gov.tr/emniyet-arac-plakasina-yazilan-ceza-sorgulama'],
  ['uyari', 'Hasar kaydı (SBM / TRAMER)', 'Sigorta Bilgi ve Gözetim Merkezi; SMS ile: "HASAR boşluk şasi no" → 5664', 'https://www.sbm.org.tr/'],
  ['takvim', 'TÜVTÜRK araç muayene', 'Muayene tarihi sorgu ve randevu', 'https://www.tuvturk.com.tr/'],
  ['numara', 'MTV sorgulama ve ödeme', 'GİB Dijital Vergi Dairesi', 'https://dijital.gib.gov.tr/'],
  ['kilit', 'Noter araç satışı', 'Türkiye Noterler Birliği portalı', 'https://www.tnb.org.tr/'],
  ['bina', 'Emniyet Genel Müdürlüğü', 'Trafik tescil duyuruları ve hizmetleri', 'https://www.egm.gov.tr/']
];
// Araç ilanı: alıcının almadan önce yapacağı resmî kontroller
function aracKontrolKarti(i) {
  const f = i.alanlar || {};
  const satir = (ik, b, a, url) => `<button class="oge" data-web="${url}">${ic(ik, 20)}<div class="ara"><b>${b}</b><div class="k soluk">${a}</div></div><span class="ok">›</span></button>`;
  return `<div class="kart"><h3>Almadan Önce Kontrol Et</h3><div class="liste">
    ${satir('uyari', 'Hasar kaydı (TRAMER)', 'Satıcıdan şasi numarasını iste; SMS ile "HASAR şasi no" yazıp 5664\'e gönder', 'sms:5664?body=HASAR%20')}
    ${satir('grafik', 'Kasko değeri', `TSB listesine göre ${kac([f.marka, f.model, f.yil].filter(Boolean).join(' ')) || 'bu aracın'} değer aralığı`, '#/degerle?ilan=' + i.id)}
    ${satir('kalkan', 'Trafik cezası', 'Plakaya yazılmış ceza var mı (e-Devlet)', 'https://www.turkiye.gov.tr/emniyet-arac-plakasina-yazilan-ceza-sorgulama')}
    ${satir('takvim', 'Muayene durumu', 'TÜVTÜRK muayene tarihi ve geçmişi', 'https://www.tuvturk.com.tr/')}
    ${satir('kilit', 'Noter satışı', 'Ödemeyi noterde, satışla aynı anda yap', 'https://www.tnb.org.tr/')}
  </div><div class="k soluk" style="font-size:12px">Ağır hasar, çekme belgesi ve rehin/haciz kaydını satıştan önce mutlaka sorgula.</div></div>`;
}
const webAc = async (url) => {
  if (String(url).startsWith('sms:')) { location.href = url; return; }
  if (String(url).startsWith('#/')) return git(url);
  kayit('web_ac', String(url).slice(0, 70));
  const B = window.Capacitor?.Plugins?.Browser;
  if (B) { try { await B.open({ url }); return; } catch (_) { } }
  const w = window.open(url, '_blank');
  if (!w) location.href = url;
};
const aracBolumu = () => katla('Resmî sorgulamalar', 'kalkan', `<div class="segment" role="tablist" id="sorguTur"><button type="button" role="tab" class="secili" aria-selected="true" data-sorgu="emlak">${ic('ev', 16)}Emlak</button><button type="button" role="tab" aria-selected="false" data-sorgu="vasita">${ic('araba', 16)}Motorlu Araçlar</button></div><div class="liste" data-sorgu-l="vasita" hidden>${ARAC_ARACLAR.map(([ik, ad, ac, url]) => `<button class="oge" data-web="${url}">${ic(ik, 20)}<div class="ara"><b>${ad}</b><div class="k soluk">${ac}</div></div><span class="ok">›</span></button>`).join('')}</div><div class="liste" data-sorgu-l="emlak">${WEB_ARACLAR.map(([ik, ad, ac, url]) => `<button class="oge" data-web="${url}">${ic(ik, 20)}<div class="ara"><b>${ad}</b><div class="k soluk">${ac}</div></div><span class="ok">›</span></button>`).join('')}</div>`);
const webBagla = () => {
  app.querySelectorAll('[data-web]').forEach((x) => (x.onclick = () => webAc(x.dataset.web)));
  app.querySelectorAll('[data-sorgu]').forEach((x) => (x.onclick = () => { app.querySelectorAll('[data-sorgu]').forEach((y) => { y.classList.toggle('secili', y === x); y.setAttribute('aria-selected', y === x); }); app.querySelectorAll('[data-sorgu-l]').forEach((l) => (l.hidden = l.dataset.sorguL !== x.dataset.sorgu)); }));
};
EKRAN.hesap = () => {
  const b = ben();
  if (!b) {
    app.innerHTML = ustBar('Hesabım', '', false) + `<div class="ic">${bosDurum('kisi', 'Mülküm360’a hoş geldin', 'Üyelik ücretsiz, bir dakikada açılır.', '<a class="btn" href="#/kayit">Üye ol</a><a class="btn cizgili" href="#/giris">Giriş yap</a>')}
      <div class="kart"><h3>Üye olunca</h3><div class="liste">${[['ev', 'Ücretsiz ilan ver', 'Linkini yapıştır ya da tapunun fotoğrafını çek, ilanın hazırlansın'], ['grafik', 'Mülkünün değerini öğren', 'Benzer ilanlar ve TCMB endeksiyle PDF değer raporu'], ['kredi', 'Yeni üyeye 1 kredi hediye', 'İlk değer raporun ya da ilk MülkümDeko görselin bizden']].map(([ik, b, a]) => `<div class="oge" style="align-items:flex-start">${ic(ik, 20)}<div class="ara"><b>${b}</b><div class="k soluk">${a}</div></div></div>`).join('')}</div></div>
      ${aracBolumu()}
      <div class="liste">${menuSatir('#/metin/guvenlik', 'kalkan', 'Yardım merkezi')}${dilSatiri()}<div class="oge" style="cursor:default">${ic('ayar', 20)}Uygulama sürümü<span class="ok" style="font-weight:600">${SURUM}</span></div><button class="oge" id="tema">${ic('ay', 20)}Koyu tema<span class="ok">${S.tema === 'koyu' ? 'Açık' : 'Kapalı'}</span></button></div></div>`;
    $('#tema').onclick = temaDegis; { const pb = $('#palet'); if (pb) pb.onclick = paletSecimi; } app.querySelectorAll('[data-dil]').forEach((b) => (b.onclick = () => dilSec(b.dataset.dil))); webBagla(); navCiz('hesap'); return;
  }
  const benim = S.ilanlar.filter((i) => i.sahip === b.id);
  const sekme = sorgu().s || 'yayinda';
  const favAlan = Object.values(S.favSayilari || {}).reduce((t, n) => t + n, 0);
  const liste = benim.filter((i) => i.durum === sekme).sort((x, y) => y.olusturma - x.olusturma);
  app.innerHTML = kartvizit(b, benim, favAlan) + `
    <div class="ic">
      ${cuzdanKarti(b)}
      <div class="bolum-bas"><h2>İlanlarım</h2>${benim.length ? `<a href="#/ver">+ Yeni ilan</a>` : ''}</div>
      <div class="ciplar"><button class="cip ${sekme === 'yayinda' ? 'secili' : ''}" data-s="yayinda">Yayında · ${benim.filter((i) => i.durum === 'yayinda').length}</button>${eidsAcik() && benim.some((i) => i.durum === 'onayda') ? `<button class="cip ${sekme === 'onayda' ? 'secili' : ''}" data-s="onayda">Doğrulanıyor · ${benim.filter((i) => i.durum === 'onayda').length}</button>` : ''}<button class="cip ${sekme === 'satildi' ? 'secili' : ''}" data-s="satildi">Satıldı / kiralandı · ${benim.filter((i) => i.durum === 'satildi').length}</button>${benim.some((i) => i.durum === 'kaldirildi') ? `<button class="cip ${sekme === 'kaldirildi' ? 'secili' : ''}" data-s="kaldirildi">Yayından kaldırıldı · ${benim.filter((i) => i.durum === 'kaldirildi').length}</button>` : ''}</div>
      ${sekme === 'kaldirildi' && liste.length ? `<div class="uyari-k">${ic('uyari', 18)}<div>Bu ilanlar şikayet ya da kural ihlali nedeniyle yönetim tarafından yayından kaldırıldı. Düzenleyip destekle iletişime geçebilirsin.</div></div>` : ''}
      ${liste.length ? liste.map((i) => {
        const e = emsalDurumu(i);
        const ip = e && e.konum > 0.7 && Date.now() - i.olusturma > 7 * 86400000 ? `<div class="uyari-k" style="margin-top:6px">${ic('grafik', 16)}<div>Fiyatın benzer ilanların üstünde. ${tl(e.orta)} civarı daha çok ilgi görebilir.<br><a href="#/degerle?ilan=${i.id}" style="font-weight:700">Değer raporu al · 1 kredi ›</a></div></div>` : '';
        return `<div style="display:flex;flex-direction:column;gap:6px">${ilanSatir(i, `<div class="perf"><span>${ic('goz', 12)} ${i.goruntulenme || 0}</span><span>${ic('kalp', 12)} ${(S.favSayilari || {})[i.id] || 0}</span><span>${ic('mesaj', 12)} ${S.sohbetler.filter((s) => s.ilanId === i.id && s.mesajlar.length).length}</span><span>${Math.max(1, Math.round((Date.now() - i.olusturma) / 86400000))}. gün</span></div>`)}${ip}
          <button class="btn sade tam ilan-yonet" data-yonet="${i.id}">${ic('ayar', 16)}İlanı yönet${(i.fotolar || []).length ? '' : ' · fotoğraf yok'}</button>
          <div hidden><a href="#/ver/${i.id}" data-duzenle="${i.id}">Düzenle</a>${i.durum === 'onayda' && eidsAcik() ? `<button class="btn sade kucuk" data-eids="${i.id}">EİDS doğrulaması</button>` : i.durum === 'kaldirildi' ? '' : `<button class="btn sade kucuk" data-durum="${i.id}">${i.durum === 'yayinda' ? 'Satıldı' : 'Yayına al'}</button>`}<button class="btn sade kucuk" data-ilansil="${i.id}" style="color:var(--hata)">Sil</button>
          ${(i.fotolar || []).length < FOTO_SINIR ? `<label class="btn ${(i.fotolar || []).length ? 'sade' : 'cizgili'} kucuk tam">${ic('foto', 16)}${(i.fotolar || []).length ? 'Fotoğraf ekle (' + i.fotolar.length + '/' + FOTO_SINIR + ')' : 'Fotoğraf ekle — bu ilanda fotoğraf yok'}<input type="file" accept="image/*" multiple hidden data-fotoekle="${i.id}"></label>` : ''}</div></div>`;
      }).join('') : bosDurum('ev', sekme === 'yayinda' ? 'Yayında ilanın yok' : sekme === 'satildi' ? 'Henüz satış yok' : 'Bu bölümde ilan yok', sekme === 'yayinda' ? 'İlk ilanını bir dakikada ver.' : sekme === 'satildi' ? 'Satılan ya da kiralanan ilanların burada listelenir.' : '', sekme === 'yayinda' ? '<a class="btn" href="#/ver">İlan ver</a>' : '')}
      ${b.ofis ? '' : `<a class="kart satir" href="#/profil" style="text-decoration:none;color:inherit">${ic('kalkan', 22, 'var(--vurgu-ikon)')}<div class="ara"><b>Emlak ofisi ya da galeri misin?</b><div class="k soluk">Hesabını kurumsala çevir; panel, toplu yükleme ve kurumsal rozet açılsın</div></div><span class="ok">›</span></a>`}
      ${b.ofis ? katla('Kurumsal hesap', 'ofis', `<div class="liste">
        ${menuSatir('#/panel', 'ofis', 'Ofis paneli')}
        <button class="oge" id="davet">${ic('paylas', 20)}Davet et, ikiniz de 3 kredi kazanın<span class="ok">›</span></button>
        ${Date.now() - b.olusturma < 7 * 86400000 ? `<button class="oge" id="davetKod">${ic('kredi', 20)}Davet kodum var<span class="ok">›</span></button>` : ''}
        ${b.firma || b.yetkiNo ? '' : menuSatir('#/profil', 'kalkan', 'Kurumsal rozet başvurusu')}
      </div>`) : ''}
      ${aracBolumu()}
      ${katla('Takip listem', 'kalp', `<div class="liste">
        ${menuSatir('#/mesajlar', 'mesaj', 'Mesajlarım', okunmamis() || '')}
        ${menuSatir('#/favori', 'kalp', 'Favorilerim', (ben().favoriler || []).length)}
        ${menuSatir('#/kayitli', 'zil', 'Kayıtlı aramalar', S.kayitliAramalar.filter((a) => a.sahip === b.id).length)}
        ${menuSatir('#/raporlar', 'belge', 'Değerleme raporlarım', (b.raporlar || []).length)}
      </div>`, [okunmamis() ? okunmamis() + ' yeni mesaj' : '', (ben().favoriler || []).length ? (ben().favoriler || []).length + ' favori' : ''].filter(Boolean).join(' · '))}
      ${katla('Ayarlar', 'ayar', `<div class="ayar-izgara">
        <a class="ayar-d" href="#/profil">${ic('profil', 22)}<span>Profil ayarları</span></a>
        <button class="ayar-d" data-dilac>${ic('dil', 22)}<span>Dil · ${DILLER.find(([k]) => k === DIL)[1]}</span></button>
        <button class="ayar-d" id="tema">${ic('tema', 22)}<span>${S.tema === 'koyu' ? 'Açık tema' : 'Koyu tema'}</span></button>
        <button class="ayar-d" id="palet">${ic('ayar', 22)}<span>Renk paleti · ${PALETLER.find((p) => p[0] === (S.palet || 'prestij'))[1]}</span></button>
        ${BLD ? `<button class="ayar-d" id="bldAyar">${ic('bildirim', 22)}<span>Bildirimler · ${bldAcik() ? 'açık' : 'kapalı'}</span></button>` : ''}
        <a class="ayar-d" href="#/metin/guvenlik">${ic('yardim', 22)}<span>Yardım merkezi</span></a>
        <a class="ayar-d" href="#/metin/kosullar">${ic('yasal', 22)}<span>Yasal bilgiler</span></a>
      </div>`, DILLER.find(([k]) => k === DIL)[1])}
      ${S.yonetici ? `<a class="kart satir yon-kart" href="#/yonetim" style="text-decoration:none;color:inherit;border:1.5px solid var(--vurgu)">${ic('kalkan', 22, 'var(--vurgu-ikon)')}<div class="ara"><b>Yönetim</b><div class="k soluk">Kullanıcılar, kredi satışları, şikayetler, veriler</div></div><span class="rozet" id="yonBekleyen" style="position:static" hidden></span><span class="soluk">›</span></a>` : ''}
      <button class="btn sade tam" id="cikis">${ic('cikis', 18)}Çıkış yap</button>
      <button class="btn tehlike tam" id="hesapSil">Hesabımı sil</button>
      <div class="k soluk" style="text-align:center">Mülküm360 · sürüm ${SURUM}</div>
    </div>`;
  app.querySelectorAll('[data-s]').forEach((x) => (x.onclick = () => git('#/hesap?s=' + x.dataset.s)));
  app.querySelectorAll('[data-yonet]').forEach((x) => (x.onclick = () => {
    const id = x.dataset.yonet, i = ilan(id), q = (s) => app.querySelector(s);
    const sec = [
      ['kalem', 'Düzenle', 'Başlık, fiyat, bilgiler ve açıklama', () => git('#/ver/' + id)],
      q(`[data-fotoekle="${id}"]`) ? ['foto', 'Fotoğraf ekle', `${(i.fotolar || []).length}/${FOTO_SINIR} fotoğraf`, () => q(`[data-fotoekle="${id}"]`).click()] : null,
      q(`[data-eids="${id}"]`) ? ['kalkan', 'EİDS doğrulaması', 'Yayına çıkmak için gerekli', () => q(`[data-eids="${id}"]`).click()] : null,
      q(`[data-durum="${id}"]`) ? ['tik', i.durum === 'yayinda' ? (i.alanlar?.islem === 'Kiralık' ? 'Kiralandı olarak işaretle' : 'Satıldı olarak işaretle') : 'Yeniden yayına al', i.durum === 'yayinda' ? 'İlan yayından kalkar, performansına işlenir' : 'İlan tekrar görünür olur', () => q(`[data-durum="${id}"]`).click()] : null,
      ['goz', 'İlanı görüntüle', 'Alıcıların gördüğü sayfa', () => git('#/ilan/' + id)],
      ['cop', 'İlanı sil', 'Fotoğraflar ve konuşmalar da silinir', () => q(`[data-ilansil="${id}"]`).click(), true]
    ].filter(Boolean);
    sheetAc(`<h2 style="font-size:18px;font-weight:800">${kac(i.baslik)}</h2><div class="liste">${sec.map(([ik, ad, ac, , tehlike], n) => `<button class="oge" data-sec="${n}" style="align-items:flex-start${tehlike ? ';color:var(--hata)' : ''}">${ic(ik, 20)}<div class="ara" style="text-align:left"><b>${ad}</b><div class="k soluk">${ac}</div></div></button>`).join('')}</div>`, (s) => {
      s.querySelectorAll('[data-sec]').forEach((b) => (b.onclick = () => { sheetKapat(); setTimeout(sec[+b.dataset.sec][3], 200); }));
    });
  }));
  webBagla();
  app.querySelectorAll('[data-durum]').forEach((x) => (x.onclick = async () => { const i = ilan(x.dataset.durum); const yeni = i.durum === 'yayinda' ? 'satildi' : 'yayinda'; let fiyat = null; if (yeni === 'satildi') { fiyat = await satisFiyatiSor(i); if (fiyat === undefined) return; } if (await dene(() => ilanDurum(i, yeni, fiyat), yeni === 'satildi' ? 'Hayırlı olsun!' : 'İlan yeniden yayında')) ciz(); }));
  app.querySelectorAll('[data-ilansil]').forEach((x) => (x.onclick = async () => {
    if (!(await onayla('İlan silinsin mi?', 'İlan, fotoğrafları ve ona ait konuşmalar kalıcı olarak silinir.', 'Sil', true))) return;
    if (await dene(() => ilanSil(x.dataset.ilansil), 'İlan silindi')) ciz();
  }));
  $('#tema').onclick = temaDegis; { const pb = $('#palet'); if (pb) pb.onclick = paletSecimi; } app.querySelectorAll('[data-dil]').forEach((b) => (b.onclick = () => dilSec(b.dataset.dil)));
  $('#davet').onclick = () => paylas(davetMetni());
  $('#kvFoto').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    toast('Fotoğraf yükleniyor…');
    try { await profilFotoKaydet(await fotoKucult(f)); toast('Profil fotoğrafın güncellendi'); ciz(); } catch (x) { toast(hataMetni(x)); }
  };
  $('#kvPaylas').onclick = () => paylas(`${b.ad}${b.firma ? ' · ' + b.firma : ''}\nMülküm360'taki ilanlarım: ${S.ilanlar.filter((i) => i.sahip === b.id && i.durum === 'yayinda').length} ilan\nUygulama: https://fatihcalis07-commits.github.io/mulkum360/`);
  const dk = $('#davetKod'); if (dk) dk.onclick = () => sheetAc(`<h2 style="font-size:19px;font-weight:800">Davet kodu</h2><div class="k soluk">Seni davet eden kişinin 8 haneli kodunu yaz; ikinize de 3 kredi yüklenir.</div><label class="alan">Kod<input id="dkKod" maxlength="8" autocapitalize="characters"></label><button class="btn tam" id="dkGonder">Kullan</button>`, (s) => {
    $('#dkGonder', s).onclick = async () => { const k = $('#dkKod', s).value.trim(); if (k.length !== 8) return toast('Kod 8 karakter olmalı.'); if (await davetUygula(k)) { sheetKapat(); ciz(); } };
  });
  const ba = $('#bldAyar'); if (ba) ba.onclick = async () => {
    if (bldAcik()) { try { localStorage.setItem('bildirim', 'kapali'); } catch (_) {} toast('Bildirimler kapatıldı'); }
    else { try { localStorage.removeItem('bildirim'); } catch (_) {} toast((await bildirimIzni(true)) ? 'Bildirimler açık' : 'Telefon ayarlarından Mülküm360 bildirim iznini aç'); }
    gorevHatirlatKur(); ciz();
  };
  // İlan listesinden doğrudan fotoğraf ekleme (toplu yüklenen ilanlar için)
  app.querySelectorAll('[data-fotoekle]').forEach((x) => (x.onchange = async () => {
    const i = ilan(x.dataset.fotoekle), yer = FOTO_SINIR - (i.fotolar || []).length, l = [...x.files].slice(0, yer);
    if (!l.length) return;
    const et = x.parentElement; et.style.pointerEvents = 'none';
    const yaz = (m) => et.childNodes.forEach((c) => c.nodeType === 3 && (c.nodeValue = m)), yeni = [];
    for (const [n, f] of l.entries()) { yaz(`Hazırlanıyor ${n + 1}/${l.length}…`); try { yeni.push(await fotoKucult(f)); } catch (_) {} }
    const t = JSON.parse(JSON.stringify({ ...i })); t.fotolar = [...(i.fotolar || []), ...yeni];
    if (await dene(() => ilanKaydet(t, yaz), `Fotoğraflar eklendi (${yeni.length})`)) ciz(); else et.style.pointerEvents = '';
  }));
  $('#cikis').onclick = async () => { if (await onayla('Çıkış yap', 'Bu cihazdaki oturumun kapanacak.', 'Çıkış yap')) { await dene(cikisYap, 'Çıkış yapıldı'); git('#/'); } };
  $('#hesapSil').onclick = async () => {
    if (!(await onayla('Hesabın silinsin mi?', 'Hesabın, ilanların, fotoğrafların, mesajların ve raporların sunucudan kalıcı olarak silinir. Bu işlem geri alınamaz.', 'Hesabımı sil', true))) return;
    if (await dene(hesabiSil, 'Hesabın silindi')) git('#/');
  };
  navCiz('hesap');
  if (S.yonetici && typeof yonBekleyenYaz === 'function') yonBekleyenYaz().catch(() => {});
};
// Kredi cüzdanı: bakiye + tek dokunuşla kredi alma (Hesabım, yan menü)
const cuzdanKarti = (b, kucuk) => `<a class="cuzdan${kucuk ? ' kucuk' : ''}" href="#/kredi"><span class="cuzdan-ikon">${ic('kredi', kucuk ? 18 : 22)}</span><div class="ara"><div class="cuzdan-ust">Kredin</div><b>${b.kredi ?? 0} kredi</b>${kucuk ? '' : '<div class="cuzdan-alt">Değer raporu, MülkümDeko ve MülkümVideo için</div>'}</div><span class="cuzdan-btn">Kredi al</span></a>`;
// Dil: tek satır (seçili dil görünür), dokununca seçim penceresi açılır
const dilSatiri = () => `<button class="oge" data-dilac data-cevirme>${ic('dil', 20)}Dil / Language / Язык / اللغة<span class="ok">${DILLER.find(([k]) => k === DIL)[1]} ›</span></button>`;
function dilSheet() {
  sheetAc(`<div data-cevirme><h2 style="font-size:19px;font-weight:800">Dil / Language / Язык / Deutsch / العربية</h2><div class="liste">${DILLER.map(([k, a]) => `<button class="oge" onclick="dilSec('${k}')">${ic('dil', 20)}${a}<span class="ok">${k === DIL ? ic('tik', 20, 'var(--birincil)') : ''}</span></button>`).join('')}</div></div>`);
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-dilac]')) { e.preventDefault(); e.stopPropagation(); sheetKapat(); setTimeout(dilSheet, 220); } }, true);
// Avatar: profil fotoğrafı varsa o, yoksa baş harfler
const avatarHtml = (k, boy = 44, sinif = 'avatar') => k?.foto ? `<img class="${sinif}" src="${kac(k.foto)}" alt="" style="width:${boy}px;height:${boy}px;object-fit:cover">` : `<div class="${sinif}" style="width:${boy}px;height:${boy}px">${basHarf(k?.ad || '')}</div>`;
// Hesabım başlığı: kompakt kartvizit (foto, ad, unvan, rozet, sayılar, hızlı düğmeler)
function kartvizit(b, benim, favAlan) {
  const aktif = benim.filter((i) => i.durum === 'yayinda').length, satilan = benim.filter((i) => i.durum === 'satildi').length;
  const alt = [b.unvan, b.firma].filter(Boolean).join(' · ') || (b.ofis ? 'Emlak ofisi' : 'Bireysel üye');
  return `<header class="kartvizit">
    <div class="kv-ust"><label class="kv-foto" aria-label="Profil fotoğrafı değiştir">${avatarHtml(b, 56, 'kv-avatar')}<span class="kv-kamera">${ic('foto', 12)}</span><input type="file" accept="image/*" hidden id="kvFoto"></label>
      <div class="ara" style="min-width:0"><div class="kv-ad">${kac(b.ad)}</div><div class="kv-unvan">${kac(alt)}</div>${b.ofis || b.dogrulanmis ? `<div class="kv-rozet" data-duzen>${ic('kalkan', 11)}${b.dogrulanmis ? 'Doğrulanmış ' : ''}${b.sektor === 'galeri' ? 'Oto Galeri' : b.ofis ? 'Emlak Ofisi' : 'Üye'}</div>` : ''}</div>
      <div class="kv-dugme"><a href="#/uye/${b.id}" aria-label="Profilimi gör">${ic('goz', 18)}</a><button id="kvPaylas" aria-label="Paylaş">${ic('paylas', 18)}</button><a href="#/profil" aria-label="Profili düzenle">${ic('profil', 18)}</a></div></div>
    <div class="kv-sayi"><div><b>${aktif}</b><span>Aktif</span></div><div><b>${satilan}</b><span>Satılan</span></div><div><b>${sayiBicim(benim.reduce((t, i) => t + (i.goruntulenme || 0), 0))}</b><span>Görüntülenme</span></div><div><b>${favAlan}</b><span>Favori</span></div></div>
  </header>`;
}
// Açılır-kapanır bölüm: başlık satırına dokununca içerik açılır (kalabalığı gizler)
const katla = (baslik, ik, icerik, ozet = '', acik = false) => `<details class="katla"${acik ? ' open' : ''}><summary>${ic(ik, 20)}<span class="ara">${baslik}</span>${ozet ? `<small>${ozet}</small>` : ''}${ic('asagi', 18)}</summary><div class="katla-ic">${icerik}</div></details>`;
const menuSatir = (h, ik, ad, say) =>`<a href="${h}">${ic(ik, 20)}${ad}<span class="ok">${say ? say + ' ' : ''}›</span></a>`;
function temaDegis() { S.tema = S.tema === 'koyu' ? 'acik' : 'koyu'; temaUygula(); kaydet(); ciz(); }
const PALETLER = [['prestij', 'Prestij', 'Lacivert · altın — kurumsal', ['#0B1B33', '#FFC72C']], ['vitrin', 'Vitrin', 'Gök mavisi · sarı — pazar yeri', ['#558ED2', '#FFE800', '#1064BC']], ['alev', 'Alev', 'Kırmızı · turkuaz — cesur', ['#F03245', '#00A699']]];
function paletSec(kod) { S.palet = kod; temaUygula(); kaydet(); sheetKapat(); ciz(); }
function paletSecimi() {
  sheetAc(`<h2 style="font-size:19px;font-weight:800">Tema</h2><div class="k soluk" style="margin:4px 0 12px">Renk paleti ve yazı tipi. Koyu tema her paletle çalışır; değer raporları her zaman kurumsal görünür.</div>` +
    PALETLER.map(([k, ad, ac, renkler]) => {
      const secili = (S.palet || 'prestij') === k;
      return `<button class="kart" data-palet="${k}" style="width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer;display:flex;align-items:center;gap:10px;padding:14px;margin-bottom:8px;border:${secili ? '2px solid var(--vurgu-koyu)' : '1px solid var(--cizgi)'}">${renkler.map((c) => `<i style="width:22px;height:22px;border-radius:50%;background:${c};border:1px solid #0002;flex-shrink:0"></i>`).join('')}<div class="ara"><b>${ad}</b><div class="k soluk">${ac}</div></div>${secili ? '<span style="color:var(--vurgu-koyu);font-weight:800">✓</span>' : ''}</button>`;
    }).join(''), (s) => s.querySelectorAll('[data-palet]').forEach((b) => (b.onclick = () => paletSec(b.dataset.palet))));
}
function temaUygula() {
  document.documentElement.classList.toggle('koyu', S.tema === 'koyu');
  const p = S.palet && S.palet !== 'prestij' ? S.palet : '';
  if (p) document.documentElement.dataset.tema = p; else document.documentElement.removeAttribute('data-tema');
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = { vitrin: '#558ED2', alev: '#F03245' }[S.palet] || '#1B2A41';
}

EKRAN.profil = () => {
  if (girisGerek()) return;
  const b = ben();
  app.innerHTML = ustBar('Profil ayarları') + `<form class="ic" id="pf"><div class="kart" style="display:flex;flex-direction:column;gap:12px"><h3 style="margin:0">Bilgilerim</h3>
      <div class="alan">Hesap türü<div class="secim">${[['bireysel', 'Bireysel'], ['emlak', 'Emlak ofisi'], ['galeri', 'Oto galeri']].map(([k, ad]) => `<button type="button" class="${(b.ofis ? (b.sektor || 'emlak') : 'bireysel') === k ? 'secili' : ''}" data-ht="${k}">${ad}</button>`).join('')}</div><input type="hidden" name="ht" value="${b.ofis ? (b.sektor || 'emlak') : 'bireysel'}"></div>
      <label class="alan">Ad soyad<input name="ad" value="${kac(b.ad)}"></label>
      <label class="alan">E-posta<input name="eposta" type="email" value="${kac(b.eposta)}" readonly><small>E-posta değişikliği için destekle iletişime geç.</small></label>
      <label class="alan">Cep telefonu<input name="tel" type="tel" value="${kac(b.tel)}"></label>
      <label class="satir k"><input type="checkbox" name="telGoster" ${b.acikTel ? 'checked' : ''} style="width:22px;height:22px">Telefonum ilanlarımda ve profilimde görünsün</label>
      <label class="satir k"><input type="checkbox" name="soyadGizle" ${b.soyadGizle ? 'checked' : ''} style="width:22px;height:22px">Soyadım yalnız baş harfiyle görünsün (örn. ${kac(gorunenAd({ ...b, soyadGizle: true, id: '' }))})</label>
      <label class="satir k"><input type="checkbox" name="ileti" ${b.ileti ? 'checked' : ''} style="width:22px;height:22px">Kampanya ve bildirim izni</label>
      <h3 style="margin:8px 0 0">Rapor danışman bilgileri <span class="k soluk" style="font-weight:500">(isteğe bağlı)</span></h3>
      <div class="k soluk">${b.sektor === 'galeri' ? 'Profilinde ve ilanlarında görünür; galeri bilgilerin.' : 'Değer raporlarında “danışman” sayfası olarak görünür; emlak danışmanları için.'}</div>
      <div class="izgara2"><label class="alan">Firma<input name="firma" maxlength="80" value="${kac(b.firma || '')}"></label><label class="alan">Unvan<input name="unvan" maxlength="80" value="${kac(b.unvan || '')}" placeholder="${b.sektor === 'galeri' ? 'örn. Satış Danışmanı' : 'örn. Gayrimenkul Danışmanı'}"></label></div>
      <label class="alan">${b.sektor === 'galeri' ? 'İkinci El Motorlu Kara Taşıtı Ticareti Yetki Belgesi no <span style="font-weight:500">(galeriler için)</span>' : 'Taşınmaz Ticareti Yetki Belgesi no <span style="font-weight:500">(emlak ofisleri için)</span>'}<input name="yetkiNo" maxlength="20" value="${kac(b.yetkiNo || '')}"></label>
      ${b.dogrulanmis ? `<div><span class="rozet dogru">${ic('kalkan', 12)}Doğrulanmış ${b.sektor === 'galeri' ? 'galeri' : 'ofis'}</span></div>` : b.yetkiNo ? `<button type="button" class="btn sade tam" id="ofisIste">${b.sektor === 'galeri' ? 'Galeri' : 'Emlak ofisi'} doğrulaması iste</button>` : ''}
      <label class="alan">Slogan<input name="slogan" maxlength="120" value="${kac(b.slogan || '')}"></label>
      <label class="alan">Hakkımda<textarea name="hakkinda" maxlength="1500">${kac(b.hakkinda || '')}</textarea></label>
      <div class="hata-yazi" id="ph"></div><button class="btn">Kaydet</button></div></form>
    <form class="ic" id="sf" style="padding-top:0"><div class="kart" style="display:flex;flex-direction:column;gap:12px"><h3 style="margin:0">Şifre değiştir</h3>
      <label class="alan">Mevcut şifre<input name="eski" type="password" autocomplete="current-password"></label>
      <label class="alan">Yeni şifre<input name="yeni" type="password" autocomplete="new-password"><small>En az 8 karakter, bir rakam.</small></label>
      <div class="hata-yazi" id="sh"></div><button class="btn koyu">Şifreyi değiştir</button></div></form>`;
  app.querySelectorAll('[data-ht]').forEach((x) => (x.onclick = () => { app.querySelectorAll('[data-ht]').forEach((y) => y.classList.toggle('secili', y === x)); $('[name=ht]').value = x.dataset.ht; }));
  const oi = $('#ofisIste'); if (oi) oi.onclick = () => dene(() => dogrulamaIste('emlakci'), 'Talebin alındı; yetki belgen kontrol edilince rozetin güncellenecek');
  $('#pf').onsubmit = async (e) => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)), h = $('#ph'); h.textContent = '';
    const tel = v.tel.replace(/\D/g, '');
    if (v.ad.trim().split(/\s+/).length < 2) return hataGoster(h, 'Adını ve soyadını yaz.');
    if (!/^(90)?0?5\d{9}$/.test(tel)) return hataGoster(h, 'Geçerli bir cep telefonu yaz.');
    const eskiTur = b.ofis ? (b.sektor || 'emlak') : 'bireysel', kb = e.target.querySelector('button.btn:not(.sade)'); kb.disabled = true;
    const tamam = await dene(() => profilKaydet(b, { ad: v.ad.trim().replace(/\s+/g, ' '), tel: '0' + tel.slice(-10), ileti: !!v.ileti, firma: v.firma.trim(), unvan: v.unvan.trim(), hakkinda: v.hakkinda.trim(), slogan: v.slogan.trim(), soyadGizle: !!v.soyadGizle, telGoster: !!v.telGoster, yetkiNo: v.yetkiNo.trim(), ofis: v.ht !== 'bireysel', sektor: v.ht === 'galeri' ? 'galeri' : 'emlak' }), 'Bilgilerin kaydedildi');
    kb.disabled = false; if (tamam && eskiTur !== v.ht) ciz();
  };
  $('#sf').onsubmit = async (e) => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)), h = $('#sh'); h.textContent = '';
    if (v.yeni.length < 8 || !/\d/.test(v.yeni)) return hataGoster(h, 'Yeni şifre en az 8 karakter olmalı ve rakam içermeli.');
    try { await sifreDegistir(b, v.eski, v.yeni); e.target.reset(); toast('Şifren değiştirildi'); } catch (x) { h.textContent = x.message.startsWith('Mevcut') ? x.message : hataMetni(x); }
  };
  navCiz('hesap');
};

// ---------- Değerleme ve PDF rapor ----------
EKRAN.degerle = () => {
  const o = sorgu(), kaynak = o.ilan ? ilan(o.ilan) : null;
  // İlandan gelindiyse o ilanın bilgileri esas; önceki (başka mülke ait) hesap kullanılmaz
  if (kaynak && sonDegerleme?.form?.haric !== kaynak.id) sonDegerleme = null;
  const d = sonDegerleme?.form || (kaynak ? { ana: kaynak.ana, alt: kaynak.alt, il: kaynak.il, ilce: kaynak.ilce, ...kaynak.alanlar, haric: kaynak.id, baslik: kaynak.baslik } : { ana: o.ana || 'emlak', alt: 'konut', islem: 'Satılık' });
  if (o.ana) d.ana = o.ana;
  const sec = (ad, et, ops) => `<label class="alan">${et}<select name="${ad}"><option value="">Seç</option>${ops.map((x) => `<option ${d[ad] === x ? 'selected' : ''}>${kac(x)}</option>`).join('')}</select></label>`;
  app.innerHTML = ustBar('Değerleme') + `<div class="ic">
    <div class="ciplar"><button class="cip ${d.ana === 'emlak' ? 'secili' : ''}" data-ana="emlak">${ic('ev', 16)}Emlak</button><button class="cip ${d.ana === 'vasita' ? 'secili' : ''}" data-ana="vasita">${ic('araba', 16)}Vasıta</button></div>
    <form id="df" class="ic" style="padding:0">${d.ana === 'emlak' ? `
      <div class="izgara2"><label class="alan">Tür<select name="alt">${altlari('emlak').map((k) => `<option value="${k}" ${d.alt === k ? 'selected' : ''}>${ALT[k].ad}</option>`).join('')}</select></label>${sec('islem', 'İşlem', ['Satılık', 'Kiralık'])}</div>
      <div class="izgara2">${sec('il', 'İl', ILLER)}<label class="alan">İlçe<select name="ilce"><option value="">Seç</option>${d.ilce ? `<option selected>${kac(d.ilce)}</option>` : ''}</select></label></div>
      <div class="izgara2"><label class="alan">Mahalle <span style="font-weight:500">(isteğe bağlı)</span><select name="mahalle" data-bos="${d.ilce ? 'Farketmez' : 'Önce ilçe seç'}"><option value="">${d.ilce ? 'Farketmez' : 'Önce ilçe seç'}</option>${d.mahalle ? `<option selected>${kac(d.mahalle)}</option>` : ''}</select></label>
      <label class="alan">Sokak / cadde <span style="font-weight:500">(isteğe bağlı)</span><input name="sokak" id="sokak" list="sokakOn" maxlength="80" autocomplete="off" placeholder="Yazmaya başla" value="${kac(d.sokak || '')}"><datalist id="sokakOn">${d.sokak ? `<option value="${kac(d.sokak)}">` : ''}</datalist></label></div>
      <div class="izgara3"><label class="alan">Net ㎡<input name="m2net" inputmode="numeric" list="on-m2net" autocomplete="off" value="${kac(d.m2net || '')}"></label><datalist id="on-m2net">${ONERI.m2net.map((o) => `<option value="${o}">`).join('')}</datalist>${sec('oda', 'Oda', ALANLAR.emlak[2][3])}${sec('binaYasi', 'Bina yaşı', YAS_GRUPLARI.includes(String(d.binaYasi ?? '')) || !d.binaYasi ? YAS_GRUPLARI : [String(d.binaYasi), ...YAS_GRUPLARI])}</div>
      ${sec('kat', 'Bulunduğu kat', ONERI.kat.includes(d.kat) || !d.kat ? ONERI.kat : [d.kat, ...ONERI.kat])}
      <div class="kart" id="elEmsalK"></div>`
      : `<div class="izgara2">${sec('marka', 'Marka', MARKALAR.includes(d.marka) || !d.marka ? MARKALAR : [d.marka, ...MARKALAR])}<label class="alan">Model<select name="model"><option value="">Seç</option>${d.model ? `<option selected>${kac(d.model)}</option>` : ''}</select></label></div>
      <div class="izgara3"><label class="alan">Yıl<input name="yil" inputmode="numeric" value="${kac(d.yil || '')}"></label><label class="alan">Km<input name="km" inputmode="numeric" value="${kac(d.km || '')}"></label>${sec('hasar', 'Hasar', ALANLAR.vasita[8][3])}</div>`}
      <div class="hata-yazi" id="dh"></div><button class="btn tam">${ic('grafik', 18, '#fff')}Değeri hesapla</button></form>
    <div id="sonuc"></div>
    <div class="k soluk" style="line-height:1.5">Emlakta hesap, mahalle ve ilçe piyasa verisi ile aynı ilçedeki benzer Mülküm360 ilanlarından yapılır; vasıtada TSB kasko değeri ve benzer ilanlar kullanılır. Bilgilendirme amaçlıdır; SPK lisanslı değerleme raporu yerine geçmez.</div>
  </div>`;
  const elListe = d.elEmsal ? [...d.elEmsal] : [];
  const elCiz = () => { const k = $('#elEmsalK'); if (!k) return;
    k.innerHTML = `<div class="satir"><b class="ara">Kendi emsallerin <span class="k soluk" style="font-weight:500">(isteğe bağlı)</span></b><button type="button" class="btn sade" id="elEkle">+ Ekle</button></div>
      <div class="k soluk">Başka bir yerde gördüğün benzer bir ilanın fiyatını ve m²'sini ekle; hesaba ve rapora "kullanıcının eklediği emsal" olarak girer.</div>
      ${elListe.map((x, n) => `<div class="satir k" style="padding:6px 0;border-top:1px solid var(--cizgi)"><span class="ara">${tl(x.fiyat)} · ${x.m2net} m²${x.oda ? ' · ' + kac(x.oda) : ''}${x.mahalle ? ' · ' + kac(x.mahalle) : ''}${x.not ? ' · ' + kac(x.not) : ''}</span><button type="button" class="btn sade" data-elsil="${n}">Sil</button></div>`).join('')}`;
    k.querySelectorAll('[data-elsil]').forEach((b) => (b.onclick = () => { elListe.splice(+b.dataset.elsil, 1); elCiz(); }));
    $('#elEkle').onclick = () => sheetAc(`<h2 style="font-size:19px;font-weight:800">Emsal ekle</h2><form id="ef" class="ic" style="padding:0">
      <div class="izgara2"><label class="alan">Fiyat (TL)<input name="fiyat" inputmode="numeric" required></label><label class="alan">Net ㎡<input name="m2net" inputmode="numeric" required></label></div>
      <div class="izgara2"><label class="alan">Oda<select name="oda"><option value="">—</option>${ALANLAR.emlak[2][3].map((x) => `<option>${x}</option>`).join('')}</select></label><label class="alan">Mahalle<input name="mahalle" maxlength="60"></label></div>
      <label class="alan">Not (kaynak)<input name="not" maxlength="60" placeholder="örn. komşu site, Ekim 2026"></label><button class="btn tam">Ekle</button></form>`, (s) => ($('#ef', s).onsubmit = (e) => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); v.fiyat = +v.fiyat.replace(/\D/g, ''); v.m2net = +v.m2net.replace(/\D/g, ''); if (!(v.fiyat > 0 && v.m2net > 0)) return toast('Fiyat ve m² gerekli.'); elListe.push(v); sheetKapat(); elCiz(); }));
  };
  elCiz();
  if ($('#df [name=ilce]')) {
    const M = $('#df [name=mahalle]');
    konumSecBagla($('#df [name=il]'), $('#df [name=ilce]'), M, () => { if (M) M.dataset.bos = $('#df [name=ilce]').value ? 'Farketmez' : 'Önce ilçe seç'; });
    $('#df [name=il]').id = 'il'; $('#df [name=ilce]').id = 'ilce'; sokakOneriBagla();
  }
  aracModelBagla($('#df [name=marka]'), $('#df [name=model]'));
  app.querySelectorAll('[data-ana]').forEach((x) => (x.onclick = () => { sonDegerleme = null; git('#/degerle?ana=' + x.dataset.ana); }));
  const hesapGoster = async (v) => {
    const h = hesapla(v), el = $('#sonuc');
    sonDegerleme = { form: v, sonuc: h, zaman: Date.now() };
    // Vasıta: TSB kasko değeri (km ve hasara göre düzeltilmiş)
    let ks = null;
    if (v.ana === 'vasita') {
      el.innerHTML = '<div class="k soluk">Kasko değeri alınıyor…</div>';
      const k = await kaskoDegeri(v.marka, v.model, v.yil);
      if (k) {
        const beklenen = Math.max(0, new Date().getFullYear() - +v.yil) * 15000;
        const kmD = v.km ? Math.max(-0.15, Math.min(0.15, ((beklenen - +v.km) / 10000) * 0.01)) : 0;
        const hsD = ({ 'Boyalı parça var': -0.04, 'Değişen parça var': -0.08, 'Ağır hasar kayıtlı': -0.25 })[v.hasar] || 0;
        const c = (1 + kmD) * (1 + hsD);
        ks = { ...k, c, kmD, hsD, ortaD: k.orta * c, altD: k.alt * c, ustD: k.ust * c };
      }
      degerlemeKaydet(v, h, ks);
      const kaskoKutu = (ana) => ks ? `<div class="kart" style="padding:12px"><div class="k" style="font-weight:700">TSB Kasko Değeri · ${kac(v.marka)} ${kac(v.model)} ${kac(v.yil)}</div>
        <div style="font-size:20px;font-weight:800;margin:4px 0">${tl(ks.altD)} – ${tl(ks.ustD)}</div>
        <div class="k soluk">Ortası ${tl(ks.ortaD)} · ${ks.tipSayi} paket/motor tipi · liste ortalaması ${tl(ks.orta)}${ks.kmD || ks.hsD ? ` · düzeltme: km ${ks.kmD >= 0 ? '+' : '−'}%${Math.abs(Math.round(ks.kmD * 100))}, hasar ${ks.hsD ? '−%' + Math.abs(Math.round(ks.hsD * 100)) : '0'}` : ''}</div>
        <div class="k soluk" style="font-size:11.5px;margin-top:4px">Kaynak: Türkiye Sigorta Birliği Kasko Değer Listesi (${new Date(ks.donem).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}). Listede km ve hasar ayrımı yok; km ve hasar düzeltmesi Mülküm360 tahminidir.${ana ? '' : ' Sitedeki benzer ilanlar arttıkça ilan fiyatlarıyla birlikte hesaplanır.'}</div></div>` : '';
      if (!h.yeterli && ks) {
        el.innerHTML = `<div class="deger-k"><div class="ust-yazi">TAHMİNİ PİYASA DEĞERİ</div><div class="buyuk">${tl(ks.altD)} – ${tl(ks.ustD)}</div><div style="font-size:13px;opacity:.85">Ortası <b>${tl(ks.ortaD)}</b></div><div style="font-size:12px;opacity:.7">Kaynak: TSB kasko değeri · sitede ${h.sayi} benzer ilan</div></div>${kaskoKutu(false)}`;
        return;
      }
      v._kasko = kaskoKutu(true);
    } else degerlemeKaydet(v, h, null);
    if (!h.yeterli) { el.innerHTML = `<div class="uyari-k">${ic('uyari', 18)}<div><b>Yeterli emsal yok.</b> ${v.ana === 'emlak' ? `Bu ilçede bu tür ve işlemde ${h.sayi} benzer ilan var ve bölge için piyasa verisi henüz yok; güvenilir bir aralık için en az 3 emsal gerekiyor. “Kendi emsallerin” bölümünden bildiğin ilanları ekleyebilirsin.` : `Bu marka ve modelde (yıl ±2) ${h.sayi} ilan var; en az 3 gerekiyor. Model adını kısaltmayı dene (örn. yalnız “Clio”).`}</div></div>`; return; }
    el.innerHTML = `<div class="deger-k"><div class="ust-yazi">TAHMİNİ ${v.ana === 'emlak' && v.islem === 'Kiralık' ? 'AYLIK KİRA' : 'PİYASA DEĞERİ'}</div><div class="buyuk">${tl(h.alt)} – ${tl(h.ust)}</div>
      <div style="font-size:13px;opacity:.85">Ortası <b>${tl(h.orta)}</b>${v.ana === 'emlak' ? ' · m²: <b>' + tl(h.birimOrta) + '</b>' : ''}</div>
      ${h.katEtkisi ? `<div style="font-size:12px;opacity:.8">Kat etkisi (${kac(v.kat)}): <b>${h.katEtkisi}</b>, emsaller de kata göre eşitlendi</div>` : ''}${h.refKaynak ? `<div style="font-size:12px;opacity:.8">Dayanak: ${h.emsalAgirlik ? `%${h.emsalAgirlik} Mülküm360 gerçek ilanları, %${100 - h.emsalAgirlik} ` : ''}${kac(h.refKaynak)}</div>` : ''}<div style="font-size:12px;opacity:.7">Güven: ${h.guven} · ${h.sayi} emsal ilan${h.kapsam ? ' · ' + kac(h.kapsam) : ''}</div></div>
      ${h.genis ? `<div class="uyari-k">${ic('uyari', 18)}<div>${kac(v.il)} için yeterli ilan olmadığından (${h.ilSayi ?? 0}) <b>Türkiye geneli</b> emsallerle hesaplandı. Bölge farkı büyük olabilir; sonucu ön fikir olarak değerlendir.</div></div>` : ''}
      <div class="izgara3">${VADE.map(([ad, sure, k], n) => `<div class="kart" style="padding:10px;${n === 1 ? 'border-color:var(--vurgu);background:var(--vurgu-acik)' : ''}"><div class="k soluk" style="font-weight:700">${ad}</div><div class="k soluk">${sure}</div><b style="font-size:14px">${tl(h[k])}</b></div>`).join('')}</div>
      <div class="k soluk" style="text-align:center">Vade fiyatları hedeftir; ${v.islem === 'Kiralık' ? 'kiralama' : 'satış'} süresi garanti edilmez.</div>
      <button class="btn tam" id="raporAl">${ic('belge', 18, '#fff')}MülkümAI PDF raporu · 1 kredi</button>
      <div class="k soluk" style="text-align:center">${ben() ? 'Kredin: ' + (ben().kredi ?? 0) + ' · <a href="#/kredi">Kredi yükle</a>' : 'Yeni üyelere 1 rapor kredisi hediye'}</div>
      ${v.ana === 'emlak' && !v.haric ? `<a class="btn cizgili tam" href="#/ver" id="ilanaCevir">Bu bilgilerle ilan ver</a>` : ''}`;
    if (v._kasko) { el.querySelector('.deger-k')?.insertAdjacentHTML('afterend', v._kasko); delete v._kasko; }
    $('#raporAl').onclick = async () => {
      if (girisGerek('Rapor oluşturmak için giriş yap')) return;
      const kalan = ben().kredi ?? 0;
      if (kalan < 1) { toast('Kredin bitti. Rapor için kredi yükle.'); return git('#/kredi'); }
      if (v.ana === 'emlak') {
        const ek = await new Promise((ok) => sheetAc(`<h2 style="font-size:19px;font-weight:700">Rapor bilgileri</h2><div class="k soluk">İsteğe bağlı; kapağa ve konum sayfasına işlenir. Adres yazarsan harita ve çevre analizi daha hassas olur.</div>
          <form id="rf" class="ic" style="padding:0"><label class="alan">Rapor kimin adına<input name="adina" maxlength="80"></label><label class="alan">Adres / mahalle<input name="adres" maxlength="120" placeholder="örn. Caferağa Mah. Moda Cad."></label>
          <div class="izgara2"><label class="alan">Ada<input name="ada" maxlength="12"></label><label class="alan">Parsel<input name="parsel" maxlength="12"></label></div>
          <details><summary class="k" style="font-weight:700;cursor:pointer;padding:8px 0">Mülk özellikleri ve kredi hesabı (isteğe bağlı)</summary><div class="ic" style="padding:0">
            <div class="izgara2"><label class="alan">Cephe<select name="cephe"><option value="">—</option><option>Güney</option><option>Kuzey</option><option>Doğu</option><option>Batı</option><option>Güneydoğu</option><option>Güneybatı</option><option>Kuzeydoğu</option><option>Kuzeybatı</option></select></label><label class="alan">Bulunduğu kat<input name="kat" maxlength="20" value="${kac(v.kat || '')}"></label></div>
            <div class="izgara2"><label class="alan">Manzara<select name="manzara"><option value="">—</option><option>Deniz</option><option>Şehir</option><option>Doğa</option><option>Göl</option><option>Boğaz</option><option>Yok</option></select></label><label class="alan">Otopark<select name="otopark"><option value="">—</option><option>Kapalı</option><option>Açık</option><option>Yok</option></select></label></div>
            <div class="izgara2"><label class="alan">Site içinde<select name="site"><option value="">—</option><option>Evet</option><option>Hayır</option></select></label><label class="alan">Tadilat<select name="tadilat"><option value="">—</option><option>Yeni / yenilenmiş</option><option>Bakımlı</option><option>Bakım gerekir</option></select></label></div>
            <div class="izgara2"><label class="alan">Tapu / iskân<select name="iskan"><option value="">—</option><option>Kat mülkiyeti, iskânlı</option><option>Kat irtifakı</option><option>İskânsız</option><option>Hisseli</option></select></label><label class="alan">Aylık aidat (TL)<input name="aidat" inputmode="numeric"></label></div>
            <div class="izgara3"><label class="alan">Aylık faiz %<input name="faiz" inputmode="decimal" placeholder="örn. 2,79"></label><label class="alan">Vade (ay)<input name="vade" inputmode="numeric" placeholder="120"></label><label class="alan">Peşinat %<input name="pesinat" inputmode="numeric" placeholder="20"></label></div>
          </div></details>
          <details><summary class="k" style="font-weight:700;cursor:pointer;padding:8px 0">İmar, inşaat alanı ve belediye rayiç bedeli (isteğe bağlı)</summary><div class="ic" style="padding:0">
            <div class="k soluk">İmar durum belgesi ya da e-imar ekranındaki değerleri, rayiç bedeli belediyenin emlak vergisi birim değerinden yaz.</div>
            <div class="izgara2"><label class="alan">İmar durumu<input name="imarTipi" maxlength="60" placeholder="örn. Konut, Ticaret+Konut"></label><label class="alan">Arsa alanı (m²)<input name="arsaAlani" inputmode="numeric"></label></div>
            <div class="izgara3"><label class="alan">KAKS (emsal)<input name="kaks" inputmode="decimal" placeholder="1,50"></label><label class="alan">TAKS<input name="taks" inputmode="decimal" placeholder="0,30"></label><label class="alan">Hmax (m)<input name="hmax" inputmode="decimal" placeholder="15,50"></label></div>
            <div class="izgara2"><label class="alan">Rayiç bedel (TL/m²)<input name="rayic" inputmode="numeric"></label><label class="alan">Rayiç yılı<input name="rayicYil" inputmode="numeric" placeholder="${new Date().getFullYear()}"></label></div>
          </div></details>
          <label class="alan">Saha / dron fotoğrafları (en fazla 4)<input type="file" name="foto" accept="image/*" multiple></label>
          <button class="btn tam">Devam</button></form>`,
          (s) => ($('#rf', s).onsubmit = async (e) => {
            e.preventDefault(); const fd = new FormData(e.target), dosyalar = [...e.target.foto.files].slice(0, 4);
            const o = Object.fromEntries([...fd.entries()].filter(([k]) => k !== 'foto'));
            o.sahaFoto = []; for (const d of dosyalar) { try { o.sahaFoto.push(await fotoKucult(d, 1400)); } catch (_) {} }
            ok(o); sheetKapat();
          })));
        const sahaFoto = ek.sahaFoto || []; delete ek.sahaFoto;
        Object.keys(ek).forEach((k) => (v[k] = String(ek[k]).trim()));
        ['arsaAlani', 'rayic', 'rayicYil'].forEach((k) => (v[k] = (v[k] || '').replace(/\D/g, '')));
        ['kaks', 'taks', 'hmax'].forEach((k) => (v[k] = (v[k] || '').replace(',', '.').replace(/[^\d.]/g, '')));
        v._sahaFoto = sahaFoto;
        v.aidat = v.aidat.replace(/\D/g, ''); v.vade = v.vade.replace(/\D/g, ''); v.pesinat = v.pesinat.replace(/\D/g, ''); v.faiz = v.faiz.replace(',', '.').replace(/[^\d.]/g, '');
      }
      if (!(await onayla('MülkümAI raporu', `Rapor oluşturulunca 1 kredi düşülür. Kalan kredin: ${kalan}.`, 'Raporu oluştur'))) return;
      const pr = raporIlerleme(v.ana === 'emlak');
      try {
        const em = h.emsal.slice(0, 8);
        const [demografi, ek] = await Promise.all([v.ana === 'emlak' ? bolgeVerisi(v.il, v.ilce).catch(() => null) : null, raporEkVeri(v, h, pr.adim)]);
        const r = { no: 'M360-' + Date.now().toString().slice(-8), zaman: Date.now(), form: v, sonuc: { ...h, emsal: em.map((x) => x.i.id).filter((id) => !String(id).startsWith('el-')), emsalOzet: em.map((x) => ({ el: !!x.i.el, baslik: x.i.baslik, il: x.i.il, ilce: x.i.ilce, fiyat: x.i.fiyat, alanlar: x.i.alanlar })), bolge: bolgeAnaliz(v), demografi, ...ek } };
        pr.adim(4);
        const k = await raporKaydet(r); pr.kapat(); toast('Rapor hazır · kalan kredi ' + ben().kredi); git('#/rapor/' + k.id);
      } catch (x) { pr.kapat(); toast(hataMetni(x)); if (x.message === 'KREDI_YOK') git('#/kredi'); }
    };
    const ic2 = $('#ilanaCevir'); if (ic2) ic2.onclick = () => { taslak = { adim: 1, fotolar: [], alt: v.alt, il: v.il, ilce: v.ilce, alanlar: { islem: v.islem, oda: v.oda, m2net: v.m2net, binaYasi: v.binaYasi } }; };
  };
  piyasaRefYukle();
  $('#df').onsubmit = async (e) => {
    e.preventDefault(); await piyasaRefYukle(); const v = { ...Object.fromEntries(new FormData(e.target)), ana: d.ana, haric: d.haric, baslik: d.baslik, elEmsal: elListe }, h = $('#dh'); h.textContent = '';
    ['m2net', 'yil', 'km'].forEach((k) => v[k] && (v[k] = v[k].replace(/\D/g, '')));
    const elle = e.isTrusted;
    if (v.ana === 'emlak' && (!v.il || !v.islem || !(+v.m2net > 0))) return hataGoster(h, 'İl, işlem ve net m² gerekli.');
    if (v.ana === 'vasita' && (!v.marka || !v.model || !v.yil)) return hataGoster(h, 'Marka, model ve yıl gerekli.');
    await hesapGoster(v);
    if (elle) $('#sonuc').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  if (kaynak || sonDegerleme) $('#df').requestSubmit();
  navCiz('degerle');
};

// Rapor hazırlanırken tam ekran ilerleme: adımlar ve geçen süre; iş bitene kadar kapatılamaz
function raporIlerleme(emlak) {
  const adlar = emlak ? ['Konum bulunuyor', 'Çevre ve toplu taşıma (OpenStreetMap)', 'Deprem kaydı ve fay hatları', 'Nüfus, seçim ve TCMB göstergeleri', 'Rapor kaydediliyor'] : ['Hazırlanıyor', '', '', 'Resmî veriler', 'Rapor kaydediliyor'];
  const el = document.createElement('div');
  el.className = 'r-ilerleme';
  el.innerHTML = `<div class="r-ilerleme-kart"><b>Raporun hazırlanıyor</b><small>Açık veri servisleri yoğunsa 1 dakikayı bulabilir. Bu ekranda kal.</small>
    <ol>${adlar.map((a, i) => (a ? `<li data-i="${i}"><span></span>${a}</li>` : '')).join('')}</ol><em>0 sn</em></div>`;
  document.body.appendChild(el);
  const t0 = Date.now(), sure = setInterval(() => ($('em', el).textContent = Math.round((Date.now() - t0) / 1000) + ' sn'), 1000);
  return {
    adim: (i) => $(`li[data-i="${i}"]`, el)?.classList.add('tamam'),
    kapat: () => { clearInterval(sure); el.remove(); }
  };
}

// İlan aktarma bilgi ekranı: hangi adımda olunduğunu, ayrıntıyı (ör. fotoğraf 3/12) ve geçen süreyi gösterir
const AKTAR_ADIM = { ac: 'İlan sayfası açılıyor', oku: 'Sayfadaki bilgiler okunuyor', ai: 'MülkümAI başlık, fiyat, m² ve özellikleri çıkarıyor', foto: 'Fotoğraflar indiriliyor', form: 'Form dolduruluyor' };
// kap verilirse (aktarma penceresi) ilerleme o pencerenin içine çizilir, pencerenin diğer öğeleri gizlenir;
// telefonda ayrı tam ekran katmanı görünmediği için asıl yol budur.
function aktarIlerleme(adimlar, kap) {
  const el = document.createElement('div');
  el.className = kap ? 'ak-ilerleme' : 'r-ilerleme';
  el.innerHTML = `<div class="r-ilerleme-kart"${kap ? ' style="padding:4px 0;max-width:none"' : ''}><b>İlanın aktarılıyor</b><small>Birkaç saniye sürer, bu ekranda kal.</small>
    <ol>${adimlar.map((k) => `<li data-k="${k}"><span></span><div style="flex:1;min-width:0">${AKTAR_ADIM[k]}<div class="k soluk" data-ayr style="font-size:12px;font-weight:500"></div></div></li>`).join('')}</ol><em>0 sn</em></div>`;
  const gizlenen = kap ? [...kap.children].filter((c) => !c.classList.contains('tutamak') && !c.hidden) : [];
  gizlenen.forEach((c) => (c.hidden = true));
  (kap || document.body).appendChild(el);
  const kapat0 = () => { el.remove(); gizlenen.forEach((c) => (c.hidden = false)); };
  const t0 = Date.now(), sure = setInterval(() => ($('em', el).textContent = Math.round((Date.now() - t0) / 1000) + ' sn'), 1000);
  const li = (k) => $(`li[data-k="${k}"]`, el);
  // Şimdiki adımdan öncekiler tamam (yeşil), şimdiki dönen halka ve kalın, sonrakiler soluk
  const simdi = (k, ayrinti = '') => {
    let gecti = true;
    adimlar.forEach((a) => { const l = li(a); if (a === k) gecti = false; l.classList.toggle('tamam', gecti); l.style.fontWeight = a === k ? '700' : ''; l.style.opacity = gecti || a === k ? '1' : '.5'; l.dataset.d = !gecti && a !== k ? 'bekle' : ''; });
    const x = li(k); if (x) $('[data-ayr]', x).textContent = ayrinti;
  };
  return { simdi, gizle: (g) => (el.style.display = g ? 'none' : ''), kapat: () => { clearInterval(sure); kapat0(); } };
}

EKRAN.raporlar = () => {
  if (girisGerek()) return;
  const l = ben().raporlar || [];
  app.innerHTML = ustBar('Değerleme raporlarım', `<a class="ikon-btn" href="#/degerle" aria-label="Yeni değer raporu">${ic('arti', 20)}</a>`) + `<div class="ic">${l.length ? `<div class="liste">${l.map((r) => `<a href="#/rapor/${r.id}">${ic('belge', 20)}<div class="ara"><div>${kac(raporBaslik(r.form))}</div><div class="k soluk" style="font-weight:500">${r.no} · ${new Date(r.zaman).toLocaleDateString('tr-TR')}</div></div><span class="ok">›</span></a>`).join('')}</div>`
    : bosDurum('belge', 'Henüz raporun yok', 'Evinin ya da aracının değerini hesapla, PDF raporunu oluştur.', '<a class="btn" href="#/degerle">Değer hesapla</a>')}</div>`;
  navCiz('hesap');
};
const raporBaslik = (f) => f.ana === 'emlak' ? [ALT[f.alt]?.ad, f.islem, f.oda, f.m2net && f.m2net + ' m²', [f.ilce, f.il].filter(Boolean).join(', ')].filter(Boolean).join(' · ') : [f.marka, f.model, f.yil, f.km && sayiBicim(f.km) + ' km'].filter(Boolean).join(' · ');

// Rapor ekranı (EKRAN.rapor) ve pdfOlustur rapor.js içindedir

// Bölge fiyat analizleri: uygulamadaki ilanlardan (ilçe yetersizse il geneli)
function bolgeAnaliz(f) {
  if (f.ana !== 'emlak') return null;
  const grup = (islem) => {
    let l = S.ilanlar.filter((i) => i.ana === 'emlak' && (TEST_DAHIL || !i.ornek) && i.alt === f.alt && i.il === f.il && i.alanlar?.islem === islem && +i.alanlar?.m2net > 0 && i.fiyat > 0);
    let kapsam = f.il + ' geneli';
    const ilceli = l.filter((i) => f.ilce && kucuk(i.ilce) === kucuk(f.ilce));
    if (f.ilce) { l = ilceli; kapsam = f.ilce + ', ' + f.il; }
    if (l.length < 3) return { yeterli: false, sayi: l.length, kapsam };
    const m2 = l.map((i) => i.fiyat / +i.alanlar.m2net), o = (l) => l.reduce((t, x) => t + x, 0) / l.length;
    return { yeterli: true, sayi: l.length, kapsam, m2Ort: o(m2), ortalama: o(l.map((i) => i.fiyat)), alanOrt: o(l.map((i) => +i.alanlar.m2net)) };
  };
  const satis = grup('Satılık'), kira = grup('Kiralık');
  let getiri = null;
  if (satis.yeterli && kira.yeterli) { const y = (kira.m2Ort * 12) / satis.m2Ort; getiri = { yuzde: y * 100, yil: 1 / y }; }
  const odalar = {};
  S.ilanlar.filter((i) => i.ana === 'emlak' && (TEST_DAHIL || !i.ornek) && i.alt === f.alt && i.il === f.il && (!f.ilce || kucuk(i.ilce) === kucuk(f.ilce)) && i.alanlar?.islem === f.islem && i.alanlar?.oda && i.fiyat > 0)
    .forEach((i) => (odalar[i.alanlar.oda] = odalar[i.alanlar.oda] || []).push(i.fiyat));
  const odaTablo = Object.entries(odalar).filter(([, l]) => l.length >= 2).map(([oda, l]) => ({ oda, sayi: l.length, ortalama: l.reduce((t, x) => t + x, 0) / l.length })).sort((a, b) => a.oda.localeCompare(b.oda, 'tr'));
  return { satis, kira, getiri, odaTablo };
}
// PDF rapora eklenen bölümler: vade fiyatları, bölge fiyat analizleri, demografik ve sosyal yapı
// parca: 'bolge' = fiyat + ilçe (demografi tabloları hariç), 'demo' = yalnız demografik/sosyal tablolar, boş = hepsi (uygulama içi)
function raporEkBolumler(f, h, parca) {
  const baslik = (t) => `<div style="font-size:13px;font-weight:700;margin-bottom:8px">${t}</div>`;
  const kutu = (ust, buyuk, alt, vurgu) => `<div style="border:1px solid ${vurgu ? '#FFC72C' : '#E1E5EE'};background:${vurgu ? '#FFF4CC' : '#fff'};border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:3px"><div style="font-size:11px;color:#5B5F68;font-weight:700">${ust}</div><div style="font-size:17px;font-weight:700">${buyuk}</div><div style="font-size:11px;color:#5B5F68;line-height:1.4">${alt}</div></div>`;
  const kira = f.islem === 'Kiralık' || f.islem === 'Günlük Kiralık';
  let s = `<div>${baslik(kira ? 'Kiralama hedef fiyatları (vadeye göre)' : 'Satış hedef fiyatları (vadeye göre)')}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">${VADE.map(([ad, sure, k, acik], n) => kutu(`${ad.toUpperCase()} · ${sure}`, tl(h[k]), (+f.m2net > 0 && f.ana === 'emlak' ? `<b style="color:#0B1B33">${tl(h[k] / +f.m2net)} / m²</b> · ` : '') + acik, n === 1)).join('')}</div>
    <div style="font-size:10px;color:#5B5F68;margin-top:6px">Vade süreleri hedeftir; ${kira ? 'kiralama' : 'satış'} süresi garanti edilmez. Fiyatlar benzer ilanların dağılımından hesaplanır.</div></div>`;
  const b = h.bolge;
  if (b) {
    const an = (ad, g, isl) => !g.yeterli && typeof piyasaRef === 'function' && piyasaRef(f.il, isl, f.ilce, f.mahalle) ? (() => { const p = piyasaRef(f.il, isl, f.ilce, f.mahalle); return kutu(ad, tl(p.birim) + ' / m²', `Piyasa verisi: ${p.kaynak}`); })() : g.yeterli ? kutu(ad, tl(g.m2Ort ?? g.m2Ortanca) + ' / m²', `${g.kapsam} · ${g.sayi} ilan · ortalama ilan ${tl(g.ortalama)}${g.alanOrt ? ' (ortalama ' + Math.round(g.alanOrt) + ' m²)' : ''}`) : kutu(ad, '—', `${g.kapsam}: yetersiz veri (${g.sayi}/3 ilan)`);
    const mulkM2 = +f.m2net > 0 && h.orta ? h.orta / +f.m2net : null;
    s += `<div>${baslik('Bölge fiyat analizleri')}
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        ${an('1 · ORTALAMA SATIŞ m² FİYATI', b.satis, 'Satılık')}
        ${an('2 · ORTALAMA KİRA m² FİYATI (AYLIK)', b.kira, 'Kiralık')}
        ${b.getiri ? kutu('3 · KİRA GETİRİSİ', '%' + b.getiri.yuzde.toFixed(1).replace('.', ','), `Yıllık brüt getiri · amortisman yaklaşık ${Math.round(b.getiri.yil)} yıl`) : kutu('3 · KİRA GETİRİSİ', '—', 'Satış ve kira verisi birlikte yeterli olunca hesaplanır')}
      </div>
      ${mulkM2 && b.satis.yeterli && !kira ? `<div style="font-size:11.5px;color:#3F434B;margin-top:8px;line-height:1.5">Bu mülk: net ${sayiBicim(+f.m2net)} m² × ${tl(mulkM2)}/m² = ${tl(h.orta)}. Bölgenin ortalama m² fiyatına göre ${mulkM2 >= (b.satis.m2Ort ?? b.satis.m2Ortanca) ? '%' + Math.round((mulkM2 / (b.satis.m2Ort ?? b.satis.m2Ortanca) - 1) * 100) + ' üstünde' : '%' + Math.round((1 - mulkM2 / (b.satis.m2Ort ?? b.satis.m2Ortanca)) * 100) + ' altında'}. Ortalama ilan fiyatı daha büyük dairelerin etkisiyle yüksek görünebilir; karşılaştırma m² üzerinden yapılmalıdır.</div>` : ''}
      ${b.odaTablo.length ? `<table style="margin-top:8px"><tr><th>Oda tipi</th><th>İlan</th><th>Ortalama fiyat</th></tr>${b.odaTablo.map((o) => `<tr><td>${kac(o.oda)}</td><td>${o.sayi}</td><td>${tl(o.ortalama ?? o.ortanca)}</td></tr>`).join('')}</table>` : ''}</div>`;
    const d = h.demografi;
    const satir = (a, v2) => (v2 == null || v2 === '' ? '' : `<tr><td style="color:#5B5F68;border:0;padding:4px 0">${a}</td><td style="border:0;padding:4px 0;font-weight:600">${v2}</td></tr>`);
    const yuzde = (x) => (x == null ? null : '%' + String(x).replace('.', ','));
    const iv = d?.ilceVeri;
    if (iv) {
      const binde = (x) => (x == null || !iv.nufus ? null : (Math.round((x / iv.nufus) * 10000) / 10).toLocaleString('tr-TR') + ' ‰');
      const art = iv.nufus_artisi == null ? null : (iv.nufus_artisi >= 0 ? '+%' : '−%') + (Math.round(Math.abs(iv.nufus_artisi) / 10 * 10) / 10).toLocaleString('tr-TR');
      const yd = iv.yabanci_satis_12ay, yo = iv.yabanci_satis_onceki12;
      const yDeg = yd != null && yo > 0 ? ' (önceki 12 aya göre ' + (yd >= yo ? '+%' : '−%') + Math.round(Math.abs(yd / yo - 1) * 100) + ')' : '';
      s += `<div>${baslik(kac(iv.ilce) + ' İlçesi')}<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        ${kutu('NÜFUS', sayiBicim(iv.nufus), art ? 'Yıllık değişim ' + art : '')}
        ${kutu('YABANCILARA KONUT SATIŞI', yd != null ? sayiBicim(yd) : '—', yd != null ? 'Son 12 ay' + yDeg : 'Bu ilçede kayıt yok')}
        ${kutu('YILLIK DOĞUM / EVLENME', [binde(iv.dogum), binde(iv.evlenme)].filter(Boolean).join(' / ') || '—', 'Bin kişi başına, ' + iv.yil)}
      </div><div style="font-size:10px;color:#5B5F68;margin-top:4px">Kaynak: ${kac(iv.kaynak)}. Yaş, eğitim ve medeni durum ilçe bazında yayımlanmadığı için ${parca === 'bolge' ? 'sonraki sayfada' : 'aşağıda'} il geneli verilmiştir.</div></div>`;
    }
    const demo = d ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div>${baslik(iv ? kac(d.il) + ' Geneli · Demografik Yapı' : 'Demografik yapı')}<table>${satir('Nüfus', d.nufus != null ? sayiBicim(d.nufus) : null)}${satir('Yaş ortancası', d.yas_ortanca)}${satir('Erkek nüfus', d.erkek_sayisi != null ? sayiBicim(d.erkek_sayisi) + ' (' + yuzde(d.erkek_orani) + ')' : yuzde(d.erkek_orani))}${satir('Kadın nüfus', d.kadin_sayisi != null ? sayiBicim(d.kadin_sayisi) + ' (' + yuzde(Math.round((100 - d.erkek_orani) * 10) / 10) + ')' : null)}${satir('Çalışma çağı (20–59 yaş)', d.yas_20_39 != null && d.yas_40_59 != null ? yuzde(Math.round((+d.yas_20_39 + +d.yas_40_59) * 10) / 10) : null)}${satir('65 yaş ve üstü', d.yas_dagilim ? yuzde(Math.round(['65-69', '70-74', '75-79', '80-84', '85-89', '90+'].reduce((t, k) => t + (+d.yas_dagilim[k] || 0), 0) * 10) / 10) : null)}${satir('Yıllık nüfus artışı (binde)', d.nufus_artisi)}</table></div>
        <div>${baslik('Sosyal yapı')}<table>${satir('Ortalama hane büyüklüğü', d.hane_buyuklugu)}${satir('Üniversite mezunu oranı', yuzde(d.universite_orani))}${satir('Lise mezunu (15+)', d.egitim_dagilim ? yuzde(d.egitim_dagilim['Lise']) : null)}${satir('Yüksek lisans / doktora (15+)', d.egitim_dagilim ? yuzde(Math.round(((+d.egitim_dagilim['Yüksek lisans'] || 0) + (+d.egitim_dagilim['Doktora'] || 0)) * 10) / 10) : null)}${satir('Okuryazarlık oranı', yuzde(d.okuryazar_orani))}${satir('Evli (18+)', medeni18(d) ? yuzde(medeni18(d)['Evli']) : null)}${satir('Not', d.notlar ? kac(d.notlar) : null)}</table></div>
        <div style="grid-column:1/-1;font-size:10px;color:#5B5F68">Kaynak: ${kac(d.demografi_kaynak || d.kaynak + ' (' + d.yil + ')')}${d.ilce ? '' : ' · il geneli verisi'}</div></div>`
      : `<div class="kutu" style="font-size:12px;color:#5B5F68">${baslik('Demografik ve sosyal yapı')}${kac([f.ilce, f.il].filter(Boolean).join(', '))} için resmî bölge verisi (TÜİK) henüz sisteme girilmedi. Veri eklendiğinde yeni raporlarda nüfus, yaş, hane ve eğitim bilgileri yer alır.</div>`;
    if (parca === 'demo') return demo;
    if (parca !== 'bolge') s += demo;
  }
  return parca === 'demo' ? '' : s;
}
// Rapor ve ilan sayfası için: cinsiyet, eğitim (15+), medeni durum (15+) çubukları (TÜİK)
function medeni18(d) {
  const m = d?.medeni_dagilim, y = d?.yas_dagilim, n = +d?.nufus; if (!m || !y || !n) return m || null;
  const cocuk = ['0-4', '5-9', '10-14'].reduce((t, k) => t + (+y[k] || 0), 0) / 100;
  const p15 = n * (1 - cocuk), c = n * ((+y['15-19'] || 0) / 100) * 0.6, p18 = p15 - c;
  if (!(p18 > 0)) return m;
  const oran = (k, eksi = 0) => Math.round(((+m[k] || 0) / 100 * p15 - eksi) / p18 * 1000) / 10;
  return { 'Hiç evlenmemiş': oran('Hiç evlenmemiş', c), 'Evli': oran('Evli'), 'Boşanmış': oran('Boşanmış'), 'Eşi ölmüş': oran('Eşi ölmüş') };
}
function demografiGrafikleri(d, baslik, secim = ['cinsiyet', 'egitim', 'medeni']) {
  if (!d || typeof cubukSvg !== 'function') return '';
  const e = d.egitim_dagilim, m = medeni18(d), b = [];
  if (secim.includes('cinsiyet') && d.erkek_orani != null) b.push(baslik('Cinsiyet Dağılımı') + cubukSvg([{ ad: 'Erkek', deger: +d.erkek_orani }, { ad: 'Kadın', deger: Math.round((100 - d.erkek_orani) * 10) / 10 }]));
  if (secim.includes('egitim') && e) { const t = (...k) => Math.round(k.reduce((s, x) => s + (+e[x] || 0), 0) * 10) / 10;
    b.push(baslik('Eğitim Düzeyi (15 Yaş ve Üstü)') + cubukSvg([{ ad: 'Okuma yazma bilmiyor', deger: t('Okuma yazma bilmiyor') }, { ad: 'Okul bitirmemiş', deger: t('Okur-yazar, okul bitirmemiş') }, { ad: 'İlkokul / ilköğretim', deger: t('İlkokul', 'İlköğretim') }, { ad: 'Ortaokul', deger: t('Ortaokul') }, { ad: 'Lise', deger: t('Lise') }, { ad: 'Üniversite', deger: t('Üniversite (lisans/ön lisans)') }, { ad: 'Yüksek lisans, doktora', deger: t('Yüksek lisans', 'Doktora') }])); }
  if (secim.includes('medeni') && m) b.push(baslik('Medeni Durum (18 Yaş ve Üstü)') + cubukSvg(['Hiç evlenmemiş', 'Evli', 'Boşanmış', 'Eşi ölmüş'].filter((k) => m[k] != null).map((ad) => ({ ad, deger: +m[ad] }))));
  return b.length ? `<div style="grid-column:1/-1">${b.join('')}</div>` : '';
}
// Vade hedef fiyatları (kullanıcı tanımı): kısa 1–2 ay, orta 6 aya kadar, uzun 1 yıla kadar
const VADE = [['Kısa vade', '1–2 ay', 'alt', 'Hızlı satış için benzerlerin alt çeyreği'], ['Orta vade', '6 aya kadar', 'orta', 'Piyasanın ortası'], ['Uzun vade', '1 yıla kadar', 'ust', 'Sabırla satış için benzerlerin üst çeyreği']];

// MülkümAI değerlendirmesi: yalnız hesaplanan verilerden üretilen kural tabanlı yorum (uydurma bilgi yok)
function mulkumAiYorum(f, h) {
  const y = [], yuzde = (a, b) => Math.round(((a - b) / b) * 100);
  const genislik = h.orta ? Math.round(((h.ust - h.alt) / h.orta) * 100) : 0;
  y.push(`Bu ${f.ana === 'emlak' ? 'taşınmaz' : 'araç'} için Mülküm360’taki ${h.sayi} benzer ilana göre orta değer ${tl(h.orta)}; benzerlerin yarısı ${tl(h.alt)} ile ${tl(h.ust)} arasında fiyatlanmış.`);
  y.push(genislik <= 15 ? `Fiyatlar birbirine yakın (aralık genişliği %${genislik}); piyasa bu tür için oturmuş görünüyor.` : genislik <= 35 ? `Fiyatlarda orta düzeyde dağılım var (aralık genişliği %${genislik}); konum, kat ve bakım farkları fiyatı etkiliyor olabilir.` : `Fiyatlar geniş bir aralığa yayılmış (aralık genişliği %${genislik}); tahmin daha belirsiz, ekspertiz önerilir.`);
  if (f.ana === 'emlak' && f.binaYasi) y.push(yasSayi(f.binaYasi) <= 5 ? 'Bina yeni sayılır; aralığın üst yarısı makul bir hedef olabilir.' : yasSayi(f.binaYasi) >= 25 ? 'Bina yaşı yüksek; deprem dayanımı ve tadilat ihtiyacı nedeniyle aralığın alt yarısı daha gerçekçi olabilir.' : 'Bina yaşı orta düzeyde; aralığın ortası makul bir başlangıç noktasıdır.');
  if (f.ana === 'vasita' && f.hasar) y.push(f.hasar === 'Hatasız' ? 'Araç hatasız beyan edildi; ekspertizle doğrulanırsa aralığın üst yarısı savunulabilir.' : 'Boya, değişen ya da hasar kaydı değeri düşürür; aralığın alt yarısını hedeflemek daha gerçekçi olur.');
  if (f.ana === 'emlak' && f.islem === 'Kiralık' && h.birimOrta) y.push(`Kira, metrekare başına ortalama ${tl(h.birimOrta)} düzeyinde.`);
  y.push(h.guven === 'Yüksek' ? 'Emsal sayısı yeterli; güven düzeyi yüksek.' : h.guven === 'Orta' ? 'Emsal sayısı orta; sonucu bölgedeki gerçekleşen satışlarla karşılaştırmanı öneririz.' : 'Emsal sayısı az; bu rapor yalnız ön fikir verir, kesin değer için lisanslı değerleme gerekir.');
  return y;
}


// ---------- MülkümAI sohbet ----------
let aiGecmis = [];
// Yanıt beklenirken ekran yeniden çizilse de tek istek sürer; yanıttaki **kalın** ve madde işaretleri düzgün görünür
let aiGidiyor = false, aiYarim = '';
const aiBicim = (t) => kac(t).replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/^\s*[*-]\s+/gm, '• ').replace(/^#{1,4}\s+(.+)$/gm, '<b>$1</b>');
EKRAN.ai = () => {
  if (girisGerek('MülkümAI için giriş yap')) return;
  document.body.classList.add('navsiz'); nav.innerHTML = '';
  const eylemler = [
    ['grafik', 'Değer tahmini', 'Evinin ya da aracının değer aralığı', '#/degerle'],
    ['kalem', 'İlan açıklaması', 'Bilgilerini gir, MülkümAI yazsın', '#/ver'],
    ['ara', 'Akıllı arama', '“3+1 satılık Çankaya” gibi yaz', '#/'],
    ['kalkan', 'Güvenli alışveriş', 'Dolandırıcılık işaretleri', '#/metin/guvenlik']
  ];
  const oneriler = ['Ev alırken nelere dikkat etmeliyim?', 'İkinci el araçta ekspertizde neye bakılır?', 'Kira sözleşmesinde hangi maddeler olmalı?', 'Kat irtifakı ile kat mülkiyeti farkı nedir?', 'Kredi ile ev alırken hangi masraflar çıkar?'];
  const avatar = `<span class="ai-avatar">${ic('yildiz', 14)}</span>`;
  app.innerHTML = ustBar(`<span class="satir" style="gap:8px">${avatar}MülkümAI</span>`, aiGecmis.length ? `<button class="ikon-btn" aria-label="Yeni sohbet" id="temizle">${ic('yenile', 18)}</button>` : '') + `
    <div class="balonlar" id="balonlar" style="padding-bottom:160px">
      ${aiGecmis.length ? aiGecmis.map((m) => m.rol === 'ai' ? `<div class="ai-mesaj">${avatar}<div class="balon o" style="white-space:pre-wrap">${aiBicim(m.metin)}</div></div>` : `<div class="balon ben">${kac(m.metin)}</div>`).join('') : `
        <div class="ai-giris"><span class="ai-buyuk">${ic('yildiz', 30)}</span><h2>Merhaba${ben() ? ' ' + kac(ben().ad.split(' ')[0]) : ''}, nasıl yardımcı olabilirim?</h2><p>Emlak ve vasıta sorularını yanıtlarım, ilan yazarım, ilanları değerlendiririm.</p></div>
        <div class="ai-eylemler">${eylemler.map(([ik, b, a, h]) => `<a href="${h}" class="ai-eylem"><span>${ic(ik, 20)}</span><b>${b}</b><small>${a}</small></a>`).join('')}</div>
        <div class="bolum-bas"><h2 style="font-size:15px">Sık sorulanlar</h2></div>
        <div class="liste">${oneriler.map((o) => `<button class="oge" data-oneri="${kac(o)}">${ic('mesaj', 18)}<span class="ara">${kac(o)}</span><span class="ok">›</span></button>`).join('')}</div>`}
      <div id="yaziyor" class="ai-mesaj" ${aiGidiyor ? '' : 'hidden'}>${avatar}<div class="balon o yaziyor"><i></i><i></i><i></i></div></div>
    </div>
    <form class="mesaj-yaz" id="af"><div class="alt-bar-ic" style="flex-direction:column;gap:6px"><div class="satir"><label class="arama-kutu" style="height:50px"><input name="m" aria-label="MülkümAI'ya sor" placeholder="Bir şey sor…" autocomplete="off" maxlength="1000"></label>
      <button class="ikon-btn" style="background:var(--vurgu);border:0;width:50px;height:50px" aria-label="Gönder">${ic('gonder', 20, '#fff')}</button></div>
      <div class="k soluk" style="text-align:center">Yapay zekâ yanıtıdır; fiyat uydurmaz, hukuki ya da mali tavsiye değildir. Kişisel bilgi yazma.</div></div></form>`;
  scrollTo(0, document.body.scrollHeight);
  if (aiYarim) { $('#af').m.value = aiYarim; aiYarim = ''; }
  const sor = async (soru) => {
    soru = soru.trim(); if (!soru) return;
    if (aiGidiyor) return toast('Önceki yanıt bekleniyor…');
    aiGidiyor = true; aiGecmis.push({ rol: 'ben', metin: soru }); ciz(); scrollTo(0, document.body.scrollHeight);
    try { aiGecmis.push({ rol: 'ai', metin: await aiSor('sohbet', { soru, gecmis: aiGecmis.slice(0, -1) }) }); }
    catch (x) { aiGecmis.pop(); aiYarim = soru; toast(hataMetni(x)); }
    aiGidiyor = false; if (location.hash.startsWith('#/ai')) ciz();
  };
  $('#af').onsubmit = (e) => { e.preventDefault(); sor(e.target.m.value); };
  app.querySelectorAll('[data-oneri]').forEach((x) => (x.onclick = () => sor(x.dataset.oneri)));
  const tz = $('#temizle'); if (tz) tz.onclick = () => { aiGecmis = []; ciz(); };
};

// ---------- Krediler ----------
// Kredi satış ekranı satis.js'te (EKRAN.kredi orada yeniden tanımlanır); aşağıdaki eski sürüm yedek
EKRAN.kredi = async () => {
  if (girisGerek('Kredilerin için giriş yap')) return;
  const b = ben();
  const paket =(n, ad) => `<div class="kart satir"><div class="avatar" style="background:var(--vurgu-acik);color:var(--vurgu-koyu)">${n}</div><div class="ara"><b>${ad}</b><div class="k soluk">${n} MülkümAI değer raporu</div></div><span class="cip" style="min-height:32px;height:32px;cursor:default">Yakında</span></div>`;
  app.innerHTML = ustBar('Kredi bakiyem') + `<div class="ic">
    <div class="deger-k"><div class="ust-yazi">RAPOR KREDİN</div><div class="buyuk">${b.kredi ?? 0} kredi</div><div style="font-size:13px;opacity:.8">Her MülkümAI PDF değer raporu 1 kredi</div></div>
    <div class="bolum-bas"><h2>Kredi paketleri</h2></div>
    ${paket(1, 'Tek rapor')}${paket(5, 'Beşli paket')}${paket(20, 'Profesyonel paket')}
    <div class="k soluk" style="line-height:1.5">Fiyatlar ve uygulama içi ödeme (Google Play) yakında. O zamana kadar kredi yüklemek için destekle iletişime geç.</div>
    <div class="bolum-bas"><h2>Hareketler</h2></div><div class="liste" id="hareket"><div class="bos">Yükleniyor…</div></div></div>`;
  navCiz('hesap');
  try {
    const l = await krediHareketleri();
    const el = $('#hareket'); if (!el) return;
    el.innerHTML = l.length ? l.map((h) => `<div class="satir" style="padding:12px 14px;border-bottom:1px solid var(--yuzey2)"><div class="ara"><div style="font-size:14px;font-weight:600">${kac(h.aciklama)}</div><div class="k soluk">${new Date(h.zaman).toLocaleString('tr-TR')}</div></div><b style="color:${h.miktar > 0 ? 'var(--guven)' : 'var(--murekkep)'}">${h.miktar > 0 ? '+' : ''}${h.miktar}</b></div>`).join('') : '<div class="bos">Hareket yok</div>';
  } catch (x) { const el = $('#hareket'); if (el) el.innerHTML = `<div class="bos">${kac(hataMetni(x))}</div>`; }
};

// ---------- Bilgi metinleri ----------
const METIN = {
  guvenlik: ['Güvenli alışveriş rehberi', `<b>Görmeden ödeme yapma.</b> Ev ya da aracı yerinde görmeden kapora veya ön ödeme gönderme.

<b>Konuşmayı uygulamada tut.</b> Seni WhatsApp’a, e-postaya ya da başka bir siteye yönlendiren, “kargo/ödeme bağlantısı” gönderen kişilere dikkat et.

<b>Belgeleri kontrol et.</b> Emlakta tapuyu ve satıcının kimliğini, araçta ruhsatı, TRAMER kaydını ve ekspertiz raporunu iste.

<b>Piyasanın çok altındaki fiyatlar</b> dolandırıcılık işareti olabilir. İlan detayındaki fiyat karşılaştırmasına bak.

<b>Şüpheli bir ilan gördüğünde</b> “İlanı şikayet et”e dokun.`],
  kosullar: ['Kullanım koşulları', `Mülküm360 · iletişim: fatihcalis07@gmail.com

1. Mülküm360, kullanıcıların emlak ve vasıta ilanı yayınlayıp birbirleriyle iletişim kurduğu bir platformdur. Alım satım taraflar arasında gerçekleşir.

2. İlan veren, ilandaki bilgilerin doğru olduğunu ve ilan konusu mal üzerinde satış ya da kiralama yetkisi bulunduğunu kabul eder.

3. Yanıltıcı, yasa dışı, başkasına ait fotoğraf içeren ya da aynı malı birden fazla kez gösteren ilanlar kaldırılabilir.

4. İlanlarda telefon numarası, e-posta veya dış bağlantı ile kullanıcıları platform dışına yönlendirmek yasaktır.

5. Değer raporları bilgilendirme amaçlıdır; lisanslı değerleme raporu yerine geçmez.

6. Krediler: Değer raporu, MülkümDeko ve MülkümVideo gibi ücretli özellikler uygulama içi krediyle kullanılır. Krediler süresizdir, nakde çevrilemez, başka hesaba devredilemez. Yapay zekâ üretimi başarısız olursa kullanılan kredi otomatik iade edilir.

7. Yapay zekâ ile üretilen görsel ve videolar ilanda "yapay zekâ ile oluşturuldu" notuyla gösterilir ve mülkün gerçek durumunu yansıtmayabilir. Olmayan bir özelliği varmış gibi göstermek gibi yanıltıcı kullanım yasaktır.

8. Kredi satın alımları Google Play üzerinden yapılır ve "Satış ve iade koşulları"na tabidir.`],
  satis: ['Satış ve iade koşulları', `<b>1. Satıcı.</b> Uygulama içi kredi paketleri Google Play üzerinden satılır. Satış, ödeme, fatura ve iade işlemlerini Google Play yürütür; Google Play'in Hizmet Şartları ve iade politikası geçerlidir. Uygulamayı geliştiren: Mülküm360, iletişim: fatihcalis07@gmail.com.

<b>2. Konu.</b> Alıcının uygulama içinden seçtiği kredi paketi (dijital içerik). Paket adı, kredi miktarı ve vergiler dahil fiyat, ödeme öncesinde Google Play ödeme ekranında gösterilir.

<b>3. Teslim.</b> Krediler, Google Play ödemeyi onayladıktan hemen sonra hesabına yüklenir ve "Kredilerim" ekranında görünür.

<b>4. Cayma ve iade.</b> Anında teslim edilen dijital içerikte cayma hakkı bulunmaz (Mesafeli Sözleşmeler Yönetmeliği md. 15/ğ). Hiç kullanılmamış krediler için iade talebini Google Play üzerinden ya da fatihcalis07@gmail.com adresine iletebilirsin.

<b>5. Krediler.</b> Krediler süresizdir, nakde çevrilemez, devredilemez. Yapay zekâ üretimi başarısız olursa kullanılan kredi otomatik iade edilir.

<b>6. Şikâyet.</b> Sorun ve itirazlarını fatihcalis07@gmail.com adresine yazabilirsin; tüketici hakem heyeti ve tüketici mahkemesine başvuru hakkın saklıdır.`],
  gizlilik: ['Gizlilik politikası', `<b>Veri sorumlusu:</b> Mülküm360 uygulamasının veri sorumlusu Mülküm360'tır. İletişim: fatihcalis07@gmail.com.

<b>Toplanan veriler:</b> ad soyad, e-posta, telefon, ilan içerikleri ve fotoğraflar, mesajlar, satın alma kayıtları, uygulama hata kayıtları.

<b>Kullanım amacı:</b> hesabın işletilmesi, ilanların yayınlanması, kullanıcılar arası iletişim, ödeme doğrulama, güvenlik ve dolandırıcılığın önlenmesi.

<b>Hizmet sağlayıcılar:</b> Veriler Supabase (AB, Frankfurt) sunucularında saklanır. Yapay zekâ özellikleri için ilan metni ve fotoğrafları Google (Gemini) ve Pollinations servislerinde işlenir. Kredi ödemeleri Google Play tarafından alınır; kart bilgileriniz bize ulaşmaz.

<b>Paylaşım:</b> Verileriniz reklam amacıyla satılmaz; yasal zorunluluk dışında üçüncü kişilerle paylaşılmaz.

<b>Hesap silme:</b> Hesabım → Hesabımı sil ile hesabınızı, ilanlarınızı, fotoğraflarınızı ve mesajlarınızı kalıcı olarak silebilirsiniz.

<b>Haklarınız:</b> KVKK'nın 11. maddesindeki haklarınız için fatihcalis07@gmail.com adresine yazabilirsiniz.`],
  kvkk: ['KVKK aydınlatma metni', `<b>Veri sorumlusu:</b> Mülküm360 · fatihcalis07@gmail.com

<b>Toplanan veriler:</b> ad soyad, e-posta, telefon, ilan içerikleri ve fotoğraflar, mesajlar, uygulama içi tercihleriniz.

<b>Amaç:</b> üyelik hesabının oluşturulması, ilanların yayınlanması, kullanıcılar arası iletişim, güvenlik ve dolandırıcılığın önlenmesi.

<b>Saklama:</b> Veriler Avrupa Birliği’ndeki (Frankfurt) güvenli sunucularda saklanır. Telefon numaranız diğer üyelere gösterilmez. Hesabınızı sildiğinizde ilanlarınız, fotoğraflarınız ve mesajlarınız kalıcı olarak silinir.

<b>Yurt dışına aktarım:</b> Sunucular yurt dışında bulunduğundan verileriniz KVKK’nın 9. maddesi kapsamında yurt dışına aktarılır; bunun için ayrıca açık rızanız alınacaktır.

<b>Haklarınız:</b> 6698 sayılı Kanun’un 11. maddesi kapsamındaki haklarınızı (bilgi talep etme, düzeltme, silme vb.) kullanabilirsiniz.`]
};
EKRAN.metin = (k) => {
  const m = METIN[k]; if (!m) { git('#/'); return; }
  const digerleri = Object.entries(METIN).filter(([x]) => x !== k);
  app.innerHTML = ustBar(m[0]) + `<div class="ic"><div class="kart" style="white-space:pre-line;line-height:1.6;font-size:14px">${m[1]}</div>
    <div class="bolum-bas"><h2 style="font-size:15px">Diğer metinler</h2></div>
    <div class="liste">${digerleri.map(([x, v]) => menuSatir('#/metin/' + x, x === 'kvkk' ? 'kilit' : x === 'guvenlik' ? 'kalkan' : 'belge', v[0])).join('')}</div></div>`;
  navCiz();
};

// ---------- Yönlendirme ----------
// Geri dönüldüğünde liste kaldığı yerden devam eder
const KAYDIR = {}, YIGIN = []; let GERI_DONUS = false;
addEventListener('scroll', () => { const h = location.hash; if (YIGIN[YIGIN.length - 1] === h) (KAYDIR[h] = KAYDIR[h] || {}).y = scrollY; }, { passive: true });
// Şifre alanlarına "göster" düğmesi
function sifreGoz() {
  app.querySelectorAll('input[type=password]').forEach((g) => {
    if (g.dataset.goz) return; g.dataset.goz = '1';
    const s = document.createElement('span'); s.className = 'sifre-sar'; g.parentNode.insertBefore(s, g); s.appendChild(g);
    const d = document.createElement('button'); d.type = 'button'; d.className = 'sifre-goz'; d.setAttribute('aria-label', 'Şifreyi göster'); d.innerHTML = ic('goz', 20);
    d.onclick = () => { const acik = g.type === 'password'; g.type = acik ? 'text' : 'password'; d.classList.toggle('acik', acik); d.setAttribute('aria-label', acik ? 'Şifreyi gizle' : 'Şifreyi göster'); };
    s.appendChild(d);
  });
}
function ciz() {
  const hsh = location.hash;
  GERI_DONUS = YIGIN.length > 1 && YIGIN[YIGIN.length - 2] === hsh;
  if (GERI_DONUS) YIGIN.pop(); else if (YIGIN[YIGIN.length - 1] !== hsh) { YIGIN.push(hsh); if (YIGIN.length > 40) YIGIN.shift(); }
  const hedefY = GERI_DONUS ? KAYDIR[hsh]?.y || 0 : 0;
  sheetKapat();
  document.body.classList.remove('navsiz');
  const [yol] = (location.hash.slice(1) || '/').split('?');
  const p = yol.split('/').filter(Boolean);
  // Karşılama ekranı da aynı bağlamalardan geçmeli (Google düğmesi burada da var)
  if (!S.karsilandi && !ben() && !['giris', 'kayit', 'metin'].includes(p[0])) { EKRAN.karsilama(); app.querySelectorAll('[data-google]').forEach((x) => (x.onclick = () => googleBasla(x))); aiDugme(); document.getElementById('aiFab').hidden = true; return; }
  const e = { '': 'kesfet', endeksler: 'endeksler', ara: 'ara', ilan: 'ilan', ver: 'ver', mesajlar: 'mesajlar', sohbet: 'sohbet', hesap: 'hesap', favori: 'favori', kayitli: 'kayitli', bildirimler: 'bildirimler', giris: 'giris', kayit: 'kayit', profil: 'profil', degerle: 'degerle', rapor: 'rapor', raporlar: 'raporlar', metin: 'metin', yonetim: 'yonetim', kategori: 'kategori', kredi: 'kredi', ai: 'ai', uye: 'uye', toplu: 'toplu', panel: 'panel', bankakredi: 'bankakredi', yardim: 'yardim', performans: 'performans', proje: 'proje', danisman: 'danisman', harita: 'harita' }[p[0] || ''] || 'kesfet';
  EKRAN[e](p[1]);
  sifreGoz();
  aiDugme();
  app.querySelectorAll('[data-geri]').forEach((x) => (x.onclick = () => (history.length > 1 ? history.back() : git('#/'))));
  app.querySelectorAll('[data-google]').forEach((x) => (x.onclick = () => googleBasla(x)));
  if (!['sohbet'].includes(e)) { scrollTo(0, hedefY); if (hedefY) requestAnimationFrame(() => scrollTo(0, hedefY)); }
  GERI_DONUS = false;
}
addEventListener('hashchange', ciz);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheetEl.hidden) sheetKapat(); });
async function basla() {
  setTimeout(() => piyasaRefYukle(), 1500);
  await yukle();
  const uTema = new URLSearchParams(location.search).get('tema'); if (['prestij', 'vitrin', 'alev'].includes(uTema)) S.palet = uTema; // test/derin bağlantı: ?tema=vitrin
  temaUygula();
  app.innerHTML = `<div class="acilis"><div class="acilis-orta"><img src="logo.png" alt="" class="acilis-logo"><div class="acilis-ad">mülküm<b>360</b></div><div class="acilis-slogan">Emlak Ve Vasıtada Yapay Zekâ Destekli İlan</div></div>
    <div class="acilis-alt"><div class="acilis-cubuk"><span></span></div><div class="acilis-not">Değer Raporu · MülkümDeko · MülkümVideo</div></div></div>`;
  try {
    const P = window.Capacitor?.Plugins;
    if (P?.App && !basla.dinleniyor) {
      basla.dinleniyor = true;
      P.App.addListener('appUrlOpen', async ({ url }) => {
        if (!url.startsWith(GOOGLE_DONUS)) return;
        try { if (await googleDonus(url)) { S.karsilandi = true; kaydet(); toast('Hoş geldin, ' + (ben()?.ad || '').split(' ')[0]); const d = S.donus; S.donus = null; git(d && !/giris|kayit/.test(d) ? d : '#/'); kayitTuruUygula(); } }
        catch (x) { toast(hataMetni(x)); }
      });
      // Uygulama öne gelince verileri tazele, kayıtlı aramalara gelen ilanları bildir
      P.App.addListener('resume', () => { if (Date.now() - sonYukleme > 60000) veriYukle().then(() => { aramaBildir(); if (!document.body.classList.contains('navsiz')) ciz(); }, () => {}); });
    }
    if (new URLSearchParams(location.search).get('code')) { await googleDonus(location.href); history.replaceState(null, '', location.pathname + location.hash); S.karsilandi = true; kaydet(); setTimeout(kayitTuruUygula, 500); }
    else await veriYukle();
  }
  catch (x) {
    console.error(x);
    app.innerHTML = bosDurum('uyari', 'Bağlantı kurulamadı', hataMetni(x), '<button class="btn" id="tekrar">Tekrar dene</button>');
    $('#tekrar').onclick = basla; return;
  }
  ciz();
  setTimeout(aramaBildir, 3000);
  if (S.oturum && BLD) panelGetir().then((l) => { if (!PANEL) { PANEL = l; PANEL.sahip = S.oturum; } gorevHatirlatKur(); }, () => {});
}
sb.auth.onAuthStateChange((olay) => { if (olay === 'SIGNED_OUT' && S.oturum) { S.oturum = null; ciz(); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - sonYukleme > 60000) veriYukle().then(() => !location.hash.startsWith('#/ver') && ciz(), () => {}); });
// Tüm betikler (doping.js, satis.js vb.) yüklendikten sonra başla; yoksa ilk veri yüklemesi eksik fonksiyona çarpabiliyor
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', basla); else basla();
