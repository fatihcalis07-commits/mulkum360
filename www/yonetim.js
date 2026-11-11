// Mülküm360 — Yönetim (yalnız yönetici; tüm işlemleri sunucu kuralları da denetler)
'use strict';

const YON_SEKME = [['ozet', 'grafik', 'Özet'], ['uyeler', 'kisi', 'Kullanıcılar'], ['kredi', 'kredi', 'Kredi Yükleme'], ['vitrin', 'yildiz', 'Vitrin'], ['doping', 'tik', 'Öne Çıkarma'], ['sikayet', 'bayrak', 'Şikayetler'], ['dogrulama', 'kalkan', 'Doğrulama'], ['bolge', 'konum', 'Bölge Verisi'], ['secim', 'bayrak', 'Seçim Verileri'], ['gosterge', 'grafik', 'Göstergeler']];
const YON_GRUP = [['Kullanıcı ve kredi', ['ozet', 'uyeler', 'kredi', 'satis']], ['Denetim', ['sikayet', 'dogrulama']], ['Görünürlük', ['vitrin', 'doping']], ['Veri', ['bolge', 'secim', 'gosterge', 'banka']]];
let YON_BEKLEYEN = 0; // bekleyen kredi satın alma talebi sayısı (satis.js günceller)
const HAREKET_IKON ={ kayit: 'kisi', giris: 'kilit', ilan: 'ev', rapor: 'belge', kredi: 'kredi', mesaj: 'mesaj', sikayet: 'bayrak', ai: 'yildiz' };
const tarihSaat = (t) => (t ? new Date(t).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

EKRAN.yonetim = async (sekme) => {
  if (girisGerek()) return;
  if (!S.yonetici) { git('#/hesap'); return; }
  if (sekme === 'uye') return EKRAN.yonetimUye();
  sekme = YON_SEKME.some(([k]) => k === sekme) ? sekme : 'ozet';
  // Sekmeler üç grupta: önce grup, altında o grubun sekmeleri
  const grup = YON_GRUP.find(([, l]) => l.includes(sekme)) || YON_GRUP[0];
  const sek = (k) => YON_SEKME.find(([x]) => x === k);
  app.innerHTML = ustBar('Yönetim') + `<div class="ic">
    <div class="segment yon-grup">${YON_GRUP.map(([ad, l]) => `<button class="${ad === grup[0] ? 'secili' : ''}" data-yg="${l[0]}">${ad}</button>`).join('')}</div>
    <div class="ciplar">${grup[1].filter(sek).map((k) => { const [, ik, ad] = sek(k); return `<a class="cip ${k === sekme ? 'secili' : ''}" href="#/yonetim/${k}">${ic(ik, 16)}${ad}${k === 'satis' && YON_BEKLEYEN ? ` <span class="rozet" style="position:static">${YON_BEKLEYEN}</span>` : ''}</a>`; }).join('')}</div>
    <div id="yonIc"><div class="bos">Yükleniyor…</div></div></div>`;
  navCiz('hesap');
  app.querySelectorAll('[data-yg]').forEach((b) => (b.onclick = () => git('#/yonetim/' + b.dataset.yg)));
  const el = $('#yonIc');
  try { await YON[sekme](el); } catch (x) { console.error(x); el.innerHTML = bosDurum('uyari', 'Yüklenemedi', kac(hataMetni(x))); }
};

const YON = {};

YON.ozet = async (el) => {
  const [st, l, dopBek] = await Promise.all([istatistik(), uyeler(''), sb.from('doping_satislari').select('id', { head: true, count: 'exact' }).eq('durum', 'bekliyor').then((r) => r.count || 0).catch(() => 0)]);
  const gun = 86400000, simdi = Date.now();
  const yeni7 = l.filter((u) => simdi - u.kayit < 7 * gun).length, aktif7 = l.filter((u) => u.son_giris && simdi - u.son_giris < 7 * gun).length;
  const toplamKredi = l.reduce((t, u) => t + (u.kredi || 0), 0), rapor = l.reduce((t, u) => t + u.rapor, 0);
  const k = (ik, b, a, h, renk) => `<a class="yon-k ${renk}" href="${h || '#/yonetim/ozet'}"><span>${ic(ik, 18)}</span><b>${b}</b><small>${a}</small></a>`;
  const test = S.ilanlar.filter((i) => i.ornek).length;
  const uyari = [st.sikayet ? [`${st.sikayet} açık şikayet`, '#/yonetim/sikayet'] : null, YON_BEKLEYEN ? [`${YON_BEKLEYEN} kredi talebi`, '#/yonetim/satis'] : null, dopBek ? [`${dopBek} doping talebi`, '#/yonetim/doping'] : null, test ? [`${test} test ilanı yayında`, '#/yonetim/ozet'] : null].filter(Boolean);
  el.innerHTML = `${uyari.length ? `<div class="yon-uyari">${uyari.map(([m, h]) => `<a href="${h}">${ic('uyari', 15)}${m}</a>`).join('')}</div>` : ''}
    <div class="bolum-bas"><h2>Üyeler</h2></div>
    <div class="yon-izgara">${k('kisi', st.uye, 'Toplam üye', '#/yonetim/uyeler', 'p2')}${k('davet', yeni7, 'Yeni (7 gün)', '#/yonetim/uyeler', 'p3')}${k('goz', aktif7, 'Aktif (7 gün)', '#/yonetim/uyeler', 'p4')}</div>
    <div class="bolum-bas"><h2>İlanlar</h2></div>
    <div class="yon-izgara">${k('ev', st.yayinda, 'Yayında ilan', '#/', 'p2')}${k('tik', st.satildi, 'Satılan ilan', '#/', 'p3')}${k('bayrak', st.sikayet, 'Açık şikayet', '#/yonetim/sikayet', 'p1')}</div>
    <div class="bolum-bas"><h2>Kredi ve rapor</h2></div>
    <div class="yon-izgara">${k('kredi', sayiBicim(toplamKredi), 'Toplam kredi', '#/yonetim/kredi', 'p1')}${k('belge', rapor, 'Değer raporu', '#/yonetim/ozet', 'p4')}${k('uyari', test, 'Test ilanı', '#/yonetim/ozet', 'p1')}</div>
    <div class="bolum-bas"><h2>Son üyeler</h2><a href="#/yonetim/uyeler">Tümü</a></div>
    <div class="liste">${l.slice(0, 5).map(uyeSatir).join('') || '<div class="bos">Üye yok</div>'}</div>`;
};

const uyeSatir = (u) => `<a href="#/yonetim/uye?id=${u.id}" style="align-items:center"><div class="avatar" style="width:40px;height:40px;font-size:14px">${basHarf(u.ad || u.eposta)}</div>
  <div class="ara" style="min-width:0"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${kac(u.ad || '—')}</div><div class="k soluk" style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${kac(u.eposta)} · ${new Date(u.kayit).toLocaleDateString('tr-TR')}</div></div>
  <span class="kredi-hap" style="height:28px;padding:0 10px;font-size:12px">${ic('kredi', 13)}${u.kredi}</span></a>`;

YON.uyeler = async (el) => {
  const ciz2 = async (q) => {
    const l = await uyeler(q);
    $('#uyeListe').innerHTML = `<div class="k soluk" style="margin:4px 0 8px">${l.length} üye${q ? ` · “${kac(q)}”` : ''}</div><div class="liste">${l.map(uyeSatir).join('') || '<div class="bos">Sonuç yok</div>'}</div>`;
  };
  el.innerHTML = `<form id="uf" class="satir"><label class="arama-kutu">${ic('ara', 18, 'var(--soluk)')}<input name="q" placeholder="E-posta veya isim ara" aria-label="Üye ara"></label></form><div id="uyeListe"><div class="bos">Yükleniyor…</div></div>`;
  $('#uf').onsubmit = (e) => { e.preventDefault(); ciz2(e.target.q.value.trim()); };
  await ciz2('');
};

EKRAN.yonetimUye = async () => {
  if (girisGerek()) return;
  if (!S.yonetici) { git('#/hesap'); return; }
  const id = sorgu().id;
  app.innerHTML = ustBar('Üye detayı') + `<div class="ic" id="uyeIc"><div class="bos">Yükleniyor…</div></div>`;
  navCiz('hesap');
  try {
    const [l, h] = await Promise.all([uyeler(''), uyeHareketleri(id)]);
    const u = l.find((x) => x.id === id);
    if (!u) { $('#uyeIc').innerHTML = bosDurum('uyari', 'Üye bulunamadı', ''); return; }
    const kutu = (b, a) => `<div><b>${b}</b><span class="k soluk">${a}</span></div>`;
    $('#uyeIc').innerHTML = `<div class="kart satir"><div class="avatar" style="width:52px;height:52px">${basHarf(u.ad || u.eposta)}</div><div class="ara" style="min-width:0"><b style="font-size:16px">${kac(u.ad || '—')}</b><div class="k soluk">${kac(u.eposta)}</div><div class="k soluk">Kayıt: ${tarihSaat(u.kayit)} · ${kac(u.saglayici)}</div><div class="k soluk">Son giriş: ${tarihSaat(u.son_giris)}</div></div></div>
      <div class="istat">${kutu(u.kredi, 'Kredi')}${kutu(u.yayinda + '/' + u.ilan, 'Yayında / ilan')}${kutu(u.rapor, 'Rapor')}</div>
      <div class="istat">${kutu(u.mesaj, 'Mesaj')}${kutu(u.favori, 'Favori')}${kutu(h.filter((x) => x.tur === 'sikayet').length, 'Şikayet')}</div>
      <form class="kart" id="ukf" style="display:flex;flex-direction:column;gap:10px"><h3 style="margin:0">Kredi tanımla</h3>
        <div class="ciplar">${[1, 5, 10, 20].map((n) => `<button type="button" class="cip" data-m="${n}">+${n}</button>`).join('')}<button type="button" class="cip" data-m="-1">−1</button></div>
        <div class="izgara2"><label class="alan">Miktar<input name="m" inputmode="numeric" value="5"></label><label class="alan">Not<input name="a" value="Kredi paketi" maxlength="80"></label></div>
        <button class="btn koyu">Krediyi tanımla</button></form>
      <div class="bolum-bas"><h2 style="font-size:15px">Hareketler</h2></div>
      <div class="liste">${h.map((x) => `<div class="satir" style="padding:10px 14px;border-bottom:1px solid var(--yuzey2);align-items:flex-start">${ic(HAREKET_IKON[x.tur] || 'ok', 18, 'var(--vurgu-koyu)')}<div class="ara"><div style="font-size:13px;font-weight:600">${kac(x.aciklama)}</div><div class="k soluk">${tarihSaat(x.zaman)}</div></div>${x.miktar != null && x.tur === 'kredi' ? `<b style="color:${x.miktar > 0 ? 'var(--guven)' : 'var(--murekkep)'}">${x.miktar > 0 ? '+' : ''}${x.miktar}</b>` : x.miktar != null ? `<span class="k soluk">${tl(x.miktar)}</span>` : ''}</div>`).join('') || '<div class="bos">Hareket yok</div>'}</div>`;
    app.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => ($('[name=m]').value = b.dataset.m)));
    $('#ukf').onsubmit = async (e) => {
      e.preventDefault(); const m = parseInt(e.target.m.value, 10);
      if (!m) return toast('Geçerli bir miktar yaz');
      if (!(await onayla('Kredi tanımla', `${u.ad || u.eposta} hesabına ${m > 0 ? '+' : ''}${m} kredi işlenecek.`, 'Onayla'))) return;
      const yeni = await dene(() => krediYukleId(u.id, m, e.target.a.value));
      if (yeni !== false) { toast('Yeni bakiye: ' + yeni); if (u.id === S.oturum) ben().kredi = yeni; ciz(); }
    };
  } catch (x) { $('#uyeIc').innerHTML = bosDurum('uyari', 'Yüklenemedi', kac(hataMetni(x))); }
};

