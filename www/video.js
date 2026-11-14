// MülkümVideo (ücretli): ilan fotoğrafından yapay zekâ ile drone görünümlü video ya da hareketli tanıtım videosu.
// Üretim sunucuda (mulkum-ai: video_baslat / video_durum) async yürür; işler video_isleri tablosunda durur, ekran kapansa da kaybolmaz.
const VIDEO_TUR = {
  drone: { ad: 'MülkümVideo Drone', kisa: 'Drone', aciklama: 'Dış cephe fotoğrafından havadan çekilmiş gibi, yükselen ve binanın çevresinde dönen video', kredi: 3 },
  video: { ad: 'MülkümVideo Tanıtım', kisa: 'Video', aciklama: 'Oda ya da dış cephe fotoğrafını kameranın yavaşça ilerlediği kısa bir videoya çevirir', kredi: 3 },
  tur: { ad: 'MülkümVideo Çok Odalı Tur', kisa: 'Tur', aciklama: 'Seçtiğin 3 ya da 6 fotoğrafı 5 saniyelik kliplere çevirir ve sırayla oynatır', kredi: 9 }
};
const VIDEO_BEKLE = new Map(); // iş id → zamanlayıcı

async function videoCagir(gorev, govde) {
  const { data, error } = await sb.functions.invoke('mulkum-ai', { body: { gorev, ...govde } });
  if (error) { let j = {}; try { j = await error.context.json(); } catch (_) {} const b = ben(); if (b && j.kredi != null) b.kredi = j.kredi; throw new Error(j.hata || 'Video işlemi yapılamadı.'); }
  const b = ben(); if (b && data && data.kredi != null) b.kredi = data.kredi;
  return data;
}
async function videoListesiKaydet(i, liste) {
  const alanlar = { ...(i.alanlar || {}), videolar: liste };
  await islem(sb.from('ilanlar').update({ alanlar }).eq('id', i.id));
  i.alanlar = alanlar;
}

