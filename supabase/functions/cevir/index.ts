// Türkçe arayüz/ilan metinlerini İngilizce/Rusça/Almanca/Arapçaya çevirir; sonuçlar 'ceviri' tablosunda saklanır (bir kez çevrilir).
// Girdi: { dil: 'en'|'ru'|'de'|'ar', metinler: string[] (en çok 60, her biri en çok 600 karakter) }. Çıktı: { ceviri: { kaynak: hedef } }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const yanit = (g: unknown, d = 200) => new Response(JSON.stringify(g), { status: d, headers: { ...CORS, 'Content-Type': 'application/json' } });
const MODELLER = ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-3.8-flash'];
const DIL: Record<string, string> = { en: 'English', ru: 'Russian', de: 'German', ar: 'Modern Standard Arabic' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  let g: { dil?: string; metinler?: unknown[] } = {};
  try { g = await req.json(); } catch { return yanit({ hata: 'istek' }, 400); }
  const dil = String(g.dil || ''); if (!DIL[dil]) return yanit({ hata: 'dil' }, 400);
  const metinler = [...new Set((g.metinler || []).map((x) => String(x).trim()).filter((x) => x && x.length <= 600))].slice(0, 60);
  if (!metinler.length) return yanit({ ceviri: {} });
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const sonuc: Record<string, string> = {};
  const { data: var_ } = await sb.from('ceviri').select('kaynak, hedef').eq('dil', dil).in('kaynak', metinler);
  for (const r of var_ || []) sonuc[r.kaynak] = r.hedef;
  const eksik = metinler.filter((m) => !(m in sonuc));
  if (eksik.length) {
    const anahtar = Deno.env.get('GEMINI_API_KEY');
    const istem = `Translate each Turkish string from a real-estate and car listing mobile app (Mülküm360) into ${DIL[dil]}.
Rules: natural, short UI wording; keep numbers, prices, "TL", "m²", emojis, URLs, @handles, #hashtags, line breaks and punctuation; keep brand names (Mülküm360, MülkümAI, MülkümDeko, TCMB, TKGM, EİDS) unchanged; Turkish place names (il, ilçe, mahalle) stay as they are; "kredi" in the app sense of in-app credits = "credit(s)" / "кредит(ы)".
Return ONLY a JSON array of strings with exactly ${eksik.length} items in the same order.
INPUT: ${JSON.stringify(eksik)}`;
    for (const model of MODELLER) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': anahtar! }, signal: AbortSignal.timeout(40000),
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: istem }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: 'application/json' } })
      }).catch(() => null);
      if (!r?.ok) continue;
      const j = await r.json();
      const metin = (j.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('');
      let dizi: unknown[] = []; try { dizi = JSON.parse(metin.slice(metin.indexOf('['), metin.lastIndexOf(']') + 1)); } catch { continue; }
      if (!Array.isArray(dizi) || dizi.length !== eksik.length) continue;
      const satir = eksik.map((k, n) => ({ dil, kaynak: k, hedef: String(dizi[n] ?? '').slice(0, 2000) })).filter((x) => x.hedef);
      satir.forEach((x) => (sonuc[x.kaynak] = x.hedef));
      if (satir.length) await sb.from('ceviri').upsert(satir);
      break;
    }
  }
  return yanit({ ceviri: sonuc });
});
