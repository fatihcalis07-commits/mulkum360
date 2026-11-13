// Uygulama simgesi için üç seçenek (aynı sembol: çatı + konum noktası + altın yay) ve karşılaştırma görseli
import sharp from 'sharp';
import fs from 'fs';
const yol = (a) => new URL(a, import.meta.url).pathname.slice(1);

// Ortak sembol parçaları (1024 kare içinde, adaptive ikon güvenli alanı için %62'ye sığar)
const cati = 'M512 222 L800 468 Q806 474 798 474 H716 Q710 474 704 469 L512 304 L320 469 Q314 474 308 474 H226 Q218 474 224 468 Z';

export const SECENEK = {
  // A) Derinlik: lacivert degrade, altın degrade yay, yumuşak gölge
  A: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="zA" cx="50%" cy="28%" r="85%"><stop offset="0" stop-color="#1B3560"/><stop offset=".55" stop-color="#0E2242"/><stop offset="1" stop-color="#07132A"/></radialGradient>
    <linearGradient id="yA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2CF7E"/><stop offset=".5" stop-color="#D9A84E"/><stop offset="1" stop-color="#B07F2C"/></linearGradient>
    <filter id="gA" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000" flood-opacity=".35"/></filter>
  </defs>
  <rect width="1024" height="1024" fill="url(#zA)"/>
  <g filter="url(#gA)">
    <path d="${cati}" fill="#FFFFFF"/>
    <path d="M238 540 A274 274 0 0 0 786 540 H698 A186 186 0 0 1 326 540 Z" fill="url(#yA)"/>
    <circle cx="512" cy="558" r="68" fill="#FFFFFF"/>
  </g>
</svg>`,
  // B) Açık zemin: beyaz-krem zemin, lacivert çatı ve nokta, altın yay (ana ekranda en çok öne çıkan)
  B: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="zB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F3EEE4"/></linearGradient>
    <linearGradient id="yB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E7B95E"/><stop offset="1" stop-color="#C08A30"/></linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#zB)"/>
  <path d="${cati}" fill="#0B1B33"/>
  <path d="M238 540 A274 274 0 0 0 786 540 H698 A186 186 0 0 1 326 540 Z" fill="url(#yB)"/>
  <circle cx="512" cy="558" r="68" fill="#0B1B33"/>
</svg>`,
  // C) 360 halkası: altın yay neredeyse tam daireye tamamlanır, ucunda dönüş oku; "360 derece" fikri
  C: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="zC" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#16305A"/><stop offset="1" stop-color="#091731"/></radialGradient>
    <linearGradient id="yC" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#B9862F"/><stop offset=".6" stop-color="#E2B562"/><stop offset="1" stop-color="#F4D58C"/></linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#zC)"/>
  <path d="M332 380 A250 250 0 1 0 692 380" fill="none" stroke="url(#yC)" stroke-width="70" stroke-linecap="round"/>
  <path d="M640 318 L748 338 L706 438 Z" fill="#F4D58C"/>
  <path d="M512 300 L668 432 H612 L512 348 L412 432 H356 Z" fill="#FFFFFF"/>
  <circle cx="512" cy="540" r="62" fill="#FFFFFF"/>
</svg>`
};

const MEVCUT = fs.readFileSync(yol('./logo.svg'), 'utf8');
const ic = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
// Kimlikler çakışmasın diye her kopyaya önek
const kopya = (svg, on) => ic(svg).replace(/id="(\w+)"/g, `id="${on}$1"`).replace(/url\(#(\w+)\)/g, `url(#${on}$1)`);

const sutunlar = [['Şu anki', MEVCUT], ['A · Derinlik', SECENEK.A], ['B · Açık zemin', SECENEK.B], ['C · 360 halkası', SECENEK.C]];
const G = 1600, H = 1140, sw = G / 4;
let govde = `<rect width="${G}" height="${H}" fill="#F4F5F7"/>`;
// Üst bant: yuvarlatılmış kare (One UI) ve daire (Pixel) maskeleri
sutunlar.forEach(([ad, svg], i) => {
  const x = i * sw + sw / 2;
  govde += `<text x="${x}" y="70" text-anchor="middle" font-family="Segoe UI, Arial" font-size="30" font-weight="700" fill="#0B1B33">${ad}</text>`;
  govde += `<defs><clipPath id="k${i}"><rect x="${x - 120}" y="110" width="240" height="240" rx="58"/></clipPath><clipPath id="d${i}"><circle cx="${x}" cy="520" r="120"/></clipPath></defs>`;
  govde += `<g clip-path="url(#k${i})"><svg x="${x - 120}" y="110" width="240" height="240" viewBox="0 0 1024 1024">${kopya(svg, 'k' + i)}</svg></g>`;
  // Daire maskesi (Pixel): aynı ölçek, köşeler kesilir
  govde += `<g clip-path="url(#d${i})"><svg x="${x - 120}" y="400" width="240" height="240" viewBox="0 0 1024 1024">${kopya(svg, 'd' + i)}</svg></g>`;
});
// Alt bant: telefon ana ekranı, etiket iki satır (Mülküm / 360)
govde += `<defs><linearGradient id="duvar" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2E4A6B"/><stop offset="1" stop-color="#6B4E7A"/></linearGradient></defs>`;
govde += `<rect x="0" y="700" width="${G}" height="${H - 700}" fill="url(#duvar)"/>`;
govde += `<text x="${G / 2}" y="752" text-anchor="middle" font-family="Segoe UI, Arial" font-size="24" fill="#FFFFFF" opacity=".8">Ana ekranda (etiket iki satır: Mülküm / 360)</text>`;
sutunlar.forEach(([, svg], i) => {
  const x = i * sw + sw / 2;
  govde += `<defs><clipPath id="t${i}"><rect x="${x - 78}" y="800" width="156" height="156" rx="40"/></clipPath></defs>`;
  govde += `<g clip-path="url(#t${i})"><svg x="${x - 78}" y="800" width="156" height="156" viewBox="0 0 1024 1024">${kopya(svg, 't' + i)}</svg></g>`;
  govde += `<text x="${x}" y="1010" text-anchor="middle" font-family="Segoe UI, Arial" font-size="30" fill="#FFFFFF">Mülküm</text><text x="${x}" y="1048" text-anchor="middle" font-family="Segoe UI, Arial" font-size="30" fill="#FFFFFF">360</text>`;
});
const sayfa = `<svg xmlns="http://www.w3.org/2000/svg" width="${G}" height="${H}" viewBox="0 0 ${G} ${H}">${govde}</svg>`;
const cikti = process.argv[2] || yol('./ikon_secenekleri.png');
await sharp(Buffer.from(sayfa)).png().toFile(cikti);
for (const [k, v] of Object.entries(SECENEK)) fs.writeFileSync(yol(`./ikon_${k}.svg`), v);
console.log('tamam', cikti);
