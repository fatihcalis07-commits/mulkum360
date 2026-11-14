// MülkümAI: Gemini (ücretsiz katman) üzerinden emlak/vasıta asistanı.
// Anahtar sunucuda (GEMINI_API_KEY); yalnız giriş yapmış üye, günlük sınırla kullanır.
import { createClient } from 'npm:@supabase/supabase-js@2';

// Sırayla denenir: yoğunluk (503/429) ya da kaldırılmış model (404) olursa sonrakine geçilir.
const MODELLER = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest'];
const SINIR = 30;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const SISTEM = `Sen MülkümAI'sın: Mülküm360 uygulamasının Türkçe emlak ve vasıta asistanısın.
Kurallar:
- Kısa, sade, saygılı Türkçe yaz; madde işaretlerini az kullan.
- Asla fiyat, metrekare değeri, faiz oranı, istatistik ya da yasa maddesi UYDURMA. Kesin bilmediğin rakam verme.
  Değer sorulursa uygulamadaki "Mülküm ne kadar eder?" değerleme aracını öner.
- Sana verilen "İLAN VERİSİ" varsa yalnız onu kullan; olmayan bilgiyi varmış gibi söyleme.
- Hukuki, vergisel ya da finansal kesin tavsiye verme; gerektiğinde uzmana (avukat, mali müşavir, lisanslı değerleme uzmanı, ekspertiz) yönlendir.
- Dolandırıcılık işaretlerine (kapora isteme, görmeden ödeme, platform dışına çekme) karşı uyar.
- Kişisel veri isteme.`;

const GOREV: Record<string, (v: Record<string, unknown>) => string> = {
  sohbet: (v) => String(v.soru || ''),
  aciklama: (v) => `Aşağıdaki bilgilerle satıcı ağzından, abartısız, 600 karakteri geçmeyen Türkçe bir ilan açıklaması yaz. Bilgide olmayan özellik ekleme, fiyat yazma, iletişim bilgisi yazma.\nİLAN VERİSİ: ${JSON.stringify(v.ilan).slice(0, 2000)}`,
  ice_aktar: (v) => `Kullanıcının kendi ilanından yapıştırdığı metinden ilan alanlarını çıkar. YALNIZ geçerli JSON döndür, açıklama yazma. Metinde olmayan alanı hiç yazma, tahmin etme.
Temel alanlar: {"alt":"aşağıdaki kategori listesinden anahtar (ör. konut, arsa, otomobil, suv, motor)","baslik":"10-80 karakter; ilandaki başlığı al ama TAMAMI BÜYÜK HARF ise normal Türkçe yazıma çevir (yalnız cümle başı, özel isim ve kısaltmalar büyük; 2+1, m², AVM gibi kalıplar korunur), bariz yazım hatalarını düzelt (GENİŞŞ → geniş), ünlem ve emoji ekleme","fiyat":sayı (yalnız rakam, TL; ör. 4500000),"il":"il adı","ilce":"","mahalle":"(yalnız emlak; Mahallesi eki olmadan)","sokak":"yalnız emlak; cadde/sokak adı, kapı no olmadan","aciklama":"ilan sahibinin açıklama yazısı; kısaltma ya da özetleme yapma, aynen al (en çok 2500 karakter); yalnız telefon, e-posta ve bağlantıları çıkar. Ayrı bir açıklama bölümü yoksa metindeki serbest yazıları birleştir"}
Ek alanlar (anahtar: izinli değerler). Seçenekli alanlara yalnız listedeki değeri aynen yaz; sayı alanlarına yalnız rakam yaz (ör. m2net 120):
${String(v.sema || 'islem: Satılık | Kiralık | Devren\noda: 3+1 gibi\nm2net: yalnız rakam\nm2brut: yalnız rakam').slice(0, 2500)}
${/m2net/.test(String(v.sema || "m2net")) ? "Net m² yazmıyorsa ama tek bir m² varsa onu m2net olarak yaz. İşlem yazmıyorsa fiyattan ve metinden çıkar (kira ise Kiralık)." : "Araç ilanıdır: km ve model yılını yalnız rakam yaz; boya/değişen bilgisini hasar alanına listedeki değerle yaz (ör. 2 parça boyalı → Boyalı parça var; ağır hasar kayıtlı → Ağır hasar kayıtlı)."}
${v.sayfa ? 'Not: METİN bir ilan sayfasının tamamıdır; menü, reklam, benzer ilanlar ve site yazılarını yok say, yalnız bu ilanın bilgilerini al. "İlan Detayları"/"Açıklama" bölümüne öncelik ver.\n' : ''}METİN: ${String(v.metin || '').slice(0, v.sayfa ? 9000 : 3000)}`,
  belge_oku: (v) => `Bu fotoğraf bir ${v.tur === 'ruhsat' ? 'araç ruhsatı' : 'tapu senedi'}. Yalnız mülkün/aracın teknik bilgilerini çıkar. Malik adı, T.C. kimlik no, adres, imza, seri no, plaka sahibi gibi KİŞİSEL VERİLERİ ASLA yazma. Okuyamadığın alanı hiç yazma, tahmin etme.
YALNIZ geçerli JSON döndür:
${v.tur === 'ruhsat'
    ? '{"ana":"vasita","alt":"otomobil|suv|elektrikli|motor|minivan|ticari|karavan|klasik","marka":"","model":"ticari adı/tipi","yil":model yılı sayı,"yakit":"Benzin|Dizel|LPG & Benzin|Hibrit|Elektrik","renk":"","motorHacmi":sayı cc,"motorGucu":sayı kW ya da HP,"kasa":"","baslik":"marka model yıl biçiminde 10-80 karakter"}'
    : '{"ana":"emlak","alt":"konut|arsa|isyeri|yazlik|bina","il":"","ilce":"","mahalle":"(Mahallesi eki olmadan)","ada":"rakam","parsel":"rakam","m2brut":yüzölçümü/alan sayı,"nitelik":"tapudaki niteliği aynen (ör. Mesken, Arsa, Dükkan)","kat":"bağımsız bölümün katı","blok":"","bagimsizBolum":"","tapuTuru":"Kat mülkiyeti|Kat irtifakı|Hisseli|Müstakil tapu","baslik":"il ilçe mahalle ve nitelikten 10-80 karakter başlık"}'}`,
  // Ajanda: emlakçının serbest cümlesini kayda çevirir
  ajanda_coz: (v) => `Bir emlak danışmanının ajandasına yazdığı cümleyi kayda çevir. Şu an: ${String(v.simdi || '')} (Europe/Istanbul). "yarın", "cuma", "haftaya", "öğleden sonra" gibi ifadeleri bu tarihe göre çöz; saat yoksa 10:00 kullan.
YALNIZ geçerli JSON döndür: {"baslik":"kısa iş tanımı, 3-8 kelime (ör. Yer gösterme · Kadıköy 3+1)","tarih":"YYYY-MM-DDTHH:mm","musteri":"kişi adı varsa","not":"varsa ek ayrıntı","hatirlat":dakika olarak hatırlatma (varsayılan 30; 'bir gün önce' 1440)}
CÜMLE: ${String(v.metin || '').slice(0, 500)}`,
  // Ajanda: günün/haftanın kısa planı ve öneriler
  ajanda_ozet: (v) => `Bir emlak danışmanının ajandasını oku. Türkçe, en çok 6 kısa madde yaz: bugünün öncelik sırası, çakışan ya da sıkışık saatler, gecikmiş işler, müşteri takibi için 1-2 somut öneri (ör. dün görüşülen müşteriyi ara). Abartı yok, emoji yok.
Şu an: ${String(v.simdi || '')}
AJANDA: ${JSON.stringify(v.ajanda).slice(0, 4000)}
MÜŞTERİLER: ${JSON.stringify(v.musteriler).slice(0, 2000)}`,
  ilan_ozet: (v) => `Alıcı gözüyle bu ilanı 3-4 kısa cümlede değerlendir: öne çıkanlar, sorulması gerekenler, kontrol edilmesi gerekenler. Yalnız verilen bilgiyi kullan.\nİLAN VERİSİ: ${JSON.stringify(v.ilan).slice(0, 3000)}`
};

