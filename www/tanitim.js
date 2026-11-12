// Mülküm360 — Tanıtım ödülleri: davet kodu (doğrulama sonrası kredi) + sosyal medya tanıtım görevleri (yönetici onaylı kredi)
// Migration: supabase/migrations/20261117010000_tanitim_odul.sql
'use strict';

const TANITIM_PLATFORM = [['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['facebook', 'Facebook'], ['youtube', 'YouTube'], ['x', 'X (Twitter)'], ['linkedin', 'LinkedIn'], ['blog', 'Blog / Forum'], ['diger', 'Diğer']];
const platformAd = (k) => (TANITIM_PLATFORM.find(([x]) => x === k) || [, k])[1];
const KOSUL_METNI = { eposta: 'e-posta adresini doğrulayınca', telefon: 'telefonunu SMS ile doğrulayınca', ilan: 'ilk ilanı yayına çıkınca' };
const GONDERI_DURUM = { bekliyor: 'İnceleniyor', onay: 'Onaylandı', red: 'Onaylanmadı' };
const DAVET_DURUM = { bekliyor: 'Doğrulama Bekleniyor', odullendi: 'Ödül Verildi', red: 'Geçersiz' };
const davetKodum = () => (ben()?.id || '').slice(0, 8).toUpperCase();
const davetBaglanti = () => 'https://mulkum360.com/www/#/kayit?davet=' + davetKodum();
async function odulAyar() { try { const { data } = await sb.from('odul_ayar').select('*').eq('id', 1).maybeSingle(); return data || {}; } catch (_) { return {}; } }


// Hesabım kartı
function odulHesapKarti() {
  const yer = document.getElementById('odulKart'); if (!yer || !S.oturum) return;
  yer.innerHTML = `<a class="kart odul-giris" href="#/tanitim"><span class="og-ikon">${ic('yildiz', 22)}</span><div class="ara"><b>Davet Et, Kredi Kazan</b><div class="k soluk">Arkadaşını Davet Et Ya Da Mülküm360'ı Paylaş</div></div><span class="yg-ok">${ic('ok', 18)}</span></a>`;
}

EKRAN.tanitim = async () => {
  if (girisGerek()) return;
  app.innerHTML = ustBar('Davet Et, Kredi Kazan') + '<div class="ic" id="tanIc"><div class="kart soluk">Yükleniyor…</div></div>';
  navCiz('hesap');
  const el = document.getElementById('tanIc');
  const [a, davetler, gonderiler] = await Promise.all([
    odulAyar(),
    sb.from('davetler').select('durum,zaman,odul_zamani').eq('davet_eden', S.oturum).order('zaman', { ascending: false }).then((r) => r.data || [], () => []),
    sb.from('tanitim_gonderi').select('*').eq('kullanici', S.oturum).order('olusturma', { ascending: false }).then((r) => r.data || [], () => []),
  ]);
  if (a.acik === false) { el.innerHTML = bosDurum('yildiz', 'Ödül Programı Şu An Kapalı', 'Yeni dönem başladığında burada duyuracağız.'); return; }
  const odul = davetler.filter((d) => d.durum === 'odullendi').length, bekl = davetler.filter((d) => d.durum === 'bekliyor').length;
  const kazanilan = odul * (a.davet_eden_kredi || 0) + gonderiler.filter((g) => g.durum === 'onay').reduce((s, g) => s + (g.kredi || 0), 0);
  el.innerHTML = `<div class="ortak-hero"><b>Mülküm360'ı Anlat, Kredi Kazan</b><span>Kredilerini değer raporu, MülkümDeko ve MülkümVideo'da kullanabilirsin.</span>
      <div class="oh-madde"><i>${ic('tik', 16)}</i>Davet ettiğin kişi ${KOSUL_METNI[a.davet_kosul] || 'hesabını doğrulayınca'} ikinize de ${a.davet_eden_kredi} kredi</div>
      <div class="oh-madde"><i>${ic('tik', 16)}</i>Sosyal medya paylaşımı başına ${a.gorev_kredi} kredi (ekibimiz kontrol eder)</div></div>
    <div class="od-izgara" style="margin-top:2px"><div><small>Davet Ettiğin</small><b>${davetler.length}</b></div><div><small>Ödül Alan Davet</small><b>${odul}${bekl ? ' <span class="k soluk" style="font-weight:600">· ' + bekl + ' bekliyor</span>' : ''}</b></div><div><small>Kazandığın Kredi</small><b>${kazanilan}</b></div><div><small>Tanıtım Gönderin</small><b>${gonderiler.length}</b></div></div>

    <div class="bolum-bas"><h2 style="font-size:16px">1. Arkadaşını Davet Et</h2></div>
    <div class="kart davet-kart"><small>Davet Kodun</small><div class="dk-kod">${davetKodum()}</div>
      <div class="izgara2"><button class="btn sade" id="dkKopya">${ic('belge', 18)}Kodu Kopyala</button><button class="btn" id="dkPaylas">${ic('paylas', 18)}Davet Gönder</button></div>
      <div class="k soluk" style="line-height:1.5">Arkadaşın üye olurken bu kodu yazmalı ya da bağlantınla gelmeli. Kod üyeliğin ilk ${a.davet_kod_gun} gününde kullanılabilir. Ayda en fazla ${a.davet_aylik_limit} davet için ödül verilir.</div></div>

    <div class="bolum-bas"><h2 style="font-size:16px">2. Mülküm360'ı Paylaş</h2></div>
    <div class="kart" style="display:flex;flex-direction:column;gap:12px">
      <div class="gorev-kural"><b>Ödül Koşulları</b>
        <span>Paylaşım herkese açık olmalı ve en az 7 gün yayında kalmalı.</span>
        <span>Mülküm360'ın adı ve uygulama bağlantısı ya da davet kodun geçmeli.</span>
        <span>Ödüllü paylaşım reklam sayılır: paylaşımda <b>#reklam</b> ya da <b>#işbirliği</b> etiketi bulunmalı (Ticaret Bakanlığı kuralı).</span>
        <span>Google Play puanı ve yorumu için ödül verilmez.</span>
        <span>Ayda en fazla ${a.gorev_aylik_limit} paylaşım gönderebilirsin; ekibimiz bağlantıyı açıp kontrol eder.</span></div>
      <form id="gorevForm" style="display:flex;flex-direction:column;gap:10px">
        <label class="alan">Platform<select name="platform">${TANITIM_PLATFORM.map(([k, ad]) => `<option value="${k}">${ad}</option>`).join('')}</select></label>
        <label class="alan">Paylaşımın bağlantısı<input name="url" type="url" inputmode="url" required maxlength="500" placeholder="https://"></label>
        <label class="alan">Not <span style="font-weight:500">(isteğe bağlı)</span><input name="not" maxlength="300"></label>
        <button class="btn tam">Kontrole Gönder</button></form></div>
    ${gonderiler.length ? `<div class="bolum-bas"><h2 style="font-size:16px">Gönderilerin</h2></div><div class="kart" style="padding:4px 16px">${gonderiler.map((g) => `<div class="tahakkuk-s"><div class="ara"><b>${platformAd(g.platform)}</b><div class="k soluk" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><a href="${kac(g.url)}" target="_blank" rel="noopener">${kac(g.url.replace(/^https:\/\/(www\.)?/, ''))}</a></div>${g.durum === 'red' && g.karar_notu ? `<div class="k soluk">${kac(g.karar_notu)}</div>` : ''}</div><div style="text-align:right">${g.durum === 'onay' ? `<b>+${g.kredi} kredi</b>` : ''}<div><span class="th-durum ${g.durum === 'onay' ? 'odendi' : g.durum === 'red' ? 'gecikti' : 'bekliyor'}">${GONDERI_DURUM[g.durum]}</span></div></div></div>`).join('')}</div>` : ''}`;
  $('#dkKopya').onclick = () => { try { navigator.clipboard.writeText(davetKodum()); toast('Davet kodun kopyalandı'); } catch (_) { toast(davetKodum()); } };
  $('#dkPaylas').onclick = () => paylas(davetMetni());
  $('#gorevForm').onsubmit = async (e) => {
    e.preventDefault(); const f = new FormData(e.target), url = String(f.get('url')).trim();
    if (!/^https:\/\/\S{6,}$/.test(url)) return toast('Bağlantı https:// ile başlamalı.');
    if (/play\.google\.com/.test(url)) return toast('Google Play yorumları için ödül verilmez.');
    if (await dene(async () => { const { error } = await sb.rpc('tanitim_gonder', { p_platform: f.get('platform'), p_url: url, p_aciklama: f.get('not') || null }); if (error) throw error; }, 'Gönderin alındı, kontrol edilince bildirim gelecek')) EKRAN.tanitim();
  };
};

// ---------- Yönetim sekmesi ----------
YON_SEKME.push(['tanitim', 'yildiz', 'Tanıtım Ödülleri']);
YON_GRUP[0][1].push('tanitim');
YON.tanitim = async (el) => {
  const [a, g, d] = await Promise.all([
    odulAyar(),
    islem(sb.from('tanitim_gonderi').select('*').order('olusturma', { ascending: false }).limit(100)),
    islem(sb.rpc('yonetim_davetler')),
  ]);
  await profilleriGetir([...new Set(g.map((x) => x.kullanici))]);
  const bek = g.filter((x) => x.durum === 'bekliyor'), dBek = d.filter((x) => x.durum === 'bekliyor');
  const ad = (id) => kac(kullanici(id)?.ad || 'Üye');
  el.innerHTML = `<div class="bolum-bas"><h2 style="font-size:15px">Bekleyen Tanıtım Gönderileri (${bek.length})</h2></div>`
    + (bek.length ? bek.map((x) => `<div class="kart" style="margin-bottom:10px;display:flex;flex-direction:column;gap:8px"><div><b>${platformAd(x.platform)}</b> · ${ad(x.kullanici)} <span class="k soluk">· ${tarihSaat(x.olusturma)}</span></div><a href="${kac(x.url)}" target="_blank" rel="noopener" style="word-break:break-all">${kac(x.url)}</a>${x.aciklama ? `<div class="k soluk">${kac(x.aciklama)}</div>` : ''}<div class="k soluk">Kontrol et: herkese açık mı, Mülküm360 adı/bağlantısı ve #reklam etiketi var mı?</div><div class="izgara2"><button class="btn kucuk" data-gonay="${x.id}">Onayla · ${a.gorev_kredi} kredi</button><button class="btn sade kucuk" data-gred="${x.id}">Reddet</button></div></div>`).join('') : '<div class="k soluk" style="margin-bottom:12px">Bekleyen gönderi yok.</div>')
    + `<div class="bolum-bas"><h2 style="font-size:15px">Davetler (${d.length}) · Ödül Bekleyen ${dBek.length}</h2></div>`
    + (d.length ? `<div class="kart" style="padding:4px 16px;margin-bottom:12px">${d.slice(0, 60).map((x) => `<div class="tahakkuk-s"><div class="ara"><b>${kac(x.eden_ad || 'Üye')} → ${kac(x.davetli_ad || 'Üye')}</b><div class="k soluk">${tarihSaat(x.zaman)} · e-posta ${x.eposta_onayli ? '✓' : '✗'} · telefon ${x.telefon_onayli ? '✓' : '✗'}</div></div><div style="text-align:right"><span class="th-durum ${x.durum === 'odullendi' ? 'odendi' : x.durum === 'red' ? 'gecikti' : 'bekliyor'}">${DAVET_DURUM[x.durum]}</span>${x.durum === 'bekliyor' ? `<div style="display:flex;gap:6px;margin-top:6px;justify-content:flex-end"><button class="btn kucuk" data-donay="${x.davetli}">Ödül Ver</button><button class="btn sade kucuk" data-dred="${x.davetli}">Geçersiz</button></div>` : ''}</div></div>`).join('')}</div>` : '<div class="k soluk" style="margin-bottom:12px">Henüz davet yok.</div>')
    + (g.length - bek.length ? `<div class="bolum-bas"><h2 style="font-size:15px">Sonuçlanan Gönderiler</h2></div><div class="kart" style="padding:4px 16px;margin-bottom:12px">${g.filter((x) => x.durum !== 'bekliyor').slice(0, 40).map((x) => `<div class="tahakkuk-s"><div class="ara"><b>${platformAd(x.platform)} · ${ad(x.kullanici)}</b><div class="k soluk" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><a href="${kac(x.url)}" target="_blank" rel="noopener">${kac(x.url)}</a></div></div><span class="th-durum ${x.durum === 'onay' ? 'odendi' : 'gecikti'}">${x.durum === 'onay' ? '+' + x.kredi + ' kredi' : 'Red'}</span></div>`).join('')}</div>` : '')
    + `<div class="bolum-bas"><h2 style="font-size:15px">Ödül Ayarları</h2></div>
      <form class="kart" id="odAyar" style="display:flex;flex-direction:column;gap:10px">
        <label class="satir k"><input type="checkbox" name="acik" ${a.acik !== false ? 'checked' : ''} style="width:22px;height:22px">Ödül programı açık</label>
        <div class="izgara2"><label class="alan">Davet edene (kredi)<input name="davet_eden_kredi" type="number" min="0" max="50" value="${a.davet_eden_kredi ?? 3}"></label><label class="alan">Davet edilene (kredi)<input name="davetli_kredi" type="number" min="0" max="50" value="${a.davetli_kredi ?? 3}"></label></div>
        <div class="izgara2"><label class="alan">Aylık davet ödülü sınırı<input name="davet_aylik_limit" type="number" min="0" max="500" value="${a.davet_aylik_limit ?? 10}"></label><label class="alan">Kod girme süresi (gün)<input name="davet_kod_gun" type="number" min="1" max="90" value="${a.davet_kod_gun ?? 7}"></label></div>
        <label class="alan">Davet ödülü koşulu<select name="davet_kosul">${[['eposta', 'Davetli e-postasını doğrulasın'], ['telefon', 'Davetli telefonunu SMS ile doğrulasın'], ['ilan', 'Davetlinin ilk ilanı yayına çıksın']].map(([k, t]) => `<option value="${k}" ${a.davet_kosul === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <div class="izgara2"><label class="alan">Tanıtım ödülü (kredi)<input name="gorev_kredi" type="number" min="0" max="50" value="${a.gorev_kredi ?? 2}"></label><label class="alan">Aylık tanıtım sınırı<input name="gorev_aylik_limit" type="number" min="0" max="50" value="${a.gorev_aylik_limit ?? 4}"></label></div>
        <button class="btn tam">Ayarları Kaydet</button></form>`;
  const yenile = () => YON.tanitim(el);
  el.querySelectorAll('[data-gonay]').forEach((x) => (x.onclick = () => ortakNotSheet('Tanıtımı onayla', 'Kredi (boş bırakılırsa ' + a.gorev_kredi + ')', async (n) => { const { error } = await sb.rpc('tanitim_karar', { p_id: x.dataset.gonay, p_onay: true, p_kredi: n === '' ? null : +n }); if (error) throw error; yenile(); }, 'kredi')));
  el.querySelectorAll('[data-gred]').forEach((x) => (x.onclick = () => ortakNotSheet('Tanıtımı reddet', 'Gerekçe (üyeye gider)', async (n) => { const { error } = await sb.rpc('tanitim_karar', { p_id: x.dataset.gred, p_onay: false, p_not: n || null }); if (error) throw error; yenile(); })));
  el.querySelectorAll('[data-donay]').forEach((x) => (x.onclick = async () => { if (!(await onayla('Davet ödülü verilsin mi?', 'İki tarafa da ayarlardaki kredi yüklenir.', 'Ödül Ver'))) return; if (await dene(async () => { const { error } = await sb.rpc('davet_karar', { p_davetli: x.dataset.donay, p_onay: true }); if (error) throw error; }, 'Ödül verildi')) yenile(); }));
  el.querySelectorAll('[data-dred]').forEach((x) => (x.onclick = () => ortakNotSheet('Daveti geçersiz say', 'Not (isteğe bağlı)', async (n) => { const { error } = await sb.rpc('davet_karar', { p_davetli: x.dataset.dred, p_onay: false, p_not: n || null }); if (error) throw error; yenile(); })));
  $('#odAyar', el).onsubmit = async (e) => {
    e.preventDefault(); const f = new FormData(e.target), sayi = (k) => +f.get(k);
    const g2 = { acik: !!f.get('acik'), davet_eden_kredi: sayi('davet_eden_kredi'), davetli_kredi: sayi('davetli_kredi'), davet_aylik_limit: sayi('davet_aylik_limit'), davet_kod_gun: sayi('davet_kod_gun'), davet_kosul: f.get('davet_kosul'), gorev_kredi: sayi('gorev_kredi'), gorev_aylik_limit: sayi('gorev_aylik_limit'), guncelleme: new Date().toISOString() };
    if (await dene(async () => { const { error } = await sb.from('odul_ayar').update(g2).eq('id', 1); if (error) throw error; }, 'Ayarlar kaydedildi')) yenile();
  };
};
