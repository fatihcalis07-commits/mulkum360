// Üretilmiş backfill SQL'inde konumDuzey kuyruğunu geçerli JSON biçimine indirger: '{konumDuzey}','"değer"')
import fs from 'node:fs';
let s = fs.readFileSync(process.argv[2], 'utf8');
let n = 0;
s = s.replace(/\{konumDuzey\}',[^)]*\)/g, (m) => {
  const d = (m.match(/parsel|sokak|mahalle|il.?e/) || [''])[0];
  if (!d) return m;
  n++;
  return `{konumDuzey}','"${d}"')`;
});
fs.writeFileSync(process.argv[2], s, 'utf8');
console.log('düzeltilen:', n, '| örnek:', (s.match(/\{konumDuzey\}','"[^"]*"'\)/) || ['?'])[0]);
