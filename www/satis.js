// Kredi satış ekranı (#/kredi) ve Yönetim > Kredi Satışları.
// Paketler ve fiyatlar kredi_paketleri tablosunda (Yönetim'den değişir).
// Ödeme: Android uygulamada Google Play Billing (cordova-plugin-purchase). Satın alma sunucuda (play-odeme) Google'dan
// doğrulanır, kredi yüklenir, sonra ürün tüketilir. Play hazır değilse (web, Play'e bağlı olmayan kurulum) "talep" akışı.
const KREDI_KULLANIM = [['belge', 'Değer raporu (PDF)', 1], ['yildiz', 'MülkümDeko görseli', 1], ['foto', 'MülkümVideo Drone', 3], ['foto', 'MülkümVideo Tanıtım', 3]];
const tlKurus = (n) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';

// ---------- Google Play Billing ----------
const PLAY = { hazir: false, basladi: false, isleniyor: new Set() };
const playUrun = (id) => (PLAY.hazir && id ? CdvPurchase.store.get(id, CdvPurchase.Platform.GOOGLE_PLAY) : null);
const ODEME_YONTEMI = (p) => (playUrun(p && p.play_urun)?.getOffer() ? 'play' : 'yok'); // havale/talep satışı kapalı (yalnız Google Play)

const PLAY_ILAN = {}; // doping alımları: hangi ürün siparişinin hangi ilan için olduğunu sheet order() öncesi yazar
async function playDogrula(tx) {
  const np = tx.nativePurchase || {}, token = np.purchaseToken || tx.purchaseId;
  const urun = (tx.products && tx.products[0] && tx.products[0].id) || (np.productIds || [])[0];
  if (!token || !urun || PLAY.isleniyor.has(token) || !S.oturum) return; // giriş yoksa sonra yeniden denenir
  const isDop = /^doping_/.test(String(urun));
  if (isDop && !PLAY_ILAN[urun]) { kayit && kayit('play_dop_ilansiz', String(urun)); toast('Görünürlük satın alımın çözümlenemedi; destek seninle iletişime geçecek.'); return; } // tüketme, Play yeniden deneyecek
  PLAY.isleniyor.add(token);
  try {
    const govde = { urun, token, siparis: np.orderId || null }; if (isDop) govde.ilan = PLAY_ILAN[urun];
    const { data, error } = await sb.functions.invoke('play-odeme', { body: govde });
    if (error) { let j = {}; try { j = await error.context.json(); } catch (_) {} if (!j.bekliyor) toast(j.hata || 'Ödeme doğrulanamadı.'); return; }
    await tx.finish(); // tüketilebilir: tüket, aynı ürün tekrar alınabilsin
    if (isDop) { await dopingYukle().catch(() => {}); toast(data.yeni === false ? 'Bu satın alma zaten işlenmişti.' : `${data.gun || ''} gün görünürlük desteğin başladı 🎉`); if (location.hash.startsWith('#/ilan')) ciz(); }
    else { const b = ben(); if (b && data.kredi != null) b.kredi = data.kredi; if (data.yeni) toast(`${data.eklenen} kredi hesabına yüklendi`); if (location.hash.startsWith('#/kredi')) EKRAN.kredi(); }
  } catch (x) { kayit && kayit('play_dogrula_hata', String(x && x.message)); }
  finally { PLAY.isleniyor.delete(token); }
}

async function playBaslat() {
  if (PLAY.basladi || !window.CdvPurchase || !window.Capacitor?.isNativePlatform?.()) return;
  PLAY.basladi = true;
  const { store, ProductType, Platform } = CdvPurchase;
  let idler = []; try { idler = (await krediPaketleri()).map((p) => p.play_urun).filter(Boolean); } catch (_) {}
  try { const { data } = await sb.from('doping_paketleri').select('play_urun').eq('aktif', true); idler = [...idler, ...(data || []).map((d) => d.play_urun).filter(Boolean)]; } catch (_) {}
  idler = [...new Set(idler)];
  if (!idler.length) { PLAY.basladi = false; return; }
  store.register(idler.map((id) => ({ id, type: ProductType.CONSUMABLE, platform: Platform.GOOGLE_PLAY })));
  store.when().approved((tx) => playDogrula(tx)).productUpdated(() => { PLAY.hazir = true; });
  store.error((e) => { if (e && e.code !== CdvPurchase.ErrorCode.PAYMENT_CANCELLED) kayit && kayit('play_hata', `${e.code} ${e.message}`); });
  try { await store.initialize([Platform.GOOGLE_PLAY]); PLAY.hazir = true; } catch (x) { kayit && kayit('play_baslat_hata', String(x && x.message)); }
}
document.addEventListener('deviceready', () => setTimeout(playBaslat, 1500));

