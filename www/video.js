// MülkümVideo (ücretli): ilan fotoğrafından AI ile drone görünümlü video ya da hareketli tanıtım videosu.
// Üretim sunucuda (mulkum-ai: video_baslat / video_durum) async yürür; işler video_isleri tablosunda durur, ekran kapansa da kaybolmaz.
const VIDEO_TUR = {
  drone: { ad: 'MülkümVideo Drone', kisa: 'Drone', aciklama: 'Dış cephe fotoğrafından havadan çekilmiş gibi, yükselen ve binanın çevresinde dönen video', kredi: 5 },
  video: { ad: 'MülkümVideo Tanıtım', kisa: 'Video', aciklama: 'Oda ya da dış cephe fotoğrafını kameranın yavaşça ilerlediği kısa bir videoya çevirir', kredi: 5 },
  tur: { ad: 'MülkümVideo Çok Odalı Tur', kisa: 'Tur', aciklama: 'Seçtiğin 3 ya da 6 fotoğrafı 5 saniyelik kliplere çevirir ve sırayla oynatır', kredi: 9 }
};
const VIDEO_URETIM_ACIK = false; // kullanıcı onay verene kadar AI videosu yalnız yöneticide üretilir
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
function videoOynatHtml(v) {
  const l = klipListe(v), poster = kac(v.kaynak || '');
  if (l.length > 1) return `<div class="mv-oy" data-liste="${kac(JSON.stringify(l))}"${v.ses ? ` data-ses="${kac(v.ses)}"` : ''}><div class="mv-oy-ekran"><video playsinline muted preload="auto" poster="${poster}"></video><video playsinline muted preload="auto"></video><button type="button" class="mv-oy-oyna" aria-label="Oynat">▶</button></div><div class="mv-oy-alt"><input type="range" class="mv-oy-cubuk" min="0" max="1000" value="0" aria-label="Video ilerleme"><span class="mv-oy-sn">0:00</span></div></div>`;
  return `<video src="${kac(l[0] || v.url)}" poster="${poster}" controls controlslist="nodownload noplaybackrate" disablepictureinpicture playsinline preload="metadata" style="width:100%;border-radius:12px;background:#000;display:block"></video>`;
}

async function videoKartiYukle(i) {
  const kap = document.getElementById('videoK'); if (!kap) return;
  const sahip = ben() && i.sahip === ben().id;
  const videolar = (i.alanlar && i.alanlar.videolar) || [];
  let isler = [];
  if (sahip) { try { const { data } = await sb.from('video_isleri').select('*').eq('ilan', i.id).neq('tur', 'inis').order('olusturma', { ascending: false }).limit(10); isler = data || []; } catch (_) {} }
  if (!document.body.contains(kap)) return;
  const ekli = new Set(videolar.map((v) => v.url));
  const klipler = klipListe;
  const oynat = videoOynatHtml;
  const bekleyen = isler.filter((x) => x.durum === 'bekliyor');
  const taslakSayi = isler.filter((x) => x.durum === 'hazir' && x.url && !ekli.has(x.url)).length;   // hazır ama ilanda değil: MülkümVideo penceresinde
  const sonHata = isler.find((x) => x.durum === 'hata' && Date.now() - new Date(x.olusturma).getTime() < 3600000);
  if (!videolar.length && !sahip) { kap.remove(); return; }
  kap.className = 'kart';
  const adSatir = (v) => kac((VIDEO_TUR[v.tur] || VIDEO_TUR.video).kisa);
  const baslik = sahip
    ? `<button class="satir mv-kart-bas" id="videoAc" style="text-align:left;width:100%;border:0;background:none;padding:0;font:inherit;color:inherit;cursor:pointer">${ic('foto', 22, 'var(--vurgu-ikon)')}<div class="ara"><b>MülkümVideo</b><div class="k soluk">${taslakSayi ? taslakSayi + ' hazır video seni bekliyor · ' : ''}Fotoğraf turu, AI klibi, drone, uzaydan konuma iniş ve çok odalı tur</div></div><span class="ok">›</span></button>`
    : `<h3>MülkümVideo</h3>`;
  const parca = (html) => `<div class="mv-kart-ic">${html}</div>`;
  kap.innerHTML = baslik
    + bekleyen.map((x) => parca(`<div class="bilgi-k">${ic('yildiz', 18)}<div><b>${VIDEO_TUR[x.tur].kisa} hazırlanıyor…</b><br>Genelde ${x.tur === 'tur' ? '3-10' : '1-3'} dakika sürer. Bu sayfadan çıkabilirsin; hazır olunca burada görünür.</div></div>`)).join('')
    + videolar.map((v, n) => parca(`<div class="mv-kart-ad"><b>${adSatir(v)}</b><span class="k soluk">AI ile oluşturuldu</span></div>${oynat(v)}${sahip ? `<div class="izgara2"><button class="btn sade" data-vk="kaydet" data-vn="${n}">${ic('indir', 18)}Telefona kaydet</button><button class="btn sade" data-vk="paylas" data-vn="${n}">Paylaş</button></div><button class="btn sade tam" data-vkaldir="${n}">İlandan kaldır</button>` : ''}`)).join('')
    + (videolar.length ? `<div class="k soluk" style="margin-top:8px">Videolar ilan fotoğrafından AI ile üretildi; gerçeği birebir yansıtmayabilir.</div>` : '')
    + (sonHata && !bekleyen.length ? `<div class="k soluk" style="margin-top:8px">Son video oluşturulamadı; kredin iade edildi.</div>` : '');
  kap.querySelectorAll('[data-vkaldir]').forEach((b) => (b.onclick = async () => {
    if (await dene(() => videoListesiKaydet(i, videolar.filter((_, n) => n !== +b.dataset.vkaldir)), 'Video ilandan kaldırıldı')) videoKartiYukle(i);
  }));
  videoListeBagla(kap);
  const ac = kap.querySelector('#videoAc'); if (ac) ac.onclick = () => videoSheet(i);
  kap.querySelectorAll('[data-vk]').forEach((b) => (b.onclick = () => videoDisaAktar(i, videolar[+b.dataset.vn], b.dataset.vk)));
  bekleyen.forEach((x) => videoTakip(x.id, i));
}

