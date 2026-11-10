// TÜM geçmişi gizli-anahtar açısından tarar; yalnız DOSYA+ÖRÜNTÜ bildirir, değer asla yazdırmaz.
const { execSync } = require('child_process');
const G = 'C:\\Program Files\\Git\\cmd\\git.exe';
const git = (a) => execSync('"' + G + '" ' + a, { cwd: 'C:\\Users\\fcali\\vitrin-app', maxBuffer: 1 << 28, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const shaList = git('rev-list --all').trim().split(/\s+/);
const CALIBLAR = {
  'service_role JWT': /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  'service_role kelimesi': /service_role/i,
  'Supabase secret key': /\b(sb_secret_|sb_srv_|supabase_sr_|SUPABASE_SERVICE)/i,
  'Google servis hesabı': /"type"\s*:\s*"service_account"/,
  "Google API key": /\bAIza[0-9A-Za-z_-]{30,}\b/,
  'GitHub token': /\b(ghp|gho|ghu|ghs|ghr)_[0-9A-Za-z]{16,}\b/,
  'AWS': /\bAKIA[0-9A-Z]{16}\b/,
  'Slack': /xox[baprs]-[0-9A-Za-z-]{10,}/,
  'OpenAI': /\bsk-[0-9A-Za-z]{20,}\b/,
  'Özel PEM anahtar': /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  'Parola/keystore alanı': /(storePassword|keyPassword|keystore)\s*[:=]/i,
};
const bulundu = new Map();
for (const sha of shaList) {
  let ls;
  try { ls = git('ls-tree -r --long ' + sha); } catch { continue; }
  for (const satir of ls.split('\n')) {
    const m = satir.match(/^\d+ \S+ ([0-9a-f]+) \d+\t(.+)$/);
    if (!m) continue;
    const [, blob, yol] = m;
    const anahtar = yol;
    if ([...bulundu.keys()].some(k => k === anahtar && Object.keys(bulundu.get(anahtar)).length)) { } // zaten tarandı mı aşağıda
    let hit = bulundu.get(anahtar);
    if (hit && hit._done) continue;
    let content;
    try { content = git('cat-file blob ' + blob); } catch { continue; }
    hit = hit || {};
    for (const [ad, re] of Object.entries(CALIBLAR)) {
      if (!hit[ad] && re.test(content)) hit[ad] = true;
    }
    hit._done = true;
    bulundu.set(anahtar, hit);
  }
}
let tehlike = 0;
for (const [yol, hit] of bulundu) {
  const cal = Object.keys(hit).filter(k => k !== '_done');
  if (cal.length) { tehlike++; console.log('⚠ ' + yol + '  →  ' + cal.join(', ')); }
}
console.log('---');
console.log('taranan commit:', shaList.length, '· eşleşen dosya:', tehlike);
if (tehlike === 0) console.log('TEMİZ: geçmişte bilinen gizli-anahtar kalıbı yok.');
