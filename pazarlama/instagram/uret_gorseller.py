# -*- coding: utf-8 -*-
"""Mülküm360 Instagram görselleri — marka paleti + Tektur + logo."""
import os
from PIL import Image, ImageDraw, ImageFont

KOK = r'C:\Users\fcali\vitrin-app'
FONT = os.path.join(KOK, 'pazarlama', 'fonts')
LOGO = os.path.join(KOK, 'assets', 'icon-only.png')
OUT = os.path.join(KOK, 'pazarlama', 'instagram', 'gorseller')
os.makedirs(OUT, exist_ok=True)

GECE = (11, 27, 51)        # #0B1B33
GECE2 = (16, 38, 68)       # hafif açık degrade
ALTIN = (212, 162, 76)     # #D4A24C
KREM = (245, 238, 223)     # #F5EEDF
KAPLAMA = (234, 196, 128)  # açık altın (vurgu)

def font(w, boyut):
    return ImageFont.truetype(os.path.join(FONT, f'Tektur-{w}.ttf'), boyut)

def sarmala(cizgi, metin, f, genislik):
    kelimeler = metin.split()
    satirlar, suan = [], ''
    for k in kelimeler:
        test = (suan + ' ' + k).strip()
        if cizgi.textlength(test, font=f) <= genislik:
            suan = test
        else:
            satirlar.append(suan); suan = k
    if suan: satirlar.append(suan)
    return satirlar

