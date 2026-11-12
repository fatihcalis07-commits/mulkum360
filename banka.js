// Banka kredisi: hesaplayıcı (#/bankakredi), ilan sayfasında teklifler, Yönetim > Banka Teklifleri.
const KREDI_TUR = [['konut', 'Konut'], ['tasit', 'Taşıt'], ['ihtiyac', 'İhtiyaç']];
// Konut kredisi BSMV ve KKDF'den muaf; taşıt ve ihtiyaçta faize %15 KKDF + %15 BSMV eklenir.
const VERGI_ORANI = { konut: 0, tasit: 0.30, ihtiyac: 0.30 };

async function bankaTeklifleri(tur) {
  const { data, error } = await sb.from('banka_teklifleri').select('*').eq('tur', tur).eq('aktif', true).order('faiz');
  if (error) throw error; return data || [];
}
async function krediOrtalama(tur) {
  const { data } = await sb.from('kredi_ortalama').select('*').eq('tur', tur).order('donem', { ascending: false }).limit(1);
  return (data || [])[0] || null;
}

function taksitHesap(anapara, aylikFaiz, vade, tur) {
  const r = (aylikFaiz / 100) * (1 + (VERGI_ORANI[tur] || 0));
  if (!(anapara > 0 && vade > 0 && r > 0)) return null;
  const taksit = (anapara * r) / (1 - Math.pow(1 + r, -vade));
  return { taksit, toplam: taksit * vade, faiz: taksit * vade - anapara };
}
const yuzde = (x) => '%' + String(+(+x).toFixed(2)).replace('.', ',');
const tarihKisa = (t) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

