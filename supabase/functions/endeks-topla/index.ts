// Mülküm360 Endeks Bankası toplayıcısı: TCMB EVDS'ten 2016'dan bugüne emlak ve otomobil serilerini çeker → endeks_veri.
// Aylık seriler (frequency=5, ortalama), il bazlı konut birim fiyat / kira serileri çeyreklik (frequency=6).
// Aylık pg_cron ile çalışır; ?tani=1 yalnız sayıları döndürür (yazmaz).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const BAS = '01-01-2016';
const AYLIK = ['TP.KFE.TR', 'TP.YKFE.TR', 'TP.YOKFEND.TR', 'TP.TUKFIY2025.04110', 'TP.AKONUTSAT1.KTRTOPLAM', 'TP.TUKFIY2025.07111', 'TP.TUKFIY2025.071', 'TP.TUKFIY2025.0722', 'TP.TUKFIY2025.0723', 'TP.TUKFIY2025.07211', 'TP.TUKFIY2025.07244', 'TP.TUKFIY2025.GENEL', 'TP.DK.USD.S.YTL', 'TP.DK.EUR.S.YTL'];
const IL_GRUP = [['BIRIMFIYAT', 'bie_birimfiyat', 'Konut Birim Fiyatları'], ['BK', 'bie_bk', 'Konut Birim Kiraları']];
const gun = (d: Date) => `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

async function evds(anahtar: string, yol: string) {
  const c = await fetch(`https://evds3.tcmb.gov.tr/igmevdsms-dis/${yol}`, { headers: { key: anahtar }, signal: AbortSignal.timeout(60000) });
  const t = await c.text(); if (c.status !== 200) throw new Error(`EVDS ${c.status}: ${t.slice(0, 200)}`);
  return JSON.parse(t);
}
// "2016-1" → 2016-01-01 ; "2016-Q2" → 2016-04-01
const donem = (t: string) => { const [y, p] = String(t).split('-'); if (!y || !p) return null; if (p.startsWith('Q')) return `${y}-${String((+p.slice(1) - 1) * 3 + 1).padStart(2, '0')}-01`; return `${y}-${p.padStart(2, '0')}-01`; };

async function seriCek(anahtar: string, seriler: string[], frekans: number) {
  const satir: { kod: string; donem: string; deger: number }[] = [];
  for (let i = 0; i < seriler.length; i += 12) {
    const grup = seriler.slice(i, i + 12);
    const j = await evds(anahtar, `series=${grup.join('-')}&startDate=${BAS}&endDate=${gun(new Date())}&type=json&frequency=${frekans}&aggregationTypes=${grup.map(() => 'avg').join('-')}&formulas=${grup.map(() => '0').join('-')}`);
    for (const k of j.items || []) {
      const d = donem(k.Tarih); if (!d) continue;
      grup.forEach((s) => { const v = k[s.replaceAll('.', '_')]; if (v != null && v !== '' && !isNaN(+v)) satir.push({ kod: s, donem: d, deger: +(+v).toFixed(4) }); });
    }
  }
  return satir;
}

Deno.serve(async (req) => {
  const anahtar = Deno.env.get('EVDS_API_KEY');
  if (!anahtar) return Response.json({ hata: 'EVDS_API_KEY yok' }, { status: 503 });
  const tani = new URL(req.url).searchParams.get('tani');
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const logla = async (durum: 'ok' | 'hata', satir?: number, ayrinti?: string) => { try { await sb.from('ingestion_logs').insert({ kaynak: 'endeks-topla', durum, satir, ayrinti: ayrinti?.slice(0, 990) }); } catch { /* */ } };
  try {
    const yaz: { kod: string; bolge: string; donem: string; deger: number }[] = [];
    // 1) Ulusal aylık seriler
    for (const s of await seriCek(anahtar, AYLIK, 5)) yaz.push({ kod: s.kod, bolge: 'TR', donem: s.donem, deger: s.deger });
    // 2) İl bazlı çeyreklik konut birim fiyat ve kira
    for (const [kod, grup, ek] of IL_GRUP) {
      const liste = (await evds(anahtar, `serieList/type=json&code=${grup}`)) as { SERIE_CODE: string; SERIE_NAME: string }[];
      const ad = new Map(liste.map((x) => [x.SERIE_CODE, x.SERIE_NAME.replace(ek, '').trim()]));
      for (const s of await seriCek(anahtar, liste.map((x) => x.SERIE_CODE), 6)) {
        const il = ad.get(s.kod) || ''; yaz.push({ kod, bolge: /^Türkiye$/i.test(il) ? 'TR' : il, donem: s.donem, deger: s.deger });
      }
    }
    if (tani) { const say: Record<string, number> = {}; yaz.forEach((y) => (say[y.kod] = (say[y.kod] || 0) + 1)); return Response.json({ toplam: yaz.length, say, ornek: yaz.slice(-3) }); }
    for (let i = 0; i < yaz.length; i += 1000) { const { error } = await sb.from('endeks_veri').upsert(yaz.slice(i, i + 1000)); if (error) throw new Error('upsert: ' + error.message); }
    const { data: ozet } = await sb.rpc('endeks_ilan_ozeti');
    await sb.from('veri_kaynaklari').update({ son_calisma: new Date().toISOString() }).eq('kod', 'endeks-topla');
    await logla('ok', yaz.length);
    return Response.json({ yazilan: yaz.length, ilan_ozeti: ozet });
  } catch (x) {
    await logla('hata', undefined, (x as Error).message);
    return Response.json({ hata: (x as Error).message }, { status: 502 });
  }
});