YON.kredi = async (el) => {
  el.innerHTML = `<div class="k soluk" style="line-height:1.5;margin-bottom:8px">Üyeyi e-posta veya isimle bul, sonra kredisini tanımla. Her işlem yönetici adı, miktar ve notla kaydedilir.</div>
    <form id="kaf" class="satir"><label class="arama-kutu">${ic('ara', 18, 'var(--soluk)')}<input name="q" placeholder="E-posta veya isim" aria-label="Kullanıcı bul"></label><button class="btn kucuk">Bul</button></form><div id="kaSonuc" style="margin-top:10px"></div>`;
  $('#kaf').onsubmit = async (e) => {
    e.preventDefault(); const q = e.target.q.value.trim(); if (!q) return;
    const l = await dene(() => uyeler(q)); if (!l) return;
    $('#kaSonuc').innerHTML = l.length ? `<div class="liste">${l.map(uyeSatir).join('')}</div><div class="k soluk" style="margin-top:6px">Üyeye dokun, açılan sayfada kredi tanımla.</div>` : bosDurum('ara', 'Bulunamadı', 'Farklı bir e-posta ya da isim dene.');
  };
};

YON.sikayet = async (el) => {
  const sk = await sikayetleriGetir();
  const gruplar = {};
  sk.forEach((x) => (gruplar[x.ilan] = gruplar[x.ilan] || []).push(x));
  const sirali = Object.entries(gruplar).sort((a, b) => b[1].length - a[1].length);
  const kaldirilan = S.ilanlar.filter((i) => i.durum === 'kaldirildi');
  el.innerHTML = `${sirali.length ? sirali.map(([id, l]) => {
      const i = ilan(id);
      const nedenler = Object.entries(l.reduce((o, x) => ((o[x.neden] = (o[x.neden] || 0) + 1), o), {})).map(([n, c]) => `${kac(n)} (${c})`).join(', ');
      return `<div class="kart" style="display:flex;flex-direction:column;gap:10px;margin-bottom:10px">${i ? ilanSatir(i) : '<div class="soluk">İlan silinmiş</div>'}<div class="k"><b>${l.length} şikayet:</b> ${nedenler}</div>
        <div class="izgara2">${i && i.durum !== 'kaldirildi' ? `<button class="btn tehlike kucuk" data-kaldir="${id}">Yayından kaldır</button>` : `<span class="k soluk" style="align-self:center">Yayında değil</span>`}<button class="btn sade kucuk" data-kapat="${id}">Şikayeti kapat</button></div></div>`;
    }).join('') : bosDurum('tik', 'Açık şikayet yok', 'Kullanıcılar bir ilanı şikayet ettiğinde burada görünür.')}
    ${kaldirilan.length ? `<div class="bolum-bas"><h2 style="font-size:15px">Yayından kaldırılanlar</h2></div>${kaldirilan.map((i) => `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">${ilanSatir(i)}<button class="btn sade kucuk" data-geriAl="${i.id}">Yeniden yayına al</button></div>`).join('')}` : ''}`;
  el.querySelectorAll('[data-kaldir]').forEach((x) => (x.onclick = async () => {
    if (!(await onayla('Yayından kaldırılsın mı?', 'İlan aramalarda ve ilan sayfasında görünmez olur.', 'Kaldır', true))) return;
    if (await dene(async () => { await ilanDurum(ilan(x.dataset.kaldir), 'kaldirildi'); await sikayetKapat(x.dataset.kaldir); }, 'İlan yayından kaldırıldı')) ciz();
  }));
  el.querySelectorAll('[data-kapat]').forEach((x) => (x.onclick = async () => { if (await dene(() => sikayetKapat(x.dataset.kapat), 'Şikayet kapatıldı')) ciz(); }));
  el.querySelectorAll('[data-geriAl]').forEach((x) => (x.onclick = async () => { if (await dene(() => ilanDurum(ilan(x.dataset.geriAl), 'yayinda'), 'İlan yeniden yayında')) ciz(); }));
};

