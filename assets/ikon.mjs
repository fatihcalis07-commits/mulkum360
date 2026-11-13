// logo.svg (A · Derinlik) -> Capacitor assets kaynakları (ikon, ön plan, arka plan, açılış ekranı, Play 512)
import sharp from 'sharp';
import fs from 'fs';
const y = (a) => new URL(a, import.meta.url).pathname.slice(1);
const svg = fs.readFileSync(new URL('./logo.svg', import.meta.url), 'utf8');
// Ön plan: zemin dikdörtgeni çıkarılır, sembol adaptive ikon güvenli alanına küçültülür
const on = svg.replace(/<rect width="1024" height="1024"[^>]*\/>/, '').replace('viewBox="0 0 1024 1024"', 'viewBox="-200 -200 1424 1424"');
const zemin = svg.replace(/<g filter[\s\S]*<\/g>/, '');
await sharp(Buffer.from(svg)).resize(1024, 1024).png().toFile(y('./icon-only.png'));
await sharp(Buffer.from(on)).resize(1024, 1024).png().toFile(y('./icon-foreground.png'));
await sharp(Buffer.from(zemin)).resize(1024, 1024).png().toFile(y('./icon-background.png'));
await sharp(Buffer.from(svg)).resize(512, 512).png().toFile(y('./play-ikon-512.png'));
const splash = Buffer.from(on.replace('viewBox="-200 -200 1424 1424"', 'viewBox="-1200 -1200 3424 3424"'));
await sharp(splash).resize(2732, 2732).flatten({ background: '#0B1B33' }).png().toFile(y('./splash.png'));
await sharp(splash).resize(2732, 2732).flatten({ background: '#0B1B33' }).png().toFile(y('./splash-dark.png'));
fs.copyFileSync(y('./icon-only.png'), y('../www/logo.png'));
console.log('tamam');