async function krediPaketleri() { return await islem(sb.from('kredi_paketleri').select('*').order('sira')); }
async function bekleyenTalep() {
  const { data } = await sb.from('kredi_satislari').select('*').eq('kullanici', S.oturum).eq('durum', 'bekliyor').order('olusturma', { ascending: false }).limit(1);
  return (data || [])[0] || null;
}

EKRAN.kredi = async () => {
  if (girisGerek('Kredilerin için giriş yap')) return;
  const b = ben();
  app.innerHTML = ustBar('Kredi bakiyem') + `<div class="ic">
    <div class="deger-k"><div class="ust-yazi">KREDİN</div><div class="buyuk">${b.kredi ?? 0} kredi</div><div style="font-size:13px;opacity:.85">Krediler süresizdir; rapor, MülkümDeko ve MülkümVideo’da ortak kullanılır</div></div>
    <div class="kart"><h3>Kredi ne alır?</h3><div class="liste">${KREDI_KULLANIM.map(([ik, ad, k]) => `<div class="oge">${ic(ik, 20)}<span class="ara">${ad}</span><span class="ok" style="font-weight:700">${k} kredi</span></div>`).join('')}</div></div>
    <div id="talepK"></div>
    <div class="bolum-bas"><h2>Kredi paketleri</h2></div><div id="paketler"><div class="bos">Yükleniyor…</div></div>
    <div class="k soluk" style="line-height:1.5">Fiyatlara KDV dahildir. Video veya görsel oluşturulamazsa kullanılan kredi otomatik iade edilir. Ödeme Google Play ile alınır; <a href="#/metin/satis">Satış ve iade koşulları</a>.</div>
    <div class="bolum-bas"><h2>Hareketler</h2></div><div class="liste" id="hareket"><div class="bos">Yükleniyor…</div></div></div>`;
  navCiz('hesap');
  let paketler = [], talep = null, yukHata = '';
  try { [paketler, talep] = await Promise.all([krediPaketleri(), bekleyenTalep()]); } catch (x) { yukHata = hataMetni(x); }
  const pk = $('#paketler'); if (!pk) return;
  const enPahali = Math.max(...paketler.map((p) => p.fiyat / p.kredi));
  pk.innerHTML = paketler.filter((p) => p.aktif).map((p) => {
    const birim = p.fiyat / p.kredi, indirim = Math.round((1 - birim / enPahali) * 100);
    return `<div class="kart paket-k${p.rozet ? ' one' : ''}">${p.rozet ? `<span class="paket-rozet">${kac(p.rozet)}</span>` : ''}
      <div class="satir"><div class="ara"><b style="font-size:16px">${kac(p.ad)}</b><div style="font-size:24px;font-weight:800;margin-top:2px">${p.kredi} kredi</div></div>
      <div style="text-align:right"><div style="font-size:19px;font-weight:800">${kac(playUrun(p.play_urun)?.pricing?.price || tlKurus(p.fiyat))}</div><div class="k soluk">kredi başı ${tlKurus(birim)}</div>${indirim > 0 ? `<div class="k" style="color:var(--guven);font-weight:700">%${indirim} avantajlı</div>` : ''}</div></div>
      <div class="k soluk">${p.kredi} rapor ya da Deko görseli, veya ${Math.floor(p.kredi / 3)} video</div>
      <button class="btn tam" data-al="${p.id}" >${ODEME_YONTEMI(p) === 'play' ? 'Google Play ile satın al' : 'Satın al'}</button></div>`;
  }).join('') || (yukHata ? `<div class="bos">${kac(yukHata)}<br><button class="btn sade" id="pkTekrar">Tekrar dene</button></div>` : '<div class="bos">Şu an satışta paket yok</div>');
  const pt = $('#pkTekrar'); if (pt) pt.onclick = () => EKRAN.kredi();
  const tk = $('#talepK');
  if (talep && tk) {
    tk.innerHTML = `<div class="bilgi-k">${ic('kredi', 18)}<div><b>Ödeme bekleyen talebin var:</b> ${talep.kredi} kredi · ${tlKurus(talep.tutar)}<br>Ödeme bilgisi için ekibimiz seninle iletişime geçecek. Ödeme alınınca kredin hesabına yüklenir.<br><button class="btn sade" id="talepIptal" style="margin-top:6px;padding-left:0">Talebi iptal et</button></div></div>`;
    $('#talepIptal').onclick = async () => { if (await dene(() => islem(sb.rpc('kredi_talep_iptal', { p_id: talep.id })), 'Talep iptal edildi')) EKRAN.kredi(); };
  }
  pk.querySelectorAll('[data-al]').forEach((x) => (x.onclick = () => satinAl(paketler.find((p) => p.id === x.dataset.al))));
  try {
    const l = await krediHareketleri();
    const el = $('#hareket'); if (!el) return;
    el.innerHTML = l.length ? l.map((h) => `<div class="satir" style="padding:12px 14px;border-bottom:1px solid var(--yuzey2)"><div class="ara"><div style="font-size:14px;font-weight:600">${kac(h.aciklama)}</div><div class="k soluk">${new Date(h.zaman).toLocaleString('tr-TR')}</div></div><b style="color:${h.miktar > 0 ? 'var(--guven)' : 'var(--murekkep)'}">${h.miktar > 0 ? '+' : ''}${h.miktar}</b></div>`).join('') : '<div class="bos">Hareket yok</div>';
  } catch (x) { const el = $('#hareket'); if (el) el.innerHTML = `<div class="bos">${kac(hataMetni(x))}</div>`; }
};