// Emlak ofisi (yetki belgesi) ve ilan (tapu) doğrulama talepleri: belge yönetici tarafından ayrıca kontrol edilir
YON.dogrulama = async (el) => {
  let eidsHtml = '';
  if (await eidsFazGetir() !== 'kapali') {
    const k = await eidsKuyruk();
    if (k.length) {
      await profilleriGetir(k.map((t) => t.sahip));
      const eksik = [...new Set(k.map((t) => t.ilan).filter((id) => id && !ilan(id)))];
      if (eksik.length) (await islem(sb.from('ilanlar').select('*').in('id', eksik))).forEach((r) => S.ilanlar.push(ilanEsle(r)));
      eidsHtml = `<div class="bolum-bas"><h2 style="font-size:15px">EİDS doğrulama kuyruğu · ${k.length}</h2></div><div class="liste">${k.map((t) => { const i = ilan(t.ilan), u = kullanici(t.sahip); return `<div class="oge" style="flex-direction:column;align-items:stretch;gap:6px"><div><b>${t.yontem === 'yetkili' ? 'Yetkili işletme ilanı' : t.yontem === 'hisim' ? 'Eş / hısım ilanı' : 'Sahibinden ilan'}</b> · ${kac(u.ad)}${u.firma ? ' · ' + kac(u.firma) : ''}</div>
        <div class="k soluk">${i ? `<a href="#/ilan/${i.id}">${kac(i.baslik)}</a> · ` : ''}${t.plaka ? `Plaka: <b>${kac(t.plaka)}</b>${t.sasi ? ' · Şasi: <b>' + kac(t.sasi) + '</b>' : ''}` : `Taşınmaz no: <b>${kac(t.tasinmaz_no)}</b>`}${t.yetki_belge_no ? ' · Yetki belge: <b>' + kac(t.yetki_belge_no) + '</b>' : ''} · ${tarihSaat(t.olusturma)}</div>
        <div class="izgara2"><button class="btn sade kucuk" data-eidsred="${t.ilan}">Reddet</button><button class="btn guven kucuk" data-eidsonay="${t.ilan}">Onayla ve yayınla</button></div></div>`; }).join('')}</div>`;
    } else eidsHtml = `<div class="bolum-bas"><h2 style="font-size:15px">EİDS doğrulama kuyruğu</h2></div><div class="k soluk">Bekleyen doğrulama yok.</div>`;
  }
  const l = await dogrulamaTalepleri();
  if (!l.length) { el.innerHTML = eidsHtml + bosDurum('kalkan', 'Bekleyen talep yok', 'Üyeler profilinden ya da ilanından doğrulama istediğinde burada görünür.'); baglaEids(el); return; }
  await profilleriGetir(l.map((t) => t.sahip));
  el.innerHTML = eidsHtml + `<div class="liste">${l.map((t) => { const k = kullanici(t.sahip), i = t.ilan && ilan(t.ilan); return `<div class="oge" style="flex-direction:column;align-items:stretch;gap:6px"><div><b>${t.tur === 'emlakci' ? 'Emlak ofisi' : 'Tapu / ilan'}</b> · ${kac(k.ad)}${k.firma ? ' · ' + kac(k.firma) : ''}</div>
    <div class="k soluk">${t.tur === 'emlakci' ? 'Yetki belgesi no: ' + kac(k.yetkiNo || '—') : i ? `<a href="#/ilan/${i.id}">${kac(i.baslik)}</a>` : 'İlan silinmiş'} · ${tarihSaat(t.olusturma)}${t.notu ? '<br>Not: ' + kac(t.notu) : ''}</div>
    <div class="izgara2"><button class="btn sade kucuk" data-karar="${t.id}" data-onay="0">Reddet</button><button class="btn guven kucuk" data-karar="${t.id}" data-onay="1">Onayla</button></div></div>`; }).join('')}</div>
    <div class="k soluk">Onaylamadan önce belgeyi resmî kaynaktan kontrol et: yetki belgesi → Ticaret Bakanlığı TTBS (ttbs.gtb.gov.tr/BelgeSorgula); tapu → e-Devlet barkodlu belgeyi turkiye.gov.tr/belge-dogrulama'da teyit et (belge yaşı ≤ 30 gün). EİDS: bireyselde malik/hısımlık, yetkilide belge + malikin e-Devlet yetkilendirmesi aranır; onay → ilan yayına çıkar. Ayrıntı: docs/EIDS.md · TAPU-DOGRULAMA.md.</div>`;
  el.querySelectorAll('[data-karar]').forEach((b) => (b.onclick = async () => { if (await dene(() => dogrulamaKarar(b.dataset.karar, b.dataset.onay === '1'), b.dataset.onay === '1' ? 'Onaylandı' : 'Reddedildi')) YON.dogrulama(el); }));
  baglaEids(el);
};
function baglaEids(el) {
  el.querySelectorAll('[data-eidsonay],[data-eidsred]').forEach((b) => (b.onclick = async () => {
    const onay = !!b.dataset.eidsonay;
    if (onay && !(await onayla('EİDS doğrulaması', 'Taşınmaz no ve yöntem resmî kayıtlardan (tapu/e-Devlet, gerekiyorsa TTBS + malik yetkilendirmesi) kontrol edildi mi? Onaylanan ilan yayına çıkar.', 'Evet, kontrol ettim — onayla'))) return;
    await dene(() => eidsKarar(b.dataset.eidsonay || b.dataset.eidsred, onay, onay ? 'Yönetici resmî sorgu teyidi (manuel faz)' : null), onay ? 'Onaylandı — ilan yayında' : 'Reddedildi — ilan kaldırıldı');
    YON.dogrulama(el);
  }));
}