// Bekleyen işi 8 sn'de bir sorar; bitince kartı yeniler
function videoTakip(id, i) {
  if (VIDEO_BEKLE.has(id)) return;
  const sor = async () => {
    let d = null; try { d = await videoCagir('video_durum', { id }); } catch (_) {}
    if (d && d.durum && d.durum !== 'bekliyor') {
      VIDEO_BEKLE.delete(id);
      toast(d.durum === 'hazir' ? 'Videon hazır. MülkümVideo penceresinden ilana ekleyebilirsin' : (d.hata || 'Video oluşturulamadı'));
      if (document.getElementById('videoK')) videoKartiYukle(i);
      return;
    }
    VIDEO_BEKLE.set(id, setTimeout(sor, 8000));
  };
  VIDEO_BEKLE.set(id, setTimeout(sor, 6000));
}

// ---------- Fotoğraf Turu (ücretsiz, 14.3): ilan fotoğraflarından telefonda üretilen tanıtım videosu ----------
// Sunucu ve kredi kullanmaz. Fotoğraflar yavaş yakınlaşma ve geçişle akar; üstte fiyat, özet, konum ve Mülküm360 imzası durur.
// Kayıt gerçek zamanlıdır (15 sn'lik video 15 sn'de hazırlanır). Görüntü değiştirilmez: AI notu gerekmez.
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

// ---------- Çok odalı tur (krediyle): 3 ya da 6 fotoğrafın her biri 5 sn'lik AI klibi olur, sırayla oynar; isteğe bağlı sesli anlatım ----------
const COK_ODA_KREDI = { 3: 9, 6: 15 };
const klipListe = (v) => ((v && v.parcalar) || []).map((p) => (typeof p === 'string' ? p : p && p.url)).filter(Boolean);

