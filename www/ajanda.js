// Ofisim > Ajanda (yapay zekâ destekli): cümleden kayıt, haftalık takvim, hatırlatma, günlük plan, örnek veriler.
// Kayıtlar panel tablosunda tur='gorev' olarak durur (veri: baslik, musteri, not, hatirlat dk, ilan, ornek).
const AJANDA_KONU = ['Yer gösterme', 'Mal sahibiyle görüşme', 'Tapu randevusu', 'Ekspertiz', 'Fotoğraf çekimi', 'Müşteri araması', 'Sözleşme imzası', 'Kira tahsilatı'];
const AJANDA_KONU_GALERI = ['Araç gösterme', 'Test sürüşü', 'Ekspertiz randevusu', 'Noter satışı', 'Fotoğraf çekimi', 'Müşteri araması', 'Araç teslimi', 'Muayene / sigorta'];
const AJANDA_HATIRLAT = [[15, '15 dk önce'], [30, '30 dk önce'], [60, '1 saat önce'], [1440, '1 gün önce']];
let AJANDA_GUN = null; // seçili gün (YYYY-MM-DD) ya da null = tümü

const gunAnahtar = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const gunAdi = (d) => { const k = gunAnahtar(d), b = gunAnahtar(Date.now()), y = gunAnahtar(Date.now() + 864e5); return k === b ? 'Bugün' : k === y ? 'Yarın' : new Date(d).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }); };

function ajandaHtml(gorevler) {
  const acik = gorevler.filter((g) => !g.tamam).sort((x, y) => new Date(x.tarih || 8.64e15) - new Date(y.tarih || 8.64e15));
  const gunler = [...Array(7)].map((_, n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d; });
  const say = (d) => acik.filter((g) => g.tarih && gunAnahtar(g.tarih) === gunAnahtar(d)).length;
  const gecmis = acik.filter((g) => g.tarih && new Date(g.tarih) < new Date() && gunAnahtar(g.tarih) !== gunAnahtar(Date.now()));
  const liste = AJANDA_GUN ? acik.filter((g) => g.tarih && gunAnahtar(g.tarih) === AJANDA_GUN) : acik;
  const gruplar = {}; liste.forEach((g) => { const k = g.tarih ? gunAnahtar(g.tarih) : 'tarihsiz'; (gruplar[k] = gruplar[k] || []).push(g); });
  const satir = (g) => { const i = g.veri.ilan && ilan(g.veri.ilan), gec = g.tarih && new Date(g.tarih) < new Date();
    return `<div class="oge panel-oge aj-satir"><button class="onay-k" data-tamam="${g.id}" aria-label="Tamamlandı"></button>
      <div class="aj-saat ${gec ? 'gec' : ''}">${g.tarih ? new Date(g.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
      <div class="ara" data-duzen="${g.id}"><b>${kac(g.veri.baslik)}</b><div class="k soluk">${[g.veri.musteri, i && i.baslik.slice(0, 26), g.veri.hatirlat ? '🔔 ' + (AJANDA_HATIRLAT.find(([m]) => m === +g.veri.hatirlat) || [0, g.veri.hatirlat + ' dk'])[1] : ''].filter(Boolean).map(kac).join(' · ')}</div>${g.veri.not ? `<div class="k">${kac(g.veri.not)}</div>` : ''}</div></div>`; };
  return `<div class="aj-ai"><div class="aj-ai-bas">${ic('yildiz', 18)}<b>MülkümAI ile ekle</b></div>
      <div class="satir" style="gap:8px"><input id="ajMetin" placeholder="${ben()?.sektor === 'galeri' ? 'örn. Yarın 14:00 Ahmet Bey ile Corolla test sürüşü' : 'örn. Yarın 14:00 Ayşe Hanım&#39;a Kadıköy 3+1 yer gösterme'}" enterkeyhint="send"><button class="btn kucuk" id="ajEkle" aria-label="Ekle">${ic('gonder', 18, '#fff')}</button></div>
      <div class="ciplar">${(ben()?.sektor === 'galeri' ? AJANDA_KONU_GALERI : AJANDA_KONU).map((k) => `<button class="cip" data-konu="${k}">${k}</button>`).join('')}</div></div>
    <div class="aj-hafta">${gunler.map((d) => { const k = gunAnahtar(d), n = say(d); return `<button class="aj-gun ${AJANDA_GUN === k ? 'secili' : ''}" data-gun="${k}"><small>${d.toLocaleDateString('tr-TR', { weekday: 'short' })}</small><b>${d.getDate()}</b><i>${n ? '•'.repeat(Math.min(n, 3)) : ''}</i></button>`; }).join('')}</div>
    <div class="satir" style="gap:8px"><button class="btn sade" id="ajPlan" style="flex:1">${ic('yildiz', 16)}Günümü planla (AI)</button><button class="btn tam" data-yeni="gorev" style="flex:1;width:auto">${ic('arti', 18)}Ajandaya ekle</button></div>
    <div id="ajPlanK"></div>
    ${gecmis.length && !AJANDA_GUN ? `<div class="yon-uyari"><a href="#/panel/gorev">${ic('uyari', 15)}${gecmis.length} gecikmiş iş var</a></div>` : ''}
    ${AJANDA_GUN ? `<button class="btn sade" id="ajTumu">Tüm günleri göster</button>` : ''}
    ${liste.length ? Object.entries(gruplar).map(([k, l]) => `<div class="bolum-bas"><h2 style="font-size:15px">${k === 'tarihsiz' ? 'Tarihsiz' : gunAdi(l[0].tarih)}</h2></div><div class="liste">${l.map(satir).join('')}</div>`).join('')
      : bosDurum('takvim', AJANDA_GUN ? 'Bu gün boş' : 'Ajandan boş', 'Cümleyle yaz, MülkümAI tarihini ve müşterisini kendisi ayırsın. Hatırlatma telefonuna bildirim olarak gelir.', ornekVarMi() ? '' : '<button class="btn cizgili" data-ornek-yukle>Örnek verilerle dene</button>')}
    ${gorevler.some((g) => g.tamam) ? `<details><summary class="k soluk" style="padding:8px 0;cursor:pointer">Tamamlananlar (${gorevler.filter((g) => g.tamam).length})</summary><div class="liste">${gorevler.filter((g) => g.tamam).map((g) => `<div class="oge panel-oge" style="opacity:.6"><button class="onay-k tamam" data-tamam="${g.id}"></button><div class="ara" data-duzen="${g.id}"><s>${kac(g.veri.baslik)}</s></div></div>`).join('')}</div></details>` : ''}
    ${ornekVarMi() ? '<button class="btn sade" data-ornek-sil style="color:var(--hata)">Örnek kayıtları sil</button>' : ''}`;
}

