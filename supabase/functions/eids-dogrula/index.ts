// EİDS resmî API uyarlayıcısı — TASLAK (deploy edilmadı; docs/EIDS.md §4.5)
// DÜRÜSTLÜK KURALI: EIDS_API_* sırları tanımlı değilse HİÇBİR doğrulama iddiası üretmez;
// yalnız { durum: 'manuel' } döner ve akış yönetici onayına düşer. Resmî erişim/onay olmadan sahte sonuç YOK.
// Resmî sözleşme (Entegrasyon Dokümanı V2.2): POST https://ws.gtb.gov.tr:8443/EidsApi/Kullanici/GetKullaniciKodu
//   Header: Authorization: Basic (Bakanlığın firmaya verdiği bilgiler) · Body: { yetkiKodu, vergiNo?, gsmNo }
//   Dönüş: { ad, soyad, kullaniciKodu(Guid), hataMesaji, hataKodu } · Hatalar: TB-0001..TB-0005 · Sağlık: GET /EidsApi/health
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const API = Deno.env.get("EIDS_API_URL") || "";     // resmî erişim verilince doldurulur
const KEY = Deno.env.get("EIDS_API_KEY") || "";     // Basic kullanıcı
const SEC = Deno.env.get("EIDS_API_SECRET") || "";  // Basic parola — ASLA loglanmaz/yazılmaz

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method", { status: 405 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return new Response("JSON", { status: 400 }); }

  // Faz 1 kimlik akışının 2. adımı: e-Devlet dönüşündeki 2 dakikalık yetkiKodu ile kullanıcı kodu sorgulanır.
  const yetkiKodu = String(body.yetkiKodu || "");
  const gsmNo = String(body.gsmNo || "");
  const vergiNo = String(body.vergiNo || "");

  if (!API || !KEY || !SEC) {
    // Resmî erişim YOK → dürüst yanıt: doğrulanmadı, manuel yönetici onayına yönlendir.
    return Response.json({ durum: "manuel", mesaj: "Resmî EİDS erişimi tanımlı değil — yönetici doğrulaması gerekir" });
  }
  if (!/^[0-9a-zA-Z]{20}$/.test(yetkiKodu)) return Response.json({ durum: "gecersiz", mesaj: "yetkiKodu 20 karakter olmalı" });

  try {
    const r = await fetch(`${API.replace(/\/$/, "")}/Kullanici/GetKullaniciKodu`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Basic " + btoa(`${KEY}:${SEC}`) },
      body: JSON.stringify({ yetkiKodu, ...(vergiNo ? { vergiNo } : {}), gsmNo }),
    });
    const j = await r.json();
    const kod = j.kullaniciKodu || "";
    if (r.ok && kod) return Response.json({ durum: "dogrulandi", kullaniciKodu: kod, ad: j.ad || "", soyad: j.soyad || "", kaynak: "EIDS" });
    // Kimlik ASLA düz saklanmaz; yalnız Guid kullaniciKodu ve hata kodu ilerler.
    return Response.json({ durum: "dogrulanamadi", hataKodu: j.hataKodu || j.islemSonucKodu || "?", mesaj: j.hataMesaji || j.islemSonucMesaji || "", kaynak: "EIDS" });
  } catch {
    return Response.json({ durum: "erisim-hatasi", mesaj: "EİDS servisine ulaşılamadı — manuel akışa düş" });
  }
});
