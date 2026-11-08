// TCMB Konut Fiyat Endeksi (KFE, aylık, 2023=100) Türkiye + 13 İBBS-2 + 6 İBBS-1 bölgesi (TCMB doğu/kuzey illerini birleştirir) → kfe tablosu. Aylık pg_cron.
// ?tani=SERI1-SERI2 : yalnız deneme, ham cevabın başını döndürür.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const BOLGELER = ['TR', 'TR10', 'TR21', 'TR22', 'TR31', 'TR32', 'TR33', 'TR41', 'TR42', 'TR51', 'TR52', 'TR61', 'TR62', 'TR63', 'TR7', 'TR8', 'TR9', 'TRA', 'TRB', 'TRC'];
const ON = Deno.env.get('KFE_ONEK') || 'TP.KFE.';
const gun = (d: Date) => `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

async function cek(anahtar: string, seriler: string[], bas: string) {
  const url = `https://evds3.tcmb.gov.tr/igmevdsms-dis/series=${seriler.join('-')}&startDate=${bas}&endDate=${gun(new Date())}&type=json`;
  const c = await fetch(url, { headers: { key: anahtar }, signal: AbortSignal.timeout(40000) });
  const t = await c.text();
  return { durum: c.status, t };
}

Deno.serve(async (req) => {
  const anahtar = Deno.env.get('EVDS_API_KEY');
  if (!anahtar) return Response.json({ hata: 'EVDS_API_KEY yok' }, { status: 503 });
  const liste = new URL(req.url).searchParams.get('liste');
  if (liste) {
    const c = await fetch(`https://evds3.tcmb.gov.tr/igmevdsms-dis/serieList/type=json&code=${encodeURIComponent(liste)}`, { headers: { key: anahtar } });
    const t = await c.text(); try { return Response.json((JSON.parse(t) as { SERIE_CODE: string; SERIE_NAME: string }[]).map((s) => s.SERIE_CODE + ' | ' + s.SERIE_NAME)); } catch { return Response.json({ durum: c.status, bas: t.slice(0, 400) }); }
  }
  const tani = new URL(req.url).searchParams.get('tani');
  if (tani) { const r = await cek(anahtar, tani.split('-'), new URL(req.url).searchParams.get('bas') || '01-01-2024'); return Response.json({ durum: r.durum, bas: r.t.slice(0, 600) }); }

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const logla = async (durum: 'ok' | 'hata', satir?: number, ayrinti?: string) => {
    try { await sb.from('ingestion_logs').insert({ kaynak: 'evds-kfe', durum, satir, ayrinti: ayrinti ? ayrinti.slice(0, 990) : null }); } catch { /* log işi asla bozmasın */ }
  };
  const satir: { bolge: string; donem: string; deger: number }[] = [];
  // EVDS tek istekte birkaç seri; 3'erli gruplar
  for (let i = 0; i < BOLGELER.length; i += 3) {
    const grup = BOLGELER.slice(i, i + 3), seri = grup.map((b) => ON + b);
    const r = await cek(anahtar, seri, '01-01-2010');
    if (r.durum !== 200) { await logla('hata', undefined, 'EVDS ' + r.durum + ': ' + r.t.slice(0, 250)); return Response.json({ hata: `EVDS ${r.durum}`, bas: r.t.slice(0, 300) }, { status: 502 }); }
    let j; try { j = JSON.parse(r.t); } catch { await logla('hata', undefined, 'JSON değil: ' + r.t.slice(0, 250)); return Response.json({ hata: 'JSON değil', bas: r.t.slice(0, 300) }, { status: 502 }); }
    for (const k of j.items || []) {
      const [y, a] = String(k.Tarih).split('-'); // "2026-9"
      if (!y || !a) continue;
      grup.forEach((b, n) => { const v = k[seri[n].replaceAll('.', '_')]; if (v != null && v !== '' && !isNaN(+v)) satir.push({ bolge: b, donem: `${y}-${a.padStart(2, '0')}-01`, deger: +(+v).toFixed(2) }); });
    }
  }
  if (!satir.length) { await logla('hata', undefined, 'EVDS boş döndü'); return Response.json({ hata: 'veri yok' }, { status: 502 }); }
  for (let i = 0; i < satir.length; i += 1000) { const { error } = await sb.from('kfe').upsert(satir.slice(i, i + 1000)); if (error) { await logla('hata', undefined, 'upsert: ' + error.message.slice(0, 250)); return Response.json({ hata: error.message }, { status: 500 }); } }
  await sb.from('veri_kaynaklari').update({ son_calisma: new Date().toISOString() }).eq('kod', 'evds-kfe');
  await logla('ok', satir.length);
  return Response.json({ yazilan: satir.length, son: satir.filter((s) => s.bolge === 'TR').at(-1) });
});
