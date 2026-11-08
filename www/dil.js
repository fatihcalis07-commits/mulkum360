// Dil desteği (Türkçe / English / Русский): ekrandaki Türkçe metinler 'cevir' fonksiyonuyla anında çevrilir.
// Çeviriler sunucuda (ceviri tablosu) ve cihazda saklanır; aynı metin bir kez çevrilir. İlan başlık ve açıklamaları da çevrilir.
// Bu dosya app.js'ten ÖNCE yüklenir: html lang ayarı Türkçe büyük harf düzeltmesini kapatır.
const DILLER = [['tr', 'Türkçe'], ['en', 'English'], ['ru', 'Русский']];
let DIL = 'tr';
try { DIL = localStorage.getItem('dil') || 'tr'; } catch (_) {}
if (!DILLER.some(([k]) => k === DIL)) DIL = 'tr';
document.documentElement.lang = DIL;

function dilSec(k) { try { localStorage.setItem('dil', k); } catch (_) {} location.reload(); }

(function () {
  if (DIL === 'tr') return;
  const ATLA = 'script,style,textarea,input,select,option,code,pre,svg,[contenteditable],[data-cevirme],.cevirme,.logo';
  const sozluk = new Map(); // Türkçe → çeviri
  try { Object.entries(JSON.parse(localStorage.getItem('ceviri_' + DIL) || '{}')).forEach(([k, v]) => sozluk.set(k, v)); } catch (_) {}
  const koru = () => { try { const o = {}; [...sozluk].slice(-4000).forEach(([k, v]) => (o[k] = v)); localStorage.setItem('ceviri_' + DIL, JSON.stringify(o)); } catch (_) {} };
  const bekleyen = new Map(); // kaynak → [{düğüm, tür, ad}]
  const bizim = new WeakMap(); // düğüm → bizim yazdığımız metin (döngüyü önler)
  let zaman = null, istekte = new Set();
  const cevrilmeli = (s) => s.length >= 2 && s.length <= 600 && /\p{L}/u.test(s) && !/^[\d\s.,:;%+\-–/()₺]*(TL|m²|㎡|km|sn|dk)?[\d\s.,:;%+\-–/()]*$/u.test(s) && !/^https?:\/\//.test(s);
  const uygula = (h, metin) => {
    if (h.t === 'text') { const ham = h.n.__ham; const bas = ham.match(/^\s*/)[0], son = ham.match(/\s*$/)[0]; const y = bas + metin + son; bizim.set(h.n, y); h.n.nodeValue = y; }
    else { h.n.setAttribute(h.a, metin); h.n['__ceviri_' + h.a] = metin; }
  };
  const ekle = (kaynak, hedef) => {
    if (sozluk.has(kaynak)) return uygula(hedef, sozluk.get(kaynak));
    if (!bekleyen.has(kaynak)) bekleyen.set(kaynak, []);
    bekleyen.get(kaynak).push(hedef);
    clearTimeout(zaman); zaman = setTimeout(gonder, 250);
  };
  async function gonder() {
    const liste = [...bekleyen.keys()].filter((k) => !istekte.has(k)).slice(0, 60);
    if (!liste.length || typeof sb === 'undefined') return;
    liste.forEach((k) => istekte.add(k));
    try {
      const { data } = await sb.functions.invoke('cevir', { body: { dil: DIL, metinler: liste } });
      const c = (data && data.ceviri) || {};
      for (const k of liste) {
        istekte.delete(k);
        if (c[k]) { sozluk.set(k, c[k]); (bekleyen.get(k) || []).forEach((h) => { try { uygula(h, c[k]); } catch (_) {} }); bekleyen.delete(k); }
      }
      koru();
    } catch (_) { liste.forEach((k) => istekte.delete(k)); }
    if ([...bekleyen.keys()].some((k) => !istekte.has(k))) { clearTimeout(zaman); zaman = setTimeout(gonder, 400); }
  }
  const metinDugumu = (n) => {
    if (!n.parentElement || n.parentElement.closest(ATLA)) return;
    if (bizim.get(n) === n.nodeValue) return;
    const s = n.nodeValue.trim(); if (!cevrilmeli(s)) return;
    n.__ham = n.nodeValue; ekle(s, { t: 'text', n });
  };
  const ogeAttr = (el) => {
    if (el.closest && el.closest('script,style,svg,[data-cevirme]')) return;
    for (const a of ['placeholder', 'aria-label', 'title']) {
      const v = el.getAttribute && el.getAttribute(a); if (!v || el['__ceviri_' + a] === v) continue;
      const s = v.trim(); if (cevrilmeli(s)) ekle(s, { t: 'attr', n: el, a });
    }
  };
  const tara = (kok) => {
    if (kok.nodeType === 3) return metinDugumu(kok);
    if (kok.nodeType !== 1) return;
    ogeAttr(kok); kok.querySelectorAll && kok.querySelectorAll('[placeholder],[aria-label],[title]').forEach(ogeAttr);
    const w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT); for (let n; (n = w.nextNode());) metinDugumu(n);
  };
  const basla = () => {
    tara(document.body);
    new MutationObserver((l) => { for (const m of l) { if (m.type === 'characterData') metinDugumu(m.target); else if (m.type === 'attributes') ogeAttr(m.target); else m.addedNodes.forEach(tara); } })
      .observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title'] });
  };
  if (document.body) basla(); else document.addEventListener('DOMContentLoaded', basla);
})();