// Çok klipli videolar için akıcı oynatıcı: iki video katmanı sırayla kullanılır, sıradaki klip önceden yüklenir ve kısa bir
// çapraz geçişle devralır (src değiştirip beklemek her geçişte takılma yapıyordu). Tek ilerleme çubuğu tüm turu gösterir; anlatım sesi aynı saate bağlıdır.
function videoListeBagla(kok) {
  kok.querySelectorAll('.mv-oy:not([data-hazir])').forEach((p) => {
    p.dataset.hazir = '1';
    let l = []; try { l = JSON.parse(p.dataset.liste); } catch (_) {}
    if (l.length < 2) return;
    const ekran = p.querySelector('.mv-oy-ekran'), vs = [...ekran.querySelectorAll('video')], btn = p.querySelector('.mv-oy-oyna');
    const cubuk = p.querySelector('.mv-oy-cubuk'), sn = p.querySelector('.mv-oy-sn');
    const sure = l.map(() => 5), GEC = 0.2;
    const ses = p.dataset.ses ? new Audio(p.dataset.ses) : null; if (ses) ses.preload = 'auto';
    let n = 0, on = 0, calis = false, zm = 0;
    const bas = (k) => sure.slice(0, k).reduce((a, b) => a + b, 0), top = () => bas(l.length);
    const bic = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
    const guncelle = () => { const t = bas(n) + (vs[on].currentTime || 0); if (!cubuk.dataset.surukle) cubuk.value = Math.round(Math.min(1, t / top()) * 1000); sn.textContent = bic(t) + ' / ' + bic(top()); };
    const yukle = (v, k) => {
      if (!l[k]) { v.removeAttribute('src'); delete v.dataset.k; return; }
      if (v.dataset.k !== String(k)) { v.dataset.k = String(k); v.src = l[k]; v.load(); } else { try { v.currentTime = 0; } catch (_) {} }
    };
    const goster = () => vs.forEach((v, j) => { v.style.opacity = j === on ? '1' : '0'; });
    vs.forEach((v) => v.addEventListener('loadedmetadata', () => {
      const k = +v.dataset.k;
      if (isFinite(v.duration) && v.duration > 0) sure[k] = v.duration;
      if (k === 0 && v.videoWidth && !p.dataset.oran) { p.dataset.oran = '1'; ekran.style.aspectRatio = v.videoWidth + ' / ' + v.videoHeight; }
      guncelle();
    }));
    const durdur = () => { calis = false; clearInterval(zm); vs.forEach((v) => v.pause()); if (ses) ses.pause(); btn.hidden = false; };
    const oynat = () => {
      if (calis) return; calis = true; btn.hidden = true;
      vs[on].play().catch(() => {});
      if (ses) { if (n === 0 && vs[on].currentTime < 0.3) ses.currentTime = 0; ses.play().catch(() => {}); }
      zm = setInterval(dongu, 40);
    };
    const gec = (k) => {
      const eski = vs[on], yeni = vs[1 - on];
      try { yeni.currentTime = 0; } catch (_) {}
      yeni.play().catch(() => {}); on = 1 - on; n = k; goster();
      setTimeout(() => { if (n === k && eski !== vs[on]) { eski.pause(); yukle(eski, k + 1); } }, GEC * 1000 + 80);
    };
    const git = (t) => new Promise((ok) => {
      if (calis) durdur();
      t = Math.max(0, Math.min(top() - 0.05, t)); let k = 0; while (l[k + 1] && bas(k + 1) <= t) k++;
      on = 0; n = k; yukle(vs[0], k); yukle(vs[1], k + 1); goster();
      const a = vs[0], hedef = t - bas(k);
      const ayarla = () => { try { a.currentTime = hedef; } catch (_) {} if (ses) { try { ses.currentTime = t; } catch (_) {} } guncelle(); ok(); };
      if (a.readyState >= 1) ayarla(); else a.addEventListener('loadedmetadata', ayarla, { once: true });
    });
    const dongu = () => {
      const v = vs[on], kalan = sure[n] - v.currentTime;
      if (l[n + 1] ? kalan <= GEC : (v.ended || kalan <= 0.04)) { if (l[n + 1]) gec(n + 1); else { durdur(); git(0); } }
      guncelle();
    };
    ekran.onclick = () => (calis ? durdur() : oynat());
    cubuk.addEventListener('pointerdown', () => { cubuk._cal = calis; });
    cubuk.addEventListener('input', () => { cubuk.dataset.surukle = '1'; sn.textContent = bic(cubuk.value / 1000 * top()) + ' / ' + bic(top()); });
    cubuk.addEventListener('change', async () => { delete cubuk.dataset.surukle; const cal = cubuk._cal; await git(cubuk.value / 1000 * top()); if (cal) oynat(); });
    yukle(vs[0], 0); yukle(vs[1], 1); goster(); guncelle();
  });
}

// Dosya işlemleri: telefona kaydet / paylaş (WhatsApp, Instagram… sistem paylaşım listesi)
const videoAd = (i, uzanti) => 'mulkum360-ilan-' + (i.no || String(i.id).slice(-6)) + '-' + Date.now().toString(36).slice(-4) + '.' + uzanti;
const blobB64 = (blob) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = no; r.readAsDataURL(blob); });
async function videoPaylasDosya(i, blob, ad) {
  const P = window.Capacitor?.Plugins, yerli = window.Capacitor?.isNativePlatform?.() && P?.Filesystem && P?.Share;
  if (yerli) {
    const y = await P.Filesystem.writeFile({ path: ad, data: await blobB64(blob), directory: 'CACHE' });
    try { await P.Share.share({ title: i.baslik, files: [y.uri], dialogTitle: 'Videoyu paylaş' }); } catch (p) { if (!/cancel|iptal/i.test(String(p?.message || p))) throw p; }
    return;
  }
  const dosya = new File([blob], ad, { type: blob.type || 'video/mp4' });
  if (navigator.canShare?.({ files: [dosya] })) { try { await navigator.share({ files: [dosya], title: i.baslik }); } catch (_) {} return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = ad; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function videoKaydetDosya(i, blob, ad) {
  const P = window.Capacitor?.Plugins, yerli = window.Capacitor?.isNativePlatform?.() && P?.Filesystem;
  if (!yerli) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = ad; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); return toast('Video indirildi'); }
  try {
    await P.Filesystem.writeFile({ path: 'Mulkum360/' + ad, data: await blobB64(blob), directory: 'DOCUMENTS', recursive: true });
    await P.Filesystem.stat({ path: 'Mulkum360/' + ad, directory: 'DOCUMENTS' });   // yazıldığı doğrulanır; yoksa paylaşım penceresine düşülür
    toast('Kaydedildi: Belgeler › Mulkum360 klasörü');
  } catch (_) {
    toast('Doğrudan kaydedilemedi. Açılan pencereden "Dosyalar" ya da Drive\'ı seç.');
    try { await videoPaylasDosya(i, blob, ad); } catch (x) { toast(x.message || 'Video kaydedilemedi'); }
  }
}
// İlandaki ya da hazırlanmış bir videoyu kaydet / paylaş. Çok klipli turlar önce tek dosyada birleştirilir.
async function videoDisaAktar(i, v, mod) {
  if (klipListe(v).length > 1) return tekVideoSheet(i, v, mod);
  try {
    toast('Video hazırlanıyor…');
    const blob = await (await fetch(v.url)).blob();
    const ad = videoAd(i, 'mp4');
    if (mod === 'paylas') await videoPaylasDosya(i, blob, ad); else await videoKaydetDosya(i, blob, ad);
  } catch (x) { toast(x.message || 'Video alınamadı'); }
}

