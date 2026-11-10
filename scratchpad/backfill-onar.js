// backfill SQL onarımı: UTF-16→UTF-8 + konumDuzey JSON dize tırnağı + BOM/çifte tırnak temizliği
const fs = require('fs');
let s = fs.readFileSync(process.argv[2], 'utf16le');
if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
s = s.replace(/konumDuzey\}','([^']*)'\)/g, (_, v) => `konumDuzey}','${JSON.stringify(v === 'ilÃ§e' ? 'ilçe' : v)}')`);
fs.writeFileSync(process.argv[3], s, 'utf8');
const degerler = [...new Set([...s.matchAll(/konumDuzey\}','("[^"]*")'\)/g)].map((m) => m[1]))];
console.log('değerler:', degerler.join(' '), '| satır:', s.split('\n').filter(Boolean).length);
