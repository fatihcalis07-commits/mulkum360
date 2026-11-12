// Mülküm360 — Anlaşmalı İş Ortaklığı (emlak ofisi / oto galeri)
// Model: ilk N ay ücretsiz, sonra aylık üyelik. Tahakkuk, gecikme ve askıya alma sunucuda (uyelik_gunluk) yürür.
// Migration: supabase/migrations/20261116010000_is_ortakligi.sql
'use strict';

const ORTAK_SOZLESME_SURUM = 'v1-2026-11';
const ORTAK_DURUM = { basvuru: 'İnceleniyor', aktif: 'Aktif', askida: 'Askıda', red: 'Onaylanmadı', iptal: 'Sona Erdi' };
const TAHAKKUK_DURUM = { bekliyor: 'Ödeme Bekliyor', odendi: 'Ödendi', gecikti: 'Gecikti', iptal: 'İptal' };
const paraTl = (n) => (+n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' TL';
const gunAy = (d) => (d ? new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
const donemAd = (d) => new Date(d).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

async function uyelikAyar() { try { const { data } = await sb.from('uyelik_ayar').select('*').eq('id', 1).maybeSingle(); return data || {}; } catch (_) { return {}; } }
async function ortakBen() { if (!S.oturum) return null; try { const { data } = await sb.from('is_ortagi').select('*').eq('kullanici', S.oturum).maybeSingle(); return data; } catch (_) { return null; } }
async function ortakTahakkuklar(id) { try { const { data } = await sb.from('uyelik_tahakkuk').select('*').eq('ortak', id).order('donem', { ascending: false }); return data || []; } catch (_) { return []; } }

// Sözleşme metni (avukat kontrolünden geçmeli; sürüm değişince yeniden onay istenir)
METIN.ortaklik = ['İş Ortaklığı Sözleşmesi', `<b>1. Taraflar ve konu.</b> Bu sözleşme ${KUNYE.unvan ? KUNYE.unvan + ' ("Mülküm360")' : 'Mülküm360'} ile başvuruyu yapan yetki belgeli emlak işletmesi veya ikinci el motorlu kara taşıtı ticareti yapan işletme ("İş Ortağı") arasında, İş Ortağı'nın ilanlarını Mülküm360'ta yayımlaması için verilen ilan hizmetini düzenler. Mülküm360 alım satıma, pazarlığa ve devir işlemlerine taraf değildir.

<b>2. Ücretsiz dönem.</b> Başvurunun onaylandığı günden itibaren ilk ücretsiz dönem boyunca (başvuru ekranında yazan ay sayısı) ilan hizmeti ücretsizdir.

<b>3. Aylık üyelik bedeli.</b> Ücretsiz dönemin bittiği günden sonraki ilk ayın 1'inden itibaren her ay için onay ekranında yazan aylık üyelik bedeli (KDV dahil) tahakkuk eder. Bedel ayın 1'inde bildirilir, vade aynı ekranda yazan gün sayısı kadardır. Ödeme havale/EFT ile yapılır, ödeme açıklamasına üye e-postası yazılır. Fatura ödeme onayından sonra düzenlenir.

<b>4. Gecikme.</b> Vadesinde ödenmeyen dönemde İş Ortağı'nın yayındaki ilanları beklemeye alınır. Ödeme onaylanınca ilanlar ek işlem gerekmeden yayına döner. Beklemede geçen süre için ayrıca bedel istenmez, ancak ilgili ayın bedeli düşmez.

<b>5. İlan kuralları.</b> İş Ortağı yalnız yetkili olduğu taşınmaz ve taşıtlar için ilan verir; Ticaret Bakanlığı Elektronik İlan Doğrulama Sistemi (EİDS) kurallarına, Taşınmaz Ticareti Hakkında Yönetmelik ve Motorlu Kara Taşıtlarının Ticareti Hakkında Yönetmelik hükümlerine uyar. Yanıltıcı, satılmış veya yetkisiz ilanlar kaldırılır.

<b>6. Bedel değişikliği.</b> Mülküm360 aylık bedeli en az 30 gün önceden bildirerek değiştirebilir. İş Ortağı yeni bedeli kabul etmezse sözleşmeyi sona erdirebilir.

<b>7. Sona erme.</b> Taraflar sözleşmeyi her zaman sona erdirebilir. Sona erme, başlamış ayın bedelini etkilemez. Ağır ihlalde (sahte ilan, yetkisiz ilan, ödenmeyen iki dönem) Mülküm360 sözleşmeyi derhâl sona erdirebilir.

<b>8. Kişisel veriler.</b> İş Ortağı, müşterilerinin kişisel verilerini KVKK'ya uygun işler. Mülküm360'ın veri işleme esasları KVKK aydınlatma metnindedir.

<b>9. Uyuşmazlık.</b> Türk hukuku uygulanır. Uyuşmazlıklarda Mülküm360 merkezinin bulunduğu yer mahkemeleri ve icra daireleri yetkilidir.

Sürüm: ${ORTAK_SOZLESME_SURUM}`];

// ---------- Hesabım kartı ----------
async function ortakHesapKarti() {
  const yer = document.getElementById('ortakKart'); const b = ben();
  if (!yer || !b?.ofis) return;
  const [o, a] = await Promise.all([ortakBen(), uyelikAyar()]);
  const galeri = b.sektor === 'galeri', ad = galeri ? 'Anlaşmalı Galeri' : 'Anlaşmalı Ofis';
  const alt = !o || o.durum === 'red' || o.durum === 'iptal'
    ? `İlk ${a.ucretsiz_ay ?? 3} Ay Ücretsiz, Sonra Aylık ${paraTl(galeri ? a.galeri_aylik : a.emlak_aylik)}`
    : o.durum === 'basvuru' ? 'Başvurun İnceleniyor'
    : o.durum === 'askida' ? 'Ödeme Gecikti · İlanların Beklemede'
    : new Date(o.ucretsiz_bitis) >= new Date(new Date().toDateString()) ? 'Ücretsiz Dönem · ' + gunAy(o.ucretsiz_bitis) + ' Tarihine Kadar' : 'Aylık ' + paraTl(o.aylik_ucret) + ' · Aktif';
  yer.innerHTML = `<a class="kart ortak-giris${o?.durum === 'askida' ? ' uyari' : ''}" href="#/ortaklik"><span class="og-ikon">${ic('tik', 22)}</span><div class="ara"><b>${o && ['aktif', 'askida'].includes(o.durum) ? ad : 'İş Ortaklığı Programı'}</b><div class="k soluk">${alt}</div></div><span class="yg-ok">${ic('ok', 18)}</span></a>`;
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
  const tanitim = `<div class="ortak-hero"><b>${galeri ? 'Anlaşmalı Galeri' : 'Anlaşmalı Ofis'} Programı</b><span>İlk ${ay} ay ücretsiz. Sonra aylık ${paraTl(aylik)}, taahhüt yok.</span>
    <div class="oh-madde"><i>${ic('tik', 16)}</i>Profilinde ve ilanlarında "${galeri ? 'Anlaşmalı Galeri' : 'Anlaşmalı Ofis'}" rozeti</div>
    <div class="oh-madde"><i>${ic('tik', 16)}</i>EİDS doğrulamalı ilanlarla güvenilir vitrin</div>
    <div class="oh-madde"><i>${ic('tik', 16)}</i>Aylık ekstre, havale ile ödeme, faturalı hizmet</div></div>`;
  if (!b?.ofis) { el.innerHTML = tanitim + bosDurum('kisi', 'Kurumsal Hesap Gerekli', 'İş ortaklığı emlak ofisleri ve oto galeriler içindir. Profil ayarlarından hesap türünü "Emlak ofisi" ya da "Oto galeri" yap.', '<a class="btn" href="#/profil">Profil Ayarları</a>'); return; }

  if (!o || o.durum === 'red' || o.durum === 'iptal') {
    el.innerHTML = tanitim + (o?.durum === 'red' ? `<div class="uyari-k">${ic('uyari', 18)}<div>Önceki başvurun onaylanmadı${o.karar_notu ? ': ' + kac(o.karar_notu) : ''}. Bilgileri düzeltip yeniden başvurabilirsin.</div></div>` : '')
      + `<form class="kart" id="ortakForm" style="display:flex;flex-direction:column;gap:12px"><h3 style="margin:0">Başvuru</h3>
        <label class="alan">Ticaret unvanı<input name="unvan" required minlength="3" maxlength="160" value="${kac(o?.unvan || b.firma || '')}"></label>
        <label class="alan">Vergi / TC kimlik no<input name="vergi" required inputmode="numeric" maxlength="11" value="${kac(o?.vergi_no || '')}"></label>
        <label class="alan">${galeri ? 'İkinci el taşıt ticareti yetki belgesi no' : 'Taşınmaz ticareti yetki belgesi no'}<input name="yetki" required maxlength="30" value="${kac(o?.yetki_belge_no || b.yetkiNo || '')}"></label>
        <label class="satir k" style="align-items:flex-start"><input type="checkbox" name="kabul" style="width:22px;height:22px;flex-shrink:0"><span style="line-height:1.5"><a href="#/metin/ortaklik">İş Ortaklığı Sözleşmesi</a>'ni okudum, kabul ediyorum.</span></label>
        <button class="btn tam">Başvur</button></form>`;
    $('#ortakForm').onsubmit = async (e) => {
      e.preventDefault(); const f = new FormData(e.target);
      const vergi = String(f.get('vergi')).replace(/\D/g, '');
      if (!/^\d{10,11}$/.test(vergi)) return toast('Vergi no 10, TC kimlik no 11 haneli olmalı.');
      if (!f.get('kabul')) return toast('Devam etmek için sözleşmeyi kabul et.');
      if (await dene(async () => { const { error } = await sb.rpc('ortak_basvur', { p_tur: galeri ? 'galeri' : 'emlak', p_unvan: f.get('unvan'), p_vergi: vergi, p_yetki: f.get('yetki'), p_surum: ORTAK_SOZLESME_SURUM }); if (error) throw error; }, 'Başvurun alındı')) EKRAN.ortaklik();
    };
    return;
  }
  if (o.durum === 'basvuru') {
    el.innerHTML = tanitim + `<div class="kart ortak-durum"><span class="od-rozet bekliyor">İnceleniyor</span><b>${kac(o.unvan)}</b><div class="k soluk">Başvuru: ${gunAy(o.sozlesme_onay)} · Yetki belgesi: ${kac(o.yetki_belge_no)}</div><div class="k soluk">Yetki belgen Ticaret Bakanlığı kayıtlarından kontrol edildikten sonra onaylanır. Onayda bildirim gelir.</div></div>`;
    return;
  }
  // aktif / askıda
  const t = await ortakTahakkuklar(o.kullanici);
  const borc = t.filter((x) => ['bekliyor', 'gecikti'].includes(x.durum)).reduce((s, x) => s + +x.tutar, 0);
  const ucretsiz = new Date(o.ucretsiz_bitis) >= new Date(new Date().toDateString());
  const ilkDonem = (() => { const d = new Date(o.ucretsiz_bitis); d.setDate(d.getDate() - 1); return new Date(d.getFullYear(), d.getMonth() + 1, 1); })();
  el.innerHTML = `<div class="kart ortak-durum"><span class="od-rozet ${o.durum}">${ORTAK_DURUM[o.durum]}</span><b>${kac(o.unvan)}</b>
      <div class="od-izgara"><div><small>Ücretsiz Dönem</small><b>${ucretsiz ? gunAy(o.ucretsiz_bitis) + "'e Kadar" : 'Bitti'}</b></div><div><small>Aylık Bedel</small><b>${paraTl(o.aylik_ucret)}</b></div>
      <div><small>${ucretsiz ? 'İlk Ödeme Dönemi' : 'Açık Borç'}</small><b>${ucretsiz ? donemAd(ilkDonem) : paraTl(borc)}</b></div><div><small>Üyelik Başlangıcı</small><b>${gunAy(o.baslangic)}</b></div></div></div>`
    + (o.durum === 'askida' ? `<div class="uyari-k">${ic('uyari', 18)}<div>Vadesi geçen ödeme nedeniyle ilanların beklemede. Ödeme onaylanınca otomatik olarak yayına döner.</div></div>` : '')
    + (borc > 0 && a.iban ? `<div class="kart"><h3 style="margin:0 0 8px">Ödeme Bilgileri</h3><div class="k"><b>Alıcı:</b> ${kac(a.alici_unvan || KUNYE.unvan || KUNYE.ad)}</div><div class="k" style="margin-top:4px"><b>IBAN:</b> <span id="ortakIban">${kac(a.iban)}</span> <button class="btn sade kucuk" id="ibanKopya">Kopyala</button></div><div class="k soluk" style="margin-top:6px">Açıklamaya hesabının e-postasını yaz. Ödeme 1 iş günü içinde onaylanır.</div></div>` : '')
    + `<div class="bolum-bas"><h2 style="font-size:16px">Hesap Özeti</h2></div>`
    + (t.length ? `<div class="kart" style="padding:4px 16px">${t.map((x) => `<div class="tahakkuk-s"><div class="ara"><b>${donemAd(x.donem)}</b><div class="k soluk">${x.durum === 'odendi' ? 'Ödeme: ' + gunAy(x.odeme_tarihi) + (x.fatura_no ? ' · Fatura ' + kac(x.fatura_no) : '') : 'Son ödeme: ' + gunAy(x.vade)}</div></div><div style="text-align:right"><b>${paraTl(x.tutar)}</b><div><span class="th-durum ${x.durum}">${TAHAKKUK_DURUM[x.durum]}</span></div></div></div>`).join('')}</div>`
      : bosDurum('takvim', 'Henüz Ödeme Dönemi Yok', ucretsiz ? 'Ücretsiz dönemin bitince ilk bedel ' + donemAd(ilkDonem) + ' ayının 1\'inde oluşur.' : 'Bu ayın bedeli ayın 1\'inde oluşur.'))
    + `<a class="btn sade tam" href="#/metin/ortaklik" style="margin-top:6px">${ic('belge', 18)}Sözleşmeyi Görüntüle</a>`;
  const k = $('#ibanKopya'); if (k) k.onclick = () => { try { navigator.clipboard.writeText(a.iban.replace(/\s/g, '')); toast('IBAN kopyalandı'); } catch (_) {} };
};

// ---------- Yönetim sekmesi ----------
YON_SEKME.push(['ortak', 'tik', 'İş Ortakları']);
YON_GRUP[0][1].push('ortak');
YON.ortak = async (el) => {
  const [l, a, t] = await Promise.all([
    islem(sb.from('is_ortagi').select('*').order('guncelleme', { ascending: false })),
    uyelikAyar(),
    islem(sb.from('uyelik_tahakkuk').select('*').in('durum', ['bekliyor', 'gecikti']).order('vade')),
  ]);
  await profilleriGetir(l.map((x) => x.kullanici));
  const ad = (id) => kac(kullanici(id)?.ad || 'Üye');
  const ortak = (id) => l.find((x) => x.kullanici === id);
  const bas = l.filter((x) => x.durum === 'basvuru'), akt = l.filter((x) => ['aktif', 'askida'].includes(x.durum));
  const ortakSatir = (o, dugmeler) => `<div class="kart" style="margin-bottom:10px;display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between;gap:8px"><div><b>${kac(o.unvan)}</b><div class="k soluk">${ad(o.kullanici)} · ${o.tur === 'galeri' ? 'Oto galeri' : 'Emlak ofisi'} · VKN ${kac(o.vergi_no)}</div><div class="k soluk">Yetki belgesi: ${kac(o.yetki_belge_no)}${o.ucretsiz_bitis ? ' · Ücretsiz: ' + gunAy(o.ucretsiz_bitis) + "'e kadar" : ''}${o.aylik_ucret ? ' · ' + paraTl(o.aylik_ucret) + '/ay' : ''}</div></div><span class="od-rozet ${o.durum}">${ORTAK_DURUM[o.durum]}</span></div>${dugmeler}</div>`;
  el.innerHTML = `<div class="bolum-bas"><h2 style="font-size:15px">Başvurular (${bas.length})</h2></div>`
    + (bas.length ? bas.map((o) => ortakSatir(o, `<div class="k soluk">Yetki belgesini <a href="https://ttbs.gtb.gov.tr/Home/BelgeSorgula" target="_blank" rel="noopener">TTBS Belge Sorgula</a> ile kontrol et.</div><div class="izgara2"><button class="btn kucuk" data-onay="${o.kullanici}">Onayla</button><button class="btn sade kucuk" data-red="${o.kullanici}">Reddet</button></div>`)).join('') : '<div class="k soluk" style="margin-bottom:12px">Bekleyen başvuru yok.</div>')
    + `<div class="bolum-bas"><h2 style="font-size:15px">Açık Tahakkuklar (${t.length})</h2></div>`
    + (t.length ? `<div class="kart" style="padding:4px 16px;margin-bottom:12px">${t.map((x) => `<div class="tahakkuk-s"><div class="ara"><b>${kac(ortak(x.ortak)?.unvan || '—')}</b><div class="k soluk">${donemAd(x.donem)} · vade ${gunAy(x.vade)}</div></div><div style="text-align:right"><b>${paraTl(x.tutar)}</b><div><span class="th-durum ${x.durum}">${TAHAKKUK_DURUM[x.durum]}</span></div><div style="display:flex;gap:6px;margin-top:6px;justify-content:flex-end"><button class="btn kucuk" data-odendi="${x.id}">Ödendi</button><button class="btn sade kucuk" data-tiptal="${x.id}">İptal</button></div></div></div>`).join('')}</div>` : '<div class="k soluk" style="margin-bottom:12px">Açık tahakkuk yok.</div>')
    + `<div class="bolum-bas"><h2 style="font-size:15px">İş Ortakları (${akt.length})</h2></div>`
    + (akt.length ? akt.map((o) => ortakSatir(o, `<div class="izgara2"><button class="btn sade kucuk" data-ucret="${o.kullanici}">Aylık Bedeli Değiştir</button><button class="btn sade kucuk" data-sonlandir="${o.kullanici}">Ortaklığı Sonlandır</button></div>`)).join('') : '<div class="k soluk" style="margin-bottom:12px">Henüz iş ortağı yok.</div>')
    + `<div class="bolum-bas"><h2 style="font-size:15px">Program Ayarları</h2></div>
      <form class="kart" id="uyAyar" style="display:flex;flex-direction:column;gap:10px">
        <div class="izgara2"><label class="alan">Emlak ofisi aylık (TL)<input name="emlak_aylik" type="number" min="0" step="0.01" value="${a.emlak_aylik ?? 1500}"></label><label class="alan">Oto galeri aylık (TL)<input name="galeri_aylik" type="number" min="0" step="0.01" value="${a.galeri_aylik ?? 1000}"></label></div>
        <div class="izgara2"><label class="alan">Ücretsiz ay<input name="ucretsiz_ay" type="number" min="0" max="24" value="${a.ucretsiz_ay ?? 3}"></label><label class="alan">Vade (gün)<input name="vade_gun" type="number" min="1" max="60" value="${a.vade_gun ?? 15}"></label></div>
        <label class="alan">Ödeme alıcı unvanı<input name="alici_unvan" maxlength="160" value="${kac(a.alici_unvan || '')}"></label>
        <label class="alan">IBAN<input name="iban" maxlength="34" placeholder="TR.." value="${kac(a.iban || '')}"></label>
        <div class="k soluk">Bedel değişikliği yeni onaylanan ortaklara uygulanır; mevcut ortağın bedelini yukarıdan tek tek değiştir (sözleşme: 30 gün önceden bildirim).</div>
        <button class="btn tam">Ayarları Kaydet</button></form>`;
  const yenile = () => YON.ortak(el);
  el.querySelectorAll('[data-onay]').forEach((x) => (x.onclick = async () => {
    const o = ortak(x.dataset.onay), v = o.tur === 'galeri' ? a.galeri_aylik : a.emlak_aylik;
    if (!(await onayla('Başvuru onaylansın mı?', `${o.unvan} · ilk ${a.ucretsiz_ay} ay ücretsiz, sonra aylık ${paraTl(v)}. Yetki belgesini kontrol ettin mi?`, 'Onayla'))) return;
    if (await dene(async () => { const { error } = await sb.rpc('ortak_karar', { p_kullanici: o.kullanici, p_karar: 'onay', p_aylik: v }); if (error) throw error; }, 'Onaylandı')) yenile();
  }));
  el.querySelectorAll('[data-red]').forEach((x) => (x.onclick = () => ortakNotSheet('Başvuruyu reddet', 'Gerekçe (üyeye gider)', async (n) => { const { error } = await sb.rpc('ortak_karar', { p_kullanici: x.dataset.red, p_karar: 'red', p_not: n }); if (error) throw error; yenile(); })));
  el.querySelectorAll('[data-sonlandir]').forEach((x) => (x.onclick = () => ortakNotSheet('Ortaklığı sonlandır', 'Not (isteğe bağlı)', async (n) => { const { error } = await sb.rpc('ortak_karar', { p_kullanici: x.dataset.sonlandir, p_karar: 'iptal', p_not: n || null }); if (error) throw error; yenile(); })));
  el.querySelectorAll('[data-ucret]').forEach((x) => (x.onclick = () => ortakNotSheet('Aylık bedel (TL)', 'Yeni aylık bedel', async (n) => { const v = +String(n).replace(',', '.'); if (!(v >= 0)) throw new Error('Geçerli bir tutar gir'); const { error } = await sb.rpc('ortak_karar', { p_kullanici: x.dataset.ucret, p_karar: 'onay', p_aylik: v }); if (error) throw error; yenile(); }, 'number')));
  el.querySelectorAll('[data-odendi]').forEach((x) => (x.onclick = () => ortakNotSheet('Ödeme alındı', 'Fatura no (isteğe bağlı)', async (n) => { const { error } = await sb.rpc('tahakkuk_odendi', { p_id: x.dataset.odendi, p_fatura: n || null }); if (error) throw error; yenile(); })));
  el.querySelectorAll('[data-tiptal]').forEach((x) => (x.onclick = () => ortakNotSheet('Tahakkuku iptal et', 'Gerekçe', async (n) => { const { error } = await sb.rpc('tahakkuk_iptal', { p_id: x.dataset.tiptal, p_not: n || null }); if (error) throw error; yenile(); })));
  $('#uyAyar', el).onsubmit = async (e) => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    const g = { emlak_aylik: +f.emlak_aylik, galeri_aylik: +f.galeri_aylik, ucretsiz_ay: +f.ucretsiz_ay, vade_gun: +f.vade_gun, alici_unvan: f.alici_unvan.trim() || null, iban: f.iban.replace(/\s/g, '').toUpperCase() || null, guncelleme: new Date().toISOString() };
    if (g.iban && !/^TR\d{24}$/.test(g.iban)) return toast('IBAN TR ile başlayan 26 karakter olmalı.');
    if (await dene(async () => { const { error } = await sb.from('uyelik_ayar').update(g).eq('id', 1); if (error) throw error; }, 'Ayarlar kaydedildi')) yenile();
  };
};
function ortakNotSheet(baslik, etiket, kaydet, tip) {
  sheetAc(`<h2 style="font-size:18px;font-weight:800">${baslik}</h2><label class="alan">${etiket}<input id="onNot" ${tip === 'number' ? 'type="number" min="0" step="0.01"' : 'maxlength="300"'}></label><button class="btn tam" id="onKaydet">Kaydet</button>`, (s) => {
    $('#onKaydet', s).onclick = async () => { const v = $('#onNot', s).value.trim(); if (tip === 'number' && !v) return toast('Tutar gir.'); if (await dene(() => kaydet(v), 'Kaydedildi')) sheetKapat(); };
  });
}
