// 5 logo önerisi -> tek tablo (logo-onerileri.png)
import sharp from 'sharp';
const K = '#16181D', T = '#E8590C', B = '#FFFFFF';
const s = (w) => `fill="none" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const L = {
  // 1: 360 halkası içinde ev çatısı + altında araba gövdesi
  '1 · Ev + araba halkası': `<circle cx="512" cy="512" r="330" stroke="${T}" ${s(48)} stroke-dasharray="1650 425" transform="rotate(-60 512 512)"/>
    <path d="M362 470 L512 340 L662 470" stroke="${B}" ${s(52)}/>
    <path d="M330 640 l40-80 h284 l40 80 v50 H330z" stroke="${B}" ${s(44)}/><circle cx="410" cy="700" r="26" fill="${T}"/><circle cx="614" cy="700" r="26" fill="${T}"/>`,
  // 2: anahtar — başı ev biçiminde (ev anahtarı da araba anahtarı da)
  '2 · Anahtar': `<path d="M300 520 L420 410 L540 520 V650 H300z" stroke="${B}" ${s(52)}/><circle cx="420" cy="560" r="34" fill="${T}"/>
    <path d="M540 585 H760 M690 585 v70 M750 585 v50" stroke="${T}" ${s(52)}/>`,
  // 3: M harfi çatılardan, altında yol çizgisi
  '3 · M + yol': `<path d="M260 640 V430 L390 330 L512 430 L634 330 L764 430 V640" stroke="${B}" ${s(60)}/>
    <path d="M230 740 H794" stroke="${T}" ${s(40)}/><path d="M300 740 h70 M470 740 h84 M654 740 h70" stroke="${K}" ${s(14)}/>`,
  // 4: konum pini içinde ev ve tekerlek
  '4 · Konum pini': `<path d="M512 830 C400 690 290 590 290 450 a222 222 0 0 1 444 0 c0 140-110 240-222 380z" stroke="${T}" ${s(48)}/>
    <path d="M420 470 L512 395 L604 470 V560 H420z" stroke="${B}" ${s(40)}/><circle cx="512" cy="520" r="22" fill="${T}"/>`,
  // 5: çatı + tekerlek (360 jant)
  '5 · Çatı + teker': `<path d="M250 450 L512 230 L774 450" stroke="${B}" ${s(64)}/>
    <circle cx="512" cy="590" r="170" stroke="${T}" ${s(48)}/><circle cx="512" cy="590" r="44" fill="${B}"/>
    <path d="M512 546 V440 M474 612 L384 664 M550 612 L640 664" stroke="${B}" ${s(30)}/>`
};
const kart = 380, bosluk = 30, ad = Object.keys(L);
const genis = ad.length * kart + (ad.length + 1) * bosluk, yuks = kart + 150;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${genis}" height="${yuks}"><rect width="100%" height="100%" fill="#F6F5F2"/>`;
ad.forEach((a, n) => {
  const x = bosluk + n * (kart + bosluk);
  svg += `<svg x="${x}" y="${bosluk}" width="${kart}" height="${kart}" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="220" fill="${K}"/>${L[a]}</svg>
    <text x="${x + kart / 2}" y="${kart + bosluk + 50}" font-family="Segoe UI, Arial" font-size="26" font-weight="700" text-anchor="middle" fill="${K}">${a}</text>
    <text x="${x + kart / 2}" y="${kart + bosluk + 90}" font-family="Segoe UI, Arial" font-size="26" font-weight="800" text-anchor="middle" fill="${K}">mülküm<tspan fill="${T}">360</tspan></text>`;
});
svg += '</svg>';
await sharp(Buffer.from(svg)).png().toFile(process.argv[2]);
console.log('tamam');
