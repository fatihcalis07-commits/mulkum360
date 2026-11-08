// Lucide simgelerinden uygulamanın IKON tablosunu üretir -> www/simgeler.js
import fs from 'fs';
const kok = new URL('../node_modules/lucide-static/icons/', import.meta.url);
const ESLE = {
  ev: 'house', arsa: 'land-plot', isyeri: 'store', gunes: 'sun', araba: 'car', suv: 'car-front', motor: 'bike', kamyon: 'truck',
  ara: 'search', arti: 'plus', kalp: 'heart', mesaj: 'message-circle', kisi: 'circle-user-round', pusula: 'compass', geri: 'chevron-left',
  kapat: 'x', paylas: 'share-2', filtre: 'sliders-horizontal', kalkan: 'shield-check', uyari: 'triangle-alert', gonder: 'send-horizontal',
  indir: 'download', belge: 'file-text', grafik: 'chart-column', zil: 'bell', ayar: 'settings', ay: 'moon', cikis: 'log-out', kalem: 'pen-line',
  cop: 'trash-2', tik: 'check', foto: 'camera', konum: 'map-pin', yildiz: 'sparkles', bayrak: 'flag', goz: 'eye', kilit: 'lock', yenile: 'rotate-cw',
  vinc: 'construction', bina: 'building-2', takvim: 'calendar-days', otel: 'hotel', simsek: 'zap', minivan: 'bus', anahtar: 'key-round',
  tekne: 'sailboat', karavan: 'caravan', menu: 'menu', ok: 'chevron-right', numara: 'hash', kredi: 'wallet', ai: 'sparkles', ev2: 'house-plus',
  grafik: 'chart-no-axes-column', belge: 'file-chart-column', telefon: 'phone', eposta: 'mail', dil: 'languages', tema: 'sun-moon', yardim: 'circle-help',
  profil: 'user-round-pen', ofis: 'briefcase-business', bildirim: 'bell-ring', rozet: 'badge-check', yasal: 'scale', davet: 'user-plus', bilgi: 'info',
  pano: 'layout-dashboard', asagi: 'chevron-down', kart: 'id-card',
  k_proje: 'hard-hat', k_yazlik: 'tree-palm', k_devre: 'calendar-range', k_elektrik: 'plug-zap', k_hasarli: 'badge-alert', k_klasik: 'crown', k_suv: 'car-front', k_minivan: 'bus-front', k_isyeri: 'store', k_bina: 'building'
};
const tablo = {}, eksik = [];
for (const [ad, lucide] of Object.entries(ESLE)) {
  const yol = new URL(lucide + '.svg', kok);
  if (!fs.existsSync(yol)) { eksik.push(lucide); continue; }
  const s = fs.readFileSync(yol, 'utf8');
  tablo[ad] = s.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s*\n\s*/g, '').trim();
}
fs.writeFileSync(new URL('../www/simgeler.js', import.meta.url), `// Lucide simgeleri (ISC lisansı, lucide.dev) — assets/simgeler.mjs ile üretildi\n'use strict';\nObject.assign(IKON, ${JSON.stringify(tablo)});\n`);
console.log('simge', Object.keys(tablo).length, 'eksik', eksik.join(',') || 'yok');