function teklifListeHtml(teklifler, anapara, vade, tur) {
  if (!teklifler.length) return bosDurum('kredi', 'Henüz banka teklifi yok', 'Teklifler eklendikçe burada sıralanacak.');
  const satir = teklifler.map((t) => {
    const uygun = vade >= t.vade_min && vade <= t.vade_max && (!t.tutar_max || anapara <= +t.tutar_max) && (!t.tutar_min || anapara >= +t.tutar_min);
    const h = taksitHesap(anapara, +t.faiz, vade, tur);
    const tahsis = t.tahsis ? anapara * (+t.tahsis / 100) : 0;
    return { t, uygun, h, tahsis };
  }).sort((a, b) => (b.uygun - a.uygun) || ((a.h?.taksit || 1e18) - (b.h?.taksit || 1e18)));
  return satir.map(({ t, uygun, h, tahsis }, n) => `<div class="kart" style="padding:12px;margin:8px 0;${uygun ? '' : 'opacity:.55'}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>${n === 0 && uygun ? '🏆 ' : ''}${kac(t.banka)}</b><span class="k">aylık ${yuzde(t.faiz)}</span></div>
      ${h && uygun ? `<div style="font-size:20px;font-weight:700;margin:4px 0">${tl(h.taksit)} <small class="soluk" style="font-size:13px;font-weight:500">/ ay</small></div>
      <div class="k soluk">Toplam geri ödeme ${tl(h.toplam + tahsis)} · faiz ${tl(h.faiz)}${tahsis ? ` · tahsis ücreti ${tl(tahsis)}` : ''}</div>`
        : `<div class="k soluk">Bu tutar ya da vade için uygun değil (vade ${t.vade_min}–${t.vade_max} ay${t.tutar_max ? `, en çok ${tl(+t.tutar_max)}` : ''}).</div>`}
      ${t.aciklama ? `<div class="k soluk" style="margin-top:4px">${kac(t.aciklama)}</div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><small class="soluk">Güncelleme: ${tarihKisa(t.guncelleme)}</small>${t.baglanti ? `<a class="btn kucuk" href="${kac(t.baglanti)}" target="_blank" rel="noopener">Bankaya git</a>` : ''}</div></div>`).join('');
}
const KREDI_UYARI = `<div class="k soluk" style="font-size:12px;line-height:1.5;margin-top:8px">Oranlar bilgilendirme amaçlıdır ve bankalar tarafından değiştirilebilir. Kesin teklif, sigorta ve masraflar için bankaya başvurun. Taşıt ve ihtiyaç kredisinde KKDF ve BSMV taksite dahil edilmiştir; konut kredisi bu vergilerden muaftır.</div>`;

// Hesaplayıcı formu ve teklif listesi; kap içine çizer. fiyat verilirse tutar ondan gelir.
async function krediHesaplayiciCiz(kap, { tur = 'konut', fiyat = 0, turSec = true, kisa = false } = {}) {
  let acik = !kisa; // ilan sayfasında yalnız en uygun teklif görünür, kalanı "Diğer teklifler" ile açılır
  kap.innerHTML = `${turSec ? `<div class="ciplar" id="bkTur">${KREDI_TUR.map(([k, a]) => `<button class="cip ${k === tur ? 'secili' : ''}" data-tur="${k}">${a}</button>`).join('')}</div>` : ''}
    <div class="izgara3" style="grid-template-columns:1.7fr 1fr 1fr"><label class="alan">${fiyat ? 'Fiyat' : 'Kredi tutarı'} (TL)<input id="bkTutar" inputmode="numeric" value="${sayiBicim(fiyat || 1000000)}"></label>
    <label class="alan">Peşinat %<input id="bkPes" inputmode="numeric" value="${fiyat ? 20 : 0}"></label>
    <label class="alan">Vade (ay)<input id="bkVade" inputmode="numeric" value="${tur === 'konut' ? 120 : 36}" list="bkVadeOn"><datalist id="bkVadeOn"><option value="12"><option value="24"><option value="36"><option value="48"><option value="60"><option value="120"><option value="180"></datalist></label></div>
    <div id="bkOrt" class="k soluk"></div><div id="bkListe">${bosDurum('kredi', 'Teklifler yükleniyor…', '')}</div>${KREDI_UYARI}`;
  let teklifler = [];
  const sayi = (id) => +String($('#' + id, kap).value).replace(/\D/g, '') || 0;
  const hesapla = () => {
    const tutar = sayi('bkTutar'), pes = Math.min(90, sayi('bkPes')) / 100, vade = sayi('bkVade'), anapara = tutar * (1 - pes);
    const l = $('#bkListe', kap);
    l.innerHTML = `<div class="k" style="margin:8px 0">Kredi tutarı <b>${tl(anapara)}</b>${pes ? ` · peşinat ${tl(tutar * pes)}` : ''}</div>` + teklifListeHtml(teklifler, anapara, vade, tur);
    const kartlar = [...l.querySelectorAll(':scope > .kart')];
    if (!acik && kartlar.length > 1) {
      kartlar.slice(1).forEach((k) => (k.hidden = true));
      const d = document.createElement('button'); d.className = 'btn sade tam'; d.textContent = `Diğer ${kartlar.length - 1} teklifi göster`;
      d.onclick = () => { acik = true; hesapla(); }; l.appendChild(d);
    }
  };
  const yukleTur = async () => {
    try {
      const [t, o] = await Promise.all([bankaTeklifleri(tur), krediOrtalama(tur)]);
      teklifler = t;
      $('#bkOrt', kap).innerHTML = o ? `Piyasa ortalaması (${kac(o.kaynak)}, ${tarihKisa(o.donem)}): yıllık ${yuzde(o.faiz_yillik)} · aylık yaklaşık ${yuzde(o.faiz_yillik / 12)}` : '';
    } catch (x) { teklifler = []; toast(hataMetni(x)); }
    hesapla();
  };
  ['bkPes', 'bkVade'].forEach((id) => ($('#' + id, kap).oninput = hesapla));
  $('#bkTutar', kap).oninput = (e) => { const n = e.target.value.replace(/\D/g, '').slice(0, 13); e.target.value = n ? sayiBicim(+n) : ''; hesapla(); };
  kap.querySelectorAll('[data-tur]').forEach((b) => (b.onclick = () => {
    tur = b.dataset.tur; kap.querySelectorAll('[data-tur]').forEach((y) => y.classList.toggle('secili', y === b));
    $('#bkVade', kap).value = tur === 'konut' ? 120 : 36; yukleTur();
  }));
  await yukleTur();
}

EKRAN.bankakredi = async (tur) => {
  app.innerHTML = ustBar('Kredi hesaplama') + `<div class="ic"><div class="k soluk" style="margin-bottom:8px">Tutarı ve vadeyi gir; bankaların teklifleri aylık taksite göre sıralansın.</div><div id="bkKap"></div></div>`;
  await krediHesaplayiciCiz($('#bkKap'), { tur: KREDI_TUR.some(([k]) => k === tur) ? tur : 'konut' });
};

// İlan sayfasındaki kredi kartının altına banka tekliflerini ekler.
function ilanKrediTeklifleri(ilan) {
  const k = document.getElementById('krediK'); if (!k) return;
  const tur = ilan.ana === 'vasita' ? 'tasit' : 'konut';
  k.innerHTML = `<h3>Kredi hesabı ve banka teklifleri</h3><div id="ikKap"></div><a class="k" href="#/bankakredi/${tur}" style="display:inline-block;margin-top:8px">Tüm teklifleri karşılaştır →</a>`;
  krediHesaplayiciCiz($('#ikKap'), { tur, fiyat: +ilan.fiyat || 0, turSec: false, kisa: true });
}

// ---------- Yönetim > Banka Teklifleri ----------
async function teklifKaydet(r) { const { error } = r.id ? await sb.from('banka_teklifleri').update(r).eq('id', r.id) : await sb.from('banka_teklifleri').insert(r); if (error) throw error; }
async function teklifSil(id) { const { error } = await sb.from('banka_teklifleri').delete().eq('id', id); if (error) throw error; }
async function ortalamaKaydet(r) { const { error } = await sb.from('kredi_ortalama').upsert(r); if (error) throw error; }

if (typeof YON_SEKME !== 'undefined') {
  YON_SEKME.push(['banka', 'kredi', 'Banka Teklifleri']);
  YON.banka = async (el) => {
    const { data: hepsi, error } = await sb.from('banka_teklifleri').select('*').order('tur').order('faiz');
    if (error) throw error;
    const secim = (ad, deger) => `<select name="${ad}">${KREDI_TUR.map(([k, a]) => `<option value="${k}" ${k === deger ? 'selected' : ''}>${a}</option>`).join('')}</select>`;
    const form = (t = {}) => `<form class="kart tf" data-id="${t.id || ''}" style="display:flex;flex-direction:column;gap:8px;margin:8px 0">
      <div class="izgara3"><label class="alan">Banka<input name="banka" value="${kac(t.banka || '')}" required></label><label class="alan">Tür${secim('tur', t.tur || 'konut')}</label><label class="alan">Aylık faiz %<input name="faiz" inputmode="decimal" value="${t.faiz ? String(t.faiz).replace('.', ',') : ''}" required></label></div>
      <div class="izgara3"><label class="alan">En kısa vade<input name="vade_min" inputmode="numeric" value="${t.vade_min || 12}"></label><label class="alan">En uzun vade<input name="vade_max" inputmode="numeric" value="${t.vade_max || 120}"></label><label class="alan">Tahsis %<input name="tahsis" inputmode="decimal" value="${t.tahsis ? String(t.tahsis).replace('.', ',') : ''}"></label></div>
      <div class="izgara3"><label class="alan">En az tutar<input name="tutar_min" inputmode="numeric" value="${t.tutar_min || ''}"></label><label class="alan">En çok tutar<input name="tutar_max" inputmode="numeric" value="${t.tutar_max || ''}"></label><label class="alan">Bağlantı (https)<input name="baglanti" value="${kac(t.baglanti || '')}"></label></div>
      <label class="alan">Not<input name="aciklama" maxlength="300" value="${kac(t.aciklama || '')}" placeholder="örn. maaş müşterisine özel"></label>
      <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="aktif" ${t.aktif === false ? '' : 'checked'}> Yayında</label>
      <div style="display:flex;gap:8px"><button class="btn koyu">${t.id ? 'Güncelle' : 'Ekle'}</button>${t.id ? `<button type="button" class="btn" data-sil="${t.id}">Sil</button><small class="soluk" style="align-self:center">Son: ${tarihKisa(t.guncelleme)}</small>` : ''}</div></form>`;
    el.innerHTML = `<div class="kart"><h3 style="margin:0 0 6px">Piyasa ortalaması</h3><div class="k soluk">TCMB EVDS haftalık ağırlıklı ortalama kredi faizi (yıllık %). EVDS anahtarı eklenince otomatik dolacak.</div>
      <form id="of" class="izgara3" style="margin-top:8px"><label class="alan">Tür${secim('tur', 'konut')}</label><label class="alan">Tarih<input name="donem" type="date" required></label><label class="alan">Yıllık faiz %<input name="faiz_yillik" inputmode="decimal" required></label><button class="btn koyu">Kaydet</button></form></div>
      <h3>Yeni teklif</h3>${form()}<h3>Kayıtlı teklifler (${hepsi.length})</h3>${hepsi.map(form).join('') || '<div class="k soluk">Kayıt yok.</div>'}`;
    const sayi = (x) => (String(x || '').trim() ? Number(String(x).replace(/\./g, '').replace(',', '.')) : null);
    el.querySelectorAll('form.tf').forEach((f) => (f.onsubmit = async (e) => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(f));
      const r = { banka: v.banka.trim(), tur: v.tur, faiz: sayi(v.faiz), vade_min: sayi(v.vade_min) || 12, vade_max: sayi(v.vade_max) || 120, tahsis: sayi(v.tahsis), tutar_min: sayi(v.tutar_min), tutar_max: sayi(v.tutar_max), baglanti: v.baglanti.trim() || null, aciklama: v.aciklama.trim() || null, aktif: !!v.aktif, guncelleme: new Date().toISOString() };
      if (f.dataset.id) r.id = f.dataset.id;
      if (!(r.faiz > 0)) return toast('Faiz sayı olmalı');
      if (await dene(() => teklifKaydet(r), 'Teklif kaydedildi')) YON.banka(el);
    }));
    el.querySelectorAll('[data-sil]').forEach((b) => (b.onclick = async () => { if (confirm('Teklif silinsin mi?') && await dene(() => teklifSil(b.dataset.sil), 'Silindi')) YON.banka(el); }));
    $('#of').onsubmit = async (e) => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(e.target));
      if (await dene(() => ortalamaKaydet({ tur: v.tur, donem: v.donem, faiz_yillik: sayi(v.faiz_yillik), kaynak: 'TCMB EVDS' }), 'Ortalama kaydedildi')) e.target.reset();
    };
  };
}
