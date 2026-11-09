// EİDS — taşınmaz ilan doğrulama modülü. Belgeler: docs/EIDS.md · TAPU-DOGRULAMA.md · migration 20261109160000_eids.sql
// Faz: 'kapali' = bugünkü akış | 'manuel' = yönetici resmî sorgu ekranlarıyla onaylar | 'canli' = resmî EİDS API erişimi gelince (YOK; başvuru: eids@ticaret.gov.tr)
// KURAL: resmî erişim/onay olmadan "doğrulandı" yazılmaz; rozet yalnız gerçekten doğrulananı söyler.

async function eidsFazGetir() { try { const { data } = await sb.from('eids_ayar').select('faz').eq('id', 1).maybeSingle(); S.eidsFaz = data?.faz || 'kapali'; } catch (_) { S.eidsFaz = 'kapali'; } return S.eidsFaz; }
const eidsAcik = () => !!S.eidsFaz && S.eidsFaz !== 'kapali';
const eidsOnayda = () => '<span class="etiket" style="background:var(--vurgu-acik);color:var(--vurgu-koyu)">Doğrulanıyor</span>';

async function eidsIste(ilanId, yontem, tasinmazNo, yetkiNo) { await islem(sb.rpc('eids_iste', { p_ilan: ilanId, p_yontem: yontem, p_tasinmaz_no: tasinmazNo, p_yetki_belge_no: yetkiNo || null })); const i = ilan(ilanId); if (i) { i.durum = 'onayda'; i.guncelleme = Date.now(); } }
async function eidsKayit(ilanId) { try { const { data } = await sb.from('ilan_dogrulama').select('*').eq('ilan', ilanId).maybeSingle(); return data; } catch (_) { return null; } }
async function eidsKuyruk() { return await islem(sb.from('ilan_dogrulama').select('*').eq('sonuc', 'bekliyor').order('olusturma')); }
async function eidsKarar(ilanId, onay, not) { await islem(sb.rpc('eids_karar', { p_ilan: ilanId, p_onay: onay, p_not: not || null })); const i = ilan(ilanId); if (i) { i.durum = onay ? 'yayinda' : 'kaldirildi'; i.dogrulanmis = !!onay; } }

// Üye doğrulama formu (portfoy/detay/akıştan ortak)
function eidsSheet(ilanId, poIsla) {
  const b = ben(); if (!b) return;
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
