// Haberler: yayıncıların kendi RSS akışlarından yalnız başlık + bağlantı + kaynak + tarih. 30 dk önbellek.
// Kategoriler: emlak (Emlak Kulisi + AA/TRT ekonomiden emlak süzgeci), otomobil (Motor1 Türkiye, Autoshow), ekonomi (AA, TRT Haber).
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS' };
const EMLAK = /konut|kira artış|kiracı|kira bedel|kira zam|kiralık konut|emlak|tapu|gayrimenkul|inşaat|toki|arsa|ev fiyat|ev sat|daire|mortgage|kentsel dönüşüm|imar|yapı ruhsat/i;
const KAYNAK: { kat: string; ad: string; url: string; suz?: RegExp }[] = [
  { kat: 'emlak', ad: 'Emlak Kulisi', url: 'https://emlakkulisi.com/rss' },
  { kat: 'emlak', ad: 'Anadolu Ajansı', url: 'https://www.aa.com.tr/tr/rss/default?cat=ekonomi', suz: EMLAK },
  { kat: 'emlak', ad: 'TRT Haber', url: 'https://www.trthaber.com/ekonomi_articles.rss', suz: EMLAK },
  { kat: 'otomobil', ad: 'Motor1 Türkiye', url: 'https://tr.motor1.com/rss/news/all/' },
  { kat: 'otomobil', ad: 'Autoshow', url: 'https://www.autoshow.com.tr/rss' },
  { kat: 'ekonomi', ad: 'Anadolu Ajansı', url: 'https://www.aa.com.tr/tr/rss/default?cat=ekonomi' },
  { kat: 'ekonomi', ad: 'TRT Haber', url: 'https://www.trthaber.com/ekonomi_articles.rss' },
];
type Haber = { baslik: string; link: string; tarih: number; kaynak: string };
let onbellek: { zaman: number; veri: Record<string, Haber[]> } | null = null;

const temiz = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).trim();
const al = (x: string, t: string) => { const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i')); return m ? temiz(m[1]) : ''; };
const ham = new Map<string, Promise<string>>(); // aynı akış iki kategoride okunursa tek istek
const getir = (url: string) => { if (!ham.has(url)) ham.set(url, fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Mulkum360 haber okuyucu)', Accept: 'application/rss+xml, application/xml, text/xml' }, signal: AbortSignal.timeout(12000) }).then((r) => (r.ok ? r.text() : '')).catch(() => '')); return ham.get(url)!; };

async function oku(k: typeof KAYNAK[number]) {
  const x = await getir(k.url); if (!x.includes('<item')) return [];
  return [...x.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => ({ kat: k.kat, baslik: al(m[0], 'title'), link: al(m[0], 'link'), tarih: Date.parse(al(m[0], 'pubDate')) || 0, kaynak: k.ad }))
    .filter((h) => h.baslik && /^https:\/\//.test(h.link) && (!k.suz || k.suz.test(h.baslik)));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!onbellek || Date.now() - onbellek.zaman > 30 * 60000) {
    ham.clear();
    const l = (await Promise.all(KAYNAK.map(oku))).flat();
    const veri: Record<string, Haber[]> = {};
    for (const kat of ['emlak', 'otomobil', 'ekonomi']) {
      const gor = new Set<string>(), say: Record<string, number> = {};
      veri[kat] = l.filter((h) => h.kat === kat).sort((a, b) => b.tarih - a.tarih)
        .filter((h) => { const k = h.baslik.toLocaleLowerCase('tr-TR').slice(0, 60); if (gor.has(k)) return false; gor.add(k); return (say[h.kaynak] = (say[h.kaynak] || 0) + 1) <= 5; })
        .slice(0, 8).map(({ baslik, link, tarih, kaynak }) => ({ baslik, link, tarih, kaynak }));
    }
    if (Object.values(veri).some((x) => x.length)) onbellek = { zaman: Date.now(), veri };
  }
  const v = onbellek?.veri || { emlak: [], otomobil: [], ekonomi: [] };
  return new Response(JSON.stringify({ kategoriler: v, haberler: v.emlak }), { headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' } });
});