// İlan sayfası kartı (#videoK): ilandaki videolar herkese; üretim düğmesi ve işler yalnız ilan sahibine
async function videoKartiYukle(i) {
  const kap = document.getElementById('videoK'); if (!kap) return;
  const sahip = ben() && i.sahip === ben().id;
  const videolar = (i.alanlar && i.alanlar.videolar) || [];
  let isler = [];
  if (sahip) { try { const { data } = await sb.from('video_isleri').select('*').eq('ilan', i.id).order('olusturma', { ascending: false }).limit(10); isler = data || []; } catch (_) {} }
  if (!document.body.contains(kap)) return;
  const ekli = new Set(videolar.map((v) => v.url));
  const klipler = klipListe;
  const oynat = (v) => { const l = klipler(v); return `<video src="${kac(l[0] || v.url)}" poster="${kac(v.kaynak || '')}"${l.length > 1 ? ` data-liste="${kac(JSON.stringify(l))}"${v.ses ? ` data-ses="${kac(v.ses)}"` : ''}` : ''} controls playsinline preload="metadata" style="width:100%;border-radius:12px;background:#000;display:block"></video>`; };
  const bekleyen = isler.filter((x) => x.durum === 'bekliyor');
  const hazirEklenmemis = isler.filter((x) => x.durum === 'hazir' && !ekli.has(x.url));
  const sonHata = isler.find((x) => x.durum === 'hata' && Date.now() - new Date(x.olusturma).getTime() < 3600000);
  if (!videolar.length && !sahip) { kap.remove(); return; }
  const yalnizDugme = !videolar.length && !bekleyen.length && !hazirEklenmemis.length && !sonHata;
  kap.className = yalnizDugme ? '' : 'kart';
  const dugme = yalnizDugme
    ? `<button class="kart satir" id="videoAc" style="text-align:left;width:100%;font:inherit;color:inherit;cursor:pointer">${ic('foto', 22, 'var(--vurgu-ikon)')}<div class="ara"><b>${i.ana === 'emlak' ? 'MülkümVideo: drone ve tanıtım videosu' : 'MülkümVideo: araç tanıtım videosu'}</b><div class="k soluk">Ücretsiz fotoğraf turu, yapay zekâ videosu${i.ana === 'emlak' ? ', drone görünümü' : ''} ve çok odalı tur</div></div><span class="ok">›</span></button>`
    : `<button class="btn cizgili tam" id="videoAc" style="margin-top:10px">${ic('foto', 18)}Yeni video oluştur</button>`;
  kap.innerHTML =`${videolar.length ? `<h3>Videolar</h3>${videolar.map((v, n) => `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">${oynat(v)}<div class="satir k soluk"><span class="ara">${kac((VIDEO_TUR[v.tur] || VIDEO_TUR.video).ad)} · yapay zekâ ile oluşturuldu</span>${sahip ? `<button class="btn sade" data-vkaldir="${n}">İlandan kaldır</button>` : ''}</div>${sahip && klipler(v).length > 1 ? `<button class="btn cizgili tam" data-vtek="${n}">${ic('indir', 18)}Tek video olarak kaydet</button>` : ''}</div>`).join('')}
    <div class="k soluk">Videolar ilan fotoğrafından yapay zekâyla üretildi; gerçeği birebir yansıtmayabilir.</div>` : ''}
    ${bekleyen.map((x) => `<div class="bilgi-k" style="margin-top:8px">${ic('yildiz', 18)}<div><b>${VIDEO_TUR[x.tur].ad} hazırlanıyor…</b><br>Genelde ${x.tur === 'tur' ? '3-10' : '1-3'} dakika sürür. Bu sayfadan çıkabilirsin; video hazır olunca burada görünür.</div></div>`).join('')}
    ${hazirEklenmemis.map((x) => `<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px"><b>${VIDEO_TUR[x.tur].ad} hazır</b>${oynat(x)}<button class="btn tam" data-vekle="${x.id}">İlana ekle</button></div>`).join('')}
    ${sonHata && !bekleyen.length ? `<div class="k soluk" style="margin-top:8px">Son video oluşturulamadı; kredin iade edildi.</div>` : ''}
    ${sahip ? dugme : ''}
`;
  kap.querySelectorAll('[data-vkaldir]').forEach((b) => (b.onclick = async () => {
    if (await dene(() => videoListesiKaydet(i, videolar.filter((_, n) => n !== +b.dataset.vkaldir)), 'Video ilandan kaldırıldı')) videoKartiYukle(i);
  }));
  kap.querySelectorAll('[data-vekle]').forEach((b) => (b.onclick = async () => {
    const x = isler.find((y) => y.id === b.dataset.vekle);
    if (await dene(() => videoListesiKaydet(i, [...videolar, { url: x.url, tur: x.tur, kaynak: x.kaynak, ...(klipler(x).length > 1 ? { parcalar: klipler(x) } : {}), ...(x.ses ? { ses: x.ses } : {}) }].slice(-6)), 'Video ilana eklendi')) videoKartiYukle(i);
  }));
  videoListeBagla(kap);
  const ac = kap.querySelector('#videoAc'); if (ac) ac.onclick = () => videoSheet(i);
  kap.querySelectorAll('[data-vtek]').forEach((b) => (b.onclick = () => tekVideoSheet(i, videolar[+b.dataset.vtek])));
  bekleyen.forEach((x) => videoTakip(x.id, i));
}

// Bekleyen işi 8 sn'de bir sorar; bitince kartı yeniler
function videoTakip(id, i) {
  if (VIDEO_BEKLE.has(id)) return;
  const sor = async () => {
    let d = null; try { d = await videoCagir('video_durum', { id }); } catch (_) {}
    if (d && d.durum && d.durum !== 'bekliyor') {
      VIDEO_BEKLE.delete(id);
      toast(d.durum === 'hazir' ? 'Videon hazır' : (d.hata || 'Video oluşturulamadı'));
      if (document.getElementById('videoK')) videoKartiYukle(i);
      return;
    }
    VIDEO_BEKLE.set(id, setTimeout(sor, 8000));
  };
  VIDEO_BEKLE.set(id, setTimeout(sor, 6000));
}

// ---------- Fotoğraf Turu (ücretsiz, 14.3): ilan fotoğraflarından telefonda üretilen tanıtım videosu ----------
// Sunucu ve kredi kullanmaz. Fotoğraflar yavaş yakınlaşma ve geçişle akar; üstte fiyat, özet, konum ve Mülküm360 imzası durur.
// Kayıt gerçek zamanlıdır (15 sn'lik video 15 sn'de hazırlanır). Görüntü değiştirilmez: yapay zekâ notu gerekmez.
const TUR_SURE = [15, 30, 45];
const TUR_KAPANIS = 2.4, TUR_EN_AZ = 2.4;
const turMime = () => ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  .find((m) => { try { return window.MediaRecorder && MediaRecorder.isTypeSupported(m); } catch (_) { return false; } }) || '';
const turAdet = (i, sure) => Math.max(1, Math.min(i.fotolar.length, Math.floor((sure - TUR_KAPANIS) / TUR_EN_AZ)));
const turYaziKes = (c, yazi, en) => { let s = String(yazi || ''); if (c.measureText(s).width <= en) return s; while (s.length > 3 && c.measureText(s + '…').width > en) s = s.slice(0, -1); return s.trim() + '…'; };

async function turUret(i, s, ilerleme) {
  const mime = turMime(); if (!mime) throw new Error('Bu telefon video kaydını desteklemiyor.');
  const dikey = s.oran === '9:16', W = dikey ? 720 : 1280, H = dikey ? 1280 : 720;
  const f = i.alanlar || {}, GECIS = 0.6;
  const adet = turAdet(i, s.sure), resimler = [];
  for (const u of i.fotolar.slice(0, adet)) {
    try { const b = await (await fetch(u)).blob(); resimler.push(await createImageBitmap(b)); } catch (_) {}
    ilerleme('Fotoğraflar hazırlanıyor ' + resimler.length + '/' + adet);
  }
  if (!resimler.length) throw new Error('Fotoğraflar okunamadı.');
  const her = (s.sure - TUR_KAPANIS) / resimler.length;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const YAZI = '"Inter","Segoe UI",system-ui,sans-serif';
  const kiralik = i.ana === 'emlak' && f.islem === 'Kiralık';
  const fiyat = i.fiyat ? tl(i.fiyat) + (kiralik ? ' / ay' : '') : '';
  const ozet = (i.ana === 'emlak' ? [f.islem, f.oda, f.m2net && f.m2net + ' m²'] : [f.yil, f.km != null && f.km !== '' && sayiBicim(f.km) + ' km', f.vites]).filter(Boolean).join(' · ');
  const yer = [f.mahalle && f.mahalle + ' Mah.', i.ilce, i.il].filter(Boolean).join(', ');
  const kapla = (im, olcek, kx, alfa) => {
    const o = Math.max(W / im.width, H / im.height) * olcek, w = im.width * o, h = im.height * o;
    c.globalAlpha = alfa; c.drawImage(im, (W - w) / 2 + kx * (w - W) / 2, (H - h) / 2, w, h); c.globalAlpha = 1;
  };
  const kare = (t) => {
    c.fillStyle = '#0b0f17'; c.fillRect(0, 0, W, H);
    const tFoto = Math.min(t, s.sure - TUR_KAPANIS - 0.001), n = Math.min(resimler.length - 1, Math.floor(tFoto / her)), icSn = tFoto - n * her;
    const fotoCiz = (k, sn, alfa) => { const p = Math.min(1, Math.max(0, sn / (her + GECIS))), yon = k % 2 ? -1 : 1; kapla(resimler[k], 1.06 + 0.1 * p, yon * (p - 0.5) * 0.9, alfa); };
    fotoCiz(n, icSn, 1);
    if (n + 1 < resimler.length && icSn > her - GECIS) fotoCiz(n + 1, icSn - her, (icSn - (her - GECIS)) / GECIS);
    // Alt bilgi şeridi
    const ust = H * (dikey ? 0.6 : 0.5), g = c.createLinearGradient(0, ust, 0, H);
    g.addColorStop(0, 'rgba(6,10,18,0)'); g.addColorStop(1, 'rgba(6,10,18,.88)');
    c.fillStyle = g; c.fillRect(0, ust, W, H - ust);
    const k = dikey ? 44 : 56, en = W - 2 * k; let y = H - (dikey ? 96 : 54);
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    if (yer) { c.font = '500 ' + (dikey ? 26 : 24) + 'px ' + YAZI; c.fillStyle = 'rgba(255,255,255,.82)'; c.fillText(turYaziKes(c, yer, en), k, y); y -= dikey ? 40 : 36; }
    if (ozet) { c.font = '600 ' + (dikey ? 30 : 28) + 'px ' + YAZI; c.fillStyle = '#fff'; c.fillText(turYaziKes(c, ozet, en), k, y); y -= dikey ? 58 : 52; }
    if (fiyat) { c.font = '800 ' + (dikey ? 58 : 54) + 'px ' + YAZI; c.fillStyle = '#fff'; c.fillText(fiyat, k, y); }
    // İmza ve sayaç
    c.font = '800 ' + (dikey ? 26 : 24) + 'px ' + YAZI;
    const imza = 'Mülküm360', iw = c.measureText(imza).width + 28;
    c.fillStyle = 'rgba(6,10,18,.55)'; c.beginPath(); c.roundRect(k - 6, k - 6, iw, 44, 12); c.fill();
    c.fillStyle = '#fff'; c.fillText(imza, k + 8, k + 25);
    c.font = '600 20px ' + YAZI; c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,.8)'; c.fillText((n + 1) + ' / ' + resimler.length, W - k, k + 22);
    // Kapanış kartı
    const kt = t - (s.sure - TUR_KAPANIS);
    if (kt > 0) {
      const a = Math.min(1, kt / 0.5);
      c.fillStyle = 'rgba(6,10,18,' + (a * 0.9) + ')'; c.fillRect(0, 0, W, H);
      c.globalAlpha = a; c.textAlign = 'center'; c.fillStyle = '#fff';
      if (fiyat) { c.font = '800 ' + (dikey ? 64 : 60) + 'px ' + YAZI; c.fillText(fiyat, W / 2, H / 2 - 30); }
      c.font = '600 ' + (dikey ? 32 : 30) + 'px ' + YAZI; c.fillText(turYaziKes(c, i.baslik || '', W - 2 * k), W / 2, H / 2 + 34);
      c.font = '500 ' + (dikey ? 28 : 26) + 'px ' + YAZI; c.fillStyle = 'rgba(255,255,255,.8)';
      c.fillText('Mülküm360' + (i.no ? ' · ilan no ' + i.no : ''), W / 2, H / 2 + 92);
      c.globalAlpha = 1;
    }
  };
  kare(0);
  const akis = cv.captureStream(30), parcalar = [];
  const kaydedici = new MediaRecorder(akis, { mimeType: mime, videoBitsPerSecond: 4500000 });
  kaydedici.ondataavailable = (e) => { if (e.data && e.data.size) parcalar.push(e.data); };
  const bitti = new Promise((ok, no) => { kaydedici.onstop = ok; kaydedici.onerror = (e) => no(e.error || new Error('Kayıt yapılamadı')); });
  kaydedici.start(500);
  const t0 = performance.now();
  await new Promise((ok) => {
    const adim = () => {
      const t = (performance.now() - t0) / 1000;
      if (s.iptal || t >= s.sure) return ok();
      kare(t); ilerleme('Video hazırlanıyor %' + Math.round(t / s.sure * 100));
      setTimeout(adim, 33);   // rAF değil: uygulama arka plana geçerse rAF durur ve kayıt hiç bitmez
    };
    adim();
  });
  kaydedici.stop(); await bitti;
  akis.getTracks().forEach((x) => x.stop()); resimler.forEach((r) => r.close && r.close());
  if (s.iptal) throw new Error('İptal edildi');
  const blob = new Blob(parcalar, { type: mime.split(';')[0] });
  if (blob.size < 20000) throw new Error('Video oluşturulamadı.');
  return { blob, uzanti: /mp4/.test(mime) ? 'mp4' : 'webm' };
}

// ---------- Çok odalı tur (krediyle): 3 ya da 6 fotoğrafın her biri 5 sn'lik yapay zekâ klibi olur, sırayla oynar; isteğe bağlı sesli anlatım ----------
const COK_ODA_KREDI = { 3: 9, 6: 15 };
const klipListe = (v) => ((v && v.parcalar) || []).map((p) => (typeof p === 'string' ? p : p && p.url)).filter(Boolean);

// Klip listesi olan <video>'lar: biri bitince sıradaki başlar; sonuncudan sonra başa döner ve durur. Anlatım sesi videoyla birlikte çalar.
function videoListeBagla(kok) {
  kok.querySelectorAll('video[data-liste]').forEach((v) => {
    let l = []; try { l = JSON.parse(v.dataset.liste); } catch (_) {}
    if (l.length < 2) return;
    let n = 0; const ses = v.dataset.ses ? new Audio(v.dataset.ses) : null;
    v.onended = () => { n = (n + 1) % l.length; v.src = l[n]; if (n) v.play().catch(() => {}); else if (ses) { ses.pause(); ses.currentTime = 0; } };
    if (ses) {
      v.onplay = () => { if (n === 0 && v.currentTime < 0.4) ses.currentTime = 0; ses.play().catch(() => {}); };
      v.onpause = () => { if (!v.ended) ses.pause(); };
    }
  });
}

// Tur kliplerini (ve varsa anlatım sesini) telefonda tek video dosyasına çevirir. Kayıt gerçek zamanlıdır.
async function tekVideoUret(liste, sesUrl, s, ilerleme) {
  const destek = (m) => { try { return window.MediaRecorder && MediaRecorder.isTypeSupported(m); } catch (_) { return false; } };
  const mime = (sesUrl ? ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'] : []).find(destek) || turMime();
  if (!mime) throw new Error('Bu telefon video kaydını desteklemiyor.');
  const v = document.createElement('video'); v.crossOrigin = 'anonymous'; v.muted = true; v.playsInline = true; v.preload = 'auto';
  const yukle = (u) => new Promise((ok, no) => { v.onloadeddata = () => ok(); v.onerror = () => no(new Error('Klip okunamadı.')); v.src = u; v.load(); });
  ilerleme('Klipler hazırlanıyor…');
  await yukle(liste[0]);
  const W = v.videoWidth || 1280, H = v.videoHeight || 720;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), YAZI = '"Inter","Segoe UI",system-ui,sans-serif', olcek = Math.min(W, H) / 720;
  const akis = cv.captureStream(30);
  let ses = null, ac = null;
  if (sesUrl) {
    try {
      ses = new Audio(); ses.crossOrigin = 'anonymous'; ses.preload = 'auto'; ses.src = sesUrl;
      await new Promise((ok, no) => { ses.oncanplaythrough = ok; ses.onerror = () => no(new Error('ses')); setTimeout(ok, 8000); });
      ac = new (window.AudioContext || window.webkitAudioContext)();
      const hedef = ac.createMediaStreamDestination(); ac.createMediaElementSource(ses).connect(hedef);
      hedef.stream.getAudioTracks().forEach((t) => akis.addTrack(t));
    } catch (_) { ses = null; }
  }
  const kare = () => {
    try { c.drawImage(v, 0, 0, W, H); } catch (_) {}
    c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.font = '800 ' + Math.round(24 * olcek) + 'px ' + YAZI;
    const imza = 'Mülküm360', k = Math.round(28 * olcek), iw = c.measureText(imza).width + 28 * olcek;
    c.fillStyle = 'rgba(6,10,18,.55)'; c.beginPath(); c.roundRect(k, k, iw, 44 * olcek, 12 * olcek); c.fill();
    c.fillStyle = '#fff'; c.fillText(imza, k + 14 * olcek, k + 31 * olcek);
    c.font = '500 ' + Math.round(17 * olcek) + 'px ' + YAZI; c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,.75)';
    c.fillText('Yapay zekâ ile oluşturuldu', W - k, H - k);
  };
  kare();
  const parcalar = [], kaydedici = new MediaRecorder(akis, { mimeType: mime, videoBitsPerSecond: 5000000 });
  kaydedici.ondataavailable = (e) => { if (e.data && e.data.size) parcalar.push(e.data); };
  const bitti = new Promise((ok, no) => { kaydedici.onstop = ok; kaydedici.onerror = (e) => no(e.error || new Error('Kayıt yapılamadı')); });
  let cizim = true; const dongu = () => { if (!cizim) return; kare(); setTimeout(dongu, 33); };
  kaydedici.start(500); dongu();
  try {
    for (let n = 0; n < liste.length; n++) {
      if (s.iptal) break;
      if (n) await yukle(liste[n]);
      ilerleme('Tek video hazırlanıyor ' + (n + 1) + '/' + liste.length);
      await v.play();
      if (!n && ses) ses.play().catch(() => {});
      await new Promise((ok) => { v.onended = ok; setTimeout(ok, ((isFinite(v.duration) ? v.duration : 5) + 4) * 1000); });
    }
  } finally {
    cizim = false; if (ses) ses.pause();
    kaydedici.stop(); await bitti.catch(() => {});
    akis.getTracks().forEach((x) => x.stop()); if (ac) ac.close().catch(() => {});
  }
  if (s.iptal) throw new Error('İptal edildi');
  const blob = new Blob(parcalar, { type: mime.split(';')[0] });
  if (blob.size < 20000) throw new Error('Video oluşturulamadı.');
  return { blob, uzanti: /mp4/.test(mime) ? 'mp4' : 'webm' };
}

// Hazır video dosyası ekranı: izle, telefona kaydet, paylaş (fotoğraf turu ve tek video ortak kullanır)
function videoSonucCiz(el, i, sonuc, baslik, not, geri) {
  const ad = 'mulkum360-ilan-' + (i.no || String(i.id).slice(-6)) + '.' + sonuc.uzanti;
  el.innerHTML = `<h2 style="font-size:19px;font-weight:800">${baslik}</h2>
    <video src="${sonuc.url}" controls playsinline autoplay muted loop style="width:100%;max-height:52vh;border-radius:12px;background:#000;display:block"></video>
    <div class="izgara2"><button class="btn sade" id="tKaydet">${ic('indir', 18)}Telefona Kaydet</button><button class="btn" id="tPaylas">Paylaş</button></div>
    ${geri ? '<button class="btn cizgili tam" id="tYeni">Ayarları değiştir</button>' : ''}
    <div class="k soluk">${not}${sonuc.uzanti === 'webm' ? ' Bu telefon videoyu WebM türünde kaydetti; bazı uygulamalar bu türü kabul etmeyebilir.' : ''}</div>`;
  const P = window.Capacitor?.Plugins, yerli = window.Capacitor?.isNativePlatform?.() && P?.Filesystem;
  const b64 = () => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = no; r.readAsDataURL(sonuc.blob); });
  const indir = () => { const a = document.createElement('a'); a.href = sonuc.url; a.download = ad; a.click(); };
  const paylasV = async () => {
    if (yerli && P.Share) {
      const y = await P.Filesystem.writeFile({ path: ad, data: await b64(), directory: 'CACHE' });
      try { await P.Share.share({ title: i.baslik, files: [y.uri], dialogTitle: 'Videoyu paylaş' }); } catch (p) { if (!/cancel|iptal/i.test(String(p?.message || p))) throw p; }
      return;
    }
    const dosya = new File([sonuc.blob], ad, { type: sonuc.blob.type });
    if (navigator.canShare?.({ files: [dosya] })) { try { await navigator.share({ files: [dosya], title: i.baslik }); } catch (_) {} } else indir();
  };
  el.querySelector('#tPaylas').onclick = () => dene(paylasV);
  el.querySelector('#tKaydet').onclick = async () => {
    if (!yerli) { indir(); return toast('Video indirildi'); }
    try { await P.Filesystem.writeFile({ path: 'Mulkum360/' + ad, data: await b64(), directory: 'DOCUMENTS', recursive: true }); toast('Kaydedildi: Belgeler › Mulkum360 klasörü'); }
    catch (_) { toast('Doğrudan kaydedilemedi. Açılan pencereden Dosyalar ya da Drive seç.'); try { await paylasV(); } catch (__) {} }
  };
  const y = el.querySelector('#tYeni'); if (y) y.onclick = () => { URL.revokeObjectURL(sonuc.url); geri(); };
}

// İlandaki çok odalı turu tek dosya olarak hazırlayıp kaydet / paylaş ekranını açar
function tekVideoSheet(i, v) {
  const s = { iptal: false }, liste = klipListe(v);
  sheetAc('<div id="tekS" style="display:flex;flex-direction:column;gap:12px"></div>', async (kok) => {
    const el = kok.querySelector('#tekS');
    el.innerHTML = `<h2 style="font-size:19px;font-weight:800">Tek video hazırlanıyor</h2>
      <div class="k soluk">Klipler${v.ses ? ' ve sesli anlatım' : ''} tek dosyada birleştiriliyor. Yaklaşık ${liste.length * 5} saniye sürer; bu sırada ekranı kapatma.</div>
      <div class="bilgi-k">${ic('yildiz', 18)}<div id="tekDurum">Başlıyor…</div></div>`;
    try {
      const r = await tekVideoUret(liste, v.ses || '', s, (m) => { if (!document.body.contains(el)) s.iptal = true; else el.querySelector('#tekDurum').textContent = m; });
      if (!document.body.contains(el)) return;
      videoSonucCiz(el, i, { ...r, url: URL.createObjectURL(r.blob) }, 'Tek video hazır', 'Video ilan fotoğraflarından yapay zekâ ile üretildi; gerçeği birebir yansıtmayabilir.', null);
      if (typeof kayit === 'function') kayit('tek_video', liste.length + ' klip · ' + r.uzanti + (v.ses ? ' · sesli' : ''));
    } catch (x) { if (document.body.contains(el)) { toast(x.message || 'Video oluşturulamadı'); sheetKapat(); } }
  });
}

// MülkümVideo penceresi (MülkümDeko düzeniyle): tür çipleri, fotoğraf şeridi, seçenek çipleri, düğme, not
function videoSheet(i, ilkTur) {
  const turler = [['foto', 'Fotoğraf turu', 'ücretsiz'], ['video', 'Tanıtım', VIDEO_TUR.video.kredi + ' kredi']];
  if (i.ana === 'emlak') turler.push(['drone', 'Drone', VIDEO_TUR.drone.kredi + ' kredi']);
  if (i.fotolar.length >= 3) turler.push(['tur', 'Çok odalı tur', COK_ODA_KREDI[3] + ' ya da ' + COK_ODA_KREDI[6] + ' kredi']);
  const s = { tur: turler.some((t) => t[0] === ilkTur) ? ilkTur : 'foto', foto: i.fotolar[0], secili: [], oran: '9:16', sure: 15, anlatim: true, sonuc: null, calisiyor: false, iptal: false };
  const ACIKLAMA = {
    foto: 'İlan fotoğraflarından fiyat, özet ve konum yazılı bir tanıtım videosu hazırlar. Ücretsizdir, telefonunda oluşturulur; görüntüler değiştirilmez.',
    video: VIDEO_TUR.video.aciklama + '.',
    drone: VIDEO_TUR.drone.aciklama + '. En iyi sonuç için binanın dışarıdan çekilmiş bir fotoğrafını seç.',
    tur: 'Gezilecek odaları sırayla seç. Her fotoğraf, kameranın yavaşça ilerlediği 5 saniyelik bir klibe dönüşür ve klipler sırayla oynar.'
  };
  const ciz = (el) => {
    if (s.sonuc) return videoSonucCiz(el, i, s.sonuc, 'Fotoğraf turu hazır', 'Video ilan fotoğraflarından oluşturuldu; görüntüler değiştirilmedi.', () => { s.sonuc = null; ciz(el); });
    const bakiye = (ben() && ben().kredi) || 0, adet = s.secili.length;
    const kredi = s.tur === 'foto' ? 0 : s.tur === 'tur' ? COK_ODA_KREDI[adet] : VIDEO_TUR[s.tur].kredi;
    const sira = (u) => { const n = s.secili.indexOf(u); return n > -1 ? `<span style="position:absolute;top:4px;left:4px;min-width:22px;height:22px;border-radius:11px;background:var(--vurgu);color:#fff;font-size:12px;font-weight:800;display:grid;place-items:center">${n + 1}</span>` : ''; };
    const secili = (u) => (s.tur === 'tur' ? s.secili.includes(u) : u === s.foto);
    const dugmeAd = { foto: 'Videoyu oluştur · ücretsiz', video: 'Videoyu oluştur', drone: 'Videoyu oluştur', tur: 'Turu oluştur' }[s.tur];
    el.innerHTML = `<h2 style="font-size:19px;font-weight:800">MülkümVideo</h2>
      <div class="k soluk">${ACIKLAMA[s.tur]}</div>
      <div class="ciplar">${turler.map(([k, a, f]) => `<button class="cip ${k === s.tur ? 'secili' : ''}" data-t="${k}">${a} · ${f}</button>`).join('')}</div>
      ${s.tur === 'foto' ? '' : `<div class="deko-fotolar">${i.fotolar.map((u) => `<button data-f="${u}" class="${secili(u) ? 'secili' : ''}" style="background-image:url('${u}');position:relative" aria-label="Fotoğraf seç">${s.tur === 'tur' ? sira(u) : ''}</button>`).join('')}</div>`}
      <div class="ciplar">${[['9:16', 'Dikey (Reels, durum)'], ['16:9', 'Yatay (ilan)']].map(([k, a]) => `<button class="cip ${k === s.oran ? 'secili' : ''}" data-o="${k}">${a}</button>`).join('')}</div>
      ${s.tur === 'foto' ? `<div class="ciplar">${TUR_SURE.map((n) => `<button class="cip ${n === s.sure ? 'secili' : ''}" data-s="${n}">${n} saniye</button>`).join('')}</div>` : ''}
      ${s.tur === 'tur' ? `<div class="ciplar"><button class="cip ${s.anlatim ? 'secili' : ''}" data-a="1">Sesli anlatım</button><button class="cip ${s.anlatim ? '' : 'secili'}" data-a="0">Sessiz</button></div>` : ''}
      ${s.tur === 'foto'
        ? `<button class="btn tam" id="vUret">${ic('foto', 18, '#fff')}${dugmeAd}</button><div class="k soluk" id="tDurum" style="text-align:center;min-height:18px"></div>`
        : s.tur === 'tur' && !kredi
          ? `<div class="bilgi-k">${ic('foto', 18)}<div>${adet} fotoğraf seçtin. <b>3 fotoğraf ${COK_ODA_KREDI[3]} kredi</b> (15 saniye), <b>6 fotoğraf ${COK_ODA_KREDI[6]} kredi</b> (30 saniye).</div></div>`
          : bakiye < kredi
            ? `<div class="bilgi-k">${ic('kredi', 18)}<div>Bakiyen <b>${bakiye} kredi</b>. Bu video <b>${kredi} kredi</b>.</div></div><a class="btn tam" href="#/kredi">${ic('kredi', 18, '#fff')}Kredi al</a>`
            : `<button class="btn tam" id="vUret">${ic('yildiz', 18, '#fff')}${dugmeAd} · ${kredi} kredi</button><div class="k soluk" style="text-align:center">Bakiyen: <b>${bakiye} kredi</b></div>`}
      <div class="k soluk">${{
        foto: `${i.fotolar.length} fotoğraftan ${turAdet(i, s.sure)} tanesi kullanılır${turAdet(i, s.sure) < i.fotolar.length ? '; hepsi için süreyi uzat' : ''}. Hazırlanması ${s.sure} saniye sürer; bu sırada ekranı kapatma.`,
        video: '5 saniyelik, 720p, sessiz video. Hazırlanması 1-3 dakika sürer; video oluşturulamazsa kredi iade edilir. Videolar ilanda "yapay zekâ ile oluşturuldu" notuyla gösterilir.',
        drone: '5 saniyelik, 720p, sessiz video. Hazırlanması 1-3 dakika sürer; video oluşturulamazsa kredi iade edilir. Videolar ilanda "yapay zekâ ile oluşturuldu" notuyla gösterilir.',
        tur: `720p. Hazırlanması 3-10 dakika sürer; bu sayfadan çıkabilirsin. Kliplerden biri oluşturulamazsa tur iptal edilir ve kredinin tamamı iade edilir.${s.anlatim ? ' Sesli anlatım ilan bilgilerinden yapay zekâ ile hazırlanır; hazırlanamazsa tur sessiz yayınlanır.' : ''} Tur ilanda "yapay zekâ ile oluşturuldu" notuyla gösterilir.`
      }[s.tur]}</div>`;
    const kilit = () => s.calisiyor;
    el.querySelectorAll('[data-t]').forEach((x) => (x.onclick = () => { if (kilit()) return; s.tur = x.dataset.t; ciz(el); }));
    el.querySelectorAll('[data-o]').forEach((x) => (x.onclick = () => { if (kilit()) return; s.oran = x.dataset.o; ciz(el); }));
    el.querySelectorAll('[data-s]').forEach((x) => (x.onclick = () => { if (kilit()) return; s.sure = +x.dataset.s; ciz(el); }));
    el.querySelectorAll('[data-a]').forEach((x) => (x.onclick = () => { s.anlatim = x.dataset.a === '1'; ciz(el); }));
    el.querySelectorAll('[data-f]').forEach((x) => (x.onclick = () => {
      const u = x.dataset.f;
      if (s.tur !== 'tur') { s.foto = u; return ciz(el); }
      const n = s.secili.indexOf(u);
      if (n > -1) s.secili.splice(n, 1); else if (s.secili.length < 6) s.secili.push(u); else return toast('En çok 6 fotoğraf seçilebilir');
      ciz(el);
    }));
    const u = el.querySelector('#vUret'); if (!u) return;
    u.onclick = async () => {
      if (s.tur === 'foto') {
        if (s.calisiyor) return; s.calisiyor = true; s.iptal = false; u.disabled = true;
        const d = el.querySelector('#tDurum');
        try {
          const r = await turUret(i, s, (m) => { if (!document.body.contains(el)) s.iptal = true; else d.textContent = m; });
          s.sonuc = { ...r, url: URL.createObjectURL(r.blob) };
          if (typeof kayit === 'function') kayit('foto_turu', s.oran + ' · ' + s.sure + ' sn · ' + r.uzanti);
        } catch (x) { if (document.body.contains(el)) toast(x.message || 'Video oluşturulamadı'); }
        s.calisiyor = false;
        if (document.body.contains(el)) ciz(el);
        return;
      }
      u.disabled = true; u.textContent = 'Başlatılıyor…';
      try {
        if (s.tur === 'tur') await videoCagir('tur_baslat', { fotolar: s.secili, oran: s.oran, ilan: i.id, anlatim: s.anlatim });
        else await videoCagir('video_baslat', { tur: s.tur, foto: s.foto, oran: s.oran, ilan: i.id });
        sheetKapat(); toast(s.tur === 'tur' ? 'Tur hazırlanıyor; 3-10 dakika içinde ilan sayfasında görünür' : 'Video hazırlanıyor; 1-3 dakika içinde ilan sayfasında görünür');
        videoKartiYukle(i);
      } catch (x) { toast(x.message); ciz(el); }
    };
  };
  sheetAc('<div id="videoS" style="display:flex;flex-direction:column;gap:12px"></div>', (el) => ciz(el.querySelector('#videoS')));
}
