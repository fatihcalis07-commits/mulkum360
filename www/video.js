// MülkümVideo (ücretli): ilan fotoğrafından yapay zekâ ile drone görünümlü video ya da hareketli tanıtım videosu.
// Üretim sunucuda (mulkum-ai: video_baslat / video_durum) async yürür; işler video_isleri tablosunda durur, ekran kapansa da kaybolmaz.
const VIDEO_TUR = {
  drone: { ad: 'MülkümVideo Drone', kisa: 'Drone', aciklama: 'Dış cephe fotoğrafından havadan çekilmiş gibi, yükselen ve binanın çevresinde dönen video', kredi: 3 },
  video: { ad: 'MülkümVideo Tanıtım', kisa: 'Video', aciklama: 'Oda ya da dış cephe fotoğrafını kameranın yavaşça ilerlediği kısa bir videoya çevirir', kredi: 3 }
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
  const oynat = (v) => `<video src="${kac(v.url)}" poster="${kac(v.kaynak || '')}" controls playsinline preload="metadata" style="width:100%;border-radius:12px;background:#000;display:block"></video>`;
  const bekleyen = isler.filter((x) => x.durum === 'bekliyor');
  const hazirEklenmemis = isler.filter((x) => x.durum === 'hazir' && !ekli.has(x.url));
  const sonHata = isler.find((x) => x.durum === 'hata' && Date.now() - new Date(x.olusturma).getTime() < 3600000);
  if (!videolar.length && !sahip) { kap.remove(); return; }
  const yalnizDugme = !videolar.length && !bekleyen.length && !hazirEklenmemis.length && !sonHata;
  kap.className = yalnizDugme ? '' : 'kart';
  const dugme = yalnizDugme
    ? `<button class="kart satir" id="videoAc" style="text-align:left;width:100%;font:inherit;color:inherit;cursor:pointer">${ic('foto', 22, 'var(--vurgu-ikon)')}<div class="ara"><b>MülkümVideo: drone ve tanıtım videosu</b><div class="k soluk">${i.ana === 'emlak' ? 'Havadan drone görünümü ya da hareketli tanıtım videosu' : 'Fotoğraftan hareketli tanıtım videosu'} · video başına ${VIDEO_TUR.video.kredi} kredi</div></div><span class="ok">›</span></button>`
    : `<button class="btn cizgili tam" id="videoAc" style="margin-top:10px">${ic('foto', 18)}Yeni video oluştur · ${VIDEO_TUR.video.kredi} kredi</button>`;
  kap.innerHTML =`${videolar.length ? `<h3>Videolar</h3>${videolar.map((v, n) => `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">${oynat(v)}<div class="satir k soluk"><span class="ara">${kac((VIDEO_TUR[v.tur] || VIDEO_TUR.video).ad)} · yapay zekâ ile oluşturuldu</span>${sahip ? `<button class="btn sade" data-vkaldir="${n}">İlandan kaldır</button>` : ''}</div></div>`).join('')}
    <div class="k soluk">Videolar ilan fotoğrafından yapay zekâyla üretildi; gerçeği birebir yansıtmayabilir.</div>` : ''}
    ${bekleyen.map((x) => `<div class="bilgi-k" style="margin-top:8px">${ic('yildiz', 18)}<div><b>${VIDEO_TUR[x.tur].ad} hazırlanıyor…</b><br>Genelde 1-3 dakika sürür. Bu sayfadan çıkabilirsin; video hazır olunca burada görünür.</div></div>`).join('')}
    ${hazirEklenmemis.map((x) => `<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px"><b>${VIDEO_TUR[x.tur].ad} hazır</b>${oynat(x)}<button class="btn tam" data-vekle="${x.id}">İlana ekle</button></div>`).join('')}
    ${sonHata && !bekleyen.length ? `<div class="k soluk" style="margin-top:8px">Son video oluşturulamadı; kredin iade edildi.</div>` : ''}
    ${sahip ? dugme : ''}`;
  kap.querySelectorAll('[data-vkaldir]').forEach((b) => (b.onclick = async () => {
    if (await dene(() => videoListesiKaydet(i, videolar.filter((_, n) => n !== +b.dataset.vkaldir)), 'Video ilandan kaldırıldı')) videoKartiYukle(i);
  }));
  kap.querySelectorAll('[data-vekle]').forEach((b) => (b.onclick = async () => {
    const x = isler.find((y) => y.id === b.dataset.vekle);
    if (await dene(() => videoListesiKaydet(i, [...videolar, { url: x.url, tur: x.tur, kaynak: x.kaynak }].slice(-6)), 'Video ilana eklendi')) videoKartiYukle(i);
  }));
  const ac = kap.querySelector('#videoAc'); if (ac) ac.onclick = () => videoSheet(i);
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

function videoSheet(i) {
  const s = { tur: i.ana === 'emlak' ? 'drone' : 'video', foto: i.fotolar[0], oran: '16:9' };
  const ciz = (el) => {
    const t = VIDEO_TUR[s.tur], bakiye = (ben() && ben().kredi) || 0;
    el.innerHTML = `<h2 style="font-size:19px;font-weight:800">MülkümVideo</h2>
      <div class="segment">${Object.entries(VIDEO_TUR).filter(([k]) => k !== 'drone' || i.ana === 'emlak').map(([k, v]) => `<button class="${k === s.tur ? 'secili' : ''}" data-t="${k}">${v.ad}</button>`).join('')}</div>
      <div class="k soluk">${t.aciklama}.${s.tur === 'drone' ? ' En iyi sonuç için binanın dışarıdan çekilmiş bir fotoğrafını seç.' : ''}</div>
      <div class="deko-fotolar">${i.fotolar.map((u) => `<button data-f="${u}" class="${u === s.foto ? 'secili' : ''}" style="background-image:url('${u}')" aria-label="Fotoğraf seç"></button>`).join('')}</div>
      <div class="ciplar">${[['16:9', 'Yatay (ilan)'], ['9:16', 'Dikey (Reels, durum)']].map(([k, a]) => `<button class="cip ${k === s.oran ? 'secili' : ''}" data-o="${k}">${a}</button>`).join('')}</div>
      ${bakiye < t.kredi
        ? `<div class="bilgi-k">${ic('kredi', 18)}<div>Bakiyen <b>${bakiye} kredi</b>. Bu video <b>${t.kredi} kredi</b>.</div></div><a class="btn tam" href="#/kredi">${ic('kredi', 18, '#fff')}Kredi al</a>`
        : `<button class="btn tam" id="vUret">${ic('yildiz', 18, '#fff')}Videoyu oluştur · ${t.kredi} kredi</button><div class="k soluk" style="text-align:center">Bakiyen: <b>${bakiye} kredi</b></div>`}
      <div class="k soluk">5 saniyelik, 720p, sessiz video. Hazırlanması 1-3 dakika sürer; video oluşturulamazsa kredi iade edilir. Videolar ilanda "yapay zekâ ile oluşturuldu" notuyla gösterilir.</div>`;
    el.querySelectorAll('[data-t]').forEach((x) => (x.onclick = () => { s.tur = x.dataset.t; ciz(el); }));
    el.querySelectorAll('[data-f]').forEach((x) => (x.onclick = () => { s.foto = x.dataset.f; ciz(el); }));
    el.querySelectorAll('[data-o]').forEach((x) => (x.onclick = () => { s.oran = x.dataset.o; ciz(el); }));
    const u = el.querySelector('#vUret'); if (u) u.onclick = async () => {
      u.disabled = true; u.textContent = 'Başlatılıyor…';
      try {
        await videoCagir('video_baslat', { tur: s.tur, foto: s.foto, oran: s.oran, ilan: i.id });
        sheetKapat(); toast('Video hazırlanıyor; 1-3 dakika içinde ilan sayfasında görünür');
        videoKartiYukle(i);
      } catch (x) { toast(x.message); ciz(el); }
    };
  };
  sheetAc('<div id="videoS"></div>', (el) => ciz(el.querySelector('#videoS')));
}