async function satinAl(p) {
  if (!p) return;
  if (ODEME_YONTEMI(p) === 'play') {
    // Google Play ödeme penceresi; onaylanınca playDogrula kredi yükler
    const hata = await playUrun(p.play_urun).getOffer().order();
    if (hata && hata.code !== CdvPurchase.ErrorCode.PAYMENT_CANCELLED) toast(hata.message || 'Ödeme başlatılamadı.');
    return;
  }
  toast(window.Capacitor?.isNativePlatform?.() ? 'Google Play ödemesi hazırlanıyor; biraz sonra tekrar dene.' : 'Kredi satın alma, Google Play\'den indirilen Mülküm360 uygulamasında.');
}

// Yönetici: bekleyen kredi talebi sayısı. Hesabım'daki Yönetim kartında rozet; uygulama açılışında bir kez uyarı.
async function yonBekleyenYaz(uyar) {
  if (!S.yonetici) return;
  const { count } = await sb.from('kredi_satislari').select('id', { count: 'exact', head: true }).eq('durum', 'bekliyor');
  YON_BEKLEYEN = count || 0;
  const r = document.getElementById('yonBekleyen'); if (r) { r.textContent = YON_BEKLEYEN ? YON_BEKLEYEN + ' kredi talebi' : ''; r.hidden = !YON_BEKLEYEN; }
  if (uyar && YON_BEKLEYEN) toast(`${YON_BEKLEYEN} kredi satın alma talebi onay bekliyor`);
}
setTimeout(() => { if (typeof ben === 'function' && ben()) yonBekleyenYaz(true).catch(() => {}); }, 6000);