def zemin(w, h):
    img = Image.new('RGB', (w, h), GECE)
    d = ImageDraw.Draw(img)
    # yumuşak üst parlama
    for i in range(28):
        r = w - i * (w // 56)
        d.ellipse([w*0.5 - r, -h*0.25 - r*0.4, w*0.5 + r, -h*0.25 + r*0.4],
                  fill=tuple(int(a + (b - a) * 0.35) for a, b in zip(GECE, GECE2)))
    # ince altın çerçeve
    m = int(w * 0.035)
    d.rectangle([m, m, w - m, h - m], outline=ALTIN, width=max(2, w // 360))
    return img, d

def logo_yapistir(img, boyut, sol, ust):
    lg = Image.open(LOGO).convert('RGBA').resize((boyut, boyut), Image.LANCZOS)
    img.paste(lg, (sol, ust), lg)

def marka_alt(img, d, w, h):
    boyut = int(w * 0.052)
    logo_yapistir(img, boyut, int(w*0.06), h - int(h*0.075) - boyut)
    f = font(700, int(w * 0.030))
    d.text((int(w*0.06) + boyut + int(w*0.02), h - int(h*0.075) - boyut//2 - int(w*0.014)),
           'Mülküm360', font=f, fill=ALTIN)
    f2 = font(400, int(w * 0.021))
    d.text((w - int(w*0.06) - d.textlength('Hayalindekine bir adım.', font=f2),
            h - int(h*0.075) - boyut//2 - int(w*0.011)),
           'Hayalindekine bir adım.', font=f2, fill=KREM)

def rozet(d, w, metin, y):
    f = font(600, int(w * 0.024))
    tw = d.textlength(metin, font=f)
    px, py = int(w*0.022), int(w*0.010)
    x0 = int(w*0.07)
    d.rounded_rectangle([x0, y, x0 + tw + px*2, y + int(w*0.024) + py*2],
                        radius=int(w*0.02), outline=ALTIN, width=2)
    d.text((x0 + px, y + py - int(w*0.002)), metin, font=f, fill=ALTIN)

def gonderi(ad, rozet_metni, baslik, alt_metin, ikon=None):
    W, H = 1080, 1350
    img, d = zemin(W, H)
    y = int(H * 0.075)
    if rozet_metni:
        rozet(d, W, rozet_metni, y)
        y += int(H * 0.065)
    fb = font(800, int(W * 0.092))
    satirlar = sarmala(d, baslik, fb, W - int(W * 0.16))
    for s in satirlar:
        d.text((int(W*0.08), y), s, font=fb, fill=KREM)
        y += int(W * 0.105)
    y += int(H * 0.025)
    fa = font(400, int(W * 0.041))
    for s in sarmala(d, alt_metin, fa, W - int(W * 0.18)):
        d.text((int(W*0.08), y), s, font=fa, fill=KAPLAMA)
        y += int(W * 0.058)
    # altın pill CTA
    if ikon:
        ikon(d, W, H)
    fc = font(700, int(W * 0.034))
    cta = 'ÜCRETSİZ İNDİR · LİNK PROFİLDE'
    tw = d.textlength(cta, font=fc)
    ph, pv = int(W*0.045), int(W*0.022)
    x0, y0 = int(W*0.08), int(H*0.775)
    d.rounded_rectangle([x0, y0, x0 + tw + ph*2, y0 + int(W*0.034) + pv*2],
                        radius=int(W*0.045), fill=ALTIN)
    d.text((x0 + ph, y0 + pv - int(W*0.003)), cta, font=fc, fill=GECE)
    marka_alt(img, d, W, H)
    img.save(os.path.join(OUT, ad), quality=95)
    print('ok', ad)

# ---- basit çizgi ikonlar (altın) ----
def ikon_ev(d, W, H):
    cx, cy, r = W*0.72, H*0.60, W*0.115
    k = max(6, W//130)
    d.line([cx-r, cy, cx, cy-r*0.85], fill=ALTIN, width=k)
    d.line([cx, cy-r*0.85, cx+r, cy], fill=ALTIN, width=k)
    d.rectangle([cx-r*0.72, cy, cx+r*0.72, cy+r*0.75], outline=ALTIN, width=k)

def ikon_ai(d, W, H):
    k = max(6, W//130)
    cx, cy = W*0.72, H*0.60
    d.line([cx - W*0.07, cy + W*0.07, cx + W*0.05, cy - W*0.05], fill=ALTIN, width=k)
    for (dx, dy, rr) in [(0.08, -0.09, 0.022), (-0.02, -0.10, 0.016), (0.11, 0.0, 0.014), (-0.09, 0.03, 0.013)]:
        x, y, r = cx + W*dx, cy + H*dy*1.1, W*rr
        d.polygon([(x, y-r), (x+r*0.3, y-r*0.3), (x+r, y), (x+r*0.3, y+r*0.3)], fill=ALTIN)
        d.polygon([(x, y+r), (x-r*0.3, y+r*0.3), (x-r, y), (x-r*0.3, y-r*0.3)], fill=ALTIN)

def ikon_rapor(d, W, H):
    k = max(6, W//130)
    x0, y0, x1, y1 = W*0.655, H*0.505, W*0.80, H*0.695
    d.rounded_rectangle([x0, y0, x1, y1], radius=W*0.012, outline=ALTIN, width=k)
    for i in range(4):
        yy = y0 + (y1-y0)*(0.22 + i*0.18)
        d.line([x0 + W*0.03, yy, x1 - W*0.03, yy], fill=ALTIN, width=max(3, k//2))

defikon = lambda *a, **k: None
def ikon_aktar(d, W, H):
    k = max(6, W//130)
    cx, cy = W*0.73, H*0.60
    d.line([cx, cy - W*0.09, cx, cy + W*0.04], fill=ALTIN, width=k)
    d.polygon([(cx - W*0.045, cy + W*0.015), (cx + W*0.045, cy + W*0.015), (cx, cy + W*0.075)], fill=ALTIN)
    d.line([cx - W*0.085, cy + W*0.095, cx + W*0.085, cy + W*0.095], fill=ALTIN, width=k)

def ikon_araba(d, W, H):
    k = max(6, W//130)
    cx, cy = W*0.72, H*0.615
    d.rounded_rectangle([cx - W*0.10, cy - W*0.015, cx + W*0.10, cy + W*0.045], radius=W*0.014, outline=ALTIN, width=k)
    d.line([cx - W*0.055, cy - W*0.015, cx - W*0.03, cy - W*0.055], fill=ALTIN, width=k)
    d.line([cx - W*0.03, cy - W*0.055, cx + W*0.035, cy - W*0.055], fill=ALTIN, width=k)
    d.line([cx + W*0.035, cy - W*0.055, cx + W*0.06, cy - W*0.015], fill=ALTIN, width=k)
    for wx in (cx - W*0.055, cx + W*0.055):
        d.ellipse([wx - W*0.02, cy + W*0.03, wx + W*0.02, cy + W*0.07], outline=ALTIN, width=k)

def ikon_ofis(d, W, H):
    k = max(6, W//130)
    cx, cy = W*0.72, H*0.60
    d.ellipse([cx - W*0.055, cy - W*0.10, cx + W*0.055, cy + W*0.01], outline=ALTIN, width=k)
    d.polygon([(cx - W*0.055, cy + W*0.005), (cx + W*0.055, cy + W*0.005),
               (cx + W*0.085, cy + W*0.085), (cx - W*0.085, cy + W*0.085)], outline=ALTIN, width=k)

# ---- üretim ----
gonderi('gonderi-01-tanisma.png', 'TANITIM',
        'TÜRKİYE’NİN EMLAK PAZARINA YENİ ADRES',
        'Emlak ve vasıta ilanları tek uygulamada. İlan ver, mesajlaş, yapay zekâ desteği al.',
        ikon_ev)
gonderi('gonderi-02-mulkumai.png', 'ÖZELLİK',
        'İLAN AÇIKLAMASINI YAPAY ZEKÂ YAZSIN',
        'Bilgileri gir, MülkümAI sana satış odaklı profesyonel açıklama yazsın.',
        ikon_ai)
gonderi('gonderi-03-rapor.png', 'MÜLKÜMAI RAPOR',
        '“EVİM KAÇ PARA?” ARTIK CEBİNDE',
        'TCMB endeksi + TÜİK verileri + il/ilçe emsalleriyle PDF değer raporu. Yeni üyeye 1 adet hediye.',
        ikon_rapor)
gonderi('gonderi-04-aktarma.png', 'EMLAK OFİSLERİ İÇİN',
        'PORTAL İLANLARINI TEK SEFERDE TAŞI',
        'Excel/CSV dosyan yeterli: başlık, fiyat, konum ve fotoğraflar otomatik yüklensin.',
        ikon_aktar)
gonderi('gonderi-05-ofis.png', 'EMLAK DANIŞMANLARI',
        'PROFİLİN VİTRİNİN OLSUN',
        '“Emlak ofisi” rozeti, iletişim bilgilerin ilanlarda, müşterine verili rapor sun.',
        ikon_ofis)
gonderi('gonderi-06-vasita.png', '11 KATEGORİ',
        'ARABADAN TRAKTÖRE, HER ŞEY BURADA',
        'Otomobil, arazi/SUV, motosiklet, tarım iş makineleri… Satıcıyla direkt mesaj, komisyon yok.',
        ikon_araba)

# ---- reels kapaklari (1080x1920, metin orta güvenli bölgede) ----
def reels_kapak(ad, ust_yazi, buyuk_yazi, alt_yazi):
    W, H = 1080, 1920
    img, d = zemin(W, H)
    cy = int(H * 0.42)
    f1 = font(600, int(W * 0.042))
    d.text((int(W*0.5) - d.textlength(ust_yazi, font=f1)//2, cy - int(W*0.13)), ust_yazi, font=f1, fill=KAPLAMA)
    f2 = font(800, int(W * 0.105))
    y = cy
    for s in sarmala(d, buyuk_yazi, f2, W - int(W*0.18)):
        d.text((int(W*0.5) - d.textlength(s, font=f2)//2, y), s, font=f2, fill=KREM)
        y += int(W * 0.122)
    f3 = font(400, int(W * 0.036))
    y += int(W*0.04)
    for s in sarmala(d, alt_yazi, f3, W - int(W*0.22)):
        d.text((int(W*0.5) - d.textlength(s, font=f3)//2, y), s, font=f3, fill=ALTIN)
        y += int(W * 0.052)
    logo_yapistir(img, int(W*0.13), int(W*0.5) - int(W*0.065), y + int(W*0.07))
    img.save(os.path.join(OUT, ad), quality=95)
    print('ok', ad)

reels_kapak('reels-kapak-01.png', 'EN ÇOK MERAK EDİLEN',
            'EVİN GERÇEKTEN KAÇ PARA?',
            'TCMB + TÜİK verili rapor 30 saniyede')
reels_kapak('reels-kapak-02.png', 'MÜLKÜMAI DEMO',
            'İLAN AÇIKLAMASINI YAZIYOR',
            '20 saniyede ilan yayında')
reels_kapak('reels-kapak-03.png', 'EMEK BEKLEYENLERE',
            '3 AYDIR NEDEN SATILMIYOR?',
            'İlanının satılmama sebepleri')

# ---- one cikar kapaklari (400x400 sade) ----
def one_cikan(ad, metin):
    S = 400
    img = Image.new('RGB', (S, S), GECE)
    d = ImageDraw.Draw(img)
    m = 14
    d.rounded_rectangle([m, m, S-m, S-m], radius=26, outline=ALTIN, width=4)
    f = font(700, int(S * 0.115) if len(metin) < 10 else int(S * 0.085))
    satirlar = sarmala(d, metin, f, S - 120)
    toplam = len(satirlar) * (S * 0.12)
    y = (S - toplam) / 2
    for s in satirlar:
        d.text((S/2 - d.textlength(s, font=f)/2, y), s, font=f, fill=ALTIN)
        y += S * 0.12
    img.save(os.path.join(OUT, ad), quality=95)
    print('ok', ad)

one_cikan('one-cikan-nedir.png', 'Nedir?')
one_cikan('one-cikan-mulkumai.png', 'MülkümAI')
one_cikan('one-cikan-rapor.png', 'Rapor')
one_cikan('one-cikan-indir.png', 'İndir')

# ---- profil fotosu ----
lg = Image.open(LOGO).convert('RGBA')
S = 640
img = Image.new('RGBA', (S, S), GECE + (255,))
lg2 = lg.resize((int(S*0.72), int(S*0.72)), Image.LANCZOS)
img.paste(lg2, (int(S*0.14), int(S*0.14)), lg2)
img.convert('RGB').save(os.path.join(OUT, 'profil-foto.png'), quality=95)
print('ok profil-foto.png')

print('--- TAMAM ---', len(os.listdir(OUT)), 'dosya:', OUT)
