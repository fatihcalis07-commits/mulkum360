// .app Pages reposunu doldur: kök index/gizlilik/CNAME kopyala, varlık referanslarını listele
import { readFileSync, writeFileSync, copyFileSync, readdirSync, existsSync } from 'node:fs';
const KAYNAK = 'C:/Users/fcali/vitrin-app';
const HEDEF = 'D:/araclar/app-repo';
const s = readFileSync(KAYNAK + '/index.html', 'utf8');
const refs = [...new Set([...s.matchAll(/(?:src|href)="([^"]+)"/g)].map((x) => x[1]).filter((u) => !/^https?:|^#|^mailto|^data:/.test(u)))];
console.log('index.html varlıkları:\n' + (refs.join('\n') || '(yok)'));
for (const f of ['index.html', 'gizlilik.html']) {
  copyFileSync(KAYNAK + '/' + f, HEDEF + '/' + f);
  console.log('kopyalandı: ' + f);
}
writeFileSync(HEDEF + '/CNAME', 'mulkum360.app', 'utf8');
console.log('CNAME: mulkum360.app');
// referans edilen kök varlıkları da kopyala (varsa)
for (const r of refs) {
  const p = KAYNAK + '/' + r.replace(/^\/+/, '');
  if (existsSync(p)) { copyFileSync(p, HEDEF + '/' + r.replace(/^\/+/, '')); console.log('varlık kopyalandı: ' + r); }
  else console.log('EKSİK VARLIK (kökte yok): ' + r);
}
console.log('kök dosyaları: ' + readdirSync(KAYNAK).filter((f) => /\.(html|svg|png|ico|css|js)$/.test(f)).join(', '));
