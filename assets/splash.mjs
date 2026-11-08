// Açılış (splash) görseli: lacivert → mavi zemin, ortada logo, altında yazı -> assets/splash.png ve splash-dark.png
import sharp from 'sharp';
const B = 2732;
const zemin = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${B}">
<defs><radialGradient id="g" cx="50%" cy="20%" r="85%"><stop offset="0" stop-color="#1F6FC6"/><stop offset=".6" stop-color="#1B2A41"/><stop offset="1" stop-color="#121D2E"/></radialGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/>
<text x="50%" y="${B / 2 + 330}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="150" font-weight="700" fill="#fff">mülküm<tspan fill="#FFE800">360</tspan></text>
</svg>`);
const logo = await sharp(new URL('./icon-only.png', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')).resize(560, 560)
  .composite([{ input: Buffer.from('<svg width="560" height="560"><rect width="560" height="560" rx="150" ry="150"/></svg>'), blend: 'dest-in' }]).png().toBuffer();
const cikti = await sharp(zemin).composite([{ input: logo, left: (B - 560) / 2, top: B / 2 - 420 }]).png().toBuffer();
for (const ad of ['splash.png', 'splash-dark.png']) await sharp(cikti).toFile(new URL('./' + ad, import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
console.log('splash hazır');