// Yönetim > Kredi Satışları: bekleyen talepler, onay/iptal, aylık özet, paket fiyatları
if (typeof YON_SEKME !== 'undefined') {
  YON_SEKME.splice(3, 0, ['satis', 'kredi', 'Kredi Satışları']);
  YON.satis = async (el) => {
    const [{ data: satis, error }, paketler, uy] = await Promise.all([sb.from('kredi_satislari').select('*').order('olusturma', { ascending: false }).limit(100), krediPaketleri(), uyeler('').catch(() => [])]);
    const uyeBul = (id) => uy.find((x) => x.id === id) || kullanici(id);
    if (error) throw error;
    const ayBas = new Date(); ayBas.setDate(1); ayBas.setHours(0, 0, 0, 0);
    const buAy = (satis || []).filter((s) => s.durum === 'onaylandi' && new Date(s.onay_zamani) >= ayBas);
    const ciro = buAy.reduce((t, s) => t + Number(s.tutar), 0);
    const bekleyen = (satis || []).filter((s) => s.durum === 'bekliyor');
    const satir = (s) => { const u = uyeBul(s.kullanici), p = paketler.find((x) => x.id === s.paket);
      return `<div class="kart" style="display:flex;flex-direction:column;gap:6px"><div class="satir"><b class="ara">${kac(u.ad || u.eposta || 'Üye')}</b><span class="rozet" style="position:static">${{ bekliyor: 'Bekliyor', onaylandi: 'Onaylandı', iptal: 'İptal' }[s.durum]}</span></div>
        <div class="k">${kac(p ? p.ad : s.paket)} · ${s.kredi} kredi · <b>${tlKurus(s.tutar)}</b></div><div class="k soluk">${new Date(s.olusturma).toLocaleString('tr-TR')}${u && u.eposta ? ' · ' + kac(u.eposta) : ''} · <a href="#/yonetim/uye?id=${s.kullanici}">üye sayfası</a></div>
        ${s.durum === 'bekliyor' ? `<div class="satir" style="gap:8px"><button class="btn guven" data-onay="${s.id}" style="flex:1">Ödeme alındı, krediyi yükle</button><button class="btn cizgili" data-iptal="${s.id}">İptal</button></div>` : ''}</div>`; };
    el.innerHTML = `<div class="izgara2" style="margin-bottom:10px"><div class="kart"><div class="k soluk">Bu ay satış</div><b style="font-size:20px">${tlKurus(ciro)}</b><div class="k soluk">${buAy.length} paket · ${buAy.reduce((t, s) => t + s.kredi, 0)} kredi</div></div><div class="kart"><div class="k soluk">Bekleyen talep</div><b style="font-size:20px">${bekleyen.length}</b></div></div>
      <div class="bolum-bas"><h2>Bekleyen talepler</h2></div>${bekleyen.length ? bekleyen.map(satir).join('') : '<div class="bos">Bekleyen talep yok</div>'}
      <div class="bolum-bas"><h2>Paketler ve fiyatlar</h2></div>
      ${paketler.map((p) => `<div class="kart" data-pk="${p.id}" style="display:flex;flex-direction:column;gap:6px"><b>${kac(p.ad)}</b>
        <div class="izgara3"><label class="alan">Kredi<input name="kredi" inputmode="numeric" value="${p.kredi}"></label><label class="alan">Fiyat (TL, KDV dahil)<input name="fiyat" inputmode="decimal" value="${p.fiyat}"></label><label class="alan">Rozet<input name="rozet" maxlength="30" value="${kac(p.rozet || '')}"></label></div>
        <label class="satir k" style="gap:8px"><input type="checkbox" name="aktif" ${p.aktif ? 'checked' : ''} style="width:20px;height:20px">Satışta</label>
        <button class="btn koyu" data-pkaydet="${p.id}">Kaydet</button></div>`).join('')}
      <div class="bolum-bas"><h2>Son satışlar</h2></div>${(satis || []).filter((s) => s.durum !== 'bekliyor').slice(0, 30).map(satir).join('') || '<div class="bos">Henüz satış yok</div>'}`;
    el.querySelectorAll('[data-onay],[data-iptal]').forEach((b) => (b.onclick = async () => {
      const onay = !!b.dataset.onay;
      if (onay && !confirm('Ödemeyi aldın mı? Kredi üyenin hesabına yüklenecek.')) return;
      if (await dene(() => islem(sb.rpc('kredi_satis_karar', { p_id: b.dataset.onay || b.dataset.iptal, p_onay: onay })), onay ? 'Kredi yüklendi' : 'Talep iptal edildi')) YON.satis(el);
    }));
    el.querySelectorAll('[data-pkaydet]').forEach((b) => (b.onclick = async () => {
      const k = el.querySelector(`[data-pk="${b.dataset.pkaydet}"]`), v = (n) => k.querySelector(`[name=${n}]`);
      const g = { kredi: parseInt(v('kredi').value, 10), fiyat: Number(String(v('fiyat').value).replace(',', '.')), rozet: v('rozet').value.trim() || null, aktif: v('aktif').checked };
      if (!(g.kredi > 0) || !(g.fiyat > 0)) return toast('Kredi ve fiyat sıfırdan büyük olmalı.');
      if (await dene(() => islem(sb.from('kredi_paketleri').update(g).eq('id', b.dataset.pkaydet)), 'Paket kaydedildi')) YON.satis(el);
    }));
  };
}