YON.vitrin = async (el) => {
  const V = S.AYARLAR.vitrinler || vitrinAyar();
  const aciklama = { onecikan: 'Dopingteki ilanlar başta; sonra doğrulanmış ve zengin fotoğraflılar', firsat: 'Fiyatı en az %7 düşürülmüş ilanlar', dusen: 'Fiyatı düşen tüm ilanlar', proje: '"Proje adı" işaretli ilanlar' };
  const satir = (k, i) => { const a = V.aktif[k] !== false; return `<div class="kart satir" data-vk="${k}"><button class="btn sade kucuk" data-yuk="${k}" ${i ? '' : 'disabled'}>↑</button><button class="btn sade kucuk" data-asagI="${k}" ${i === V.sira.length - 1 ? '' : 'disabled'}>↓</button><div class="ara"><b>${kac(V.ad[k] || k)}</b><div class="k soluk">${aciklama[k] || ''}</div></div><button class="btn ${a ? 'guven' : 'sade'} kucuk" data-cevir="${k}">${a ? 'Açık' : 'Kapalı'}</button></div>`;
  };
  el.innerHTML = `${V.sira.map((k, i) => satir(k, i)).join('')}<div class="k soluk" style="margin-top:8px">Sıra ve görünürlük bu cihazda anında geçerli olur; tüm kullanıcılara yayılması ayarlar tablosu migration'ının uygulanmasına bağlıdır (MODULLER-12-16.md).</div>`;
  const kaydet = () => { S.AYARLAR.vitrinler = V; try { localStorage.setItem('vitrin_ayarlari', JSON.stringify(V)); } catch (_) {} };
  el.querySelectorAll('[data-yuk]').forEach((b) => (b.onclick = () => { const i = V.sira.indexOf(b.dataset.yuk); if (i > 0) { V.sira.splice(i - 1, 0, V.sira.splice(i, 1)[0]); kaydet(); YON.vitrin(el); } }));
  el.querySelectorAll('[data-asagI]').forEach((b) => (b.onclick = () => { const i = V.sira.indexOf(b.dataset.asagi); if (i < V.sira.length - 1) { V.sira.splice(i + 1, 0, V.sira.splice(i, 1)[0]); kaydet(); YON.vitrin(el); } }));
  el.querySelectorAll('[data-cevir]').forEach((b) => (b.onclick = () => { const k = b.dataset.cevir; V.aktif[k] = V.aktif[k] === false; kaydet(); YON.vitrin(el); }));
};

