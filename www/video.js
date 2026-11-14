// MülkümVideo (ücretli): ilan fotoğrafından yapay zekâ ile drone görünümlü video ya da hareketli tanıtım videosu.
// Üretim sunucuda (mulkum-ai: video_baslat / video_durum) async yürür; işler video_isleri tablosunda durur, ekran kapansa da kaybolmaz.
const VIDEO_TUR = {
  drone: { ad: 'MülkümVideo Drone', kisa: 'Drone', aciklama: 'Dış cephe fotoğrafından havadan çekilmiş gibi, yükselen ve binanın çevresinde dönen video', kredi: 5 },
  video: { ad: 'MülkümVideo Tanıtım', kisa: 'Video', aciklama: 'Oda ya da dış cephe fotoğrafını kameranın yavaşça ilerlediği kısa bir videoya çevirir', kredi: 5 },
  tur: { ad: 'MülkümVideo Çok Odalı Tur', kisa: 'Tur', aciklama: 'Seçtiğin 3 ya da 6 fotoğrafı 5 saniyelik kliplere çevirir ve sırayla oynatır', kredi: 9 }
};
const VIDEO_URETIM_ACIK = false; // kullanıcı onay verene kadar yapay zekâ videosu yalnız yöneticide üretilir
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
  // 14.8: panel herkese görünür; yapay zekâ üretimi kullanıcı onayına kadar yalnız yöneticide (sunucu da reddeder).
  const yz = VIDEO_URETIM_ACIK || (typeof S !== 'undefined' && !!S.yonetici);
  const turler = [['foto', 'Fotoğraf turu', 'ücretsiz', 'Fotoğraflar fiyat ve konum yazısıyla akar. Telefonda hazırlanır.']];
  turler.push(['video', 'Yapay zekâ klibi', VIDEO_TUR.video.kredi + ' kredi', 'Tek fotoğraftan kameranın ilerlediği 5 saniyelik video.']);
  if (i.ana === 'emlak') turler.push(['drone', 'Drone görünümü', 'ücretsiz · ' + VIDEO_TUR.drone.kredi + ' kredi', 'Bina fotoğrafından drone çekimi ya da uydudan konuma iniş.']);
  if (i.fotolar.length >= 3) turler.push(['tur', 'Çok odalı tur', COK_ODA_KREDI[3] + '–' + COK_ODA_KREDI[6] + ' kredi', '3 ya da 6 odayı sırayla gezen, sesli anlatımlı video.']);
  const YEREL = ['foto', 'uzay'];   // telefonda üretilen ücretsiz türler (uzay = drone altında "uzaydan konuma")
  const s = { konum: undefined, tur: turler.some((t) => t[0] === ilkTur) ? ilkTur : 'foto', foto: i.fotolar[0], secili: [], oran: '9:16', sure: 15, anlatim: true, sonuc: null, calisiyor: false, iptal: false };
  const ACIKLAMA = {
    foto: 'İlan fotoğraflarından fiyat, özet ve konum yazılı bir tanıtım videosu hazırlar. Ücretsizdir, telefonunda oluşturulur; görüntüler değiştirilmez.',
    video: VIDEO_TUR.video.aciklama + '.',
    drone: VIDEO_TUR.drone.aciklama + '. En iyi sonuç için binanın dışarıdan çekilmiş bir fotoğrafını seç.',
    uzay: 'Uydu görüntüsünde dünyadan ilanın konumuna doğru inen bir video hazırlar. Ücretsizdir, telefonunda oluşturulur.',
    tur: 'Gezilecek odaları sırayla seç. Her fotoğraf, kameranın yavaşça ilerlediği 5 saniyelik bir klibe dönüşür ve klipler sırayla oynar.'
  };
  const ciz = (el) => {
    if (s.sonuc) return s.tur === 'uzay'
      ? videoSonucCiz(el, i, s.sonuc, 'Konuma iniş videosu hazır', 'Uydu görüntüleri © Mapbox © OpenStreetMap. Konum ' + INIS_DUZEY_AD[s.konum?.duzey] + ' bilgisinden alındı.', () => { s.sonuc = null; ciz(el); })
      : videoSonucCiz(el, i, s.sonuc, 'Fotoğraf turu hazır', 'Video ilan fotoğraflarından oluşturuldu; görüntüler değiştirilmedi.', () => { s.sonuc = null; ciz(el); });
    if (s.tur === 'uzay' && s.konum === undefined) { s.konum = null; ilanKonumu(i).then((k) => { s.konum = k || false; if (document.body.contains(el)) ciz(el); }).catch(() => { s.konum = false; if (document.body.contains(el)) ciz(el); }); }
    const bakiye = (ben() && ben().kredi) || 0, adet = s.secili.length;
    const kredi = YEREL.includes(s.tur) ? 0 : s.tur === 'tur' ? COK_ODA_KREDI[adet] : VIDEO_TUR[s.tur].kredi;
    const sira = (u) => { const n = s.secili.indexOf(u); return n > -1 ? `<span style="position:absolute;top:4px;left:4px;min-width:22px;height:22px;border-radius:11px;background:var(--vurgu);color:#fff;font-size:12px;font-weight:800;display:grid;place-items:center">${n + 1}</span>` : ''; };
    const secili = (u) => (s.tur === 'tur' ? s.secili.includes(u) : u === s.foto);
    const dugmeAd = { foto: 'Videoyu oluştur · ücretsiz', uzay: 'Videoyu oluştur · ücretsiz', video: 'Videoyu oluştur', drone: 'Videoyu oluştur', tur: 'Turu oluştur' }[s.tur];
    const konumSatir = s.tur !== 'uzay' ? '' : s.konum === null || s.konum === undefined ? `<div class="k soluk">Konum aranıyor…</div>`
      : s.konum ? `<div class="bilgi-k">${ic('konum', 18)}<div>Konum <b>${INIS_DUZEY_AD[s.konum.duzey] || s.konum.duzey}</b> bilgisinden bulundu.${INIS_SON_Z[s.konum.duzey] >= 17 ? ' Binaların seçilebileceği kadar yaklaşılır.' : ' Konum adresten tahmin edildiği için ' + s.konum.duzey + ' ölçeğinde durulur; daha yakın inmesi için ilanda haritadan işaretle ya da ada/parsel gir.'}</div></div>`
      : `<div class="bilgi-k">${ic('konum', 18)}<div>Bu ilanın konumu bulunamadı. İlanı düzenleyip haritadan işaretle ya da ada/parsel gir.</div></div>`;
    const fotoIpucu = { video: 'Videoya dönüşecek fotoğrafı seç.', drone: 'Binanın dışarıdan çekilmiş fotoğrafını seç.', tur: `Odaları gezilecek sırayla seç (${adet} seçili). 3 oda ${COK_ODA_KREDI[3]} kredi, 6 oda ${COK_ODA_KREDI[6]} kredi.` }[s.tur];
    const n0 = turler.length > 1 ? 1 : 0;
    el.innerHTML = `<div class="mv-bas"><h2>MülkümVideo</h2><div class="k soluk">İlanın için tanıtım videosu hazırla, kaydet ya da paylaş.</div></div>
      ${turler.length > 1 ? `<div class="mv-adim"><b>1</b>Video türü</div>
      <div class="liste mv-tur">${turler.map(([k, a, f, d]) => `<button class="oge ${k === s.tur || (k === 'drone' && s.tur === 'uzay') ? 'secili' : ''}" data-t="${k}">${ic(k === 'foto' ? 'foto' : 'yildiz', 18)}<div class="ara"><div>${a}</div><div class="k soluk">${d}</div></div><span class="mv-fiyat${k === 'foto' ? ' ucretsiz' : ''}">${f}</span></button>`).join('')}</div>` : ''}
      ${s.tur === 'drone' || s.tur === 'uzay' ? `<div class="mv-adim"><b>${n0 + 1}</b>Drone türü</div><div class="ciplar"><button class="cip ${s.tur === 'drone' ? 'secili' : ''}" data-d="drone">Bina fotoğrafından · ${VIDEO_TUR.drone.kredi} kredi</button><button class="cip ${s.tur === 'uzay' ? 'secili' : ''}" data-d="uzay">Uzaydan konuma · ücretsiz</button></div><div class="k soluk" style="margin-top:-6px">${ACIKLAMA[s.tur]}</div>${konumSatir}` : ''}
      ${YEREL.includes(s.tur) ? '' : `<div class="mv-adim"><b>${n0 + (s.tur === 'drone' ? 2 : 1)}</b>Fotoğraf</div><div class="k soluk" style="margin-top:-6px">${fotoIpucu}</div>
      <div class="deko-fotolar">${i.fotolar.map((u) => `<button data-f="${u}" class="${secili(u) ? 'secili' : ''}" style="background-image:url('${u}');position:relative" aria-label="Fotoğraf seç">${s.tur === 'tur' ? sira(u) : ''}</button>`).join('')}</div>`}
      <div class="mv-adim"><b>${n0 + (s.tur === 'foto' ? 1 : s.tur === 'drone' ? 3 : 2)}</b>Ayarlar</div>
      <div class="ciplar">${[['9:16', 'Dikey · Reels'], ['16:9', 'Yatay · ilan']].map(([k, a]) => `<button class="cip ${k === s.oran ? 'secili' : ''}" data-o="${k}">${a}</button>`).join('')}</div>
      ${s.tur === 'foto' ? `<div class="ciplar">${TUR_SURE.map((n) => `<button class="cip ${n === s.sure ? 'secili' : ''}" data-s="${n}">${n} saniye</button>`).join('')}</div>` : ''}
      ${s.tur === 'tur' ? `<div class="ciplar"><button class="cip ${s.anlatim ? 'secili' : ''}" data-a="1">Sesli anlatım</button><button class="cip ${s.anlatim ? '' : 'secili'}" data-a="0">Sessiz</button></div>` : ''}
      ${!YEREL.includes(s.tur) && !yz
        ? `<button class="btn tam" disabled>${ic('yildiz', 18, '#fff')}Çok yakında</button><div class="bilgi-k">${ic('yildiz', 18)}<div>Yapay zekâ videoları son denemelerden geçiyor. Açıldığında bu ekrandan oluşturabileceksin; şimdilik ücretsiz <b>Fotoğraf turu</b>nu kullanabilirsin.</div></div>`
        : s.tur === 'uzay' && !s.konum
        ? `<button class="btn tam" disabled>${ic('konum', 18, '#fff')}${s.konum === false ? 'Konum gerekli' : 'Konum aranıyor…'}</button>`
        : YEREL.includes(s.tur)
        ? `<button class="btn tam" id="vUret">${ic(s.tur === 'uzay' ? 'konum' : 'foto', 18, '#fff')}${dugmeAd}</button><div class="k soluk" id="tDurum" style="text-align:center;min-height:18px"></div>`
        : s.tur === 'tur' && !kredi
          ? `<button class="btn tam" disabled>${adet < 3 ? (3 - adet) + ' fotoğraf daha seç' : (6 - adet) + ' fotoğraf daha seç ya da 3 bırak'}</button>`
          : bakiye < kredi
            ? `<div class="bilgi-k">${ic('kredi', 18)}<div>Bakiyen <b>${bakiye} kredi</b>. Bu video <b>${kredi} kredi</b>.</div></div><a class="btn tam" href="#/kredi">${ic('kredi', 18, '#fff')}Kredi al</a>`
            : `<button class="btn tam" id="vUret">${ic('yildiz', 18, '#fff')}${dugmeAd} · ${kredi} kredi</button><div class="k soluk" style="text-align:center">Bakiyen: <b>${bakiye} kredi</b></div>`}
      <div class="k soluk">${{
        foto: `${turAdet(i, s.sure)} fotoğraf kullanılır. Hazırlanması ${s.sure} saniye sürer; ekranı kapatma.`,
        uzay: '12 saniyelik video. Uydu görüntüleri indirilir ve telefonda birleştirilir; hazırlanırken ekranı kapatma.',
        video: '720p, sessiz. 1-3 dakikada hazır olur; oluşturulamazsa kredi iade edilir.',
        drone: '720p, sessiz. 1-3 dakikada hazır olur; oluşturulamazsa kredi iade edilir.',
        tur: `720p. 3-10 dakikada hazır olur, bu sayfadan çıkabilirsin. Oluşturulamazsa kredinin tamamı iade edilir.`
      }[s.tur]}${YEREL.includes(s.tur) ? '' : ' İlanda "yapay zekâ ile oluşturuldu" notuyla gösterilir.'}</div>`;
    const kilit = () => s.calisiyor;
    el.querySelectorAll('[data-t]').forEach((x) => (x.onclick = () => { if (kilit()) return; s.tur = x.dataset.t; ciz(el); }));
    el.querySelectorAll('[data-o]').forEach((x) => (x.onclick = () => { if (kilit()) return; s.oran = x.dataset.o; ciz(el); }));
    el.querySelectorAll('[data-s]').forEach((x) => (x.onclick = () => { if (kilit()) return; s.sure = +x.dataset.s; ciz(el); }));
    el.querySelectorAll('[data-d]').forEach((x) => (x.onclick = () => { if (kilit()) return; s.tur = x.dataset.d; ciz(el); }));
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
      if (YEREL.includes(s.tur)) {
        if (s.calisiyor) return; s.calisiyor = true; s.iptal = false; u.disabled = true;
        const d = el.querySelector('#tDurum');
        try {
          const ilerle = (m) => { if (!document.body.contains(el)) s.iptal = true; else if (d) d.textContent = m; };
          const r = s.tur === 'uzay' ? await inisUret(i, s.konum, s, ilerle) : await turUret(i, s, ilerle);
          s.sonuc = { ...r, url: URL.createObjectURL(r.blob) };
          if (typeof kayit === 'function') kayit(s.tur === 'uzay' ? 'konum_inis' : 'foto_turu', s.oran + ' · ' + (s.tur === 'uzay' ? s.konum.duzey : s.sure + ' sn') + ' · ' + r.uzanti);
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
  sheetAc('<div id="videoS" class="mv"></div>', (el) => ciz(el.querySelector('#videoS')));
}

// ---------- Uzaydan konuma iniş (14.10, ücretsiz): uydu görüntüsünde dünyadan ilanın konumuna yaklaşan video ----------
// Konum: ilanKonumu() (haritadaki işaret → ada/parsel → sokak → mahalle → ilçe). Görüntüler uydu fonksiyonundan (Mapbox, 1280x1280).
// Konum ne kadar kesinse o kadar yaklaşılır; adresten tahmin edilen konumda bina seçilecek kadar inilmez (yanlış binayı göstermemek için).
const INIS_SON_Z = { bina: 18, parsel: 18, sokak: 17, mahalle: 15, 'ilçe': 13 };
const INIS_DUZEY_AD = { bina: 'haritadaki işaret', parsel: 'ada / parsel', sokak: 'sokak adresi', mahalle: 'mahalle', 'ilçe': 'ilçe' };

async function inisUret(i, k, s, ilerleme) {
  const mime = turMime(); if (!mime) throw new Error('Bu telefon video kaydını desteklemiyor.');
  const dikey = s.oran === '9:16', W = dikey ? 720 : 1280, H = dikey ? 1280 : 720;
  const Z0 = 3, Z1 = INIS_SON_Z[k.duzey] || 15, INIS = 9, BEKLE = 3, SURE = INIS + BEKLE;
  const resim = {};
  for (let z = Z0; z <= Z1; z++) {
    ilerleme('Uydu görüntüleri alınıyor ' + (z - Z0 + 1) + '/' + (Z1 - Z0 + 1));
    const u = `${SB_URL}/functions/v1/uydu?lat=${k.lat.toFixed(6)}&lon=${k.lon.toFixed(6)}&z=${z}&boy=kare`;
    try { const b = await (await fetch(u)).blob(); if (b.size > 5000) resim[z] = await createImageBitmap(b); } catch (_) {}
  }
  if (!resim[Z1] || Object.keys(resim).length < (Z1 - Z0 + 1) / 2) throw new Error('Uydu görüntüsü alınamadı. Biraz sonra tekrar dene.');
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), YAZI = '"Inter","Segoe UI",system-ui,sans-serif', ol = Math.min(W, H) / 720;
  const f = i.alanlar || {}, yer = [f.mahalle && f.mahalle + ' Mah.', i.ilce, i.il].filter(Boolean).join(', ');
  const kiralik = i.ana === 'emlak' && f.islem === 'Kiralık', fiyat = i.fiyat ? tl(i.fiyat) + (kiralik ? ' / ay' : '') : '';
  const ciz = (z, alfa) => { const im = resim[z]; if (!im) return; const o = 2 ** (s.zoom - z), w = 1280 * o; c.globalAlpha = alfa; c.drawImage(im, (W - w) / 2, (H - w) / 2, w, w); c.globalAlpha = 1; };
  const kare = (t) => {
    const p = Math.min(1, t / INIS), e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
    s.zoom = Z0 + (Z1 - Z0) * e;
    c.fillStyle = '#05070c'; c.fillRect(0, 0, W, H);
    const k0 = Math.min(Z1, Math.floor(s.zoom)), fr = s.zoom - k0;
    for (let z = Z0; z < k0; z++) ciz(z, 1);            // alt katmanlar: kenarlar boş kalmasın
    ciz(k0, 1);
    if (k0 < Z1 && fr > 0.55) ciz(k0 + 1, Math.min(1, (fr - 0.55) / 0.4));
    // İşaret: son yaklaşmada belirir
    const pin = Math.max(0, Math.min(1, (t - INIS * 0.8) / 1));
    if (pin > 0) {
      const cx = W / 2, cy = H / 2, r = 12 * ol;
      c.globalAlpha = pin;
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3 * ol; c.beginPath(); c.arc(cx, cy, r * (2.2 + Math.sin(t * 4) * 0.3), 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#C8553D'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 3 * ol; c.stroke();
      c.globalAlpha = 1;
    }
    // Alt bilgi
    const g = c.createLinearGradient(0, H * 0.62, 0, H); g.addColorStop(0, 'rgba(6,10,18,0)'); g.addColorStop(1, 'rgba(6,10,18,.85)');
    c.fillStyle = g; c.fillRect(0, H * 0.62, W, H * 0.38);
    const kx = 40 * ol, en = W - 2 * kx; let y = H - 70 * ol;
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    const bilgi = Math.max(0, Math.min(1, (t - INIS * 0.7) / 1.2));
    c.globalAlpha = 0.6 + 0.4 * bilgi;
    if (yer) { c.font = '600 ' + Math.round(28 * ol) + 'px ' + YAZI; c.fillStyle = '#fff'; c.fillText(turYaziKes(c, yer, en), kx, y); y -= 52 * ol; }
    if (fiyat && bilgi > 0) { c.globalAlpha = bilgi; c.font = '800 ' + Math.round(52 * ol) + 'px ' + YAZI; c.fillText(fiyat, kx, y); }
    c.globalAlpha = 1;
    // İmza, ölçek bilgisi, kaynak
    c.font = '800 ' + Math.round(24 * ol) + 'px ' + YAZI; const imza = 'Mülküm360', iw = c.measureText(imza).width + 28 * ol;
    c.fillStyle = 'rgba(6,10,18,.55)'; c.beginPath(); c.roundRect(kx - 6 * ol, kx - 6 * ol, iw, 44 * ol, 12 * ol); c.fill();
    c.fillStyle = '#fff'; c.fillText(imza, kx + 8 * ol, kx + 25 * ol);
    c.font = '500 ' + Math.round(15 * ol) + 'px ' + YAZI; c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,.8)';
    c.fillText('© Mapbox © OpenStreetMap · uydu görüntüsü', W - kx, H - 24 * ol);
  };
  s.zoom = Z0; kare(0);
  const akis = cv.captureStream(30), parcalar = [];
  const kaydedici = new MediaRecorder(akis, { mimeType: mime, videoBitsPerSecond: 6000000 });
  kaydedici.ondataavailable = (e) => { if (e.data && e.data.size) parcalar.push(e.data); };
  const bitti = new Promise((ok, no) => { kaydedici.onstop = ok; kaydedici.onerror = (e) => no(e.error || new Error('Kayıt yapılamadı')); });
  kaydedici.start(500);
  const t0 = performance.now();
  await new Promise((ok) => {
    const adim = () => { const t = (performance.now() - t0) / 1000; if (s.iptal || t >= SURE) return ok(); kare(t); ilerleme('Video hazırlanıyor %' + Math.round(t / SURE * 100)); setTimeout(adim, 33); };
    adim();
  });
  kaydedici.stop(); await bitti; akis.getTracks().forEach((x) => x.stop()); Object.values(resim).forEach((r) => r.close && r.close());
  if (s.iptal) throw new Error('İptal edildi');
  const blob = new Blob(parcalar, { type: mime.split(';')[0] });
  if (blob.size < 20000) throw new Error('Video oluşturulamadı.');
  return { blob, uzanti: /mp4/.test(mime) ? 'mp4' : 'webm' };
}