// MülkümDeko: ilan fotoğrafındaki odayı seçilen stilde yeniden döşer; mimari aynı kalır.
const GORSEL_MODELLER = ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'];
const DEKO_SINIR = 12;
// Stil: yalnız malzeme, renk ve hava (eşya türü odaya göre ODA_ESYA'dan gelir; mutfağa kanepe konmasın diye)
const STILLER: Record<string, string> = {
  Modern: 'luxury modern style: sleek high-end Italian design, marble, brass and matte black metal accents, warm walnut wood, neutral palette with one rich accent colour, sculptural designer lighting',
  Klasik: 'luxury classic style: elegant traditional design, carved solid wood with gold leaf details, marble, crystal lighting, silk and velvet fabrics, rich warm palette',
  'İskandinav': 'luxury scandinavian style: premium Danish design, light solid oak, leather and wool boucle, linen, white and soft natural tones, designer pendant lights, plants',
  Rustik: 'luxury rustic style: premium reclaimed solid wood, natural stone, leather, handwoven textiles, wrought iron and brass, warm earthy palette'
};
const ODALAR: Record<string, string> = { 'Oturma odası': 'living room', 'Yatak odası': 'bedroom', Mutfak: 'kitchen', Banyo: 'bathroom' };
// Oda türüne özel: ne kalır, ne yenilenir, ne asla eklenmez
const ODA_ESYA: Record<string, string> = {
  'living room': 'This is a LIVING ROOM. Replace the loose furniture with new luxury pieces of similar size in roughly the same places: sofa, armchairs, coffee table, side tables, TV unit, rug, curtains, floor and table lamps, cushions, plants and wall art. Do not add a bed.',
  bedroom: 'This is a BEDROOM. Stage it with a luxury upholstered bed with premium bedding and pillows, matching nightstands with lamps, a bench or armchair, rug, curtains and wall art. Keep built-in wardrobes in place but give them completely new luxury fronts. Do not add sofas or a TV wall.',
  kitchen: 'This is a KITCHEN and must stay a kitchen. Keep the layout: cabinets, countertop, sink, stove, oven, fridge and appliances stay in the same places and sizes. But completely renovate the look into a luxury designer kitchen: replace ALL cabinet doors with new luxury fronts and handles, replace the old countertop and the wall tiles with continuous marble or quartz, new designer faucet, under-cabinet lighting and pendant lights, integrated stainless or panel-ready appliances. Clear every item off the counters (no kettle, no toaster, no pots) except one vase or bowl. Replace any tablecloth, plastic table or chairs with a luxury dining table and upholstered chairs (or bar stools) in the same spot, and replace any floor rug with a premium runner or remove it. Never add sofas, armchairs, beds, coffee tables or living-room furniture.',
  bathroom: 'This is a BATHROOM and must stay a bathroom. Keep the toilet, sink, shower or bathtub and plumbing in the same places. But fully renovate the look into a luxury spa bathroom: new floating vanity with stone top, designer faucets and fittings, large backlit mirror, new large-format marble or stone tiles on walls and floor, frameless glass shower screen, fluffy towels, plants. Remove all toiletries, laundry and clutter. Never add sofas, beds or other furniture.'
};
// deno-lint-ignore no-explicit-any
async function deko(g: Record<string, unknown>, sb: any, uid: string, anahtar: string) {
  const foto = String(g.foto || ''), stil = STILLER[String(g.stil)], oda = ODALAR[String(g.oda)];
  if (!stil || !oda) return yanit({ hata: 'Oda ve stil seç.' }, 400);
  // Yalnız uygulamanın kendi deposundaki fotoğraflar işlenir.
  if (!foto.startsWith(Deno.env.get('SUPABASE_URL') + '/storage/v1/object/public/ilan-fotolari/')) return yanit({ hata: 'Fotoğraf geçersiz.' }, 400);

  const kaynak = await fetch(foto).catch(() => null);
  if (!kaynak?.ok) return yanit({ hata: 'Fotoğraf okunamadı.' }, 400);
  const bayt = new Uint8Array(await kaynak.arrayBuffer());
  if (bayt.length > 8_000_000) return yanit({ hata: 'Fotoğraf çok büyük.' }, 400);
  let ikili = ''; for (let i = 0; i < bayt.length; i += 0x8000) ikili += String.fromCharCode(...bayt.subarray(i, i + 0x8000));
  const istem = `You are an award-winning interior architect. Completely redesign, renovate and restage this exact photo of a ${oda} as a finished luxury project: one coherent colour and material palette, layered lighting (ceiling, accent and lamps), well-proportioned furniture placement with clear walking paths, balanced composition and high-end finishes. Apply ${stil}. ${ODA_ESYA[oda]} RENOVATE EVERYTHING that is not structural: restyle only the doors that already exist in the input (new luxury door leaf and frame in exactly the same position and size), replace every built-in wardrobe or cabinet front, every piece of furniture, every textile, all lighting fixtures and all wall tiles with new luxury ones. Nothing old should remain visible except the room shell. Keep the SAME framing as the input: same camera position, lens, field of view, crop, room size and proportions, and keep walls, windows and door openings in exactly the same places. STRICT RULE: the output must have exactly the same number of doors, windows and openings as the input, at the same positions. Never add a new door, window, arch or opening, never move one, never turn a wall or a wall section into a door. Where the input shows a wall, the output shows a wall. DECLUTTER COMPLETELY: remove every small and unnecessary object — kettles, small appliances on counters, pots, dish racks, food, bottles, cleaning products, sponges, towels, magnets, stickers, papers, cables, laptops, chargers, toys, shoes, bags, boxes, laundry, baskets, stepladders and anything stuck inside or on the oven, fridge or windows. All counters, tables and floors must be clear except at most one vase, bowl or plant per surface. It should look like an upscale interior-design magazine photo. Photorealistic real-estate photo, no text, no watermark, no logo, no people.`;
  const kaydet = async (cikti: Uint8Array, tur: string) => {
    const yol = `${uid}/deko-${crypto.randomUUID()}.${tur.includes('png') ? 'png' : 'jpg'}`;
    const { error } = await sb.storage.from('ilan-fotolari').upload(yol, cikti, { contentType: tur });
    if (error) { console.error('deko yükleme', error.message); return yanit({ hata: 'Görsel kaydedilemedi.' }, 500); }
    return yanit({ url: sb.storage.from('ilan-fotolari').getPublicUrl(yol).data.publicUrl });
  };
  // 1) Pollinations (POLLINATIONS_API_KEY varsa): OpenAI uyumlu /v1/images/edits, FLUX Kontext Pro → yedek FLUX.2 Klein
  const pk = Deno.env.get('POLLINATIONS_API_KEY'); const pHata: string[] = [];
  if (pk) {
    for (const model of ['black-forest-labs/flux.1-kontext-pro', 'black-forest-labs/flux.2-klein-4b']) {
      const fd = new FormData();
      fd.append('model', model); fd.append('prompt', istem); fd.append('n', '1');
      fd.append('image', new Blob([bayt], { type: kaynak.headers.get('content-type') || 'image/jpeg' }), 'oda.jpg');
      const pr = await fetch('https://gen.pollinations.ai/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${pk}` }, body: fd, signal: AbortSignal.timeout(120000) }).catch(() => null);
      if (!pr?.ok) { const m = pr ? (await pr.text()).slice(0, 300) : 'zaman aşımı'; pHata.push(model.split('/')[1] + ' ' + (pr?.status ?? '') + ' ' + m); console.error('deko pollinations', model, m); continue; }
      const pj = await pr.json().catch(() => null), o = pj?.data?.[0];
      if (o?.b64_json) return await kaydet(Uint8Array.from(atob(o.b64_json), (c) => c.charCodeAt(0)), 'image/png');
      if (o?.url) { const ir = await fetch(o.url).catch(() => null); if (ir?.ok) return await kaydet(new Uint8Array(await ir.arrayBuffer()), ir.headers.get('content-type') || 'image/jpeg'); }
      console.error('deko pollinations boş', model, JSON.stringify(pj).slice(0, 300));
    }
  }
  // 2) Gemini (faturalandırma açıksa)
  const govde = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: istem }, { inlineData: { mimeType: kaynak.headers.get('content-type') || 'image/jpeg', data: btoa(ikili) } }] }],
    generationConfig: { responseModalities: ['IMAGE'] }
  });
  let r: Response | null = null;
  for (const model of GORSEL_MODELLER) {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': anahtar }, body: govde, signal: AbortSignal.timeout(90000)
    }).catch(() => null);
    if (r?.ok) break;
    console.error('deko', model, r?.status ?? 'zaman aşımı', r ? (await r.text()).slice(0, 300) : '');
    if (r && ![404, 429, 500, 503].includes(r.status)) break;
  }
  if (!r?.ok) return yanit({ ayrinti: pHata.join(' | ').slice(0, 600), hata: r?.status === 429 ? 'MülkümDeko şu an kullanılamıyor: yapay zekâ görsel kotası dolu. Yönetici bilgilendirildi.' : r?.status === 503 ? 'MülkümDeko şu an yoğun, biraz sonra tekrar dene.' : 'Görsel oluşturulamadı.' }, 502);
  const d = await r.json();
  const parca = (d.candidates?.[0]?.content?.parts || []).find((p: { inlineData?: { data: string } }) => p.inlineData?.data);
  if (!parca) return yanit({ hata: 'Görsel oluşturulamadı, başka bir fotoğrafla dene.' }, 502);
  return await kaydet(Uint8Array.from(atob(parca.inlineData.data), (c) => c.charCodeAt(0)), parca.inlineData.mimeType || 'image/png');
}