YON.bolge = async (el) => {
  el.innerHTML = `<form class="kart" id="bf" style="display:flex;flex-direction:column;gap:10px"><h3 style="margin:0">Bölge verisi (TÜİK)</h3>
    <div class="k soluk">Rapordaki demografik ve sosyal yapı bölümü buradan beslenir. Yalnız resmî kaynaktaki değerleri gir; ilçe boşsa il geneli sayılır.</div>
    <div class="izgara3"><label class="alan">İl<select name="il" required>${ILLER.map((x) => `<option>${x}</option>`).join('')}</select></label><label class="alan">İlçe<input name="ilce"></label><label class="alan">Yıl<input name="yil" inputmode="numeric" value="${new Date().getFullYear() - 1}"></label></div>
    <label class="alan">Kaynak<input name="kaynak" value="TÜİK Adrese Dayalı Nüfus Kayıt Sistemi" required></label>
    <div class="izgara3"><label class="alan">Nüfus<input name="nufus" inputmode="numeric"></label><label class="alan">Yaş ortancası<input name="yas_ortanca" inputmode="decimal"></label><label class="alan">Erkek %<input name="erkek_orani" inputmode="decimal"></label></div>
    <div class="izgara3"><label class="alan">Hane büyüklüğü<input name="hane_buyuklugu" inputmode="decimal"></label><label class="alan">Üniversite %<input name="universite_orani" inputmode="decimal"></label><label class="alan">Okuryazar %<input name="okuryazar_orani" inputmode="decimal"></label></div>
    <div class="k soluk">Yaş grupları (nüfusa oranı, %)</div><div class="izgara2"><label class="alan">0–19 yaş %<input name="yas_0_19" inputmode="decimal"></label><label class="alan">20–39 yaş %<input name="yas_20_39" inputmode="decimal"></label></div><div class="izgara2"><label class="alan">40–59 yaş %<input name="yas_40_59" inputmode="decimal"></label><label class="alan">60+ yaş %<input name="yas_60" inputmode="decimal"></label></div>
    <div class="izgara2"><label class="alan">Nüfus artışı (binde)<input name="nufus_artisi" inputmode="decimal"></label><label class="alan">Not<input name="notlar" maxlength="500"></label></div>
    <button class="btn koyu">Kaydet</button></form>`;
  $('#bf').onsubmit = async (e) => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.target));
    const sayi = (x) => (x === '' || x == null ? null : Number(String(x).replace(',', '.')));
    const r = { il: v.il, ilce: v.ilce.trim(), yil: parseInt(v.yil, 10), kaynak: v.kaynak.trim(), notlar: v.notlar.trim() || null, guncelleme: new Date().toISOString() };
    ['nufus', 'yas_ortanca', 'erkek_orani', 'hane_buyuklugu', 'universite_orani', 'okuryazar_orani', 'nufus_artisi', 'yas_0_19', 'yas_20_39', 'yas_40_59', 'yas_60'].forEach((k) => (r[k] = sayi(v[k])));
    if (!(r.yil > 2000)) return toast('Yılı kontrol et');
    if (await dene(() => bolgeKaydet(r), `${r.ilce ? r.ilce + ', ' : ''}${r.il} (${r.yil}) kaydedildi`)) e.target.reset();
  };
};

