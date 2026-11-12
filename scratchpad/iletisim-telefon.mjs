// Site iletişim: e-posta → telefon (+90 542 689 19 82), tel: bağlantılı
import { readFileSync, writeFileSync } from 'node:fs';
const TEL = '+90 542 689 19 82';
const isler = [
  ['C:/Users/fcali/vitrin-app/index.html',
    '<p>İletişim: fatihcalis07@gmail.com</p>',
    '<p>İletişim: <a href="tel:+905426891982">' + TEL + '</a></p>'],
  ['C:/Users/fcali/vitrin-app/site/index.html',
    '<p>İletişim: fatihcalis07@gmail.com</p>',
    '<p>İletişim: <a href="tel:+905426891982">' + TEL + '</a></p>'],
  ['C:/Users/fcali/vitrin-app/gizlilik.html',
    'Talepleriniz için: <a href="mailto:fatihcalis07@gmail.com">fatihcalis07@gmail.com</a>',
    'Talepleriniz için: <a href="tel:+905426891982">' + TEL + '</a>'],
  ['C:/Users/fcali/vitrin-app/site/gizlilik.html',
    'Talepleriniz için: <a href="mailto:fatihcalis07@gmail.com">fatihcalis07@gmail.com</a>',
    'Talepleriniz için: <a href="tel:+905426891982">' + TEL + '</a>'],
  ['C:/Users/fcali/vitrin-app/docs/PLAY-LISTE.md',
    '📬 İletişim: fatihcalis07@gmail.com · mulkum360.com',
    '📬 İletişim: ' + TEL + ' · mulkum360.app'],
];
let ok = 0;
for (const [f, eski, yeni] of isler) {
  const s = readFileSync(f, 'utf8');
  if (!s.includes(eski)) { console.log('BULUNAMADI: ' + f); continue; }
  writeFileSync(f, s.replace(eski, yeni), 'utf8');
  console.log('güncellendi: ' + f); ok++;
}
console.log('toplam: ' + ok + '/' + isler.length);
