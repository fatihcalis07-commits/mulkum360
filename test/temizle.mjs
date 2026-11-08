// Kalan deneme hesaplarını (deneme-*@example.com) ve fotoğraflarını siler; gerçek üyelere dokunmaz.
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const ayar = fs.readFileSync(new URL('../www/sb-ayar.js', import.meta.url), 'utf8');
const yonet = createClient(ayar.match(/SB_URL = '([^']+)'/)[1], process.env.SB_GIZLI, { auth: { persistSession: false } });
const { data } = await yonet.auth.admin.listUsers();
const deneme = data.users.filter((u) => /^deneme-.*@example\.com$/.test(u.email || ''));
for (const u of deneme) {
  const f = await yonet.storage.from('ilan-fotolari').list(u.id);
  if (f.data?.length) await yonet.storage.from('ilan-fotolari').remove(f.data.map((x) => `${u.id}/${x.name}`));
  await yonet.auth.admin.deleteUser(u.id);
}
const kalan = (await yonet.auth.admin.listUsers()).data.users;
console.log(`silinen deneme hesabı: ${deneme.length}; kalan üye: ${kalan.length} (${kalan.map((u) => u.email.replace(/^(.{3}).*(@.*)$/, '$1***$2')).join(', ')})`);
