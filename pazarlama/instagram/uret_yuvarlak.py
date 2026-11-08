# -*- coding: utf-8 -*-
# Yuvarlak (highlight) kapak kartlari — satariz tarzi: dolgu daire + cizgi ikon + etiket
import os
from PIL import Image, ImageDraw, ImageFont

G = os.path.join(os.path.dirname(__file__), 'gorseller')
F = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'fonts')
GECE = (11, 27, 51)
KIRMIZI = (232, 69, 31)
ALTIN = (212, 162, 76)
SARI = (255, 199, 44)

def font(sz, kali=False):
    return ImageFont.truetype(os.path.join(F, 'Tektur-%d.ttf' % (800 if kali else 700)), sz)

def cizgi(d, noktalar, renk, w):
    d.line(noktalar, fill=renk, width=w, joint='curve')
    for (x, y) in (noktalar if isinstance(noktalar[0], tuple) else noktalar):
        d.ellipse([x - w // 2, y - w // 2, x + w // 2, y + w // 2], fill=renk)

def ikon_ev(d, cx, cy, renk, w):
    cizgi(d, [(cx - 150, cy - 95), (cx, cy - 215), (cx + 150, cy - 95)], renk, w)
    cizgi(d, [(cx - 110, cy - 120), (cx - 110, cy + 25), (cx + 110, cy + 25), (cx + 110, cy - 120)], renk, w)
    cizgi(d, [(cx - 30, cy + 25), (cx - 30, cy - 50), (cx + 30, cy - 50), (cx + 30, cy + 25)], renk, w)

def ikon_araba(d, cx, cy, renk, w):
    d.rounded_rectangle([cx - 95, cy - 200, cx + 95, cy - 125], radius=25, outline=renk, width=w)
    d.rounded_rectangle([cx - 160, cy - 130, cx + 160, cy - 35], radius=22, outline=renk, width=w)
    for wx in (cx - 85, cx + 85):
        d.ellipse([wx - 32, cy - 68, wx + 32, cy - 4], fill=renk)
        d.ellipse([wx - 14, cy - 50, wx + 14, cy - 22], fill=None)
    cizgi(d, [(cx - 55, cy - 130), (cx - 35, cy - 185)], renk, max(6, w - 10))
    cizgi(d, [(cx + 55, cy - 130), (cx + 35, cy - 185)], renk, max(6, w - 10))

def ikon_ai(d, cx, cy, renk, w):
    d.rounded_rectangle([cx - 115, cy - 170, cx + 115, cy - 45], radius=30, outline=renk, width=w)
    for ex in (cx - 55, cx + 55):
        d.ellipse([ex - 16, cy - 130, ex + 16, cy - 98], fill=renk)
    cizgi(d, [(cx - 45, cy - 78), (cx + 45, cy - 78)], renk, max(8, w - 8))
    cizgi(d, [(cx, cy - 170), (cx, cy - 215)], renk, w)
    d.ellipse([cx - 16, cy - 240, cx + 16, cy - 208], fill=renk)
    cizgi(d, [(cx - 155, cy - 130), (cx - 115, cy - 130)], renk, w)
    cizgi(d, [(cx + 115, cy - 130), (cx + 155, cy - 130)], renk, w)

def ikon_rapor(d, cx, cy, renk, w):
    cizgi(d, [(cx - 120, cy + 30), (cx - 120, cy - 60)], renk, w)
    cizgi(d, [(cx - 30, cy + 30), (cx - 30, cy - 130)], renk, w)
    cizgi(d, [(cx + 60, cy + 30), (cx + 60, cy - 30)], renk, w)
    cizgi(d, [(cx + 150, cy + 30), (cx + 150, cy - 180)], renk, w)
    cizgi(d, [(cx + 110, cy - 150), (cx + 150, cy - 195), (cx + 190, cy - 150)], renk, w)
    cizgi(d, [(cx - 160, cy + 55), (cx + 185, cy + 55)], renk, max(8, w - 10))

def ikon_indir(d, cx, cy, renk, w):
    cizgi(d, [(cx, cy - 220), (cx, cy - 40)], renk, w)
    cizgi(d, [(cx - 70, cy - 110), (cx, cy - 35), (cx + 70, cy - 110)], renk, w)
    cizgi(d, [(cx - 150, cy + 5), (cx - 150, cy + 55), (cx + 150, cy + 55), (cx + 150, cy + 5)], renk, w)

KONULAR = [
    ('ev', ikon_ev, 'ev'),
    ('vasita', ikon_araba, 'vasıta'),
    ('mulkumai', ikon_ai, 'MülkümAI'),
    ('rapor', ikon_rapor, 'rapor'),
    ('indir', ikon_indir, 'indir'),
]

def kart(daire, yazi, ikonfn, etiket, yol, boyut=1080):
    im = Image.new('RGB', (boyut, boyut), GECE)
    d = ImageDraw.Draw(im)
    s = boyut / 1080.0
    m = int(100 * s)
    d.ellipse([m, m, boyut - m, boyut - m], fill=daire)
    cx = boyut // 2
    w = max(10, int(24 * s))
    ikonfn(d, cx, int(boyut * 0.42), yazi, w)
    f = font(int(112 * s), kali=True)
    tb = d.textbbox((0, 0), etiket, font=f)
    d.text((cx - (tb[2] - tb[0]) / 2, boyut * 0.60), etiket, font=f, fill=yazi)
    im.save(yol.replace('{c}', 'png').split('.png')[0] + '.png')
    im.save(yol.replace('{c}', 'jpg').split('.png')[0] + '.jpg', quality=92)
    return im

def hikaye(kart_im, yol):
    st = Image.new('RGB', (1080, 1920), GECE)
    st.paste(kart_im, (0, 420))
    st.save(yol.replace('.png', '.jpg'), quality=92)
    st.save(yol)

renkler = [('sari', SARI, GECE)]
for rk, rc, yz in renkler:
    for ad, fn, etiket in KONULAR:
        p = os.path.join(G, 'yuvarlak-%s-%s.png' % (rk, ad))
        im = kart(rc, yz, fn, etiket, p)
        if rk == 'sari':
            hikaye(im, os.path.join(G, 'hikaye-yuvarlak-%s.jpg' % ad))
        print('ok', os.path.basename(p))
print('bitti')
