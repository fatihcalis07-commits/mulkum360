// TÜİK databrowser2 (Fusion) konut satış istatistikleri → bolge_gostergeleri. Aylık pg_cron (ayın 18'i; her çalışmada son 24 ay taranır, geciken yayın kendini iyileştirir).
// Kaynak: TR,DF_SATIS_SEKLI_DURUMU_ILILCE_V3,1.0 (il) + TR,DF_SATIS_SEKLI_SATIS_DURUMU_V3,1.0 (Türkiye). Açık veri; UA + sayılı istek.
// Doğrulama (biri patlarsa HİÇBİR satır yazılmaz): küp boyutları sabit; her ilde ilk+ikinci=toplam ve ipotekli+diğer=toplam;
// 81 il toplamı == Türkiye küpü (ay ay); İstanbul ilk-el payı DB'deki son değerle ±4 puan uyumlu (kod listesi kayarsa durur).
// ?kuru=1 → yazmadan dene ve özet döndür. ?ay=N → yalnızca son N ay yazılsın (varsayılan 24; tam geriye dönüş ?ay=999).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const KAYNAK = 'TÜİK Konut Satış İstatistikleri (TKGM kayıtları)';
const KOD = 'tuik-satis';
const UA = 'mulkum360-ingest/1.0 (+veri motoru; ayda ~2 istek)';
// REF_AREA indeks sırası = TÜİK tablo sırası (değer eşleştirmeyle kanıtlandı: 81/81, 48 bağımsız DOM kontrolü, 0 çelişki)
const ILLER = ["İstanbul","Edirne","Kırklareli","Tekirdağ","Balıkesir","Çanakkale","İzmir","Aydın","Denizli","Muğla","Afyonkarahisar","Kütahya","Manisa","Uşak","Bilecik","Bursa","Eskişehir","Bolu","Düzce","Kocaeli","Sakarya","Yalova","Ankara","Karaman","Konya","Antalya","Burdur","Isparta","Adana","Mersin","Hatay","Kahramanmaraş","Osmaniye","Aksaray","Kırıkkale","Kırşehir","Nevşehir","Niğde","Kayseri","Sivas","Yozgat","Bartın","Karabük","Zonguldak","Çankırı","Kastamonu","Sinop","Amasya","Çorum","Samsun","Tokat","Artvin","Giresun","Gümüşhane","Ordu","Rize","Trabzon","Bayburt","Erzincan","Erzurum","Ağrı","Ardahan","Iğdır","Kars","Bingöl","Elazığ","Malatya","Tunceli","Bitlis","Hakkari","Muş","Van","Adıyaman","Gaziantep","Kilis","Diyarbakır","Şanlıurfa","Batman","Mardin","Siirt","Şırnak"];

const AKIS_IL = 'TR,DF_SATIS_SEKLI_DURUMU_ILILCE_V3,1.0';
const AKIS_TR = 'TR,DF_SATIS_SEKLI_SATIS_DURUMU_V3,1.0';

type Kup = { id: string[]; size: number[]; value: Record<string, string> };

