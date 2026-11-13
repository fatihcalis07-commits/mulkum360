// Mülküm360 — Anlaşmalı İş Ortaklığı (emlak ofisi / oto galeri / ikisi birden: karma)
// Model: ilk N ay ücretsiz (kart istenmez), sonra Business Partner aboneliği (Google Play: aylık / 3 aylık / yıllık).
// Abonelik doğrulama ve Google bildirimleri: supabase/functions/play-abonelik. Havale yalnız yöneticinin tanımladığı ortaklarda (aylık tahakkuk).
// Migration: 20261116010000_is_ortakligi.sql, 20261118010000_ortak_abonelik.sql
'use strict';

const ORTAK_SOZLESME_SURUM = 'v2-2026-11';
const ORTAK_DURUM = { basvuru: 'İnceleniyor', aktif: 'Aktif', askida: 'Askıda', red: 'Onaylanmadı', iptal: 'Sona Erdi' };
const TAHAKKUK_DURUM = { bekliyor: 'Ödeme Bekliyor', odendi: 'Ödendi', gecikti: 'Gecikti', iptal: 'İptal' };
const ORTAK_TUR_AD = { emlak: 'Anlaşmalı Ofis', galeri: 'Anlaşmalı Galeri', karma: 'Anlaşmalı Ofis ve Galeri' };
const ORTAK_TUR_KISA = { emlak: 'Emlak ofisi', galeri: 'Oto galeri', karma: 'Emlak + galeri' };
const paraTl = (n) => (+n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' TL';
const gunAy = (d) => (d ? new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
const donemAd = (d) => new Date(d).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

async function uyelikAyar() { try { const { data } = await sb.from('uyelik_ayar').select('*').eq('id', 1).maybeSingle(); return data || {}; } catch (_) { return {}; } }
async function ortakBen() { if (!S.oturum) return null; try { const { data } = await sb.from('is_ortagi').select('*').eq('kullanici', S.oturum).maybeSingle(); return data; } catch (_) { return null; } }
async function uyelikPaketleri(tur) { try { const { data } = await sb.from('uyelik_paket').select('*').eq('tur', tur).eq('aktif', true).order('sira'); return data || []; } catch (_) { return []; } }
const ABONE_DURUM = { aktif: 'Aktif', ek_sure: 'Ödeme Bekleniyor (Ek Süre)', iptal_edildi: 'Yenilenmeyecek', beklemede: 'Ödeme Alınamadı', duraklatildi: 'Duraklatıldı', sona_erdi: 'Sona Erdi', odeme_bekliyor: 'Ödeme Onayı Bekleniyor' };
const aboneGecerli = (o) => !!o && ['aktif', 'ek_sure', 'iptal_edildi'].includes(o.abonelik_durum) && new Date(o.abonelik_bitis) > new Date();
const paketSure = (ay) => (ay === 12 ? 'yıl' : ay === 1 ? 'ay' : ay + ' ay');
const PLAY_ABONE_YONET = (urun) => 'https://play.google.com/store/account/subscriptions?package=com.mulkum360.app' + (urun ? '&sku=' + encodeURIComponent(urun) : '');

// Google Play aboneliği onaylandı: sunucuda doğrula, sonra onayla (finish = acknowledge)
async function ortakAbonelikDogrula(tx, token, urun) {
  if (PLAY.isleniyor.has(token) || !S.oturum) return;
  PLAY.isleniyor.add(token);
  try {
    const { data, error } = await sb.functions.invoke('play-abonelik', { body: { urun, token } });
    if (error) { let j = {}; try { j = await error.context.json(); } catch (_) {} if (!j.bekliyor) toast(j.hata || 'Abonelik doğrulanamadı.'); return; }
    await tx.finish();
    if (data && data.gecerli) toast(`${data.paket || 'Business Partner'} aboneliğin aktif`);
    if (location.hash.startsWith('#/ortaklik')) EKRAN.ortaklik();
  } catch (x) { kayit && kayit('play_abonelik_hata', String(x && x.message)); }
  finally { PLAY.isleniyor.delete(token); }
}
async function ortakAboneOl(p, o) {
  const pu = playUrun(p.id), teklif = pu && pu.getOffer();
  if (!teklif) return toast(window.Capacitor?.isNativePlatform?.() ? 'Google Play paketleri hazırlanıyor; biraz sonra tekrar dene.' : 'Abonelik, Google Play\'den indirilen Mülküm360 uygulamasından başlatılır.');
  const ek = {}; if (o && o.play_token && aboneGecerli(o) && o.play_urun !== p.id) ek.googlePlay = { oldPurchaseToken: o.play_token }; // paket değişikliği
  const hata = await teklif.order(ek);
  if (hata && hata.code !== CdvPurchase.ErrorCode.PAYMENT_CANCELLED) toast(hata.message || 'Ödeme başlatılamadı.');
}
function aboneKarti(o, paketler, ucretsiz, kalanGun) {
  const p = paketler.find((x) => x.id === o.play_urun);
  if (aboneGecerli(o)) {
    return `<div class="kart abone-kart"><div class="satir"><div class="ara"><small>Aboneliğin</small><b>${kac(p?.ad || 'Business Partner')}</b></div><span class="th-durum ${o.abonelik_durum === 'aktif' ? 'odendi' : 'bekliyor'}">${ABONE_DURUM[o.abonelik_durum] || ''}</span></div>
      <div class="k soluk">${o.abonelik_durum === 'iptal_edildi' ? 'Yenileme kapalı. ' + gunAy(o.abonelik_bitis) + ' tarihine kadar geçerli.' : o.abonelik_durum === 'ek_sure' ? 'Google Play yenileme ödemesini tekrar deniyor. Ödeme yöntemini Google Play\'de güncelle.' : 'Sonraki yenileme: ' + gunAy(o.abonelik_bitis)}</div>
      <a class="btn sade tam" href="${PLAY_ABONE_YONET(o.play_urun)}" target="_blank" rel="noopener">${ic('ayar', 18)}Aboneliği Google Play'de Yönet</a></div>`
      + (paketler.length > 1 ? `<div class="bolum-bas"><h2 style="font-size:16px">Paketi Değiştir</h2></div>` + paketKartlari(paketler.filter((x) => x.id !== o.play_urun), paketler) : '');
  }
  const uyari = o.abonelik_durum === 'beklemede' ? `<div class="uyari-k">${ic('uyari', 18)}<div>Google Play yenileme ödemesini alamadı. Ödeme yöntemini <a href="${PLAY_ABONE_YONET(o.play_urun)}" target="_blank" rel="noopener">Google Play'de güncelle</a>; ödeme alınınca ilanların otomatik yayına döner.</div></div>` : '';
  if (ucretsiz && kalanGun > 7) return uyari + `<div class="bilgi-k">${ic('takvim', 18)}<div>Ücretsiz dönemin ${gunAy(o.ucretsiz_bitis)} tarihine kadar sürüyor. Paket seçimi son 7 günde açılır; o zaman hatırlatma gönderiyoruz.</div></div>`
    + `<div class="bolum-bas"><h2 style="font-size:16px">Business Partner Paketleri</h2></div>` + paketKartlari(paketler, paketler, true);
  return uyari + `<div class="bolum-bas"><h2 style="font-size:16px">Business Partner Paketi Seç</h2></div>`
    + (ucretsiz ? `<div class="k soluk" style="margin:-4px 0 10px">Ücretsiz dönemin ${kalanGun} gün sonra bitiyor. İlk ödeme abone olduğun gün alınır.</div>` : '') + paketKartlari(paketler, paketler);
}
function paketKartlari(liste, hepsi, kilitli) {
  const aylik = hepsi.find((x) => x.ay === 1);
  return liste.map((p) => {
    const indirim = aylik && p.ay > 1 ? Math.round((1 - p.fiyat / (aylik.fiyat * p.ay)) * 100) : 0;
    const fiyat = playUrun(p.id)?.pricing?.price || paraTl(p.fiyat);
    return `<div class="kart paket-k${p.ay === 12 ? ' one' : ''}">${p.ay === 12 ? '<span class="paket-rozet">En Avantajlı</span>' : indirim > 0 ? '<span class="paket-rozet">%' + indirim + ' İndirim</span>' : ''}
      <div class="satir"><div class="ara"><b style="font-size:15.5px">${kac(p.ad)}</b><div class="k soluk">${p.ay > 1 ? 'Aylık ' + paraTl(p.fiyat / p.ay) + ' karşılığı' : 'İstediğin zaman iptal'}</div></div>
      <div style="text-align:right"><div style="font-size:19px;font-weight:800">${kac(fiyat)}</div><div class="k soluk">/ ${paketSure(p.ay)}</div></div></div>
      ${kilitli ? '' : `<button class="btn tam" data-abone="${p.id}">Google Play ile Abone Ol</button>`}</div>`;
  }).join('') || '<div class="bos">Şu an satışta paket yok</div>';
}
async function ortakTahakkuklar(id) { try { const { data } = await sb.from('uyelik_tahakkuk').select('*').eq('ortak', id).order('donem', { ascending: false }); return data || []; } catch (_) { return []; } }

// Sözleşme metni (avukat kontrolünden geçmeli; sürüm değişince yeniden onay istenir)
METIN.ortaklik = ['İş Ortaklığı Sözleşmesi', `<b>1. Taraflar ve konu.</b> Bu sözleşme ${KUNYE.unvan ? KUNYE.unvan + ' ("Mülküm360")' : 'Mülküm360'} ile başvuruyu yapan yetki belgeli emlak işletmesi veya ikinci el motorlu kara taşıtı ticareti yapan işletme ("İş Ortağı") arasında, İş Ortağı'nın ilanlarını Mülküm360'ta yayımlaması için verilen ilan hizmetini düzenler. Mülküm360 alım satıma, pazarlığa ve devir işlemlerine taraf değildir.

<b>2. Ücretsiz dönem.</b> Başvurunun onaylandığı günden itibaren ilk ücretsiz dönem boyunca (başvuru ekranında yazan ay sayısı) ilan hizmeti ücretsizdir.

<b>3. Abonelik.</b> Ücretsiz dönemden sonra ilan hizmeti, uygulamada gösterilen Business Partner paketlerinden (aylık, 3 aylık veya yıllık) biriyle sürer. Hem taşınmaz hem ikinci el taşıt ticareti yetki belgesi olan İş Ortağı, iki alanı kapsayan Business Partner Emlak + Galeri paketlerini seçebilir. Paketler Google Play aboneliği olarak satılır; fiyat ve vergiler ödeme öncesinde Google Play ekranında gösterilir. Abonelik seçilen süre sonunda otomatik yenilenir. İş Ortağı aboneliği Google Play hesabından istediği zaman iptal edebilir; iptal, ödenmiş dönemin sonunda geçerli olur. Ödeme, fatura ve iade işlemlerinde Google Play koşulları uygulanır. Mülküm360'ın yazılı onayıyla havale/EFT ile ödeme yapan İş Ortağı için aylık bedel ayın 1'inde tahakkuk eder, vade bildirimde yazılır ve fatura ödeme onayından sonra düzenlenir.

<b>4. Ödeme alınamaması.</b> Ücretsiz dönem bittiğinde geçerli bir abonelik yoksa, yenileme ödemesi alınamaz ve Google Play'in tanıdığı ek süre biterse ya da havale ile ödenen dönem vadesinde ödenmezse İş Ortağı'nın yayındaki ilanları beklemeye alınır. Abonelik yeniden geçerli olunca veya ödeme onaylanınca ilanlar ek işlem gerekmeden yayına döner. Beklemede geçen süre için ayrıca bedel istenmez.

<b>5. İlan kuralları.</b> İş Ortağı yalnız yetkili olduğu taşınmaz ve taşıtlar için ilan verir; Ticaret Bakanlığı Elektronik İlan Doğrulama Sistemi (EİDS) kurallarına, Taşınmaz Ticareti Hakkında Yönetmelik ve Motorlu Kara Taşıtlarının Ticareti Hakkında Yönetmelik hükümlerine uyar. Yanıltıcı, satılmış veya yetkisiz ilanlar kaldırılır.

<b>6. Bedel değişikliği.</b> Mülküm360 paket bedellerini en az 30 gün önceden bildirerek değiştirebilir. Mevcut abonelikte fiyat artışı Google Play'in fiyat değişikliği kurallarına göre uygulanır. İş Ortağı yeni bedeli kabul etmezse aboneliği iptal edip sözleşmeyi sona erdirebilir.

<b>7. Sona erme.</b> Taraflar sözleşmeyi her zaman sona erdirebilir. Sona erme, başlamış ayın bedelini etkilemez. Ağır ihlalde (sahte ilan, yetkisiz ilan, ödenmeyen iki dönem) Mülküm360 sözleşmeyi derhâl sona erdirebilir.

<b>8. Kişisel veriler.</b> İş Ortağı, müşterilerinin kişisel verilerini KVKK'ya uygun işler. Mülküm360'ın veri işleme esasları KVKK aydınlatma metnindedir.

<b>9. Uyuşmazlık.</b> Türk hukuku uygulanır. Uyuşmazlıklarda Mülküm360 merkezinin bulunduğu yer mahkemeleri ve icra daireleri yetkilidir.

Sürüm: ${ORTAK_SOZLESME_SURUM}`];

// ---------- Hesabım kartı ----------
async function ortakHesapKarti() {
  const yer = document.getElementById('ortakKart'); const b = ben();
  if (!yer || !b?.ofis) return;
  const [o, a] = await Promise.all([ortakBen(), uyelikAyar()]);
  const galeri = b.sektor === 'galeri', ad = ORTAK_TUR_AD[o?.tur] || (galeri ? 'Anlaşmalı Galeri' : 'Anlaşmalı Ofis');
  const alt = !o || o.durum === 'red' || o.durum === 'iptal'
    ? `İlk ${a.ucretsiz_ay ?? 3} Ay Ücretsiz, Sonra Aylık ${paraTl(galeri ? a.galeri_aylik : a.emlak_aylik)}`
    : o.durum === 'basvuru' ? 'Başvurun İnceleniyor'
    : o.durum === 'askida' ? (o.odeme_yontemi === 'havale' ? 'Ödeme Gecikti · İlanların Beklemede' : 'Abonelik Gerekli · İlanların Beklemede')
    : aboneGecerli(o) ? 'Business Partner · ' + (o.abonelik_durum === 'iptal_edildi' ? gunAy(o.abonelik_bitis) + ' Tarihine Kadar' : 'Yenileme ' + gunAy(o.abonelik_bitis))
    : new Date(o.ucretsiz_bitis) >= new Date(new Date().toDateString()) ? 'Ücretsiz Dönem · ' + gunAy(o.ucretsiz_bitis) + ' Tarihine Kadar'
    : o.odeme_yontemi === 'havale' ? 'Aylık ' + paraTl(o.aylik_ucret) + ' · Aktif' : 'Business Partner Paketi Seç';
  yer.innerHTML = `<a class="kart ortak-giris${o?.durum === 'askida' ? ' uyari' : ''}" href="#/ortaklik"><span class="og-ikon">${ic('tik', 22)}</span><div class="ara"><b>${o && ['aktif', 'askida'].includes(o.durum) ? (aboneGecerli(o) ? 'Business Partner' : ad) : 'Business Partner Programı'}</b><div class="k soluk">${alt}</div></div><span class="yg-ok">${ic('ok', 18)}</span></a>`;
}

// ---------- İş Ortaklığı ekranı ----------
EKRAN.ortaklik = async () => {
  if (girisGerek()) return;
  const b = ben();
  app.innerHTML = ustBar('İş Ortaklığı') + '<div class="ic" id="ortakIc"><div class="kart soluk">Yükleniyor…</div></div>';
  navCiz('hesap');
  const el = document.getElementById('ortakIc');
  const [o, a] = await Promise.all([ortakBen(), uyelikAyar()]);
  const galeri = b?.sektor === 'galeri', aylik = galeri ? a.galeri_aylik : a.emlak_aylik, ay = a.ucretsiz_ay ?? 3;
  const tanitim = `<div class="ortak-hero"><b>${galeri ? 'Anlaşmalı Galeri' : 'Anlaşmalı Ofis'} Programı</b><span>İlk ${ay} ay ücretsiz, kart bilgisi istenmez. Sonra aylık ${paraTl(aylik)}'den başlayan Business Partner paketleri.</span>
    <div class="oh-madde"><i>${ic('tik', 16)}</i>Profilinde ve ilanlarında "${galeri ? 'Anlaşmalı Galeri' : 'Anlaşmalı Ofis'}" rozeti</div>
    <div class="oh-madde"><i>${ic('tik', 16)}</i>EİDS doğrulamalı ilanlarla güvenilir vitrin</div>
    <div class="oh-madde"><i>${ic('tik', 16)}</i>Aylık, 3 aylık veya yıllık paket; Google Play ile ödeme, istediğin zaman iptal</div></div>`;
  if (!b?.ofis) { el.innerHTML = tanitim + bosDurum('kisi', 'Kurumsal Hesap Gerekli', 'İş ortaklığı emlak ofisleri ve oto galeriler içindir. Profil ayarlarından hesap türünü "Emlak ofisi" ya da "Oto galeri" yap.', '<a class="btn" href="#/profil">Profil Ayarları</a>'); return; }

  if (!o || o.durum === 'red' || o.durum === 'iptal') {
    el.innerHTML = tanitim + (o?.durum === 'red' ? `<div class="uyari-k">${ic('uyari', 18)}<div>Önceki başvurun onaylanmadı${o.karar_notu ? ': ' + kac(o.karar_notu) : ''}. Bilgileri düzeltip yeniden başvurabilirsin.</div></div>` : '')
      + `<form class="kart" id="ortakForm" style="display:flex;flex-direction:column;gap:12px"><h3 style="margin:0">Başvuru</h3>
        <label class="alan">Ticaret unvanı<input name="unvan" required minlength="3" maxlength="160" value="${kac(o?.unvan || b.firma || '')}"></label>
        <label class="alan">Vergi / TC kimlik no<input name="vergi" required inputmode="numeric" maxlength="11" value="${kac(o?.vergi_no || '')}"></label>
        <div class="alan">Ortaklık türü<div class="tur-sec">${[['emlak', 'Emlak Ofisi'], ['galeri', 'Oto Galeri'], ['karma', 'Emlak + Galeri']].map(([v, t]) => `<label><input type="radio" name="tur" value="${v}" ${(o?.tur || (galeri ? 'galeri' : 'emlak')) === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></div>
        <label class="alan" id="ofYetki1"><span id="ofYetki1Ad"></span><input name="yetki" required maxlength="30" value="${kac(o?.yetki_belge_no || b.yetkiNo || '')}"></label>
        <label class="alan" id="ofYetki2" hidden>İkinci el taşıt ticareti yetki belgesi no<input name="yetki2" maxlength="30" value="${kac(o?.yetki_belge_no2 || '')}"></label>
        <div class="k soluk" id="ofKarmaNot" hidden>Emlak + Galeri ortaklığında iki yetki belgesi de gerekir. Paketler aylık ${paraTl(a.karma_aylik ?? 2999.99)}'den başlar.</div>
        <label class="satir k" style="align-items:flex-start"><input type="checkbox" name="kabul" style="width:22px;height:22px;flex-shrink:0"><span style="line-height:1.5"><a href="#/metin/ortaklik">İş Ortaklığı Sözleşmesi</a>'ni okudum, kabul ediyorum.</span></label>
        <button class="btn tam">Başvur</button></form>`;
    const turGuncelle = () => { const t = $('#ortakForm').querySelector('[name=tur]:checked')?.value || 'emlak';
      $('#ofYetki1Ad').textContent = t === 'galeri' ? 'İkinci el taşıt ticareti yetki belgesi no' : 'Taşınmaz ticareti yetki belgesi no';
      $('#ofYetki2').hidden = $('#ofKarmaNot').hidden = t !== 'karma'; };
    $('#ortakForm').querySelectorAll('[name=tur]').forEach((r) => (r.onchange = turGuncelle)); turGuncelle();
    $('#ortakForm').onsubmit = async (e) => {
      e.preventDefault(); const f = new FormData(e.target);
      const tur = f.get('tur') || 'emlak', yetki2 = String(f.get('yetki2') || '').trim();
      if (tur === 'karma' && yetki2.length < 4) return toast('Emlak + Galeri için taşıt ticareti yetki belgesi no gerekli.');
      const vergi = String(f.get('vergi')).replace(/\D/g, '');
      if (!/^\d{10,11}$/.test(vergi)) return toast('Vergi no 10, TC kimlik no 11 haneli olmalı.');
      if (!f.get('kabul')) return toast('Devam etmek için sözleşmeyi kabul et.');
      if (await dene(async () => { const { error } = await sb.rpc('ortak_basvur', { p_tur: tur, p_unvan: f.get('unvan'), p_vergi: vergi, p_yetki: f.get('yetki'), p_surum: ORTAK_SOZLESME_SURUM, p_yetki2: tur === 'karma' ? yetki2 : null }); if (error) throw error; }, 'Başvurun alındı')) EKRAN.ortaklik();
    };
    return;
  }
  if (o.durum === 'basvuru') {
    el.innerHTML = tanitim + `<div class="kart ortak-durum"><span class="od-rozet bekliyor">İnceleniyor</span><b>${kac(o.unvan)}</b><div class="k soluk">Başvuru: ${gunAy(o.sozlesme_onay)} · Yetki belgesi: ${kac(o.yetki_belge_no)}</div><div class="k soluk">Yetki belgen Ticaret Bakanlığı kayıtlarından kontrol edildikten sonra onaylanır. Onayda bildirim gelir.</div></div>`;
    return;
  }
  // aktif / askıda
  const havale = o.odeme_yontemi === 'havale';
  const [t, paketler] = await Promise.all([havale ? ortakTahakkuklar(o.kullanici) : Promise.resolve([]), havale ? Promise.resolve([]) : uyelikPaketleri(o.tur)]);
  const kalanGun = Math.ceil((new Date(o.ucretsiz_bitis) - new Date(new Date().toDateString())) / 864e5);
  const borc = t.filter((x) => ['bekliyor', 'gecikti'].includes(x.durum)).reduce((s, x) => s + +x.tutar, 0);
  const ucretsiz = new Date(o.ucretsiz_bitis) >= new Date(new Date().toDateString());
  const ilkDonem = (() => { const d = new Date(o.ucretsiz_bitis); d.setDate(d.getDate() - 1); return new Date(d.getFullYear(), d.getMonth() + 1, 1); })();
  el.innerHTML = `<div class="kart ortak-durum"><span class="od-rozet ${o.durum}">${ORTAK_DURUM[o.durum]}</span><b>${kac(o.unvan)}</b>
      <div class="od-izgara"><div><small>Ücretsiz Dönem Sonu</small><b>${ucretsiz ? gunAy(o.ucretsiz_bitis) : 'Bitti'}</b></div>${havale ? `<div><small>Aylık Bedel</small><b>${paraTl(o.aylik_ucret)}</b></div>
      <div><small>${ucretsiz ? 'İlk Ödeme Dönemi' : 'Açık Borç'}</small><b>${ucretsiz ? donemAd(ilkDonem) : paraTl(borc)}</b></div>` : `<div><small>Paket</small><b>${aboneGecerli(o) ? kac((paketler.find((x) => x.id === o.play_urun) || {}).ad?.replace('Business Partner ', '') || '—') : 'Seçilmedi'}</b></div>
      <div><small>${aboneGecerli(o) ? (o.abonelik_durum === 'iptal_edildi' ? 'Bitiş' : 'Yenileme') : 'Abonelik'}</small><b>${aboneGecerli(o) ? gunAy(o.abonelik_bitis) : ABONE_DURUM[o.abonelik_durum] || 'Yok'}</b></div>`}<div><small>Üyelik Başlangıcı</small><b>${gunAy(o.baslangic)}</b></div></div></div>`
    + (o.durum === 'askida' ? `<div class="uyari-k">${ic('uyari', 18)}<div>${havale ? 'Vadesi geçen ödeme nedeniyle ilanların beklemede. Ödeme onaylanınca otomatik olarak yayına döner.' : 'Geçerli bir Business Partner aboneliğin olmadığı için ilanların beklemede. Paket seçince otomatik yayına döner.'}</div></div>` : '')
    + (havale ? '' : aboneKarti(o, paketler, ucretsiz, kalanGun))
    + (havale && borc > 0 && a.iban && !window.Capacitor?.isNativePlatform?.() ? `<div class="kart"><h3 style="margin:0 0 8px">Ödeme Bilgileri</h3><div class="k"><b>Alıcı:</b> ${kac(a.alici_unvan || KUNYE.unvan || KUNYE.ad)}</div><div class="k" style="margin-top:4px"><b>IBAN:</b> <span id="ortakIban">${kac(a.iban)}</span> <button class="btn sade kucuk" id="ibanKopya">Kopyala</button></div><div class="k soluk" style="margin-top:6px">Açıklamaya hesabının e-postasını yaz. Ödeme 1 iş günü içinde onaylanır.</div></div>` : '')
    + (havale && borc > 0 && window.Capacitor?.isNativePlatform?.() ? `<div class="bilgi-k">${ic('belge', 18)}<div>Ödeme bilgilerin faturayla birlikte e-posta ile gönderilir.</div></div>` : '')
    + (havale ? `<div class="bolum-bas"><h2 style="font-size:16px">Hesap Özeti</h2></div>` : '')
    + (!havale ? '' : t.length ? `<div class="kart" style="padding:4px 16px">${t.map((x) => `<div class="tahakkuk-s"><div class="ara"><b>${donemAd(x.donem)}</b><div class="k soluk">${x.durum === 'odendi' ? 'Ödeme: ' + gunAy(x.odeme_tarihi) + (x.fatura_no ? ' · Fatura ' + kac(x.fatura_no) : '') : 'Son ödeme: ' + gunAy(x.vade)}</div></div><div style="text-align:right"><b>${paraTl(x.tutar)}</b><div><span class="th-durum ${x.durum}">${TAHAKKUK_DURUM[x.durum]}</span></div></div></div>`).join('')}</div>`
      : bosDurum('takvim', 'Henüz Ödeme Dönemi Yok', ucretsiz ? 'Ücretsiz dönemin bitince ilk bedel ' + donemAd(ilkDonem) + ' ayının 1\'inde oluşur.' : 'Bu ayın bedeli ayın 1\'inde oluşur.'))
    + (o.tur === 'karma' ? '' : o.karma_talep ? `<div class="bilgi-k">${ic('takvim', 18)}<div>Emlak + Galeri ortaklığına geçiş talebin inceleniyor. Onaylanınca kombine paketleri seçebilirsin.</div></div>`
      : `<div class="kart karma-kart"><b>Hem Emlak Hem Vasıta mı Satıyorsun?</b><div class="k soluk">Business Partner Emlak + Galeri ile iki alanda tek ortaklık: aylık ${paraTl(a.karma_aylik ?? 2999.99)}'den başlayan paketler.</div>
        <label class="alan">${o.tur === 'galeri' ? 'Taşınmaz ticareti yetki belgesi no' : 'İkinci el taşıt ticareti yetki belgesi no'}<input id="karmaBelge" maxlength="30"></label>
        <button class="btn sade tam" id="karmaGec">Emlak + Galeri'ye Geçiş Talebi Gönder</button></div>`)
    + `<a class="btn sade tam" href="#/metin/ortaklik" style="margin-top:6px">${ic('belge', 18)}Sözleşmeyi Görüntüle</a>`;
  const kg = $('#karmaGec'); if (kg) kg.onclick = async () => { const v = $('#karmaBelge').value.trim(); if (v.length < 4) return toast('Yetki belgesi no gir.');
    if (await dene(async () => { const { error } = await sb.rpc('ortak_karma_talep', { p_yetki2: v }); if (error) throw error; }, 'Geçiş talebin alındı')) EKRAN.ortaklik(); };
  el.querySelectorAll('[data-abone]').forEach((x) => (x.onclick = () => ortakAboneOl(paketler.find((p) => p.id === x.dataset.abone), o)));
  const k = $('#ibanKopya'); if (k) k.onclick = () => { try { navigator.clipboard.writeText(a.iban.replace(/\s/g, '')); toast('IBAN kopyalandı'); } catch (_) {} };
};

// ---------- Yönetim sekmesi ----------
YON_SEKME.push(['ortak', 'tik', 'İş Ortakları']);
YON_GRUP[0][1].push('ortak');
YON.ortak = async (el) => {
  const [l, a, t, pk] = await Promise.all([
    islem(sb.from('is_ortagi').select('*').order('guncelleme', { ascending: false })),
    uyelikAyar(),
    islem(sb.from('uyelik_tahakkuk').select('*').in('durum', ['bekliyor', 'gecikti']).order('vade')),
    islem(sb.from('uyelik_paket').select('*').order('sira')),
  ]);
  await profilleriGetir(l.map((x) => x.kullanici));
  const ad = (id) => kac(kullanici(id)?.ad || 'Üye');
  const ortak = (id) => l.find((x) => x.kullanici === id);
  const bas = l.filter((x) => x.durum === 'basvuru'), akt = l.filter((x) => ['aktif', 'askida'].includes(x.durum));
  const ortakSatir = (o, dugmeler) => `<div class="kart" style="margin-bottom:10px;display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between;gap:8px"><div><b>${kac(o.unvan)}</b><div class="k soluk">${ad(o.kullanici)} · ${ORTAK_TUR_KISA[o.tur] || o.tur} · VKN ${kac(o.vergi_no)}</div><div class="k soluk">Yetki belgesi: ${kac(o.yetki_belge_no)}${o.yetki_belge_no2 ? ' · Taşıt belgesi: ' + kac(o.yetki_belge_no2) : ''}${o.ucretsiz_bitis ? ' · Ücretsiz dönem sonu: ' + gunAy(o.ucretsiz_bitis) : ''}${o.odeme_yontemi === 'havale' ? (o.aylik_ucret ? ' · Havale ' + paraTl(o.aylik_ucret) + '/ay' : ' · Havale') : ' · Play: ' + (aboneGecerli(o) ? kac(o.play_urun) + ' → ' + gunAy(o.abonelik_bitis) : ABONE_DURUM[o.abonelik_durum] || 'abonelik yok')}</div></div><span class="od-rozet ${o.durum}">${ORTAK_DURUM[o.durum]}</span></div>${dugmeler}</div>`;
  el.innerHTML = `<div class="bolum-bas"><h2 style="font-size:15px">Başvurular (${bas.length})</h2></div>`
    + (bas.length ? bas.map((o) => ortakSatir(o, `<div class="k soluk">Yetki belgesini <a href="https://ttbs.gtb.gov.tr/Home/BelgeSorgula" target="_blank" rel="noopener">TTBS Belge Sorgula</a> ile kontrol et.</div><div class="izgara2"><button class="btn kucuk" data-onay="${o.kullanici}">Onayla</button><button class="btn sade kucuk" data-red="${o.kullanici}">Reddet</button></div>`)).join('') : '<div class="k soluk" style="margin-bottom:12px">Bekleyen başvuru yok.</div>')
    + (l.some((x) => x.karma_talep) ? `<div class="bolum-bas"><h2 style="font-size:15px">Emlak + Galeri Geçiş Talepleri</h2></div>` + l.filter((x) => x.karma_talep).map((o) => ortakSatir(o, `<div class="k soluk">Yeni belgeyi (${kac(o.yetki_belge_no2)}) TTBS'den kontrol et.</div><div class="izgara2"><button class="btn kucuk" data-karma="${o.kullanici}">Emlak + Galeri'ye Geçir</button><button class="btn sade kucuk" data-karmared="${o.kullanici}">Reddet</button></div>`)).join('') : '')
    + `<div class="bolum-bas"><h2 style="font-size:15px">Açık Tahakkuklar (${t.length})</h2></div>`
    + (t.length ? `<div class="kart" style="padding:4px 16px;margin-bottom:12px">${t.map((x) => `<div class="tahakkuk-s"><div class="ara"><b>${kac(ortak(x.ortak)?.unvan || '—')}</b><div class="k soluk">${donemAd(x.donem)} · vade ${gunAy(x.vade)}</div></div><div style="text-align:right"><b>${paraTl(x.tutar)}</b><div><span class="th-durum ${x.durum}">${TAHAKKUK_DURUM[x.durum]}</span></div><div style="display:flex;gap:6px;margin-top:6px;justify-content:flex-end"><button class="btn kucuk" data-odendi="${x.id}">Ödendi</button><button class="btn sade kucuk" data-tiptal="${x.id}">İptal</button></div></div></div>`).join('')}</div>` : '<div class="k soluk" style="margin-bottom:12px">Açık tahakkuk yok.</div>')
    + `<div class="bolum-bas"><h2 style="font-size:15px">İş Ortakları (${akt.length})</h2></div>`
    + (akt.length ? akt.map((o) => ortakSatir(o, `<div class="izgara2"><button class="btn sade kucuk" data-yontem="${o.kullanici}">${o.odeme_yontemi === 'havale' ? 'Play Aboneliğine Geçir' : 'Havaleye Geçir'}</button><button class="btn sade kucuk" data-sonlandir="${o.kullanici}">Ortaklığı Sonlandır</button>${o.odeme_yontemi === 'havale' ? `<button class="btn sade kucuk" data-ucret="${o.kullanici}">Aylık Bedeli Değiştir</button>` : ''}</div>`)).join('') : '<div class="k soluk" style="margin-bottom:12px">Henüz iş ortağı yok.</div>')
    + `<div class="bolum-bas"><h2 style="font-size:15px">Business Partner Paketleri</h2></div>
      <div class="k soluk" style="margin-bottom:8px">Satış fiyatı Play Console'da belirlenir; buradaki fiyat uygulamada Play fiyatı yüklenemezse gösterilir. İkisini aynı tut.</div>
      ${pk.map((p) => `<div class="kart" data-paket="${p.id}" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px"><b>${kac(p.ad)}</b><div class="k soluk">${kac(p.id)}</div>
        <div class="izgara2"><label class="alan">Fiyat (TL)<input name="fiyat" type="number" min="1" step="0.01" value="${p.fiyat}"></label><label class="satir k" style="gap:8px;align-self:end"><input type="checkbox" name="aktif" ${p.aktif ? 'checked' : ''} style="width:20px;height:20px">Satışta</label></div>
        <button class="btn sade kucuk" data-pkaydet="${p.id}">Kaydet</button></div>`).join('')}`
    + `<div class="bolum-bas"><h2 style="font-size:15px">Program Ayarları</h2></div>
      <form class="kart" id="uyAyar" style="display:flex;flex-direction:column;gap:10px">
        <div class="izgara2"><label class="alan">Havale: emlak aylık (TL)<input name="emlak_aylik" type="number" min="0" step="0.01" value="${a.emlak_aylik ?? 1500}"></label><label class="alan">Havale: galeri aylık (TL)<input name="galeri_aylik" type="number" min="0" step="0.01" value="${a.galeri_aylik ?? 1000}"></label></div>
        <label class="alan">Havale: emlak + galeri aylık (TL)<input name="karma_aylik" type="number" min="0" step="0.01" value="${a.karma_aylik ?? 2999.99}"></label>
        <div class="izgara2"><label class="alan">Ücretsiz ay<input name="ucretsiz_ay" type="number" min="0" max="24" value="${a.ucretsiz_ay ?? 3}"></label><label class="alan">Vade (gün)<input name="vade_gun" type="number" min="1" max="60" value="${a.vade_gun ?? 15}"></label></div>
        <label class="alan">Ödeme alıcı unvanı<input name="alici_unvan" maxlength="160" value="${kac(a.alici_unvan || '')}"></label>
        <label class="alan">IBAN<input name="iban" maxlength="34" placeholder="TR.." value="${kac(a.iban || '')}"></label>
        <div class="k soluk">Bedel değişikliği yeni onaylanan ortaklara uygulanır; mevcut ortağın bedelini yukarıdan tek tek değiştir (sözleşme: 30 gün önceden bildirim).</div>
        <button class="btn tam">Ayarları Kaydet</button></form>`;
  const yenile = () => YON.ortak(el);
  el.querySelectorAll('[data-onay]').forEach((x) => (x.onclick = async () => {
    const o = ortak(x.dataset.onay), v = o.tur === 'galeri' ? a.galeri_aylik : o.tur === 'karma' ? a.karma_aylik : a.emlak_aylik;
    if (!(await onayla('Başvuru onaylansın mı?', `${o.unvan} · ilk ${a.ucretsiz_ay} ay ücretsiz, sonra aylık ${paraTl(v)}. Yetki belgesini kontrol ettin mi?`, 'Onayla'))) return;
    if (await dene(async () => { const { error } = await sb.rpc('ortak_karar', { p_kullanici: o.kullanici, p_karar: 'onay', p_aylik: v }); if (error) throw error; }, 'Onaylandı')) yenile();
  }));
  el.querySelectorAll('[data-karma]').forEach((x) => (x.onclick = async () => { const o = ortak(x.dataset.karma);
    if (!(await onayla('Emlak + Galeri\'ye geçirilsin mi?', `${o.unvan} · taşıt belgesi ${o.yetki_belge_no2}. Havale ödüyorsa aylık bedeli ${paraTl(a.karma_aylik)} olur; Play abonesi kombine paket seçmeli.`, 'Geçir'))) return;
    if (await dene(async () => { const { error } = await sb.rpc('ortak_karar', { p_kullanici: o.kullanici, p_karar: 'karma' }); if (error) throw error; }, 'Geçirildi')) yenile(); }));
  el.querySelectorAll('[data-karmared]').forEach((x) => (x.onclick = () => ortakNotSheet('Geçiş talebini reddet', 'Gerekçe (üyeye gider)', async (n) => { const { error } = await sb.rpc('ortak_karar', { p_kullanici: x.dataset.karmared, p_karar: 'karma_red', p_not: n || null }); if (error) throw error; yenile(); })));
  el.querySelectorAll('[data-red]').forEach((x) => (x.onclick = () => ortakNotSheet('Başvuruyu reddet', 'Gerekçe (üyeye gider)', async (n) => { const { error } = await sb.rpc('ortak_karar', { p_kullanici: x.dataset.red, p_karar: 'red', p_not: n }); if (error) throw error; yenile(); })));
  el.querySelectorAll('[data-yontem]').forEach((x) => (x.onclick = async () => {
    const o = ortak(x.dataset.yontem), yeni = o.odeme_yontemi === 'havale' ? 'play' : 'havale';
    if (!(await onayla('Ödeme yöntemi değişsin mi?', yeni === 'havale' ? `${o.unvan} faturalı havale ile ödeyecek; her ayın 1'inde tahakkuk oluşur. Ödeme bilgisini ona e-postayla gönder.` : `${o.unvan} uygulamadan Google Play aboneliği seçecek.`, 'Değiştir'))) return;
    if (await dene(async () => { const { error } = await sb.rpc('ortak_odeme_yontemi', { p_kullanici: o.kullanici, p_yontem: yeni }); if (error) throw error; }, 'Kaydedildi')) yenile();
  }));
  el.querySelectorAll('[data-pkaydet]').forEach((x) => (x.onclick = async () => {
    const k = el.querySelector(`[data-paket="${x.dataset.pkaydet}"]`), fiyat = +k.querySelector('[name=fiyat]').value;
    if (!(fiyat > 0)) return toast('Fiyat sıfırdan büyük olmalı.');
    if (await dene(async () => { const { error } = await sb.from('uyelik_paket').update({ fiyat, aktif: k.querySelector('[name=aktif]').checked }).eq('id', x.dataset.pkaydet); if (error) throw error; }, 'Paket kaydedildi')) yenile();
  }));
  el.querySelectorAll('[data-sonlandir]').forEach((x) => (x.onclick = () => ortakNotSheet('Ortaklığı sonlandır', 'Not (isteğe bağlı)', async (n) => { const { error } = await sb.rpc('ortak_karar', { p_kullanici: x.dataset.sonlandir, p_karar: 'iptal', p_not: n || null }); if (error) throw error; yenile(); })));
  el.querySelectorAll('[data-ucret]').forEach((x) => (x.onclick = () => ortakNotSheet('Aylık bedel (TL)', 'Yeni aylık bedel', async (n) => { const v = +String(n).replace(',', '.'); if (!(v >= 0)) throw new Error('Geçerli bir tutar gir'); const { error } = await sb.rpc('ortak_karar', { p_kullanici: x.dataset.ucret, p_karar: 'onay', p_aylik: v }); if (error) throw error; yenile(); }, 'number')));
  el.querySelectorAll('[data-odendi]').forEach((x) => (x.onclick = () => ortakNotSheet('Ödeme alındı', 'Fatura no (isteğe bağlı)', async (n) => { const { error } = await sb.rpc('tahakkuk_odendi', { p_id: x.dataset.odendi, p_fatura: n || null }); if (error) throw error; yenile(); })));
  el.querySelectorAll('[data-tiptal]').forEach((x) => (x.onclick = () => ortakNotSheet('Tahakkuku iptal et', 'Gerekçe', async (n) => { const { error } = await sb.rpc('tahakkuk_iptal', { p_id: x.dataset.tiptal, p_not: n || null }); if (error) throw error; yenile(); })));
  $('#uyAyar', el).onsubmit = async (e) => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    const g = { emlak_aylik: +f.emlak_aylik, galeri_aylik: +f.galeri_aylik, karma_aylik: +f.karma_aylik, ucretsiz_ay: +f.ucretsiz_ay, vade_gun: +f.vade_gun, alici_unvan: f.alici_unvan.trim() || null, iban: f.iban.replace(/\s/g, '').toUpperCase() || null, guncelleme: new Date().toISOString() };
    if (g.iban && !/^TR\d{24}$/.test(g.iban)) return toast('IBAN TR ile başlayan 26 karakter olmalı.');
    if (await dene(async () => { const { error } = await sb.from('uyelik_ayar').update(g).eq('id', 1); if (error) throw error; }, 'Ayarlar kaydedildi')) yenile();
  };
};
function ortakNotSheet(baslik, etiket, kaydet, tip) {
  sheetAc(`<h2 style="font-size:18px;font-weight:800">${baslik}</h2><label class="alan">${etiket}<input id="onNot" ${tip === 'number' ? 'type="number" min="0" step="0.01"' : 'maxlength="300"'}></label><button class="btn tam" id="onKaydet">Kaydet</button>`, (s) => {
    $('#onKaydet', s).onclick = async () => { const v = $('#onNot', s).value.trim(); if (tip === 'number' && !v) return toast('Tutar gir.'); if (await dene(() => kaydet(v), 'Kaydedildi')) sheetKapat(); };
  });
}
