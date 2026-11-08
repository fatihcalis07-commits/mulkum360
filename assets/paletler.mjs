// Renk paleti önerileri -> palet-onerileri.png
import sharp from 'sharp';
const P = [
  { ad: 'A · Gece Mavisi + Altın', alt: 'Güven, premium, bankacılık hissi', hero: '#0B1B33', vurgu: '#D4A24C', vurguYazi: '#0B1B33', acik: '#F5EEDF', zemin: '#F4F6FA', yuzey: '#FFFFFF', yazi: '#0B1B33' },
  { ad: 'B · Zümrüt + Krem', alt: 'Doğa, ev, huzur; emlak için sıcak', hero: '#0E3B2E', vurgu: '#1F9D6B', vurguYazi: '#FFFFFF', acik: '#DDF3E8', zemin: '#F7F5EF', yuzey: '#FFFFFF', yazi: '#13241E' },
  { ad: 'C · Mürekkep + Mercan', alt: 'Modern, genç, enerjik', hero: '#1B1E2E', vurgu: '#FF5A5F', vurguYazi: '#FFFFFF', acik: '#FFE4E5', zemin: '#F6F6F9', yuzey: '#FFFFFF', yazi: '#1B1E2E' },
  { ad: 'D · Lacivert + Elektrik Mavisi', alt: 'Teknoloji, yapay zeka, temiz', hero: '#0A1630', vurgu: '#2F6BFF', vurguYazi: '#FFFFFF', acik: '#E3EBFF', zemin: '#F3F6FC', yuzey: '#FFFFFF', yazi: '#0A1630' }
];
const W = 360, H = 640, g = 30;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${P.length * W + (P.length + 1) * g}" height="${H + 150}"><rect width="100%" height="100%" fill="#EDEDED"/>`;
P.forEach((p, n) => {
  const x = g + n * (W + g), y = g;
  svg += `<g transform="translate(${x},${y})">
    <rect width="${W}" height="${H}" rx="32" fill="${p.zemin}"/>
    <rect width="${W}" height="308" rx="30" fill="${p.hero}"/>
    <text x="24" y="58" font-family="Segoe UI" font-size="20" font-weight="800" fill="#fff">mülküm<tspan fill="${p.vurgu}">360</tspan></text>
    <rect x="${W - 86}" y="36" width="62" height="30" rx="15" fill="${p.vurgu}"/><text x="${W - 55}" y="56" font-family="Segoe UI" font-size="13" font-weight="700" fill="${p.vurguYazi}" text-anchor="middle">★ 1</text>
    <text x="24" y="112" font-family="Segoe UI" font-size="26" font-weight="800" fill="#fff">Aradığın evi</text>
    <text x="24" y="144" font-family="Segoe UI" font-size="26" font-weight="800" fill="#fff">tek cümleyle bul.</text>
    <rect x="24" y="166" width="${W - 48}" height="40" rx="12" fill="#ffffff18"/><rect x="28" y="170" width="${(W - 56) / 2}" height="32" rx="9" fill="#fff"/>
    <text x="${28 + (W - 56) / 4}" y="191" font-family="Segoe UI" font-size="13" font-weight="700" fill="${p.hero}" text-anchor="middle">Emlak</text>
    <text x="${28 + 3 * (W - 56) / 4}" y="191" font-family="Segoe UI" font-size="13" font-weight="600" fill="#C9CCD3" text-anchor="middle">Vasıta</text>
    <rect x="24" y="220" width="${W - 48}" height="48" rx="14" fill="#fff"/><text x="44" y="250" font-family="Segoe UI" font-size="13" fill="#8A8F99">örn. 3+1 satılık, metroya yakın</text>
    <rect x="${W - 64}" y="226" width="36" height="36" rx="10" fill="${p.vurgu}"/>
    ${[0, 1, 2].map((k) => `<rect x="${24 + k * 108}" y="330" width="98" height="96" rx="16" fill="${p.yuzey}" stroke="#0000000d"/><rect x="${36 + k * 108}" y="342" width="34" height="34" rx="10" fill="${p.acik}"/><text x="${36 + k * 108}" y="404" font-family="Segoe UI" font-size="13" font-weight="700" fill="${p.yazi}">${['Konut', 'İşyeri', 'Arsa'][k]}</text>`).join('')}
    <rect x="24" y="442" width="150" height="110" rx="18" fill="${p.hero}"/><text x="40" y="520" font-family="Segoe UI" font-size="14" font-weight="700" fill="#fff">MülkümAI</text><text x="40" y="538" font-family="Segoe UI" font-size="11" fill="#C9CCD3">asistan</text>
    <rect x="186" y="442" width="150" height="110" rx="18" fill="${p.acik}"/><text x="202" y="520" font-family="Segoe UI" font-size="14" font-weight="700" fill="${p.yazi}">Ne kadar eder?</text><text x="202" y="538" font-family="Segoe UI" font-size="11" fill="${p.yazi}" opacity=".7">PDF rapor</text>
    <rect x="0" y="${H - 70}" width="${W}" height="70" fill="${p.yuzey}"/><rect x="${W / 2 - 26}" y="${H - 62}" width="52" height="52" rx="16" fill="${p.vurgu}"/><text x="${W / 2}" y="${H - 27}" font-family="Segoe UI" font-size="28" font-weight="700" fill="${p.vurguYazi}" text-anchor="middle">+</text>
  </g>
  <text x="${x + W / 2}" y="${H + 75}" font-family="Segoe UI" font-size="22" font-weight="700" fill="#16181D" text-anchor="middle">${p.ad}</text>
  <text x="${x + W / 2}" y="${H + 108}" font-family="Segoe UI" font-size="16" fill="#555" text-anchor="middle">${p.alt}</text>`;
});
svg += '</svg>';
await sharp(Buffer.from(svg)).png().toFile(process.argv[2]);
console.log('tamam');