function ajandaBagla() {
  const kaydet = async (veri, tarih) => {
    const r = await dene(() => panelKaydet({ tur: 'gorev', veri, tarih, tamam: false }), 'Ajandaya eklendi');
    if (r) { const s0 = PANEL.sahip; PANEL = [r, ...PANEL]; PANEL.sahip = s0; ciz(); if (tarih) await bildirimIzni(true); gorevHatirlatKur(); }
  };
  const ekle = $('#ajEkle'), girdi = $('#ajMetin');
  if (ekle) ekle.onclick = async () => {
    const m = girdi.value.trim(); if (m.length < 4) return toast('Ne yapılacağını bir cümleyle yaz.');
    ekle.disabled = true; ekle.innerHTML = '…';
    try {
      const t = await aiSor('ajanda_coz', { metin: m, simdi: new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Istanbul' }).slice(0, 16) });
      const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
      const tarih = j.tarih && !isNaN(new Date(j.tarih)) ? new Date(j.tarih).toISOString() : null;
      await kaydet({ baslik: String(j.baslik || m).slice(0, 120), musteri: String(j.musteri || '').slice(0, 80), not: String(j.not || '').slice(0, 300), hatirlat: +j.hatirlat || 30 }, tarih);
    } catch (x) { toast(x.message && !/JSON/.test(x.message) ? x.message : 'Anlayamadım; formdan ekleyebilirsin.'); ekle.disabled = false; ekle.innerHTML = ic('gonder', 18, '#fff'); }
  };
  if (girdi) girdi.onkeydown = (e) => { if (e.key === 'Enter') ekle.click(); };
  app.querySelectorAll('[data-konu]').forEach((b) => (b.onclick = () => panelForm({ tur: 'gorev', veri: { baslik: b.dataset.konu, hatirlat: 30 } })));
  app.querySelectorAll('[data-gun]').forEach((b) => (b.onclick = () => { AJANDA_GUN = AJANDA_GUN === b.dataset.gun ? null : b.dataset.gun; ciz(); }));
  const tm = $('#ajTumu'); if (tm) tm.onclick = () => { AJANDA_GUN = null; ciz(); };
  const pl = $('#ajPlan'); if (pl) pl.onclick = async () => {
    const k = $('#ajPlanK'); pl.disabled = true; k.innerHTML = '<div class="kart k soluk">MülkümAI planlıyor…</div>';
    try {
      const aj = PANEL.filter((g) => g.tur === 'gorev' && !g.tamam).slice(0, 40).map((g) => ({ ne: g.veri.baslik, ne_zaman: g.tarih ? new Date(g.tarih).toLocaleString('tr-TR') : 'tarihsiz', musteri: g.veri.musteri || '' }));
      const mu = PANEL.filter((g) => g.tur === 'musteri').slice(0, 20).map((m) => ({ ad: m.veri.ad, tur: m.veri.rol || 'Alıcı / kiracı', arar: [m.veri.islem, m.veri.oda, m.veri.ilce].filter(Boolean).join(' ') }));
      const t = await aiSor('ajanda_ozet', { ajanda: aj, musteriler: mu, simdi: new Date().toLocaleString('tr-TR') });
      k.innerHTML = `<div class="kart aj-plan"><div class="aj-ai-bas">${ic('yildiz', 16)}<b>Günün planı</b></div><div style="white-space:pre-wrap;line-height:1.55;font-size:14px">${kac(t)}</div><div class="k soluk">Yapay zekâ önerisidir.</div></div>`;
    } catch (x) { k.innerHTML = ''; toast(x.message); }
    pl.disabled = false;
  };
  app.querySelectorAll('[data-ornek-yukle]').forEach((b) => (b.onclick = () => ornekYukle(b)));
  app.querySelectorAll('[data-ornek-sil]').forEach((b) => (b.onclick = ornekSil));
}

// ---------- Örnek veriler (denemek için; "Örnek kayıtları sil" ile tek dokunuşta kalkar) ----------
const ornekVarMi = () => (PANEL || []).some((k) => k.veri && k.veri.ornek);
async function ornekYukle(b) {
  if (b) { b.disabled = true; b.textContent = 'Ekleniyor…'; }
  const t = (gun, saat, dk = 0) => { const d = new Date(); d.setDate(d.getDate() + gun); d.setHours(saat, dk, 0, 0); return d.toISOString(); };
  const kayit = [
    { tur: 'gorev', tarih: t(0, 11), veri: { baslik: 'Yer gösterme · Kadıköy 3+1', musteri: 'Ayşe Demir', not: 'Otopark sorulacak; anahtar kapıcıda', hatirlat: 30 } },
    { tur: 'gorev', tarih: t(0, 15, 30), veri: { baslik: 'Mal sahibiyle fiyat görüşmesi', musteri: 'Mehmet Kaya', not: 'Emsal raporunu götür', hatirlat: 60 } },
    { tur: 'gorev', tarih: t(1, 10), veri: { baslik: 'Tapu randevusu · Ataşehir', musteri: 'Selin Arslan', not: 'Kimlik ve DASK poliçesi', hatirlat: 1440 } },
    { tur: 'gorev', tarih: t(2, 14), veri: { baslik: 'Fotoğraf çekimi · Bahçelievler 2+1', musteri: 'Mehmet Kaya', hatirlat: 30 } },
    { tur: 'gorev', tarih: t(4, 18), veri: { baslik: 'Kira tahsilatı hatırlatması', musteri: 'Emre Yıldız', hatirlat: 1440 } },
    { tur: 'musteri', veri: { rol: 'Alıcı / kiracı', ad: 'Ayşe Demir', tel: '0532 000 00 01', islem: 'Satılık', mulk: 'Daire', oda: '3+1', il: 'İstanbul', ilce: 'Kadıköy', butce: '7500000', not: 'Okula yakın, otoparklı' } },
    { tur: 'musteri', veri: { rol: 'Alıcı / kiracı', ad: 'Emre Yıldız', tel: '0532 000 00 02', islem: 'Kiralık', mulk: 'Daire', oda: '2+1', il: 'İstanbul', ilce: 'Ataşehir', butce: '35000', not: 'Eşyalı tercih' } },
    { tur: 'musteri', veri: { rol: 'Mal sahibi', ad: 'Mehmet Kaya', tel: '0532 000 00 03', islem: 'Satılık', mulk: 'Daire', oda: '2+1', il: 'İstanbul', ilce: 'Bahçelievler', butce: '5200000', not: 'Acil satış, pazarlık payı %5' } },
    { tur: 'musteri', veri: { rol: 'Mal sahibi', ad: 'Selin Arslan', tel: '0532 000 00 04', islem: 'Kiralık', mulk: 'İşyeri', il: 'İstanbul', ilce: 'Ataşehir', butce: '60000', not: 'Kurumsal kiracı istiyor' } },
    { tur: 'not', veri: { metin: 'Kadıköy 3+1 portföyü: komşu daire 8,2 milyona satıldı, fiyatı 7,9 olarak öner.' } },
    { tur: 'not', veri: { metin: 'Ataşehir işyeri için tabela izni belediyeden sorulacak.' } },
    { tur: 'not', veri: { metin: 'Haftaya yeni portföy fotoğrafları için drone videosu (MülkümVideo) dene.' } }
  ];
  let n = 0;
  for (const k of kayit) { try { const r = await panelKaydet({ ...k, veri: { ...k.veri, ornek: true }, tamam: false }); if (r) { PANEL.unshift(r); n++; } } catch (_) {} }
  toast(`${n} örnek kayıt eklendi`); ciz(); gorevHatirlatKur();
}
async function ornekSil() {
  if (!(await onayla('Örnek kayıtlar silinsin mi?', 'Yalnız "Örnek verilerle dene" ile eklenen ajanda, müşteri ve not kayıtları silinir.', 'Sil', true))) return;
  const l = PANEL.filter((k) => k.veri && k.veri.ornek);
  for (const k of l) { try { await panelSil(k.id); } catch (_) {} }
  const s0 = PANEL.sahip; PANEL = PANEL.filter((k) => !(k.veri && k.veri.ornek)); PANEL.sahip = s0;
  toast('Örnek kayıtlar silindi'); ciz(); gorevHatirlatKur();
}