YON.secim = async (el) => {
  el.innerHTML = `<form class="kart" id="sf2" style="display:flex;flex-direction:column;gap:10px"><h3 style="margin:0">Seçim sonuçları (YSK)</h3>
    <div class="k soluk">Resmî sonuçları YSK'dan al. Her satıra bir parti: <b>Parti;oran</b> (örn. <code>AK Parti;58,2</code>). İlçe boşsa il geneli sayılır. Aynı il/ilçe/yıl/tür için tekrar kaydedersen güncellenir.</div>
    <div class="izgara3"><label class="alan">İl<select name="il" required>${ILLER.map((x) => `<option>${x}</option>`).join('')}</select></label><label class="alan">İlçe<input name="ilce"></label><label class="alan">Yıl<input name="yil" inputmode="numeric" value="2024"></label></div>
    <label class="alan">Seçim türü<select name="tur"><option>Belediye Başkanlığı</option><option>Belediye Meclis Üyeliği</option><option>Milletvekili</option><option>Cumhurbaşkanlığı</option></select></label>
    <label class="alan">Sonuçlar<textarea name="metin" rows="8" placeholder="AK Parti;58,2&#10;CHP;34,7&#10;Yeniden Refah;2,1"></textarea></label>
    <label class="alan">Kaynak<input name="kaynak" value="YSK"></label>
    <div class="hata-yazi" id="sh2"></div><button class="btn koyu">Kaydet</button></form>`;
  $('#sf2').onsubmit = async (e) => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)), h = $('#sh2'); h.textContent = '';
    const satirlar = v.metin.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => { const m = s.split(/[;\t]/); return { parti: (m[0] || '').trim(), oy_orani: Number(String(m[1] || '').replace('%', '').replace(',', '.').trim()) }; });
    const bozuk = satirlar.filter((s) => !s.parti || isNaN(s.oy_orani) || s.oy_orani < 0 || s.oy_orani > 100);
    if (!satirlar.length) return (h.textContent = 'En az bir satır gir.');
    if (bozuk.length) return (h.textContent = 'Hatalı satır: ' + bozuk.map((b) => b.parti || '?').join(', '));
    const toplam = satirlar.reduce((t, s) => t + s.oy_orani, 0);
    if (toplam > 101) return (h.textContent = `Oranların toplamı %${toplam.toFixed(1)}; %100'ü geçmemeli.`);
    const yil = parseInt(v.yil, 10);
    if (await dene(() => secimKaydet(satirlar.map((s) => ({ il: v.il, ilce: v.ilce.trim(), yil, tur: v.tur, parti: s.parti, oy_orani: s.oy_orani, kaynak: v.kaynak.trim() || 'YSK' }))), `${satirlar.length} parti kaydedildi`)) e.target.metin.value = '';
  };
};
const GOSTERGE_ONERI = [['Konut fiyat endeksi', 'endeks', 'TCMB'], ['Konut fiyat endeksi yıllık değişim', '%', 'TCMB'], ['Konut satış sayısı (aylık)', 'adet', 'TÜİK'], ['İlk el konut satışı (aylık)', 'adet', 'TÜİK'], ['Yapı ruhsatı (daire)', 'adet', 'TÜİK'], ['Yapı kullanma izni (daire)', 'adet', 'TÜİK'], ['Deprem tehlikesi PGA (475 yıl)', 'g', 'AFAD'], ['En yakın diri fay uzaklığı', 'km', 'MTA'], ['LGS ortalama puanı', 'puan', 'MEB'], ['Riskli alan ilanı', 'var=1 / yok=0', 'ÇŞİDB']];
YON.gosterge = async (el) => {
  el.innerHTML = `<form class="kart" id="gf" style="display:flex;flex-direction:column;gap:10px"><h3 style="margin:0">Resmî gösterge ekle</h3>
    <div class="k soluk">TCMB konut fiyat endeksi, TÜİK konut satışları ve yapı izinleri, AFAD deprem tehlikesi, MEB puanları gibi resmî rakamlar. Raporda "Resmî Göstergeler" tablosunda kaynak ve dönemle görünür. İlçe boşsa il geneli.</div>
    <div class="izgara3"><label class="alan">İl<select name="il" required>${ILLER.map((x) => `<option>${x}</option>`).join('')}</select></label><label class="alan">İlçe<input name="ilce"></label><label class="alan">Dönem<input name="donem" placeholder="2026-09" required></label></div>
    <label class="alan">Gösterge<input name="gosterge" list="gl" required><datalist id="gl">${GOSTERGE_ONERI.map(([a]) => `<option value="${a}">`).join('')}</datalist></label>
    <div class="izgara3"><label class="alan">Değer<input name="deger" inputmode="decimal" required></label><label class="alan">Birim<input name="birim"></label><label class="alan">Kaynak<input name="kaynak" required></label></div>
    <button class="btn koyu">Kaydet</button></form>`;
  const gi = $('[name=gosterge]'); gi.onchange = () => { const o = GOSTERGE_ONERI.find(([a]) => a === gi.value); if (o) { $('[name=birim]').value = o[1]; $('[name=kaynak]').value = o[2]; } };
  $('#gf').onsubmit = async (e) => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); const d = Number(String(v.deger).replace(',', '.'));
    if (isNaN(d)) return toast('Değer sayı olmalı');
    const r = { il: v.il, ilce: v.ilce.trim(), donem: v.donem.trim(), gosterge: v.gosterge.trim(), deger: d, birim: v.birim.trim() || null, kaynak: v.kaynak.trim(), guncelleme: new Date().toISOString() };
    if (await dene(() => gostergeKaydet(r), 'Gösterge kaydedildi')) { e.target.deger.value = ''; }
  };
};

