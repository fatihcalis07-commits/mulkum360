// TCMB EVDS'den haftalık ağırlıklı ortalama kredi faizlerini (TL, akım, yıllık %) çeker, kredi_ortalama'ya yazar.
// Günlük pg_cron ile çağrılır. Gerekli sır: EVDS_API_KEY. Seri kodları EVDS_SERILER ile değiştirilebilir.
// Her çalışma ingestion_logs'a satır bırakır (kaynak: evds-kredi).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const VARSAYILAN: Record<string, string> = { ihtiyac: 'TP.KTF10', tasit: 'TP.KTF11', konut: 'TP.KTF12' };

const gun = (d: Date) => `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

Deno.serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const logla = async (durum: 'ok' | 'hata', satir?: number, ayrinti?: string) => {
    try { await sb.from('ingestion_logs').insert({ kaynak: 'evds-kredi', durum, satir, ayrinti: ayrinti ? ayrinti.slice(0, 990) : null }); } catch { /* log işi asla bozmasın */ }
  };
  const anahtar = Deno.env.get('EVDS_API_KEY');
  if (!anahtar) { await logla('hata', undefined, 'EVDS_API_KEY eklenmemiş'); return Response.json({ hata: 'EVDS_API_KEY eklenmemiş' }, { status: 503 }); }
  const seriler: Record<string, string> = { ...VARSAYILAN, ...JSON.parse(Deno.env.get('EVDS_SERILER') || '{}') };
  const bitis = new Date(), baslangic = new Date(Date.now() - 60 * 864e5);
  const url = `https://evds3.tcmb.gov.tr/igmevdsms-dis/series=${Object.values(seriler).join('-')}&startDate=${gun(baslangic)}&endDate=${gun(bitis)}&type=json`;
  let c: Response;
  try { c = await fetch(url, { headers: { key: anahtar }, signal: AbortSignal.timeout(30000) }); }
  catch (x) { const m = 'EVDS erişilemedi: ' + String(x).slice(0, 200); await logla('hata', undefined, m); return Response.json({ hata: m }, { status: 502 }); }
  const govde = await c.text();
  if (!c.ok) { const m = `EVDS ${c.status}: ` + govde.slice(0, 250); await logla('hata', undefined, m); return Response.json({ hata: `EVDS ${c.status}`, govde: govde.slice(0, 300) }, { status: 502 }); }
  let veri; try { veri = JSON.parse(govde); } catch { const m = 'EVDS JSON değil: ' + govde.slice(0, 250); await logla('hata', undefined, m); return Response.json({ hata: 'EVDS JSON değil', govde: govde.slice(0, 300) }, { status: 502 }); }
  const satirlar: { tur: string; donem: string; faiz_yillik: number; kaynak: string }[] = [];
  for (const k of veri.items || []) {
    const [g, a, y] = String(k.Tarih).split('-');
    for (const [tur, seri] of Object.entries(seriler)) {
      const v = k[seri.replaceAll('.', '_')];
      if (v != null && v !== '' && !isNaN(+v)) satirlar.push({ tur, donem: `${y}-${a}-${g}`, faiz_yillik: +(+v).toFixed(2), kaynak: 'TCMB EVDS' });
    }
  }
  if (!satirlar.length) { await logla('hata', undefined, 'EVDS boş döndü'); return Response.json({ hata: 'EVDS boş döndü', ornek: (veri.items || [])[0] || null }, { status: 502 }); }
  const { error } = await sb.from('kredi_ortalama').upsert(satirlar);
  if (error) { await logla('hata', undefined, 'upsert: ' + error.message.slice(0, 250)); return Response.json({ hata: error.message }, { status: 500 }); }
  await sb.from('veri_kaynaklari').update({ son_calisma: new Date().toISOString() }).eq('kod', 'evds-kredi');
  await logla('ok', satirlar.length);
  return Response.json({ yazilan: satirlar.length, son: satirlar.at(-1) });
});
