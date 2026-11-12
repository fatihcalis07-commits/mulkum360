// EİDS — taşınmaz ilan doğrulama modülü. Belgeler: docs/EIDS.md · TAPU-DOGRULAMA.md · migration 20261109160000_eids.sql
// Faz: 'kapali' = bugünkü akış | 'manuel' = yönetici resmî sorgu ekranlarıyla onaylar | 'canli' = resmî EİDS API erişimi gelince (YOK; başvuru: eids@ticaret.gov.tr)
// KURAL: resmî erişim/onay olmadan "doğrulandı" yazılmaz; rozet yalnız gerçekten doğrulananı söyler.

async function eidsFazGetir() { try { const { data } = await sb.from('eids_ayar').select('faz').eq('id', 1).maybeSingle(); S.eidsFaz = data?.faz || 'kapali'; } catch (_) { S.eidsFaz = 'kapali'; } return S.eidsFaz; }
const eidsAcik = () => !!S.eidsFaz && S.eidsFaz !== 'kapali';
const eidsOnayda = () => '<span class="etiket" style="background:var(--vurgu-acik);color:var(--vurgu-koyu)">Doğrulanıyor</span>';

async function eidsIste(ilanId, yontem, tasinmazNo, yetkiNo) { await islem(sb.rpc('eids_iste', { p_ilan: ilanId, p_yontem: yontem, p_tasinmaz_no: tasinmazNo, p_yetki_belge_no: yetkiNo || null })); const i = ilan(ilanId); if (i) { i.durum = 'onayda'; i.guncelleme = Date.now(); } }
async function eidsIsteTasit(ilanId, yontem, plaka, sasi, yetkiNo) { await islem(sb.rpc('eids_iste_tasit', { p_ilan: ilanId, p_yontem: yontem, p_plaka: plaka, p_sasi: sasi || null, p_yetki_belge_no: yetkiNo || null })); const i = ilan(ilanId); if (i) { i.durum = 'onayda'; i.guncelleme = Date.now(); } }
const plakaDuzelt = (p) => String(p || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
const plakaGecerli = (p) => /^[0-9]{2}[A-Z]{1,3}[0-9]{2,4}$/.test(plakaDuzelt(p));
const sasiGecerli = (s) => !s || /^[A-HJ-NPR-Z0-9]{17}$/.test(String(s).toUpperCase().replace(/\s/g, ''));
// Araç ilanı EİDS alanları (İlan Ver son adımı ve doğrulama penceresi ortak)
const eidsTasitAlanlari = (v = {}, ofis = false) => `<label class="alan">İlanı kim veriyor?<select id="eYontem">
      <option value="sahibim" ${v.yontem === 'sahibim' || !v.yontem ? 'selected' : ''}>Aracın sahibiyim</option>
      <option value="hisim" ${v.yontem === 'hisim' ? 'selected' : ''}>Eşimin ya da 1./2. derece akrabamın aracı</option>
      ${ofis ? `<option value="yetkili" ${v.yontem === 'yetkili' ? 'selected' : ''}>Yetkili galeriyim (araç sahibi e-Devlet'ten yetki verdi)</option>` : ''}</select></label>
    <div class="izgara2"><label class="alan">Plaka <span style="font-weight:500">(zorunlu)</span><input id="ePlaka" maxlength="12" autocapitalize="characters" placeholder="34 ABC 123" value="${kac(v.plaka || '')}"></label>
    <label class="alan">Şasi no <span style="font-weight:500">(isteğe bağlı)</span><input id="eSasi" maxlength="17" autocapitalize="characters" placeholder="17 karakter" value="${kac(v.sasi || '')}"></label></div>
    <label class="alan" id="eYetkiK"${v.yontem === 'yetkili' ? '' : ' hidden'}>Yetki belge numarası <span style="font-weight:500">(2. el ticaret yetki belgesi)</span><input id="eYetki" maxlength="20" value="${kac(v.yetki || '')}"></label>`;
async function eidsKayit(ilanId) { try { const { data } = await sb.from('ilan_dogrulama').select('*').eq('ilan', ilanId).maybeSingle(); return data; } catch (_) { return null; } }
async function eidsKuyruk() { return await islem(sb.from('ilan_dogrulama').select('*').eq('sonuc', 'bekliyor').order('olusturma')); }
async function eidsKarar(ilanId, onay, not) { await islem(sb.rpc('eids_karar', { p_ilan: ilanId, p_onay: onay, p_not: not || null })); const i = ilan(ilanId); if (i) { i.durum = onay ? 'yayinda' : 'kaldirildi'; i.dogrulanmis = !!onay; } }

// Üye doğrulama formu (portfoy/detay/akıştan ortak)
function eidsSheet(ilanId, poIsla) {
  const b = ben(); if (!b) return;
  if (ilan(ilanId)?.ana === 'vasita') return sheetAc(`<h2 style="font-size:19px;font-weight:800">EİDS doğrulaması</h2>
    <p class="soluk" style="margin:0;line-height:1.5">İkinci el taşıt ilanları, ilan verenin aracın sahibi, eşi ya da 1./2. derece akrabası veya araç sahibinin yetkilendirdiği galeri olduğu doğrulanmadan yayımlanamaz. Onaylanınca ilanın otomatik yayına çıkar.</p>
    ${eidsTasitAlanlari({}, b.ofis)}<button class="btn tam" id="eGonder">Doğrulama talebi gönder</button>`, (s) => {
    const y = $('#eYontem', s), tk = () => { $('#eYetkiK', s).hidden = y.value !== 'yetkili'; }; y.onchange = tk; tk();
    $('#eGonder', s).onclick = async () => {
      const p = plakaDuzelt($('#ePlaka', s).value), sa = $('#eSasi', s).value.trim().toUpperCase().replace(/\s/g, '');
      if (!plakaGecerli(p)) return toast('Plakayı kontrol et (ör. 34 ABC 123).');
      if (!sasiGecerli(sa)) return toast('Şasi numarası 17 karakter olmalı.');
      if (y.value === 'yetkili' && $('#eYetki', s).value.trim().length < 6) return toast('Yetki belge numarasını gir.');
      if (await dene(() => eidsIsteTasit(ilanId, y.value, p, sa, $('#eYetki', s).value.trim()), eidsCanli() ? 'Bakanlık kaydı sorgulanıyor…' : 'Talebin alındı — onaylanınca ilanın yayına çıkacak')) { sheetKapat(); if (eidsCanli()) return eidsAracSorgula(ilanId); if (poIsla) poIsla(); else ciz(); }
    };
  });
  sheetAc(`<h2 style="font-size:19px;font-weight:800">EİDS doğrulaması</h2>
    <p class="soluk" style="margin:0;line-height:1.5">Taşınmaz Ticareti Yönetmeliği gereği emlak ilanları kimlik ve mülkiyet/yetki doğrulanmadan yayımlanamaz. Bilgilerin resmî kayıtlardan kontrol edilir, onaylanınca ilanın otomatik yayına çıkar.</p>
    <label class="alan">İlanı kim veriyor?<select id="eYontem">
      <option value="sahibim">Taşınmazın sahibiyim</option>
      <option value="hisim">Eşim ya da 1./2. derece kan hısmımın taşınmazı</option>
      ${b.ofis ? '<option value="yetkili">Yetkili emlak işletmesiyim (sahibi e-Devlet\'ten yetkilendirdi)</option>' : ''}</select></label>
    <label class="alan">Taşınmaz numarası<input id="eNo" inputmode="numeric" maxlength="20" placeholder="e-Devlet → Tapu Bilgileri Sorgulama veya tapu senedi">${b.ofis ? '' : '<span class="k soluk" style="font-weight:400;display:block;margin-top:4px">Malik/hısımlık kontrolü resmî kayıtlardan yapılır.</span>'}</label>
    <label class="alan" id="eYetkiK" hidden>Yetki belge numarası<input id="eYetki" maxlength="20" placeholder="TTBS kayıt belgen"></label>
    <button class="btn tam" id="eGonder">Doğrulama talebi gönder</button>`, (s) => {
    const y = $('#eYontem', s), tk = () => { $('#eYetkiK', s).hidden = y.value !== 'yetkili'; }; y.onchange = tk; tk();
    $('#eGonder', s).onclick = async () => {
      const no = $('#eNo', s).value.replace(/\D/g, '');
      if (!/^[0-9]{8,20}$/.test(no)) return toast('Taşınmaz numarası 8–20 haneli rakam olmalı.');
      if (y.value === 'yetkili' && $('#eYetki', s).value.trim().length < 6) return toast('Yetki belge numarasını gir.');
      if (await dene(() => eidsIste(ilanId, y.value, no, $('#eYetki', s).value.trim()), 'Talebin alındı — onaylanınca ilanın yayına çıkacak')) { sheetKapat(); if (poIsla) poIsla(); else ciz(); }
    };
  });
}
document.addEventListener('click', (ev) => { const b = ev.target.closest && ev.target.closest('[data-eids]'); if (b) { ev.preventDefault(); eidsSheet(b.dataset.eids); } });
eidsFazGetir();

// ================= CANLI EİDS (röle sunucusu: eids-sunucu/, sabit IP) =================
// Faz 'canli' olunca devreye girer. Yönetici her fazda test edebilir.
const EIDS_SUNUCU = 'https://eids.mulkum360.com';
const EIDS_APP_DONUS = 'com.mulkum360.prototip://eids';
const eidsCanli = () => S.eidsFaz === 'canli';
async function eidsToken() { return (await sb.auth.getSession()).data.session?.access_token || ''; }
async function eidsIstek(yol, govde) {
  const r = await fetch(EIDS_SUNUCU + yol, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await eidsToken()) }, body: JSON.stringify(govde || {}) });
  let j = {}; try { j = await r.json(); } catch (_) {}
  return { ok: r.ok, durum: r.status, ...j };
}
async function eidsUyeDurum() { try { const { data } = await sb.rpc('eids_uye_durum'); return data || { dogrulandi: false }; } catch (_) { return { dogrulandi: false }; } }
async function telefonDurum() { const u = (await sb.auth.getUser()).data.user; return { tel: u?.phone || '', onayli: !!u?.phone_confirmed_at }; }

// Telefon SMS doğrulaması (EİDS, OTP ile doğrulanmış GSM ister). Supabase Auth'ta SMS sağlayıcısı tanımlı olmalı.
function telefonDogrulaSheet(sonra) {
  sheetAc(String.raw`<h2 style="font-size:19px;font-weight:800">Telefonunu doğrula</h2>
    <p class="soluk" style="margin:0;line-height:1.5">Ticaret Bakanlığı EİDS kuralı gereği ilan verenin cep telefonu SMS koduyla doğrulanır. Numaran diğer üyelere gösterilmez.</p>
    <label class="alan">Cep telefonu<input id="tTel" inputmode="tel" maxlength="14" placeholder="5XX XXX XX XX"></label>
    <button class="btn tam" id="tGonder">SMS kodu gönder</button>
    <div id="tKodK" hidden><label class="alan">SMS kodu<input id="tKod" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label><button class="btn tam" id="tOnay">Doğrula</button></div>`, (s) => {
    let tel = '';
    $('#tGonder', s).onclick = async () => {
      const n = $('#tTel', s).value.replace(/\D/g, '').replace(/^90/, '').replace(/^0/, '');
      if (!/^5\d{9}$/.test(n)) return toast('Numarayı 5XX XXX XX XX biçiminde gir.');
      tel = '+90' + n;
      if (await dene(async () => { const { error } = await sb.auth.updateUser({ phone: tel }); if (error) throw error; }, 'Kod gönderildi')) { $('#tKodK', s).hidden = false; $('#tKod', s).focus(); }
    };
    $('#tOnay', s).onclick = async () => {
      const kod = $('#tKod', s).value.replace(/\D/g, '');
      if (kod.length < 4) return toast('SMS kodunu gir.');
      if (await dene(async () => { const { error } = await sb.auth.verifyOtp({ phone: tel, token: kod, type: 'phone_change' }); if (error) throw error; }, 'Telefonun doğrulandı')) { sheetKapat(); if (sonra) sonra(); }
    };
  });
}

// e-Devlet ile kimlik doğrulama: sunucu tek kullanımlık oturum açar, tarayıcıda e-Devlet girişi açılır
async function eidsKimlikBaslat() {
  const t = await telefonDurum();
  if (!t.onayli) return telefonDogrulaSheet(eidsKimlikBaslat);
  const b = ben(), yerel = !!window.Capacitor?.isNativePlatform?.();
  const r = await eidsIstek('/eids/baslat', { donus: yerel ? 'uygulama' : 'web', vergiNo: b?.ofis ? (b.vergiNo || null) : null });
  if (r.hata === 'telefon') return telefonDogrulaSheet(eidsKimlikBaslat);
  if (!r.ok || !r.url) return toast(r.mesaj || r.hata || 'Doğrulama başlatılamadı, biraz sonra tekrar dene.');
  const url = EIDS_SUNUCU + r.url, P = window.Capacitor?.Plugins;
  if (yerel && P?.Browser) await P.Browser.open({ url, presentationStyle: 'popover' }); else location.href = url;
}
// Dönüş: uygulamada derin bağlantı, web'de #/hesap?eids=ok
async function eidsDonus(durum, mesaj) {
  try { window.Capacitor?.Plugins?.Browser?.close(); } catch (_) {}
  if (durum === 'ok') toast('Kimliğin e-Devlet ile doğrulandı'); else toast('Doğrulama tamamlanmadı: ' + (mesaj || 'tekrar dene'));
  if (location.hash.startsWith('#/hesap')) ciz(); else git('#/hesap');
}

// Araç ilanı: EİDS yetki sorgusu (anlık). Başarılıysa ilan yayına çıkar, marka/model/yıl kilitlenir.
async function eidsAracSorgula(ilanId) {
  const u = await eidsUyeDurum();
  if (!u.dogrulandi) { toast('Araç ilanı için önce e-Devlet ile kimliğini doğrula.'); return eidsKimlikBaslat(); }
  const r = await eidsIstek('/eids/arac', { ilan: ilanId });
  if (r.ok) { toast('EİDS yetki doğrulaması tamam, ilanın yayında'); await sessizTazele?.(); git('#/ilan/' + ilanId); return true; }
  if (r.hata === 'eids-uye') return eidsKimlikBaslat();
  toast('EİDS: ' + (r.mesaj || r.hata || 'yetki doğrulanamadı'));
  return false;
}

// Hesabım ekranındaki "Kimlik doğrulama" kartı
async function eidsHesapKarti() {
  const yer = document.getElementById('eidsKart'); if (!yer || !S.oturum) return;
  if (!eidsCanli() && !S.yonetici) return;
  const [u, t] = await Promise.all([eidsUyeDurum(), telefonDurum()]);
  const tarih = u.zaman ? new Date(u.zaman).toLocaleDateString('tr-TR') : '';
  const adim = (tamam, no, ad, alt, dugme) => '<div class="eids-adim' + (tamam ? ' tamam' : '') + '"><span class="ea-no">' + (tamam ? '✓' : no) + '</span><div class="ea-yazi"><b>' + ad + '</b><small>' + alt + '</small></div>' + (tamam ? '<span class="ea-durum">Tamam</span>' : dugme) + '</div>';
  yer.innerHTML = '<div class="kart eids-kart"><div class="eids-bas"><span class="eids-ikon' + (u.dogrulandi ? ' tamam' : '') + '">' + ic('kalkan', 22) + '</span><div class="eb-yazi"><b>Kimlik Doğrulama (EİDS)</b><small>' + (u.dogrulandi ? 'E-Devlet İle Doğrulandı · ' + tarih : 'İlan Vermek İçin E-Devlet İle Bir Kez Doğrulaman Gerekir') + '</small></div></div>'
    + adim(t.onayli, 1, 'Telefon SMS Doğrulaması', 'Cep Telefonuna Gelen Kodla', '<button class="btn sade kucuk ea-btn" id="eidsTel">Doğrula</button>')
    + adim(u.dogrulandi, 2, 'E-Devlet Kimlik Doğrulaması', t.onayli ? 'Ticaret Bakanlığı EİDS Üzerinden' : 'Önce 1. Adımı Tamamla', t.onayli ? '<button class="btn kucuk ea-btn" id="eidsBas">Doğrula</button>' : '<button class="btn sade kucuk ea-btn ea-kilit" id="eidsBas" aria-disabled="true">' + ic('kilit', 15) + 'Kilitli</button>')
    + (eidsCanli() ? '' : '<div class="eids-not">' + ic('goz', 14) + '<span>Faz: ' + kac({ kapali: 'Kapalı', manuel: 'Manuel', canli: 'Canlı' }[S.eidsFaz] || 'Kapalı') + ' · Bu Kart Şimdilik Yalnız Yöneticiye Görünür</span></div>') + '</div>';
  const a = document.getElementById('eidsTel'); if (a) a.onclick = () => telefonDogrulaSheet(() => eidsHesapKarti());
  const b2 = document.getElementById('eidsBas'); if (b2) b2.onclick = () => (t.onayli ? eidsKimlikBaslat() : toast('Önce 1. adımda telefonunu SMS koduyla doğrula. Bakanlık e-Devlet doğrulamasında doğrulanmış telefon numarası istiyor.'));
}

