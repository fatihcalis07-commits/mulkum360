// Günlük banka kredi teklifleri: Gemini + Google Arama (mevcut GEMINI_API_KEY, ek API yok).
// Sonuçlar banka_teklifleri'ne otomatik=true olarak yazılır; elle girilenlere dokunulmaz.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const MODELLER = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest'];
const TURLER: Record<string, string> = { konut: 'konut kredisi', tasit: 'taşıt kredisi (sıfır araç)', ihtiyac: 'ihtiyaç kredisi' };

async function sor(tur: string, anahtar: string) {
  const bugun = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const istem = `Bugün ${bugun}. Türkiye'deki bankaların güncel ${TURLER[tur]} AYLIK faiz oranlarını Google'da ara (bankaların kendi siteleri ve güncel haberler). En az 6 banka bul.
Yalnız şu JSON'u yaz, başka hiçbir şey yazma:
{"teklifler":[{"banka":"Banka adı","faiz":2.79,"vade_min":12,"vade_max":120,"not":"kısa koşul, ör. maaş müşterisine","kaynak":"https://..."}]}
Kurallar: faiz aylık yüzde, sayı. Bulamadığın bankayı yazma, uydurma. Vade bilinmiyorsa konutta 12-120, taşıtta 12-48, ihtiyaçta 3-36 yaz.`;
  const hatalar: string[] = [];
  for (const model of MODELLER) {
    const c = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${anahtar}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(60000),
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: istem }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0, maxOutputTokens: 8192 } })
    }).catch(() => null);
    if (!c) { hatalar.push(`${model}: zaman aşımı`); continue; }
    if (!c.ok) { hatalar.push(`${model}: ${c.status} ${(await c.text()).slice(0, 200)}`); continue; }
    const j = await c.json();
    const metin = (j.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('');
    const m = metin.match(/\{[\s\S]*\}/); if (!m) { hatalar.push(`${model}: JSON yok: ${metin.slice(0, 150)}`); continue; }
    try { return { model, liste: JSON.parse(m[0]).teklifler || [], hatalar }; } catch { hatalar.push(`${model}: JSON bozuk`); continue; }
  }
  return { model: null, liste: [], hatalar };
}

Deno.serve(async (req) => {
  const anahtar = Deno.env.get('GEMINI_API_KEY');
  if (new URL(req.url).searchParams.has('tani')) {
    const md = new URL(req.url).searchParams.get('model') || 'gemini-flash-lite-latest'; const gorsel = /image/.test(md);
    const c = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${md}:generateContent?key=${anahtar}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: gorsel ? 'A small red apple on a white table, photo' : 'merhaba' }] }], ...(gorsel ? { generationConfig: { responseModalities: ['IMAGE'] } } : {}) }) });
    return Response.json({ aramasiz: c.status, govde: (await c.text()).slice(0, 300) });
  }
  if (!anahtar) return Response.json({ hata: 'GEMINI_API_KEY yok' }, { status: 503 });
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const sinir: Record<string, [number, number]> = { konut: [0.8, 6], tasit: [0.8, 8], ihtiyac: [1, 10] };
  const rapor: Record<string, unknown> = {};
  for (const tur of Object.keys(TURLER)) {
    const { model, liste, hatalar } = await sor(tur, anahtar);
    const gorulen = new Set<string>();
    const satirlar = liste.filter((t: Record<string, unknown>) => {
      const f = Number(String(t.faiz).replace(',', '.')), ad = String(t.banka || '').trim();
      if (!ad || ad.length > 60 || !(f >= sinir[tur][0] && f <= sinir[tur][1]) || gorulen.has(ad.toLowerCase())) return false;
      gorulen.add(ad.toLowerCase()); return true;
    }).map((t: Record<string, unknown>) => {
      const vmin = Math.max(1, parseInt(String(t.vade_min)) || 12), vmax = Math.min(360, Math.max(vmin, parseInt(String(t.vade_max)) || 120));
      const k = String(t.kaynak || '');
      return { banka: String(t.banka).trim(), tur, faiz: +Number(String(t.faiz).replace(',', '.')).toFixed(3), vade_min: vmin, vade_max: vmax,
        aciklama: t.not ? String(t.not).slice(0, 300) : null, baglanti: /^https:\/\/[^\s]+$/.test(k) && !k.includes('vertexaisearch') ? k : null,
        aktif: true, otomatik: true, guncelleme: new Date().toISOString() };
    });
    // Az sonuç geldiyse eski listeyi koru
    if (satirlar.length >= 3) {
      await sb.from('banka_teklifleri').delete().eq('tur', tur).eq('otomatik', true);
      const { error } = await sb.from('banka_teklifleri').insert(satirlar);
      rapor[tur] = error ? error.message : { model, adet: satirlar.length };
    } else rapor[tur] = { model, adet: satirlar.length, not: 'yetersiz, eski liste korundu', hatalar };
  }
  return Response.json(rapor);
});
