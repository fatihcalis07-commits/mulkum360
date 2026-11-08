// Uçtan uca sunucu testi: iki geçici hesap açar, gerçek akışları dener, sonunda hesapları ve verilerini siler.
// Kullanım: node test/uctan_uca.mjs  (gizli anahtar ortam değişkeni SB_GIZLI ile verilir, ekrana yazılmaz)
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const ayar = fs.readFileSync(new URL('../www/sb-ayar.js', import.meta.url), 'utf8');
const URL_ = ayar.match(/SB_URL = '([^']+)'/)[1], ACIK = ayar.match(/SB_ANAHTAR = '([^']+)'/)[1];
const yonet = createClient(URL_, process.env.SB_GIZLI, { auth: { persistSession: false } });
const yeni = () => createClient(URL_, ACIK, { auth: { persistSession: false } });
const sonuc = [];
const kontrol = (ad, kosul, ek = '') => sonuc.push(`${kosul ? 'TAMAM' : 'HATA '} ${ad}${ek ? ' — ' + ek : ''}`);
const ek = Date.now().toString(36);
const hesaplar = [];

async function hesap(ad, tel) {
  const eposta = `deneme-${hesaplar.length}-${ek}@example.com`, sifre = 'Deneme' + ek + '9';
  const { data, error } = await yonet.auth.admin.createUser({ email: eposta, password: sifre, email_confirm: true, user_metadata: { ad, tel } });
  if (error) throw error;
  hesaplar.push(data.user.id);
  const c = yeni();
  const g = await c.auth.signInWithPassword({ email: eposta, password: sifre });
  if (g.error) throw g.error;
  return { c, id: data.user.id };
}

try {
  const A = await hesap('Ayşe Deneme', '05321112233'), B = await hesap('Burak Deneme', '05334445566');
  kontrol('iki hesap açıldı ve giriş yaptı', A.id && B.id);

  // Ayrılmış e-posta: yönetici adresi şifreyle kaydedilemez

  // Fotoğraf yükleme
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const yol = `${A.id}/${ek}.jpg`;
  const up = await A.c.storage.from('ilan-fotolari').upload(yol, png, { contentType: 'image/jpeg' });
  kontrol('fotoğraf yüklendi', !up.error, up.error?.message);
  const url = A.c.storage.from('ilan-fotolari').getPublicUrl(yol).data.publicUrl;
  const herkes = await fetch(url);
  kontrol('fotoğraf herkese açık okunuyor', herkes.status === 200, String(herkes.status));
  const baska = await B.c.storage.from('ilan-fotolari').upload(`${A.id}/sizma-${ek}.jpg`, png, { contentType: 'image/jpeg' });
  kontrol('başkasının klasörüne yükleme engelli', !!baska.error);

  // İlan
  const il = await A.c.from('ilanlar').insert({ ana: 'emlak', alt: 'konut', baslik: 'Deneme ilanı, test sonrası silinecek', fiyat: 4200000, il: 'Ankara', ilce: 'Çankaya', alanlar: { islem: 'Satılık', tip: 'Daire', oda: '3+1', m2net: '120' }, fotolar: [url] }).select().single();
  kontrol('ilan yayınlandı', !il.error, il.error?.message || 'no ' + il.data?.no);
  const anon = await yeni().from('ilanlar').select('id').eq('id', il.data.id);
  kontrol('ilan üyeliksiz görünüyor', anon.data?.length === 1);
  const bDuz = await B.c.from('ilanlar').update({ fiyat: 1 }).eq('id', il.data.id).select();
  kontrol('başkası ilanı değiştiremiyor', !bDuz.data?.length);

  // Profil gizliliği
  const tel = await B.c.from('profil_ozel').select('tel').eq('id', A.id);
  kontrol('başkasının telefonu görünmüyor', tel.data?.length === 0);
  const ad = await yeni().from('profiller').select('ad').eq('id', A.id).single();
  kontrol('görünen ad herkese açık', ad.data?.ad === 'Ayşe Deneme');

  // Görüntülenme + favori
  await B.c.rpc('ilan_goruntule', { p_ilan: il.data.id });
  await B.c.from('favoriler').insert({ ilan: il.data.id });
  const g2 = await A.c.from('ilanlar').select('goruntulenme').eq('id', il.data.id).single();
  kontrol('görüntülenme sayıldı', g2.data.goruntulenme === 1, String(g2.data.goruntulenme));
  const fs_ = await A.c.rpc('favori_sayilari');
  kontrol('satıcı favori sayısını görüyor', fs_.data?.[0]?.sayi === 1);

  // Canlı mesaj: A dinler, B yazar
  let canli = null;
  const kanal = A.c.channel('t-' + ek).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mesajlar' }, (p) => (canli = p.new)).subscribe();
  await new Promise((r) => setTimeout(r, 2500));
  const soh = await B.c.from('sohbetler').insert({ ilan: il.data.id, satici: A.id }).select().single();
  kontrol('sohbet başladı', !soh.error, soh.error?.message);
  await B.c.from('mesajlar').insert({ sohbet: soh.data.id, metin: 'Merhaba, ilan hâlâ geçerli mi?' });
  const tk = await B.c.from('mesajlar').insert({ sohbet: soh.data.id, tur: 'teklif', tutar: 4000000, durum: 'bekliyor' }).select().single();
  await new Promise((r) => setTimeout(r, 3000));
  kontrol('mesaj satıcıya canlı ulaştı', !!canli, canli ? canli.tur : 'gelmedi');
  const ya = await B.c.rpc('teklif_yanitla', { p_mesaj: tk.data.id, p_kabul: true });
  kontrol('alıcı kendi teklifini kabul edemiyor', !!ya.error);
  const yb = await A.c.rpc('teklif_yanitla', { p_mesaj: tk.data.id, p_kabul: true });
  kontrol('satıcı teklifi kabul etti', !yb.error, yb.error?.message);
  const ms = await B.c.from('mesajlar').select('tur,durum,metin').eq('sohbet', soh.data.id).order('zaman');
  kontrol('alıcı sistem mesajını görüyor', ms.data?.some((m) => m.tur === 'sistem' && m.metin.includes('4.000.000')), ms.data?.map((m) => m.tur).join(','));
  const yab = await yeni().from('mesajlar').select('id').eq('sohbet', soh.data.id);
  kontrol('yabancı mesajları göremiyor', yab.data?.length === 0);
  A.c.removeChannel(kanal);

  // Kayıtlı arama, rapor, şikayet
  kontrol('arama kaydedildi', !(await B.c.from('kayitli_aramalar').insert({ q: 'ana=emlak', ad: 'Emlak' })).error);
  const r1 = await B.c.rpc('rapor_olustur', { p_no: 'TEST1', p_form: {}, p_sonuc: {} });
  kontrol('hoş geldin kredisiyle rapor oluştu', !r1.error, r1.error?.message);
  const r2 = await B.c.rpc('rapor_olustur', { p_no: 'TEST2', p_form: {}, p_sonuc: {} });
  kontrol('kredi bitince rapor engellendi', !!r2.error && /yetersiz/.test(r2.error.message));
  const hile = await B.c.from('profil_ozel').update({ kredi: 99 }).eq('id', B.id);
  kontrol('üye kendi kredisini artıramıyor', !!hile.error);
  const dogru = await B.c.from('raporlar').insert({ sahip: B.id, no: 'X', form: {}, sonuc: {} });
  kontrol('rapor kredisiz eklenemiyor', !!dogru.error);
  const yk = await B.c.rpc('kredi_yukle', { p_eposta: 'x@example.com', p_miktar: 5 });
  kontrol('sıradan üye kredi yükleyemiyor', !!yk.error);
  kontrol('şikayet gönderildi', !(await B.c.from('sikayetler').insert({ ilan: il.data.id, neden: 'Test' })).error);
  const sk = await B.c.from('sikayetler').select('id');
  kontrol('şikayetleri sıradan üye göremiyor', sk.data?.length === 0);
  const yon = await B.c.rpc('yonetici');
  kontrol('sıradan üye yönetici değil', yon.data === false);

  // Satıldı ve hesap silme (A kendi hesabını siler: ilan, foto, sohbet gider)
  kontrol('satıldı işaretlendi', !(await A.c.from('ilanlar').update({ durum: 'satildi' }).eq('id', il.data.id)).error);
  const dz = await A.c.storage.from('ilan-fotolari').list(A.id);
  if (dz.data?.length) await A.c.storage.from('ilan-fotolari').remove(dz.data.map((d) => `${A.id}/${d.name}`));
  const sil = await A.c.rpc('hesabimi_sil');
  kontrol('hesap silindi', !sil.error, sil.error?.message);
  const kalan = await yonet.from('ilanlar').select('id').eq('id', il.data.id);
  kontrol('silinen hesabın ilanı gitti', kalan.data?.length === 0);
  const fkalan = await yonet.storage.from('ilan-fotolari').list(A.id);
  kontrol('silinen hesabın fotoğrafları gitti', (fkalan.data || []).length === 0, String(fkalan.data?.length));
  if (!sil.error) hesaplar.splice(hesaplar.indexOf(A.id), 1);
} catch (e) {
  sonuc.push('BEKLENMEYEN HATA: ' + (e.message || e));
} finally {
  for (const id of hesaplar) {
    const f = await yonet.storage.from('ilan-fotolari').list(id);
    if (f.data?.length) await yonet.storage.from('ilan-fotolari').remove(f.data.map((x) => `${id}/${x.name}`));
    await yonet.auth.admin.deleteUser(id);
  }
  const { data: kalan } = await yonet.auth.admin.listUsers();
  sonuc.push(`temizlik: kalan deneme hesabı ${kalan.users.filter((u) => u.email?.includes(ek)).length}`);
  console.log(sonuc.join('\n'));
  process.exit(0);
}
