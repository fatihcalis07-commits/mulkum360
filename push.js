// Anlık bildirim (FCM). Yalnız Android derlemesinde google-services.json varken açılır (PUSH_ACIK derleme sırasında yazılır).
// Jeton push_jetonlari tablosuna yazılır; sunucu her yeni bildirimde push-gonder ile telefona yollar.
const PUSH_ACIK = true;
let pushKurulu = false;
async function pushKur() {
  const P = window.Capacitor?.Plugins?.PushNotifications;
  if (!PUSH_ACIK || pushKurulu || !P || !S.oturum || !window.Capacitor?.isNativePlatform?.()) return;
  pushKurulu = true;
  try {
    let izin = await P.checkPermissions();
    if (izin.receive !== 'granted') izin = await P.requestPermissions();
    if (izin.receive !== 'granted') return;
    try { await P.createChannel({ id: 'genel', name: 'Bildirimler', importance: 4 }); } catch (_) {}
    P.addListener('registration', async (t) => { try { await sb.from('push_jetonlari').upsert({ token: t.value, kullanici: S.oturum, platform: window.Capacitor.getPlatform(), guncelleme: new Date().toISOString() }); } catch (_) {} });
    P.addListener('pushNotificationActionPerformed', (a) => { const l = a.notification?.data?.link; if (l) git(l); });
    await P.register();
  } catch (e) { pushKurulu = false; console.error('push', e); }
}
