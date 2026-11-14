// Gece temizliği (pg_cron, 02:10): ilana eklenmemiş hazır videolar 30 gün sonra silinir (kayıt + depodaki dosyalar).
// İlanda yayında olan videolara (alanlar.videolar) dokunulmaz. Girdi almaz; yalnız bu sabit işi yapar.
import { createClient } from 'npm:@supabase/supabase-js@2';
const GUN = 30;
Deno.serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const sinir = new Date(Date.now() - GUN * 86400000).toISOString();
  const on = Deno.env.get('SUPABASE_URL') + '/storage/v1/object/public/ilan-videolari/';
  // Başarısız işler: dosyası yok, yalnız kayıt silinir
  const { count: hatali } = await sb.from('video_isleri').delete({ count: 'exact' }).eq('durum', 'hata').lt('olusturma', sinir);
  const { data: eski } = await sb.from('video_isleri').select('id,sahip,ilan,url,ses,parcalar').eq('durum', 'hazir').not('url', 'is', null).lt('olusturma', sinir).limit(300);
  let silinen = 0, korunan = 0;
  for (const r of eski || []) {
    const adresler = [r.url, r.ses, ...(Array.isArray(r.parcalar) ? r.parcalar.map((p: { url?: string }) => p?.url) : [])].filter((u): u is string => typeof u === 'string' && u.startsWith(on));
    if (r.ilan) {
      const { data: il } = await sb.from('ilanlar').select('alanlar').eq('id', r.ilan).maybeSingle();
      const ekli = new Set(((il?.alanlar?.videolar || []) as { url?: string; parcalar?: string[]; ses?: string }[]).flatMap((v) => [v.url, v.ses, ...(v.parcalar || [])]));
      if (adresler.some((u) => ekli.has(u))) { korunan++; continue; }
    }
    const yollar = [...new Set(adresler.map((u) => decodeURIComponent(u.slice(on.length))).filter((y) => y.startsWith(r.sahip + '/')))];
    if (yollar.length) await sb.storage.from('ilan-videolari').remove(yollar);
    await sb.from('video_isleri').delete().eq('id', r.id);
    silinen++;
  }
  return new Response(JSON.stringify({ silinen, korunan, hatali: hatali || 0 }), { headers: { 'Content-Type': 'application/json' } });
});
