// logo.svg -> Capacitor assets kaynakları (ikon, ön plan, açılış ekranı)
import sharp from 'sharp';
import fs from 'fs';
const svg = fs.readFileSync(new URL('./logo.svg', import.meta.url));
const on = svg.toString().replace('<rect width="1024" height="1024" rx="0" fill="#0B1B33"/>', '').replace('viewBox="0 0 1024 1024"', 'viewBox="-200 -200 1424 1424"');
await sharp(svg).resize(1024, 1024).png().toFile(new URL('./icon-only.png', import.meta.url).pathname.slice(1));
await sharp(Buffer.from(on)).resize(1024, 1024).png().toFile(new URL('./icon-foreground.png', import.meta.url).pathname.slice(1));
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#0B1B33' } }).png().toFile(new URL('./icon-background.png', import.meta.url).pathname.slice(1));
const splash = Buffer.from(on.replace('viewBox="-200 -200 1424 1424"', 'viewBox="-1200 -1200 3424 3424"'));
await sharp(splash).resize(2732, 2732).flatten({ background: '#0B1B33' }).png().toFile(new URL('./splash.png', import.meta.url).pathname.slice(1));
await sharp(splash).resize(2732, 2732).flatten({ background: '#0B1B33' }).png().toFile(new URL('./splash-dark.png', import.meta.url).pathname.slice(1));
fs.copyFileSync(new URL('./icon-only.png', import.meta.url), new URL('../www/logo.png', import.meta.url));
console.log('tamam');
