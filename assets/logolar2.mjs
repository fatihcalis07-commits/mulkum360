// İkinci tur: dolgu, geometrik logo önerileri -> logo-onerileri-2.png
import sharp from 'sharp';
const K = '#16181D', T = '#E8590C', B = '#FFFFFF';
const L = {
  // A: dolu ev; kapıdan çıkan kıvrımlı yol negatif boşluk (ev + vasıta)
  'A · Evden çıkan yol': `<path d="M512 230 L800 470 V800 H224 V470z" fill="${B}"/>
    <path d="M470 800 C470 700 560 680 560 600 C560 545 520 520 512 520 C504 520 464 545 464 600 C464 680 380 700 380 800z" fill="${K}"/>
    <path d="M512 160 L880 470" stroke="${T}" stroke-width="70" stroke-linecap="round"/><path d="M512 160 L144 470" stroke="${T}" stroke-width="70" stroke-linecap="round"/>`,
  // B: rozet — üst yarı çatı silüeti, alt yarı perspektif yol
  'B · Çatı ve yol rozeti': `<circle cx="512" cy="512" r="330" fill="${B}"/>
    <path d="M182 512 H842 A330 330 0 0 1 182 512z" fill="${T}"/>
    <path d="M512 270 L700 440 V512 H324 V440z" fill="${K}"/>
    <path d="M470 842 L500 540 H524 L554 842z" fill="${B}"/>`,
  // C: anahtar başı dolu ev, anahtar deliği negatif, dişler yol şeridi
  'C · Ev anahtarı': `<path d="M380 300 L560 450 V700 H200 V450z" fill="${B}"/>
    <circle cx="380" cy="545" r="46" fill="${K}"/><path d="M362 570 h36 l14 80 h-64z" fill="${K}"/>
    <rect x="540" y="540" width="300" height="60" rx="30" fill="${T}"/><rect x="700" y="580" width="56" height="100" rx="20" fill="${T}"/><rect x="784" y="580" width="56" height="70" rx="20" fill="${T}"/>`,
  // D: M monogramı — sol tepe çatı (beyaz), sağ tepe hız çizgisi (turuncu)
  'D · M monogram': `<path d="M220 780 V420 L380 280 L512 400 V780 H420 V470 L380 435 L312 495 V780z" fill="${B}"/>
    <path d="M512 400 L644 280 L804 420 V780 H712 V495 L644 435 L604 470 V780 H512z" fill="${T}"/>`,
  // E: 360 halkası iki renkli — üst yarı çatı kemeri, alt yarı jant; ortada nokta
  'E · 360 halka': `<path d="M512 210 L812 470 H712 L512 296 L312 470 H212z" fill="${B}"/>
    <path d="M232 540 A280 280 0 0 0 792 540 H700 A188 188 0 0 1 324 540z" fill="${T}"/>
    <circle cx="512" cy="560" r="70" fill="${B}"/>`
};
const kart = 380, bosluk = 30, ad = Object.keys(L);
const genis = ad.length * kart + (ad.length + 1) * bosluk, yuks = kart * 2 + 260;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${genis}" height="${yuks}"><rect width="100%" height="100%" fill="#F6F5F2"/>`;
ad.forEach((a, n) => {
  const x = bosluk + n * (kart + bosluk);
  svg += `<svg x="${x}" y="${bosluk}" width="${kart}" height="${kart}" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="220" fill="${K}"/>${L[a]}</svg>
    <svg x="${x + 40}" y="${kart + 70}" width="110" height="110" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="220" fill="${K}"/>${L[a]}</svg>
    <text x="${x + 165}" y="${kart + 138}" font-family="Segoe UI, Arial" font-size="34" font-weight="800" fill="${K}">mülküm<tspan fill="${T}">360</tspan></text>
    <rect x="${x}" y="${kart + 220}" width="${kart}" height="${kart - 60}" rx="24" fill="#FFFFFF"/>
    <svg x="${x + 130}" y="${kart + 250}" width="120" height="120" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="220" fill="${K}"/>${L[a]}</svg>
    <text x="${x + kart / 2}" y="${kart + 430}" font-family="Segoe UI, Arial" font-size="26" font-weight="700" text-anchor="middle" fill="${K}">${a}</text>`;
});
svg += '</svg>';
await sharp(Buffer.from(svg)).png().toFile(process.argv[2]);
console.log('tamam');