// Tur kliplerini (ve varsa anlatım sesini) telefonda tek video dosyasına çevirir. Kayıt gerçek zamanlıdır.
// İki video katmanı: sıradaki klip önceden yüklenir ve 0,2 sn çapraz geçişle devralır (geçişte siyah kare olmaz).
async function tekVideoUret(liste, sesUrl, s, ilerleme) {
  const destek = (m) => { try { return window.MediaRecorder && MediaRecorder.isTypeSupported(m); } catch (_) { return false; } };
  const mime = (sesUrl ? ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'] : []).find(destek) || turMime();
  if (!mime) throw new Error('Bu telefon video kaydını desteklemiyor.');
  const yap = () => { const v = document.createElement('video'); v.crossOrigin = 'anonymous'; v.muted = true; v.playsInline = true; v.preload = 'auto'; return v; };
  const yukle = (v, u) => new Promise((ok, no) => { v.onloadeddata = () => ok(); v.onerror = () => no(new Error('Klip okunamadı.')); v.src = u; v.load(); });
  const vs = [yap(), yap()], GEC = 0.2;
  ilerleme('Klipler hazırlanıyor…');
  await yukle(vs[0], liste[0]); if (liste[1]) await yukle(vs[1], liste[1]);
  const W = vs[0].videoWidth || 1280, H = vs[0].videoHeight || 720;
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
  let aktif = vs[0], onceki = null, gecisT = 0;
  const kare = () => {
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    if (onceki) { try { c.drawImage(onceki, 0, 0, W, H); } catch (_) {} }
    const a = onceki ? Math.min(1, (performance.now() - gecisT) / (GEC * 1000)) : 1;
    c.globalAlpha = a; try { c.drawImage(aktif, 0, 0, W, H); } catch (_) {} c.globalAlpha = 1;
    if (a >= 1) onceki = null;
    c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.font = '800 ' + Math.round(24 * olcek) + 'px ' + YAZI;
    const imza = 'Mülküm360', k = Math.round(28 * olcek), iw = c.measureText(imza).width + 28 * olcek;
    c.fillStyle = 'rgba(6,10,18,.55)'; c.beginPath(); c.roundRect(k, k, iw, 44 * olcek, 12 * olcek); c.fill();
    c.fillStyle = '#fff'; c.fillText(imza, k + 14 * olcek, k + 31 * olcek);
    c.font = '500 ' + Math.round(17 * olcek) + 'px ' + YAZI; c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,.75)';
    c.fillText('AI ile oluşturuldu', W - k, H - k);
  };
  kare();
  const parcalar = [], kaydedici = new MediaRecorder(akis, { mimeType: mime, videoBitsPerSecond: 5000000 });
  kaydedici.ondataavailable = (e) => { if (e.data && e.data.size) parcalar.push(e.data); };
  const bitti = new Promise((ok, no) => { kaydedici.onstop = ok; kaydedici.onerror = (e) => no(e.error || new Error('Kayıt yapılamadı')); });
  let cizim = true; const dongu = () => { if (!cizim) return; kare(); setTimeout(dongu, 33); };
  kaydedici.start(500); dongu();
  try {
    await aktif.play(); if (ses) ses.play().catch(() => {});
    for (let n = 0; n < liste.length; n++) {
      if (s.iptal) break;
      ilerleme('Tek video hazırlanıyor ' + (n + 1) + '/' + liste.length);
      const v = vs[n % 2], sonraki = vs[(n + 1) % 2], son = liste[n + 1] ? GEC : 0.05;
      await new Promise((ok) => {
        const sinir = Date.now() + ((isFinite(v.duration) ? v.duration : 5) + 6) * 1000;
        const kontrol = () => { if (s.iptal || v.ended || Date.now() > sinir || (isFinite(v.duration) && v.duration - v.currentTime <= son)) return ok(); setTimeout(kontrol, 20); };
        kontrol();
      });
      if (liste[n + 1]) {
        try { sonraki.currentTime = 0; await sonraki.play(); } catch (_) {}
        onceki = v; aktif = sonraki; gecisT = performance.now();
        setTimeout(() => { v.pause(); if (liste[n + 2]) yukle(v, liste[n + 2]).catch(() => {}); }, GEC * 1000 + 60);
      }
    }
    await new Promise((ok) => setTimeout(ok, 250));
  } finally {
    cizim = false; if (ses) ses.pause(); vs.forEach((v) => v.pause());
    kaydedici.stop(); await bitti.catch(() => {});
    akis.getTracks().forEach((x) => x.stop()); if (ac) ac.close().catch(() => {});
  }
  if (s.iptal) throw new Error('İptal edildi');
  const blob = new Blob(parcalar, { type: mime.split(';')[0] });
  if (blob.size < 20000) throw new Error('Video oluşturulamadı.');
  return { blob, uzanti: /mp4/.test(mime) ? 'mp4' : 'webm' };
}

