// Mülküm360 — FAZ 4 (MODÜL 12+16) doping: görünürlük, zorunlu rozet, tek noktadan sıralama enjeksiyonu.
// Aktif doping = ilan_doping satırı (durum='aktif', baslangic ≤ şimdi < bitis). Rozet reklam mevzuatı gereği ZORUNLUDUR.
// Sıralama: dopingli ilanlar tür önceliğine göre başa alınır, kalanlar doğal sırasını korur (stabil, şeffaf).

async function dopingYukle() {
  try {
    const [{ data: akt }, { data: tur }] = await Promise.all([
      sb.from('ilan_doping').select('ilan,tur,paket,baslangic,bitis').eq('durum', 'aktif').order('baslangic'),
      sb.from('doping_turleri').select('kod,ad,sira,aktif').eq('aktif', true)
    ]);
    const simdi = Date.now(), harita = {};
    for (const d of akt || []) { const b = ms(d.baslangic), e = ms(d.bitis); if (b <= simdi && simdi < e) harita[d.ilan] = { tur: d.tur, paket: d.paket, bitis: e }; }
    S.DOPING = { aktif: harita, turler: Object.fromEntries((tur || []).map((t) => [t.kod, t])) };
  } catch (e) { console.error('doping', e); S.DOPING = { aktif: {}, turler: {} }; }
}

const dopingBilgi = (i) => (S.DOPING && S.DOPING.aktif[i.id]) || null;

// Kart rozeti: "Acil" turu kendi adıyla, diğer doping türleri "Sponsorlu" etiketiyle (mevzuat: açıkça belirtilir)
function dopingRozet(i) {
  const d = dopingBilgi(i);
  if (!d) return '';
  const acil = d.tur === 'acil';
  return `<span style="background:${acil ? '#C8553D' : '#B58A2B'};color:#fff">${acil ? 'Acil' : 'Sponsorlu'}</span>`;
}

// Tek sıralama enjeksiyonu: dopingli önde (tür önceliği: sira küçük = daha önde), dopinglisiz mevcut sırayı korur
function dopingSirala(l) {
  const a = S.DOPING && S.DOPING.aktif;
  if (!a || !Object.keys(a).length) return l;
  const agirlik = (i) => { const d = a[i.id]; return d ? 1000 - (S.DOPING.turler[d.tur] ? S.DOPING.turler[d.tur].sira : 9) : 0; };
  return l.map((i, n) => [i, n]).sort((x, y) => agirlik(y[0]) - agirlik(x[0]) || x[1] - y[1]).map((p) => p[0]);
}

// Satın alma (herkes): aktif paketi seç, ilan sahibi kendi ilanına talep/açılış başlatır.
// Play ürünleri kurulana kadar yontem='talep': panelde yönetici onaylayınca devreye girer (kredi akışı kalıbı).
async function dopingTalep(ilanId, paketId) {
  const p = S.DOPING.paketler.find((x) => x.id === paketId);
  if (!p || !p.aktif || !(+p.fiyat > 0)) throw new Error('Paket satışta değil.');
  const i = ilan(ilanId);
  if (!i || i.sahip !== S.oturum) throw new Error('İlan sizin değil.');
  await islem(sb.from('doping_satislari').insert({ kullanici: S.oturum, ilan: ilanId, paket: paketId, tutar: +p.fiyat, yontem: 'talep', durum: 'bekliyor' }));
}

// Satılık paket listesi (alım ekranı için) — doping_paketleri tek doğruluk kaynağı, fiyat sabit kod yok
async function dopingPaketlerGetir() {
  const { data } = await sb.from('doping_paketleri').select('*').eq('aktif', true).order('sira');
  S.DOPING.paketler = data || [];
  return S.DOPING.paketler;
}

// Doping başlat: anlık görüntüyle (görüntülenme/fav) — yönetici onayı veya yönetici hediyesi. Kullanıcı talebi doping_satislari'nde bekler.
async function dopingBaslat(ilanId, paketId, satisId) {
  const { data: p } = await sb.from('doping_paketleri').select('tur,gun').eq('id', paketId).single();
  if (!p) throw new Error('Paket bulunamadı.');
  const i = ilan(ilanId);
  await islem(sb.from('ilan_doping').insert({ ilan: ilanId, tur: p.tur, paket: paketId, bitis: new Date(Date.now() + p.gun * 864e5).toISOString(), anlik: { g: (i && i.goruntulenme) || 0, f: (S.favSayilari || {})[ilanId] || 0 } }));
  if (satisId) await islem(sb.from('doping_satislari').update({ durum: 'onaylandi', onay_zamani: new Date().toISOString() }).eq('id', satisId));
  await dopingYukle();
}
async function dopingBitir(id) { await islem(sb.from('ilan_doping').update({ durum: 'iptal' }).eq('id', id)); await dopingYukle(); }
async function dopingTaleplerGetir() { const { data } = await sb.from('doping_satislari').select('*').eq('durum', 'bekliyor').order('olusturma'); return data || []; }
async function dopingTalepRed(id) { await islem(sb.from('doping_satislari').update({ durum: 'reddedildi', onay_zamani: new Date().toISOString() }).eq('id', id)); }

// Sahibinin alım ekranı: paket seç → talep kuyruğuna düşer (Play ürünleri kurulana kadar onay akışı; kredi kalıbı)
function dopingAlimSheet(i) {
  dopingPaketlerGetir().then((pk) => {
    const ak = dopingBilgi(i), t = () => S.DOPING.turler;
    sheetAc(`<h2 style="font-size:19px;font-weight:800">İlanı öne çıkar</h2>
      ${ak ? `<p class="soluk" style="margin:0 0 8px">Bu ilan şu anda görünürlük desteğinde · bitiş ${new Date(ak.bitis).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.</p>` : ''}
      ${pk.length ? pk.map((p) => {
        const ind = +p.indirim_orani > 0 && (!p.gecerlilik || new Date(p.gecerlilik) >= new Date(new Date().toDateString())), fiyat = ind ? +p.fiyat * (1 - +p.indirim_orani) : +p.fiyat;
        return `<div class="kart satir" style="align-items:center"><div class="ara"><b>${kac((t()[p.tur] || {}).ad || p.tur)} · ${p.gun} gün</b><div class="k soluk">${kac((t()[p.tur] || {}).aciklama || '')}</div></div>
          <button class="btn kucuk" data-paket="${p.id}">${ind ? `<s style="opacity:.55;font-weight:400">${tl(+p.fiyat)}</s> ` : ''}${tl(fiyat)}</button></div>`;
      }).join('') : '<p class="soluk">Şu anda satışta olan paket yok. Yakında yeniden dolacak.</p>'}
      <p class="k soluk" style="line-height:1.5">Talebin onaylanınca ilanın rozeti ("Sponsorlu"/"Acil") görünür olur ve aramada türünün önceliğiyle öne çıkar. Ödeme şu an yönetici onayıyla tamamlanır; Google Play ödemesi ürünler tanımlanınca açılacak.</p>`,
      (s) => s.querySelectorAll('[data-paket]').forEach((b) => (b.onclick = async () => {
        if (await dene(() => dopingTalep(i.id, b.dataset.paket), 'Talebin alındı — onaylanınca yayına girer.')) sheetKapat();
      })));
  });
}
