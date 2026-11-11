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
      if (await dene(() => eidsIsteTasit(ilanId, y.value, p, sa, $('#eYetki', s).value.trim()), 'Talebin alındı — onaylanınca ilanın yayına çıkacak')) { sheetKapat(); if (poIsla) poIsla(); else ciz(); }
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
