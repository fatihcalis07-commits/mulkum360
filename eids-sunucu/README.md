# EİDS röle sunucusu

Ticaret Bakanlığı EİDS servisleri yalnız önceden bildirilen **sabit IP** adresinden çağrılabiliyor.
Supabase'in sabit çıkış IP'si olmadığı için bu küçük sunucu sabit IP'li bir VPS'te çalışır.

## Bakanlığa bildirilecek bilgiler
- **returnUrl:** `https://eids.mulkum360.com/eids/donus`
- **Sunucu IP adresi:** VPS'in sabit IPv4 adresi

## Kurulum (Ubuntu 22.04/24.04 VPS)
1. Sabit IPv4'lü VPS kiralayın (Türkiye veya AB lokasyonu; en küçük paket yeterli).
2. DNS: `eids.mulkum360.com` için VPS IP'sine **A kaydı**.
3. Sunucuda:
   ```
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs caddy
   sudo mkdir -p /opt/mulkum-eids && sudo cp sunucu.mjs .env.ornek /opt/mulkum-eids/
   sudo cp /opt/mulkum-eids/.env.ornek /opt/mulkum-eids/.env && sudo nano /opt/mulkum-eids/.env   # anahtarları girin
   sudo chmod 600 /opt/mulkum-eids/.env
   sudo cp mulkum-eids.service /etc/systemd/system/ && sudo systemctl enable --now mulkum-eids
   sudo cp Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy
   ```
4. Kontrol: `https://eids.mulkum360.com/saglik` → `{"sunucu":"ok","ayarlar":"tamam","eids":"Healthy"}`
5. Uygulamada Yönetim → EİDS fazı `canli` yapılınca otomatik akış devreye girer.

## Akış
- Üye: Hesabım → "e-Devlet ile kimliğini doğrula" → e-Devlet girişi → `/eids/donus` → `GetKullaniciKodu` → `eids_uye`.
- Araç ilanı: plaka girilir → `/eids/arac` → `EidsAracApi` → başarılıysa marka/model/yıl EİDS'ten kilitlenir, ilan yayına çıkar.
- Taşınmaz: Faz-2 servis dokümanı Bakanlıktan gelince `/eids/tasinmaz` doldurulacak; o zamana kadar yönetici doğrulaması sürer.
- Saatlik iş: yetki süresi dolan araç ilanları yeniden sorgulanır, olumsuzsa yayından alınır.

## Güvenlik
- `.env` yalnız sunucuda durur (servis anahtarı ve Bakanlık parolası). Git'e girmez.
- Kimlik bilgileri loglanmaz. `eids_uye` tablosunu istemci okuyamaz.