// İlan bağlantısı: kullanıcının yapıştırdığı tek sayfayı normal bir tarayıcı gibi bir kez okur.
// Bot koruması olan siteler (ör. sahibinden) engellerse aşılmaya çalışılmaz; kullanıcıdan metni kopyalaması istenir.
// İlan sayfasındaki fotoğraf adresleri: og:image, JSON-LD image, galeri <img>/data-src ve sayfa içi JSON'daki büyük görseller
function linkFotolar(html: string, taban: URL): string[] {
  const l: string[] = [];
  const ekle = (u: string) => {
    try {
      u = u.replace(/\\u002F/gi, '/').replace(/\\\//g, '/').replace(/&amp;/g, '&').trim();
      if (u.startsWith('//')) u = 'https:' + u;
      const t = new URL(u, taban).href;
      if (!/^https:\/\//.test(t) || !/\.(jpe?g|png|webp)(\?|$)/i.test(t)) return;
      if (/logo|icon|ikon|avatar|sprite|banner|favicon|placeholder|blank|loading|thumb(?!nail_?big)|\/(16|24|32|48|64|96|120|150)x/i.test(t)) return;
      if (!l.includes(t)) l.push(t);
    } catch { /* geçersiz adres */ }
  };
  for (const m of html.matchAll(/<meta[^>]+property=["']og:image(?::url)?["'][^>]*content=["']([^"']+)/gi)) ekle(m[1]);
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    for (const g of m[1].matchAll(/"(?:image|contentUrl|url)"\s*:\s*(\[[^\]]*\]|"[^"]+")/g)) for (const u of g[1].matchAll(/"([^"]+)"/g)) ekle(u[1]);
  }
  for (const m of html.matchAll(/<(?:img|source)[^>]+(?:data-src|data-original|data-lazy|data-zoom-image|src|srcset)=["']([^"'\s,]+)/gi)) ekle(m[1]);
  for (const m of html.matchAll(/https?:(?:\\?\/){2}[^"'\s<>()]+?\.(?:jpe?g|webp|png)(?:\?[^"'\s<>()]*)?/gi)) ekle(m[0]);
  // Aynı fotoğrafın küçük/büyük sürümleri: yol adı aynıysa en uzun (genelde en büyük) kalsın
  const kok = (u: string) => u.replace(/[?#].*$/, '').split('/').pop()!.replace(/[_-]?(\d{2,4}x\d{2,4}|small|medium|large|big|thumb|th|s|m|l|xl)(?=\.)/i, '');
  const sec = new Map<string, string>();
  for (const u of l) { const k = kok(u); if (!sec.has(k) || u.length > sec.get(k)!.length) sec.set(k, u); }
  return [...sec.values()].slice(0, 40);
}

async function linkMetni(adres: string): Promise<{ metin: string; fotolar: string[] }> {
  let u: URL; try { u = new URL(adres); } catch { throw new Error('Bağlantı geçersiz.'); }
  if (!/^https?:$/.test(u.protocol) || /^(localhost|\d+\.\d+\.\d+\.\d+|\[.*\])$/i.test(u.hostname) || !u.hostname.includes('.')) throw new Error('Bağlantı geçersiz.');
  const c = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36', 'Accept-Language': 'tr-TR,tr' }, redirect: 'follow', signal: AbortSignal.timeout(12000) }).catch(() => null);
  const html = c?.ok ? (await c.text()).slice(0, 1500000) : '';
  const fotolar = html ? linkFotolar(html, u) : [];
  const meta = [...html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:title|og:description|description)["'][^>]*content=["']([^"']+)/gi)].map((m) => m[1]);
  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join(' ');
  const govde = html.replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  const metin = [...meta, ld.replace(/\s+/g, ' ').slice(0, 1500), govde].join('\n').slice(0, 3000).trim();
  if (metin.replace(/\s/g, '').length < 200 || /captcha|cloudflare|robot|erişim engellendi|access denied/i.test(metin.slice(0, 1500)))
    throw new Error('Bu site bağlantıdan okumaya izin vermiyor. İlan sayfasını aç, başlık, fiyat, özellikler ve açıklamayı kopyalayıp yapıştır.');
  return { metin, fotolar };
}

const yanit = (govde: unknown, durum = 200) => new Response(JSON.stringify(govde), { status: durum, headers: { ...CORS, 'Content-Type': 'application/json' } });

// ---------- MülkümVideo (ücretli) ----------
// Pollinations görüntüden video: önce Seedance 1 Pro Fast, olmazsa P-Video. İş async başlatılır, uygulama durumu sorar.
const VIDEO_KREDI: Record<string, number> = { drone: 3, video: 3 };
const VIDEO_MODELLER = ['bytedance/seedance-1-pro-fast', 'prunaai/p-video'];
const VIDEO_ISTEM: Record<string, string> = {
  drone: 'Cinematic aerial drone footage of this exact property, starting from this frame. The drone smoothly rises and pulls back while slowly orbiting, revealing the building, its roof, garden and the surrounding neighbourhood from above. Keep the architecture, facade colours, windows, balconies and surroundings exactly as in the photo; do not add, remove or reshape buildings. Daylight, stable gimbal, smooth slow motion, photorealistic real-estate drone video. No text, no watermark, no logo.',
  video: 'Smooth real-estate walkthrough video of this exact space, starting from this frame: slow, steady cinematic camera dolly forward with a gentle pan, filmed on a gimbal. Keep the room, furniture, walls, windows, doors and colours exactly as in the photo; only the camera moves. No people, no new objects, no text, no watermark. Natural light, photorealistic.',
};
const POLL = 'https://gen.pollinations.ai';

async function videoBaslat(g: Record<string, unknown>, sbY: ReturnType<typeof createClient>, uid: string) {
  const tur = String(g.tur), foto = String(g.foto || ''), oran = g.oran === '9:16' ? '9:16' : '16:9';
  const kredi = VIDEO_KREDI[tur];
  if (!kredi) return yanit({ hata: 'Video türü seç.' }, 400);
  if (!foto.startsWith(Deno.env.get('SUPABASE_URL') + '/storage/v1/object/public/ilan-fotolari/')) return yanit({ hata: 'Fotoğraf geçersiz.' }, 400);
  const pk = Deno.env.get('POLLINATIONS_API_KEY');
  if (!pk) return yanit({ hata: 'MülkümVideo henüz yapılandırılmadı.' }, 503);
  // Aynı anda en çok 2 bekleyen iş
  const { count } = await sbY.from('video_isleri').select('id', { count: 'exact', head: true }).eq('sahip', uid).eq('durum', 'bekliyor').gt('olusturma', new Date(Date.now() - 20 * 60000).toISOString());
  if ((count || 0) >= 2) return yanit({ hata: 'Hazırlanan videoların bitmesini bekle.' }, 429);
  const aciklama = tur === 'drone' ? 'MülkümVideo drone videosu' : 'MülkümVideo fotoğraftan video';
  const { data: kalan, error: kh } = await sbY.rpc('video_kredi', { p_kullanici: uid, p_miktar: -kredi, p_aciklama: aciklama });
  if (kh) return yanit({ hata: /yetersiz/.test(kh.message) ? `Kredin yetmiyor. Bu video ${kredi} kredi; Hesabım → Kredilerim bölümünden kredi alabilirsin.` : 'Kredi düşülemedi, tekrar dene.' }, 402);
  const { data: is } = await sbY.from('video_isleri').insert({ sahip: uid, ilan: g.ilan || null, tur, kaynak: foto, kredi }).select('id').single();
  const hatalar: string[] = [];
  for (const model of VIDEO_MODELLER) {
    const q = new URLSearchParams({ model, image: foto, duration: '5', aspectRatio: oran, resolution: '720p', audio: 'false', safe: 'true' });
    const r = await fetch(`${POLL}/video/${encodeURIComponent(VIDEO_ISTEM[tur])}?${q}`, { headers: { Authorization: `Bearer ${pk}`, Prefer: 'respond-async' }, signal: AbortSignal.timeout(60000) }).catch(() => null);
    if (r?.status === 202) {
      const j = await r.json().catch(() => ({}));
      await sbY.from('video_isleri').update({ is_no: j.id, model }).eq('id', is!.id);
      return yanit({ id: is!.id, kredi: kalan });
    }
    if (r?.ok && (r.headers.get('content-type') || '').includes('video')) { // önbellekten hazır geldi
      const url = await videoKaydet(sbY, uid, new Uint8Array(await r.arrayBuffer()));
      await sbY.from('video_isleri').update({ model, durum: 'hazir', url }).eq('id', is!.id);
      return yanit({ id: is!.id, url, kredi: kalan });
    }
    const m = r ? (await r.text()).slice(0, 300) : 'zaman aşımı';
    hatalar.push(`${model} ${r?.status ?? ''} ${m}`); console.error('video başlat', model, m);
  }
  const { data: iade } = await sbY.rpc('video_kredi', { p_kullanici: uid, p_miktar: kredi, p_aciklama: aciklama + ' iadesi' });
  await sbY.from('video_isleri').update({ durum: 'hata', iade: true, hata: hatalar.join(' | ').slice(0, 900) }).eq('id', is!.id);
  return yanit({ hata: 'Video şu an oluşturulamıyor, biraz sonra tekrar dene. Kredin iade edildi.', kredi: iade }, 502);
}

async function videoKaydet(sbY: ReturnType<typeof createClient>, uid: string, bayt: Uint8Array) {
  const yol = `${uid}/${crypto.randomUUID()}.mp4`;
  const { error } = await sbY.storage.from('ilan-videolari').upload(yol, bayt, { contentType: 'video/mp4' });
  if (error) throw new Error('kayıt: ' + error.message);
  return sbY.storage.from('ilan-videolari').getPublicUrl(yol).data.publicUrl;
}

async function videoDurum(id: string, sbY: ReturnType<typeof createClient>, uid: string) {
  const { data: is } = await sbY.from('video_isleri').select('*').eq('id', id).eq('sahip', uid).maybeSingle();
  if (!is) return yanit({ hata: 'Video bulunamadı.' }, 404);
  if (is.durum !== 'bekliyor') return yanit({ durum: is.durum, url: is.url, parcalar: Array.isArray(is.parcalar) ? is.parcalar.map((p: { url?: string }) => p.url).filter(Boolean) : undefined, hata: is.durum === 'hata' ? 'Video oluşturulamadı. Kredin iade edildi.' : undefined });
  if (is.tur === 'tur') return await turDurum(is, sbY, uid);
  const pk = Deno.env.get('POLLINATIONS_API_KEY')!;
  const basarisiz = async (neden: string) => {
    const { data: k } = await sbY.rpc('video_kredi', { p_kullanici: uid, p_miktar: is.kredi, p_aciklama: (is.tur === 'drone' ? 'MülkümVideo drone videosu' : 'MülkümVideo fotoğraftan video') + ' iadesi' });
    await sbY.from('video_isleri').update({ durum: 'hata', iade: true, hata: neden.slice(0, 900), guncelleme: new Date().toISOString() }).eq('id', id).eq('durum', 'bekliyor');
    return yanit({ durum: 'hata', hata: 'Video oluşturulamadı. Kredin iade edildi.', kredi: k });
  };
  if (!is.is_no) return Date.now() - new Date(is.olusturma).getTime() > 600000 ? await basarisiz('iş numarası yok') : yanit({ durum: 'bekliyor' });
  const r = await fetch(`${POLL}/v1/jobs/${is.is_no}`, { headers: { Authorization: `Bearer ${pk}` }, signal: AbortSignal.timeout(20000) }).catch(() => null);
  if (!r?.ok) return r?.status === 404 ? await basarisiz('iş bulunamadı') : yanit({ durum: 'bekliyor' });
  const j = await r.json().catch(() => ({}));
  if (j.status === 'failed') return await basarisiz(JSON.stringify(j).slice(0, 600));
  if (j.status !== 'succeeded') return Date.now() - new Date(is.olusturma).getTime() > 1800000 ? await basarisiz('30 dk zaman aşımı') : yanit({ durum: 'bekliyor' });
  const v = await fetch(j.result_url || `${POLL}/v1/jobs/${is.is_no}/result`, { headers: { Authorization: `Bearer ${pk}` }, signal: AbortSignal.timeout(60000) }).catch(() => null);
  if (!v?.ok) return yanit({ durum: 'bekliyor' });
  try {
    const url = await videoKaydet(sbY, uid, new Uint8Array(await v.arrayBuffer()));
    await sbY.from('video_isleri').update({ durum: 'hazir', url, guncelleme: new Date().toISOString() }).eq('id', id);
    return yanit({ durum: 'hazir', url });
  } catch (x) { console.error('video kaydet', (x as Error).message); return yanit({ durum: 'bekliyor' }); }
}

// ---------- Çok odalı tur (14.4): 3 ya da 6 fotoğrafın her biri 5 sn'lik klip olur; uygulama klipleri sırayla oynatır ----------
// Tek iş satırı (tur='tur'), klipler parcalar sütununda. Bir klip başlatılamaz ya da başarısız olursa turun tamamı iptal edilir, kredi iade edilir.
const TUR_KREDI: Record<number, number> = { 3: 6, 6: 10 };
const TUR_ACIKLAMA = 'MülkümVideo çok odalı tur';
type Parca = { foto: string; is_no?: string; model?: string; url?: string };

async function klipBaslat(foto: string, oran: string, pk: string, sbY: ReturnType<typeof createClient>, uid: string): Promise<{ is_no?: string; model?: string; url?: string; hata?: string }> {
  const hatalar: string[] = [];
  for (const model of VIDEO_MODELLER) {
    const q = new URLSearchParams({ model, image: foto, duration: '5', aspectRatio: oran, resolution: '720p', audio: 'false', safe: 'true' });
    const r = await fetch(`${POLL}/video/${encodeURIComponent(VIDEO_ISTEM.video)}?${q}`, { headers: { Authorization: `Bearer ${pk}`, Prefer: 'respond-async' }, signal: AbortSignal.timeout(60000) }).catch(() => null);
    if (r?.status === 202) { const j = await r.json().catch(() => ({})); if (j.id) return { is_no: String(j.id), model }; }
    else if (r?.ok && (r.headers.get('content-type') || '').includes('video')) {
      try { return { url: await videoKaydet(sbY, uid, new Uint8Array(await r.arrayBuffer())), model }; } catch (x) { hatalar.push(`${model} kayıt ${(x as Error).message}`); continue; }
    }
    const m = r ? (await r.text().catch(() => '')).slice(0, 300) : 'zaman aşımı';
    hatalar.push(`${model} ${r?.status ?? ''} ${m}`); console.error('tur klip başlat', model, m);
  }
  return { hata: hatalar.join(' | ') };
}

async function turBaslat(g: Record<string, unknown>, sbY: ReturnType<typeof createClient>, uid: string) {
  const oran = g.oran === '9:16' ? '9:16' : '16:9';
  const fotolar = Array.isArray(g.fotolar) ? (g.fotolar as unknown[]).map(String) : [];
  const kredi = TUR_KREDI[fotolar.length];
  if (!kredi) return yanit({ hata: 'Tur için 3 ya da 6 fotoğraf seç.' }, 400);
  const on = Deno.env.get('SUPABASE_URL') + '/storage/v1/object/public/ilan-fotolari/';
  if (fotolar.some((f) => !f.startsWith(on)) || new Set(fotolar).size !== fotolar.length) return yanit({ hata: 'Fotoğraf geçersiz.' }, 400);
  const pk = Deno.env.get('POLLINATIONS_API_KEY');
  if (!pk) return yanit({ hata: 'MülkümVideo henüz yapılandırılmadı.' }, 503);
  const { count } = await sbY.from('video_isleri').select('id', { count: 'exact', head: true }).eq('sahip', uid).eq('durum', 'bekliyor').gt('olusturma', new Date(Date.now() - 20 * 60000).toISOString());
  if ((count || 0) >= 1) return yanit({ hata: 'Hazırlanan videoların bitmesini bekle.' }, 429);
  const { data: kalan, error: kh } = await sbY.rpc('video_kredi', { p_kullanici: uid, p_miktar: -kredi, p_aciklama: TUR_ACIKLAMA });
  if (kh) return yanit({ hata: /yetersiz/.test(kh.message) ? `Kredin yetmiyor. Bu tur ${kredi} kredi; Hesabım → Kredilerim bölümünden kredi alabilirsin.` : 'Kredi düşülemedi, tekrar dene.' }, 402);
  const parcalar: Parca[] = fotolar.map((foto) => ({ foto }));
  const { data: is, error: ih } = await sbY.from('video_isleri').insert({ sahip: uid, ilan: g.ilan || null, tur: 'tur', kaynak: fotolar[0], kredi, parcalar }).select('id').single();
  const iptal = async (neden: string) => {
    const { data: iade } = await sbY.rpc('video_kredi', { p_kullanici: uid, p_miktar: kredi, p_aciklama: TUR_ACIKLAMA + ' iadesi' });
    if (is) await sbY.from('video_isleri').update({ durum: 'hata', iade: true, hata: neden.slice(0, 900), parcalar }).eq('id', is.id);
    return yanit({ hata: 'Tur şu an oluşturulamıyor, biraz sonra tekrar dene. Kredin iade edildi.', kredi: iade }, 502);
  };
  if (ih || !is) return await iptal('iş satırı yazılamadı: ' + (ih?.message || ''));
  for (const p of parcalar) {
    const k = await klipBaslat(p.foto, oran, pk, sbY, uid);
    if (k.hata) return await iptal(k.hata);
    p.is_no = k.is_no; p.model = k.model; p.url = k.url;
  }
  await sbY.from('video_isleri').update({ parcalar, model: parcalar[0].model || null }).eq('id', is.id);
  return yanit({ id: is.id, kredi: kalan });
}

async function turDurum(is: Record<string, unknown>, sbY: ReturnType<typeof createClient>, uid: string) {
  const id = String(is.id), pk = Deno.env.get('POLLINATIONS_API_KEY')!;
  const parcalar: Parca[] = Array.isArray(is.parcalar) ? (is.parcalar as Parca[]) : [];
  const basarisiz = async (neden: string) => {
    const { data: k } = await sbY.rpc('video_kredi', { p_kullanici: uid, p_miktar: is.kredi, p_aciklama: TUR_ACIKLAMA + ' iadesi' });
    await sbY.from('video_isleri').update({ durum: 'hata', iade: true, hata: neden.slice(0, 900), parcalar, guncelleme: new Date().toISOString() }).eq('id', id).eq('durum', 'bekliyor');
    return yanit({ durum: 'hata', hata: 'Tur oluşturulamadı. Kredin iade edildi.', kredi: k });
  };
  const yas = Date.now() - new Date(String(is.olusturma)).getTime();
  if (!parcalar.length) return await basarisiz('klip listesi boş');
  let indirilen = 0, degisti = false;
  for (const p of parcalar) {
    if (p.url) continue;
    if (!p.is_no) { if (yas > 600000) return await basarisiz('iş numarası yok'); continue; }
    if (indirilen >= 2) break;   // tek çağrıda en çok 2 klip indirilir (süre sınırı)
    const r = await fetch(`${POLL}/v1/jobs/${p.is_no}`, { headers: { Authorization: `Bearer ${pk}` }, signal: AbortSignal.timeout(20000) }).catch(() => null);
    if (!r?.ok) { if (r?.status === 404) return await basarisiz('iş bulunamadı'); continue; }
    const j = await r.json().catch(() => ({}));
    if (j.status === 'failed') return await basarisiz(JSON.stringify(j).slice(0, 600));
    if (j.status !== 'succeeded') continue;
    const v = await fetch(j.result_url || `${POLL}/v1/jobs/${p.is_no}/result`, { headers: { Authorization: `Bearer ${pk}` }, signal: AbortSignal.timeout(60000) }).catch(() => null);
    if (!v?.ok) continue;
    try { p.url = await videoKaydet(sbY, uid, new Uint8Array(await v.arrayBuffer())); indirilen++; degisti = true; }
    catch (x) { console.error('tur klip kaydet', (x as Error).message); }
  }
  const hazir = parcalar.filter((p) => p.url).length;
  if (hazir === parcalar.length) {
    await sbY.from('video_isleri').update({ durum: 'hazir', url: parcalar[0].url, parcalar, guncelleme: new Date().toISOString() }).eq('id', id);
    return yanit({ durum: 'hazir', url: parcalar[0].url, parcalar: parcalar.map((p) => p.url) });
  }
  if (degisti) await sbY.from('video_isleri').update({ parcalar, guncelleme: new Date().toISOString() }).eq('id', id);
  if (yas > 1800000) return await basarisiz('30 dk zaman aşımı');
  return yanit({ durum: 'bekliyor', hazir, toplam: parcalar.length });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return yanit({ hata: 'yöntem' }, 405);
  const anahtar = Deno.env.get('GEMINI_API_KEY');
  if (!anahtar) return yanit({ hata: 'MülkümAI henüz yapılandırılmadı.' }, 503);

  const yetki = req.headers.get('Authorization') || '';
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: yetki } } });
  const { data: kul } = await sb.auth.getUser();
  if (!kul?.user) return yanit({ hata: 'MülkümAI için giriş yapmalısın.' }, 401);

  let g: { gorev?: string; gecmis?: { rol: string; metin: string }[]; [k: string]: unknown };
  try { g = await req.json(); } catch { return yanit({ hata: 'geçersiz istek' }, 400); }
  if (g.gorev === 'deko') {
    // Ücretli: her görsel 1 kredi. Önce düşülür; üretim başarısız olursa iade edilir.
    if (!STILLER[String(g.stil)] || !ODALAR[String(g.oda)] || !String(g.foto || '').startsWith(Deno.env.get('SUPABASE_URL') + '/storage/v1/object/public/ilan-fotolari/')) return yanit({ hata: 'Oda, stil ve fotoğraf seç.' }, 400);
    const { data: kalan, error: kh } = await sb.rpc('deko_kredi_kullan');
    if (kh) return yanit({ hata: /yetersiz/.test(kh.message) ? 'Kredin yok. MülkümDeko her görsel için 1 kredi kullanır; Hesabım → Kredilerim bölümünden kredi alabilirsin.' : 'Kredi düşülemedi, tekrar dene.', kredi: 0 }, 402);
    const sonuc = await deko(g, sb, kul.user.id, anahtar);
    if (sonuc.status === 200) { const j = await sonuc.json(); return yanit({ ...j, kredi: kalan }); }
    const { data: iade } = await sb.rpc('deko_kredi_iade');
    const j = await sonuc.json().catch(() => ({}));
    return yanit({ ...j, hata: (j.hata || 'Görsel oluşturulamadı.') + (iade != null ? ' Kredin iade edildi.' : ''), kredi: iade ?? kalan }, sonuc.status);
  }
  if (g.gorev === 'tur_baslat') {
    const sbY = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    return await turBaslat(g, sbY, kul.user.id);
  }
  if (g.gorev === 'video_baslat' || g.gorev === 'video_durum') {
    const sbY = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    return g.gorev === 'video_baslat' ? await videoBaslat(g, sbY, kul.user.id) : await videoDurum(String(g.id || ''), sbY, kul.user.id);
  }
  if (g.gorev === 'ice_aktar' && g.url) {
    try { const l = await linkMetni(String(g.url)); g.metin = l.metin; g.fotolar = l.fotolar; } catch (x) { return yanit({ hata: (x as Error).message }, 422); }
    if (g.sadeceDene) return yanit({ metin: '', okunabilir: true }); // yalnız erişim denemesi; AI hakkı harcanmaz
  }
  const gorev = GOREV[g.gorev || 'sohbet'];
  if (!gorev) return yanit({ hata: 'bilinmeyen görev' }, 400);
  const istem = gorev(g).slice(0, g.gorev === 'ice_aktar' ? 13000 : 4000).trim();
  if (!istem) return yanit({ hata: 'Bir şey yaz.' }, 400);

  const { data: hak } = await sb.rpc('ai_hak_kullan', { p_sinir: SINIR });
  if (!hak) return yanit({ hata: `Bugünkü MülkümAI hakkın doldu (${SINIR}). Yarın yenilenir.` }, 429);

  const gecmis = (g.gorev === 'sohbet' && Array.isArray(g.gecmis) ? g.gecmis.slice(-8) : [])
    .map((m) => ({ role: m.rol === 'ai' ? 'model' : 'user', parts: [{ text: String(m.metin).slice(0, 2000) }] }));
  const govde = JSON.stringify({
    systemInstruction: { parts: [{ text: SISTEM }] },
    contents: [...gecmis, { role: 'user', parts: [{ text: istem }, ...(g.gorev === 'belge_oku' && typeof g.gorsel === 'string' && g.gorsel.length < 4_000_000 ? [{ inlineData: { mimeType: 'image/jpeg', data: String(g.gorsel).replace(/^data:[^,]+,/, '') } }] : [])] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 8192 } // yeni modellerin "düşünme" adımı da bu sınırdan yer; düşük tutunca cevap yarım kalıyordu
  });
  let r: Response | null = null;
  for (const model of MODELLER) {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': anahtar },
      body: govde,
      signal: AbortSignal.timeout(25000)
    }).catch(() => null);
    if (r?.ok) break;
    console.error('gemini', model, r?.status ?? 'zaman aşımı', r ? (await r.text()).slice(0, 200) : '');
    if (r && ![404, 429, 500, 503].includes(r.status)) break;
  }
  if (!r?.ok) {
    return yanit({ hata: r?.status === 429 || r?.status === 503 ? 'MülkümAI şu an yoğun, biraz sonra tekrar dene.' : 'MülkümAI yanıt veremedi.' }, 502);
  }
  const d = await r.json();
  const metin = (d.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('').trim();
  return yanit({ metin: metin || 'Bu konuda yardımcı olamıyorum.', ...(g.gorev === 'ice_aktar' && g.url ? { fotolar: g.fotolar } : {}) });
});