// Hazır video dosyası ekranı: izle, telefona kaydet, paylaş (fotoğraf turu, konuma iniş ve tek video ortak kullanır)
function videoSonucCiz(el, i, sonuc, baslik, not, geri) {
  const ad = sonuc.ad || videoAd(i, sonuc.uzanti);
  el.innerHTML = `<h2 style="font-size:19px;font-weight:800">${baslik}</h2>
    <video src="${sonuc.url}" controls controlslist="nodownload" playsinline autoplay muted loop style="width:100%;max-height:52vh;border-radius:12px;background:#000;display:block"></video>
    <div class="izgara2"><button class="btn sade" id="tKaydet">${ic('indir', 18)}Telefona Kaydet</button><button class="btn" id="tPaylas">Paylaş</button></div>
    <div class="k soluk" style="text-align:center">Paylaş'a basınca WhatsApp, Instagram ve diğer uygulamalar listelenir.</div>
    ${geri ? '<button class="btn cizgili tam" id="tYeni">Ayarları değiştir</button>' : ''}
    <div class="k soluk">${not}${sonuc.uzanti === 'webm' ? ' Bu telefon videoyu WebM türünde kaydetti; bazı uygulamalar bu türü kabul etmeyebilir.' : ''}</div>`;
  el.querySelector('#tPaylas').onclick = () => dene(() => videoPaylasDosya(i, sonuc.blob, ad));
  el.querySelector('#tKaydet').onclick = () => videoKaydetDosya(i, sonuc.blob, ad);
  const y = el.querySelector('#tYeni'); if (y) y.onclick = () => { URL.revokeObjectURL(sonuc.url); geri(); };
}

// İlandaki / hazırlanmış çok odalı turu tek dosya olarak birleştirir; mod verilirse bitince kaydeder ya da paylaşır
function tekVideoSheet(i, v, mod) {
  const s = { iptal: false }, liste = klipListe(v);
  sheetAc('<div id="tekS" style="display:flex;flex-direction:column;gap:12px"></div>', async (kok) => {
    const el = kok.querySelector('#tekS');
    el.innerHTML = `<h2 style="font-size:19px;font-weight:800">Tek video hazırlanıyor</h2>
      <div class="k soluk">Klipler${v.ses ? ' ve sesli anlatım' : ''} tek dosyada birleştiriliyor. Yaklaşık ${liste.length * 5} saniye sürer; bu sırada ekranı kapatma.</div>
      <div class="bilgi-k">${ic('yildiz', 18)}<div id="tekDurum">Başlıyor…</div></div>`;
    try {
      const r = await tekVideoUret(liste, v.ses || '', s, (m) => { if (!document.body.contains(el)) s.iptal = true; else el.querySelector('#tekDurum').textContent = m; });
      if (!document.body.contains(el)) return;
      const sonuc = { ...r, url: URL.createObjectURL(r.blob), ad: videoAd(i, r.uzanti) };
      videoSonucCiz(el, i, sonuc, 'Tek video hazır', 'Video ilan fotoğraflarından AI ile üretildi; gerçeği birebir yansıtmayabilir.', null);
      if (typeof kayit === 'function') kayit('tek_video', liste.length + ' klip · ' + r.uzanti + (v.ses ? ' · sesli' : '') + (mod ? ' · ' + mod : ''));
      if (mod === 'paylas') dene(() => videoPaylasDosya(i, sonuc.blob, sonuc.ad)); else if (mod === 'kaydet') videoKaydetDosya(i, sonuc.blob, sonuc.ad);
    } catch (x) { if (document.body.contains(el)) { toast(x.message || 'Video oluşturulamadı'); sheetKapat(); } }
  });
}