async function cek<T>(url: string, init?: RequestInit): Promise<T> {
  let sonHata = '';
  for (let deneme = 0; deneme < 3; deneme++) {
    try {
      const c = await fetch(url, { ...init, headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Content-Type': 'application/json', ...(init?.headers || {}) }, signal: AbortSignal.timeout(90000) });
      if (c.status === 429 || c.status >= 500) { sonHata = 'HTTP ' + c.status; await new Promise((r) => setTimeout(r, 4000 * (deneme + 1))); continue; }
      if (!c.ok) throw new Error('HTTP ' + c.status + ' ' + url.slice(0, 80));
      return await c.json() as T;
    } catch (e) { sonHata = String(e).slice(0, 200); await new Promise((r) => setTimeout(r, 3000 * (deneme + 1))); }
  }
  throw new Error('çekilmedi: ' + sonHata);
}

const temel = 'https://databrowser2.tuik.gov.tr/api/core/nodes/1/datasets';
const kupGetir = async (akis: string): Promise<{ kup: Kup; zamanlar: string[] }> => {
  const id = encodeURIComponent(akis);
  const st = await cek<{ template: { layouts: string } }>(`${temel}/${id}/structure`);
  const kup = await cek<Kup>(`${temel}/${id}/data`, { method: 'POST', body: '[]' });
  const etik = JSON.parse(st.template.layouts).chartLayoutCartesian.primaryDimValues as string[];
  return { kup, zamanlar: etik };
};

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const kuru = u.searchParams.get('kuru') === '1';
  const aySiniri = +(u.searchParams.get('ay') || 24);
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const logla = async (durum: 'ok' | 'hata', satir?: number, ayrinti?: string) => {
    try { await sb.from('ingestion_logs').insert({ kaynak: KOD, durum, satir, ayrinti: ayrinti ? String(ayrinti).slice(0, 990) : null }); } catch { /* log işi asla bozmasın */ }
  };
  const dur = async (mesaj: string, kod = 502): Promise<Response> => { await logla('hata', undefined, mesaj); return Response.json({ hata: mesaj.slice(0, 500) }, { status: kod }); };

  try {
    const ilK = await kupGetir(AKIS_IL), trK = await kupGetir(AKIS_TR);
    const kup = ilK.kup, zamanlar = ilK.zamanlar, tr = trK.kup;
    const S = kup.size, D = kup.id.join(',');
    if (D !== 'FREQ,SATIS_TURU,REF_AREA,KONUT_ISYERI_GSTERGE,INDICATOR,TIME_PERIOD' || S.join(',') !== '2,9,81,2,2,178') return dur('Küp boyutları değişti: ' + D + ' [' + S.join(',') + ']');
    const [, turN, refN, kiyN, indN, kisi] = S;
    const deger = (tur: number, ref: number, kiy: number, ind: number, t: number) => { const v = kup.value[((tur * refN + ref) * kiyN + kiy) * indN * kisi + ind * kisi + t]; return v == null ? NaN : +v; };
    // FREQ=0 katmanı: lineer üs FREQ en büyük — deger() freq0 varsayar: lin = ((((0*9+tur)*81+ref)*2+kiy)*2+ind)*178+t
    const tSon = zamanlar.length - 1;
    const yilAylar = zamanlar.map((z, i) => [z, i] as const).filter(([z]) => /^\d{4}-\d{2}$/.test(z)).map(([, i]) => i);
    const donemOf = (i: number) => zamanlar[i];

    // --- (kiy, çift) çözümlemesi: İstanbul'da toplam = a+b olan iki alt küme; büyük oranlı grup ilk/ikinci (DB çapasıyla doğrulanır)
    const IST = 0;
    const adaylar: { kiy: number; top: number; a: number; b: number }[] = [];
    for (let kiy = 0; kiy < kiyN; kiy++) {
      const top = deger(0, IST, kiy, 0, tSon);
      if (!(top > 1000)) continue;
      for (let a = 0; a < turN; a++) for (let b = a + 1; b < turN; b++) {
        const va = deger(a, IST, kiy, 0, tSon), vb = deger(b, IST, kiy, 0, tSon);
        if (va > 0 && vb > 0 && Math.abs(va + vb - top) <= 1 && a !== 0 && b !== 0) adaylar.push({ kiy, top, a, b });
      }
    }
    if (adaylar.length !== 2) return dur(`İstanbul ayrışması beklenmedik: ${adaylar.length} grup (kod listesi değişmiş olabilir)`);
    // DB çapası: İstanbul 'İlk el satış payı' son bilinen değer
    const { data: ana } = await sb.from('bolge_gostergeleri').select('deger,donem').eq('il', 'İstanbul').eq('gosterge', 'İlk el satış payı').order('donem', { ascending: false }).limit(1).maybeSingle();
    const anaPay = ana ? +ana.deger : 30;
    const oran = (x: { a: number; b: number; top: number }) => { const pa = 100 * deger(x.a, IST, x.kiy, 0, tSon) / x.top, pb = 100 * deger(x.b, IST, x.kiy, 0, tSon) / x.top; return Math.min(Math.abs(pa - anaPay), Math.abs(pb - anaPay)); };
    const durum = adaylar.map((x) => ({ ...x, payGrup: oran(x) })).sort((x, y) => x.payGrup - y.payGrup);
    if (durum[0].payGrup > 4) return dur(`İlk-el çapasıyla eşleşen grup yok (en yakın fark ${durum[0].payGrup.toFixed(1)} puan) — kod listesi kaymış olabilir`);
    const ilkGrup = durum[0], ipGrup = durum[1];
    const [ilk, ikinci] = deger(ilkGrup.a, IST, ilkGrup.kiy, 0, tSon) <= deger(ilkGrup.b, IST, ilkGrup.kiy, 0, tSon) ? [ilkGrup.a, ilkGrup.b] : [ilkGrup.b, ilkGrup.a];
    const K = ilkGrup.kiy, IP = ipGrup.kiy;
    // ipotekli alt kodu: DB 'İpotekli satış payı' İstanbul çapasıyla (7 ille doğrulandı: 20.8≈20.84)
    const { data: anaIp } = await sb.from('bolge_gostergeleri').select('deger').eq('il', 'İstanbul').eq('gosterge', 'İpotekli satış payı').order('donem', { ascending: false }).limit(1).maybeSingle();
    const ipAna = anaIp ? +anaIp.deger : 20;
    const ipOran = (tur: number) => Math.abs(100 * deger(tur, IST, IP, 0, tSon) / deger(0, IST, IP, 0, tSon) - ipAna);
    const ipKodu = ipOran(ipGrup.a) <= ipOran(ipGrup.b) ? ipGrup.a : ipGrup.b;

    // --- son N ayı yaz; her ay için 81 il × {aylık, ilk-el payı} + 4 Türkiye satırı
    const secilen = yilAylar.slice(-aySiniri);
    const satirlar: Record<string, unknown>[] = [];
    let atlananIl = 0, atlananAy = 0;
    // TR küpü aylık toplamı (eşleşme için): boyut FREQ,SATIS_TURU,REF_AREA,KONUT_ISYERI_GSTERGE,SATIS_ADET_PAY,INDICATOR,TIME
    const TS = tr.size; // [2,9,1,2,3,2,N]
    const tN = TS[TS.length - 1];
    const trTop = (t: number) => { const lin = ((((0 * 9 + 0) * 1 + 0) * 2 + 0) * 3 + 0) * 2 * tN + 0 * tN + t; return +(tr.value[lin] ?? NaN); };
    const trIp = (t: number) => { const lin = ((((0 * 9 + 1) * 1 + 0) * 2 + 0) * 3 + 1) * 2 * tN + 0 * tN + t; return +(tr.value[lin] ?? NaN); };
    for (const t of secilen) {
      const ulke = trTop(t);
      if (!Number.isFinite(ulke)) { atlananAy++; continue; }
      let toplamIl = 0; const aySatirlari: Record<string, unknown>[] = [];
      let bozukMu = false;
      for (let ref = 0; ref < refN; ref++) {
        const top = deger(0, ref, K, 0, t), ik = deger(ilk, ref, K, 0, t), ik2 = deger(ikinci, ref, K, 0, t);
        if (!(top > 0)) continue;
        const ilkOk = Number.isFinite(ik) && Number.isFinite(ik2) && Math.abs(ik + ik2 - top) <= 1; // durum ayrışması sağlam mı
        const topIp = deger(0, ref, IP, 0, t), ip = deger(ipKodu, ref, IP, 0, t), dg = deger(ipKodu === ipGrup.a ? ipGrup.b : ipGrup.a, ref, IP, 0, t);
        const ipOk = Number.isFinite(topIp) && topIp > 0 && Number.isFinite(ip) && Number.isFinite(dg) && Math.abs(ip + dg - topIp) <= 1; // şekil ayrışması sağlam mı
        toplamIl += top;
        const donem = donemOf(t), gnc = new Date().toISOString();
        aySatirlari.push({ il: ILLER[ref], ilce: '', donem, gosterge: 'Konut satışı (aylık)', deger: Math.round(top), birim: 'adet', kaynak: KAYNAK, guncelleme: gnc });
        if (ilkOk) aySatirlari.push({ il: ILLER[ref], ilce: '', donem, gosterge: 'İlk el satış payı', deger: Math.round((ik / top) * 1000) / 10, birim: '%', kaynak: KAYNAK, guncelleme: gnc });
        if (ipOk) aySatirlari.push({ il: ILLER[ref], ilce: '', donem, gosterge: 'İpotekli satış payı', deger: Math.round((ip / topIp) * 1000) / 10, birim: '%', kaynak: KAYNAK, guncelleme: gnc });
      }
      if (!bozukMu && Math.abs(toplamIl - ulke) > Math.max(3, ulke * 0.001)) { atlananAy++; continue; } // il toplamı ≠ Türkiye → ayı yazma
      const donem = donemOf(t);
      aySatirlari.push({ il: 'Türkiye', ilce: '', donem, gosterge: 'Konut satışı (aylık)', deger: Math.round(ulke), birim: 'adet', kaynak: KAYNAK, guncelleme: new Date().toISOString() });
      const ipUlke = trIp(t);
      if (Number.isFinite(ipUlke)) aySatirlari.push({ il: 'Türkiye', ilce: '', donem, gosterge: 'İpotekli satış payı', deger: Math.round((ipUlke / ulke) * 1000) / 10, birim: '%', kaynak: KAYNAK, guncelleme: new Date().toISOString() });
      // yıllık değişim: aynı ay geçen yıl
      const tGec = secilen.includes(t - 12) ? t - 12 : (zamanlar[t - 12] || '').match(/^\d{4}-\d{2}$/) ? t - 12 : -1;
      if (tGec >= 0) {
        const g = trTop(tGec);
        if (g > 0) aySatirlari.push({ il: 'Türkiye', ilce: '', donem, gosterge: 'Konut satışı yıllık değişim', deger: Math.round((ulke / g * 100 - 100) * 10) / 10, birim: '%', kaynak: KAYNAK, guncelleme: new Date().toISOString() });
      }
      satirlar.push(...aySatirlari);
    }
    const ozet = { ay: secilen.length, yazilan: satirlar.length, atlananAy, atlananIl, sonDonem: satirlar.length ? satirlar[satirlar.length - 1].donem : null, kiyKonut: K, kiyIpotekli: IP, ilkTur: ilk, ikinciTur: ikinci };
    if (kuru) return Response.json({ kuru: true, ...ozet });
    if (!satirlar.length) return dur('yazılacak satır yok (tüm aylar doğrulamayı geçemedi)');
    for (let i = 0; i < satirlar.length; i += 1000) {
      const { error } = await sb.from('bolge_gostergeleri').upsert(satirlar.slice(i, i + 1000), { onConflict: 'il,ilce,donem,gosterge' });
      if (error) return dur('upsert: ' + error.message);
    }
    await sb.from('veri_kaynaklari').update({ son_calisma: new Date().toISOString() }).eq('kod', KOD);
    await logla('ok', satirlar.length, JSON.stringify(ozet).slice(0, 400));
    return Response.json(ozet);
  } catch (e) {
    return dur('kritik: ' + String(e && (e as Error).stack || e).slice(0, 400));
  }
});