// FAZ 4 — Doping: satın alma talepleri (onaylayınca başlar), aktifler, ücretsiz başlatma ve paket/fiyat yönetimi.
let YON_DOP_BEK = 0;
YON.doping = async (el) => {
  const [talepler, akt, paketler] = await Promise.all([
    dopingTaleplerGetir(),
    sb.from('ilan_doping').select('*').eq('durum', 'aktif').order('bitis').then((r) => r.data || []),
    sb.from('doping_paketleri').select('*').order('sira').then((r) => r.data || [])
  ]);
  YON_DOP_BEK = talepler.length;
  const tAd = (k) => (S.DOPING.turler[k] || {}).ad || k;
  const yayinla = (id) => { const i = ilan(id); return i ? `<a href="#/ilan/${i.id}">${kac(i.baslik)}</a>` : '<span class="soluk">İlan silinmiş</span>'; };
  el.innerHTML = `
    <div class="bolum-bas"><h2 style="font-size:15px">Bekleyen talepler</h2></div>
    ${talepler.length ? `<div class="liste">${talepler.map((t) => { const k = kullanici(t.kullanici); return `<div class="oge" style="flex-direction:column;align-items:stretch;gap:6px">
      <div><b>${tAd(paketler.find((p) => p.id === t.paket)?.tur)} · ${kac(t.paket)}</b> · ${tl(t.tutar)} · ${kac(k ? k.ad : 'Üye')} · ${tarihSaat(t.olusturma)}</div>
      <div class="k soluk">${yayinla(t.ilan)}</div>
      <div class="izgara2"><button class="btn sade kucuk" data-red="${t.id}">Reddet</button><button class="btn guven kucuk" data-onay="${t.id}" data-ilan="${t.ilan}" data-paket="${t.paket}">Onayla ve başlat</button></div></div>`; }).join('')}</div>` : '<div class="bos">Bekleyen doping talebi yok</div>'}
    <div class="bolum-bas"><h2 style="font-size:15px">Dopingte olan ilanlar</h2></div>
    ${akt.length ? `<div class="liste">${akt.map((d) => `<div class="oge" style="align-items:center">${d.anlik ? '' : ''}<div class="ara" style="min-width:0"><div>${yayinla(d.ilan)}</div><div class="k soluk">${tAd(d.tur)} · bitiş ${tarihSaat(d.bitis)}${d.anlik ? ` · başlangıçta ${d.anlik.g || 0} görüntülenme` : ''}</div></div><button class="btn sade kucuk" data-bitir="${d.id}">Bitir</button></div>`).join('')}</div>` : '<div class="bos">Şu anda dopingte ilan yok</div>'}
    <form class="kart" id="df" style="display:flex;flex-direction:column;gap:10px"><h3 style="margin:0">Ücretsiz başlat (deneme / hediye)</h3>
      <div class="k soluk">Satın alma olmadan yönetici olarak başlatır; rozet ve sıralama avantajı anında devreye girer.</div>
      <label class="alan">İlan<select name="ilan" required>${S.ilanlar.filter((x) => x.durum === 'yayinda').slice(0, 300).map((x) => `<option value="${x.id}">${kac(x.baslik)} — ${kac(x.il)}</option>`).join('')}</select></label>
      <label class="alan">Paket<select name="paket" required>${paketler.map((p) => `<option value="${p.id}">${tAd(p.tur)} · ${p.gun} gün${p.aktif ? '' : ' (satışta değil)'}</option>`).join('')}</select></label>
      <button class="btn koyu">Dopingi başlat</button></form>
    <div class="bolum-bas"><h2 style="font-size:15px">Paketler ve fiyatlar</h2></div>
    <div class="k soluk" style="margin-bottom:6px">Fiyatı girip "Satışta"yı açtığın an kullanıcılar o paketi görebilir. İndirim istersen oran ve son tarihi doldur.</div>
    ${paketler.map((p) => `<form class="kart" data-pk="${p.id}" style="display:flex;flex-direction:column;gap:8px">
      <b style="font-size:13.5px">${tAd(p.tur)} · ${p.gun} gün <span class="k soluk">(${p.id}${p.play_urun ? ' · Play: ' + kac(p.play_urun) : ' · Play ürünü yok'})</span></b>
      <div class="izgara3"><label class="alan">Fiyat (TL)<input name="fiyat" inputmode="decimal" value="${+p.fiyat || ''}" placeholder="0"></label>
      <label class="alan">İndirim %<input name="indirim" inputmode="decimal" value="${p.indirim_orani != null ? +p.indirim_orani * 100 : ''}"></label>
      <label class="alan">Kampanya bitiş<input name="gecerlilik" type="date" value="${p.gecerlilik || ''}"></label></div>
      <div class="izgara2"><button class="btn ${p.aktif ? 'guven' : 'sade'} kucuk" type="button" data-togglesat>${p.aktif ? 'Satışta ✓' : 'Satışta değil'}</button><button class="btn koyu kucuk">Kaydet</button></div></form>`).join('')}`;
  el.querySelectorAll('[data-onay]').forEach((b) => (b.onclick = async () => {
    if (await dene(() => dopingBaslat(b.dataset.ilan, b.dataset.paket, b.dataset.onay), 'Doping başlatıldı — rozet ve sıra avantajı aktif')) YON.doping(el);
  }));
  el.querySelectorAll('[data-red]').forEach((b) => (b.onclick = async () => { if (await dene(() => dopingTalepRed(b.dataset.red), 'Talep reddedildi')) YON.doping(el); }));
  el.querySelectorAll('[data-bitir]').forEach((b) => (b.onclick = async () => { if (await dene(() => dopingBitir(b.dataset.bitir), 'Doping sonlandırıldı')) { await dopingYukle(); ciz(); } YON.doping(el); }));
  $('#df').onsubmit = async (e) => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.target));
    if (await dene(() => dopingBaslat(v.ilan, v.paket), 'Doping başlatıldı')) { await dopingYukle(); ciz(); }
  };
  el.querySelectorAll('[data-pk]').forEach((f) => {
    const id = f.dataset.pk, kaydet = async (aktif) => {
      const v = Object.fromEntries(new FormData(f));
      const ind = v.indirim === '' ? null : Math.min(0.95, Math.max(0, +v.indirim / 100));
      const fiyat = v.fiyat === '' ? 0 : +v.fiyat;
      if (isNaN(fiyat) || fiyat < 0) return toast('Fiyatı kontrol et');
      const g = { fiyat, indirim_orani: ind, gecerlilik: v.gecerlilik || null, ...(aktif != null ? { aktif } : {}) };
      if (await dene(() => islem(sb.from('doping_paketleri').update(g).eq('id', id)), 'Paket güncellendi')) YON.doping(el);
    };
    f.onsubmit = (e) => { e.preventDefault(); kaydet(null); };
    f.querySelector('[data-togglesat]').onclick = () => kaydet(!f.querySelector('[data-togglesat]').textContent.includes('✓'));
  });
};