// MülkümVideo penceresi (MülkümDeko düzeniyle): tür çipleri, fotoğraf şeridi, seçenek çipleri, düğme, not
function videoSheet(i, ilkTur) {
  // 14.8: panel herkese görünür; AI üretimi kullanıcı onayına kadar yalnız yöneticide (sunucu da reddeder).
  const yz = VIDEO_URETIM_ACIK || (typeof S !== 'undefined' && !!S.yonetici);
  const turler = [['foto', 'Fotoğraf turu', 'ücretsiz', 'Fotoğraflar fiyat ve konum yazısıyla akar. Telefonda hazırlanır.']];
  turler.push(['video', 'AI klibi', VIDEO_TUR.video.kredi + ' kredi', 'Tek fotoğraftan kameranın ilerlediği 5 saniyelik video.']);
  if (i.ana === 'emlak') turler.push(['drone', 'Drone görünümü', INIS_KREDI + '–' + VIDEO_TUR.drone.kredi + ' kredi', 'Bina fotoğrafından drone çekimi ya da uydudan konuma iniş.']);
  if (i.fotolar.length >= 3) turler.push(['tur', 'Çok odalı tur', COK_ODA_KREDI[3] + '–' + COK_ODA_KREDI[6] + ' kredi', '3 ya da 6 odayı sırayla gezen, sesli anlatımlı video.']);
  const YEREL = ['foto', 'uzay'];   // telefonda üretilen ücretsiz türler (uzay = drone altında "uzaydan konuma")
  const s = { konum: undefined, tur: turler.some((t) => t[0] === ilkTur) ? ilkTur : 'foto', foto: i.fotolar[0], secili: [], oran: '9:16', sure: 15, anlatim: true, sonuc: null, calisiyor: false, iptal: false };
  const ACIKLAMA = {
    foto: 'İlan fotoğraflarından fiyat, özet ve konum yazılı bir tanıtım videosu hazırlar. Ücretsizdir, telefonunda oluşturulur; görüntüler değiştirilmez.',
    video: VIDEO_TUR.video.aciklama + '.',
    drone: VIDEO_TUR.drone.aciklama + '. En iyi sonuç için binanın dışarıdan çekilmiş bir fotoğrafını seç.',
    uzay: `Uydu görüntüsünde dünyadan ilanın konumuna doğru inen bir video hazırlar. ${INIS_KREDI} kredidir; telefonunda oluşturulur, oluşturulamazsa kredi iade edilir.`,
    tur: 'Gezilecek odaları sırayla seç. Her fotoğraf, kameranın yavaşça ilerlediği 5 saniyelik bir klibe dönüşür ve klipler sırayla oynar.'
  };
  const ciz = (el) => {
    if (s.sonuc) return s.tur === 'uzay'
      ? videoSonucCiz(el, i, s.sonuc, 'Konuma iniş videosu hazır', 'Uydu görüntüleri © Mapbox © OpenStreetMap. Konum ' + INIS_DUZEY_AD[s.konum?.duzey] + ' bilgisinden alındı.', () => { s.sonuc = null; ciz(el); })
      : videoSonucCiz(el, i, s.sonuc, 'Fotoğraf turu hazır', 'Video ilan fotoğraflarından oluşturuldu; görüntüler değiştirilmedi.', () => { s.sonuc = null; ciz(el); });
    if (s.tur === 'uzay' && s.konum === undefined) { s.konum = null; ilanKonumu(i).then((k) => { s.konum = k || false; if (document.body.contains(el)) ciz(el); }).catch(() => { s.konum = false; if (document.body.contains(el)) ciz(el); }); }
    const bakiye = (ben() && ben().kredi) || 0, adet = s.secili.length;
    const kredi = s.tur === 'foto' ? 0 : s.tur === 'uzay' ? INIS_KREDI : s.tur === 'tur' ? COK_ODA_KREDI[adet] : VIDEO_TUR[s.tur].kredi;
    const sira = (u) => { const n = s.secili.indexOf(u); return n > -1 ? `<span style="position:absolute;top:4px;left:4px;min-width:22px;height:22px;border-radius:11px;background:var(--vurgu);color:#fff;font-size:12px;font-weight:800;display:grid;place-items:center">${n + 1}</span>` : ''; };
    const secili = (u) => (s.tur === 'tur' ? s.secili.includes(u) : u === s.foto);
    const dugmeAd = { foto: 'Videoyu oluştur · ücretsiz', uzay: 'Videoyu oluştur · ' + INIS_KREDI + ' kredi', video: 'Videoyu oluştur', drone: 'Videoyu oluştur', tur: 'Turu oluştur' }[s.tur];
    const konumSatir = s.tur !== 'uzay' ? '' : s.konum === null || s.konum === undefined ? `<div class="k soluk">Konum aranıyor…</div>`
      : s.konum ? `<div class="bilgi-k">${ic('konum', 18)}<div>Konum <b>${INIS_DUZEY_AD[s.konum.duzey] || s.konum.duzey}</b> bilgisinden bulundu.${INIS_KESIN.includes(s.konum.duzey) ? ' Binaların seçilebileceği kadar yaklaşılır ve konum işaretlenir.' : ' Konum adresten tahmin edildiği için binalar görünecek kadar yaklaşılır ama tek bina işaretlenmez, "yaklaşık konum" çemberi çizilir. Tam konum için ilanda haritadan işaretle ya da ada/parsel gir.'}</div></div>`
      : `<div class="bilgi-k">${ic('konum', 18)}<div>Bu ilanın konumu bulunamadı. İlanı düzenleyip haritadan işaretle ya da ada/parsel gir.</div></div>`;
    const fotoIpucu = { video: 'Videoya dönüşecek fotoğrafı seç.', drone: 'Binanın dışarıdan çekilmiş fotoğrafını seç.', tur: `Odaları gezilecek sırayla seç (${adet} seçili). 3 oda ${COK_ODA_KREDI[3]} kredi, 6 oda ${COK_ODA_KREDI[6]} kredi.` }[s.tur];
    const n0 = turler.length > 1 ? 1 : 0;
    const taslakHtml = (s.taslaklar && s.taslaklar.length) ? `<div class="mv-adim"><b style="background:var(--guven)">✓</b>Hazırladığın videolar (${s.taslaklar.length})</div><div class="k soluk" style="margin-top:-6px">Bunlar ilanında görünmüyor. İstersen ilana ekle, istersen sil.</div>${s.taslaklar.map((x) => `<div class="mv-taslak"><div class="mv-kart-ad"><b>${kac((VIDEO_TUR[x.tur] || VIDEO_TUR.video).kisa)}</b><span class="k soluk">İlanda değil</span></div>${videoOynatHtml(x)}<div class="izgara2"><button class="btn" data-tekle="${x.id}">İlana ekle</button><button class="btn sade" data-tsil="${x.id}">Sil</button></div><div class="izgara2"><button class="btn sade" data-tvk="kaydet" data-tid="${x.id}">${ic('indir', 18)}Telefona kaydet</button><button class="btn sade" data-tvk="paylas" data-tid="${x.id}">Paylaş</button></div></div>`).join('')}<div class="k soluk">Paylaş'a basınca WhatsApp, Instagram ve diğer uygulamalar listelenir.</div>` : '';
    el.innerHTML = `<div class="mv-bas"><h2>MülkümVideo</h2><div class="k soluk">İlanın için tanıtım videosu hazırla, kaydet ya da paylaş.</div></div>
      ${taslakHtml}
      ${turler.length > 1 ? `<div class="mv-adim"><b>1</b>Video türü</div>
      <div class="liste mv-tur">${turler.map(([k, a, f, d]) => `<button class="oge ${k === s.tur || (k === 'drone' && s.tur === 'uzay') ? 'secili' : ''}" data-t="${k}">${ic(k === 'foto' ? 'foto' : 'yildiz', 18)}<div class="ara"><div>${a}</div><div class="k soluk">${d}</div></div><span class="mv-fiyat${k === 'foto' ? ' ucretsiz' : ''}">${f}</span></button>`).join('')}</div>` : ''}
      ${s.tur === 'drone' || s.tur === 'uzay' ? `<div class="mv-adim"><b>${n0 + 1}</b>Drone türü</div><div class="ciplar"><button class="cip ${s.tur === 'drone' ? 'secili' : ''}" data-d="drone">Bina fotoğrafından · ${VIDEO_TUR.drone.kredi} kredi</button><button class="cip ${s.tur === 'uzay' ? 'secili' : ''}" data-d="uzay">Uzaydan konuma · ${INIS_KREDI} kredi</button></div><div class="k soluk" style="margin-top:-6px">${ACIKLAMA[s.tur]}</div>${konumSatir}` : ''}
      ${YEREL.includes(s.tur) ? '' : `<div class="mv-adim"><b>${n0 + (s.tur === 'drone' ? 2 : 1)}</b>Fotoğraf</div><div class="k soluk" style="margin-top:-6px">${fotoIpucu}</div>
      <div class="deko-fotolar">${i.fotolar.map((u) => `<button data-f="${u}" class="${secili(u) ? 'secili' : ''}" style="background-image:url('${u}');position:relative" aria-label="Fotoğraf seç">${s.tur === 'tur' ? sira(u) : ''}</button>`).join('')}</div>`}
      <div class="mv-adim"><b>${n0 + (s.tur === 'foto' ? 1 : s.tur === 'drone' ? 3 : 2)}</b>Ayarlar</div>
      <div class="ciplar">${[['9:16', 'Dikey · Reels'], ['16:9', 'Yatay · ilan']].map(([k, a]) => `<button class="cip ${k === s.oran ? 'secili' : ''}" data-o="${k}">${a}</button>`).join('')}</div>
      ${s.tur === 'foto' ? `<div class="ciplar">${TUR_SURE.map((n) => `<button class="cip ${n === s.sure ? 'secili' : ''}" data-s="${n}">${n} saniye</button>`).join('')}</div>` : ''}
      ${s.tur === 'tur' ? `<div class="ciplar"><button class="cip ${s.anlatim ? 'secili' : ''}" data-a="1">Sesli anlatım</button><button class="cip ${s.anlatim ? '' : 'secili'}" data-a="0">Sessiz</button></div>` : ''}
      ${!YEREL.includes(s.tur) && !yz
        ? `<button class="btn tam" disabled>${ic('yildiz', 18, '#fff')}Çok yakında</button><div class="bilgi-k">${ic('yildiz', 18)}<div>AI videoları son denemelerden geçiyor. Açıldığında bu ekrandan oluşturabileceksin; şimdilik ücretsiz <b>Fotoğraf turu</b>nu kullanabilirsin.</div></div>`
        : s.tur === 'uzay' && !s.konum
        ? `<button class="btn tam" disabled>${ic('konum', 18, '#fff')}${s.konum === false ? 'Konum gerekli' : 'Konum aranıyor…'}</button>`
        : s.tur === 'uzay' && bakiye < kredi
        ? `<div class="bilgi-k">${ic('kredi', 18)}<div>Bakiyen <b>${bakiye} kredi</b>. Bu video <b>${kredi} kredi</b>.</div></div><a class="btn tam" href="#/kredi">${ic('kredi', 18, '#fff')}Kredi al</a>`
        : YEREL.includes(s.tur)
        ? `<button class="btn tam" id="vUret">${ic(s.tur === 'uzay' ? 'konum' : 'foto', 18, '#fff')}${dugmeAd}</button><div class="k soluk" id="tDurum" style="text-align:center;min-height:18px"></div>${s.tur === 'uzay' ? `<div class="k soluk" style="text-align:center">Bakiyen: <b>${bakiye} kredi</b></div>` : ''}`
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
      }[s.tur]}${YEREL.includes(s.tur) ? '' : ' İlanda "AI ile oluşturuldu" notuyla gösterilir.'}</div>`;
    const tekle = (x) => { const m = (i.alanlar && i.alanlar.videolar) || []; return [...m, { url: x.url, tur: x.tur, kaynak: x.kaynak, ...(klipListe(x).length > 1 ? { parcalar: klipListe(x) } : {}), ...(x.ses ? { ses: x.ses } : {}) }].slice(-6); };
    el.querySelectorAll('[data-tekle]').forEach((x) => (x.onclick = async () => {
      const v = (s.taslaklar || []).find((y) => y.id === x.dataset.tekle); if (!v) return;
      if (await dene(() => videoListesiKaydet(i, tekle(v)), 'Video ilana eklendi')) { s.taslaklar = s.taslaklar.filter((y) => y.id !== v.id); ciz(el); videoKartiYukle(i); }
    }));
    el.querySelectorAll('[data-tvk]').forEach((x) => (x.onclick = () => { const v = (s.taslaklar || []).find((y) => y.id === x.dataset.tid); if (v) videoDisaAktar(i, v, x.dataset.tvk); }));
    el.querySelectorAll('[data-tsil]').forEach((x) => (x.onclick = async () => {
      const id = x.dataset.tsil;
      if (await onayla('Video silinsin mi?', 'Bu video kalıcı olarak silinir ve geri alınamaz.', 'Sil', true)) {
        try { await videoCagir('video_sil', { id }); toast('Video silindi'); } catch (e) { toast(e.message); }
        videoKartiYukle(i);
      }
      videoSheet(i, s.tur);
    }));
    videoListeBagla(el);
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
          let odeme = null;
          if (s.tur === 'uzay') { d.textContent = 'Kredi düşülüyor…'; odeme = await videoCagir('inis_ode', { ilan: i.id }); }
          let r;
          try { r = s.tur === 'uzay' ? await inisUret(i, s.konum, s, ilerle) : await turUret(i, s, ilerle); }
          catch (x) { if (odeme) { try { await videoCagir('inis_iade', { id: odeme.id }); toast('Video oluşturulamadı; kredin iade edildi'); } catch (_) {} } throw x; }
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
  sheetAc('<div id="videoS" class="mv"></div>', (kok) => {
    const el = kok.querySelector('#videoS'); ciz(el); videoListeBagla(el);
    if (!(ben() && i.sahip === ben().id)) return;
    sb.from('video_isleri').select('*').eq('ilan', i.id).neq('tur', 'inis').eq('durum', 'hazir').order('olusturma', { ascending: false }).limit(10).then(({ data }) => {
      const ekli = new Set(((i.alanlar && i.alanlar.videolar) || []).map((v) => v.url));
      s.taslaklar = (data || []).filter((x) => x.url && !ekli.has(x.url));
      if (document.body.contains(el) && !s.calisiyor && !s.sonuc && s.taslaklar.length) { ciz(el); videoListeBagla(el); }
    }, () => {});
  });
}

// ---------- Uzaydan konuma iniş (14.10, ücretsiz): uydu görüntüsünde dünyadan ilanın konumuna yaklaşan video ----------
// Konum: ilanKonumu() (haritadaki işaret → ada/parsel → sokak → mahalle → ilçe). Görüntüler uydu fonksiyonundan (Mapbox, 1280x1280).
// Konum ne kadar kesinse o kadar yaklaşılır; adresten tahmin edilen konumda bina seçilecek kadar inilmez (yanlış binayı göstermemek için).
const INIS_KREDI = 1;
const INIS_SON_Z = { bina: 18, parsel: 18, sokak: 18, mahalle: 17, 'ilçe': 15 };
const INIS_KESIN = ['bina', 'parsel', 'sokak'];   // bu düzeylerde konum işareti, diğerlerinde "yaklaşık konum" çemberi
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
    if (pin > 0 && !INIS_KESIN.includes(k.duzey)) {
      // Konum adresten tahmin edildi: tek bir binayı göstermek yanıltır; yaklaşık alan çemberi çizilir
      const cx = W / 2, cy = H / 2;
      c.globalAlpha = pin; c.setLineDash([10 * ol, 8 * ol]); c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 3 * ol;
      c.beginPath(); c.arc(cx, cy, 170 * ol, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      c.fillStyle = 'rgba(6,10,18,.6)'; c.font = '700 ' + Math.round(20 * ol) + 'px ' + YAZI; c.textAlign = 'center';
      const et = 'Yaklaşık konum', ew = c.measureText(et).width + 24 * ol;
      c.beginPath(); c.roundRect(cx - ew / 2, cy - 170 * ol - 46 * ol, ew, 34 * ol, 10 * ol); c.fill();
      c.fillStyle = '#fff'; c.fillText(et, cx, cy - 170 * ol - 22 * ol); c.textAlign = 'left'; c.globalAlpha = 1;
    } else if (pin > 0) {
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
