/* Mülküm360 tanıtım sayfası: sayfaya özgü davranış (motor değiştirilmez).
   1) Folio: geçilen bölümün adı kenarda güncellenir.
   2) Ölçek göstergesi (imza hareket): iniş sırasında ekranın kapsadığı gerçek genişlik yazılır.
      Kareler uydu fonksiyonundan z3..z17 düzeylerinden üretildi; 1280 px'lik kare, Mapbox 512 px karo ölçeğinde,
      enlem 36,9361: görüş genişliği = 1280 * 78271,517 * cos(enlem) / 2^zoom metre. */
(function () {
  'use strict';
  var folio = document.getElementById('folio'), folioAd = document.getElementById('folioAd');
  if (folio && 'IntersectionObserver' in window) {
    var son = '';
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var ad = e.target.getAttribute('data-bolum');
        if (!ad || ad === son) return;
        son = ad; folio.classList.add('degisiyor');
        setTimeout(function () { folioAd.textContent = ad; folio.classList.remove('degisiyor'); }, 200);
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    document.querySelectorAll('[data-bolum]').forEach(function (s) { io.observe(s); });
  }

  /* Üst çubuk: aşağı kaydırınca gizlenir, yukarı kaydırınca döner */
  var ust = document.getElementById('ust'), sy = 0;
  if (ust) window.addEventListener('scroll', function () {
    var y = window.scrollY; ust.classList.toggle('gizli', y > sy && y > 240); sy = y;
  }, { passive: true });
  /* Eylem düğmesi: imleci izleyen ışık */
  document.querySelectorAll('.eylem').forEach(function (b) {
    b.addEventListener('pointermove', function (e) {
      var r = b.getBoundingClientRect();
      b.style.setProperty('--mx', (e.clientX - r.left) + 'px'); b.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
  /* Kapak kartı: imleçle hafif eğilir */
  var kart = document.querySelector('.kapak__kart');
  if (kart && matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) {
    document.getElementById('kapak').addEventListener('pointermove', function (e) {
      var x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      kart.style.transform = 'perspective(1200px) rotateY(' + (-9 + x * 8) + 'deg) rotateX(' + (3 - y * 6) + 'deg) rotate(1.5deg)';
    });
  }

  var inis = document.getElementById('inis'), deger = document.getElementById('olcekDeger');
  if (!inis || !deger) return;
  var N = 56, Z0 = 3, Z1 = 17, ENLEM = 36.9361 * Math.PI / 180, vur = false, sonYazi = '';
  var ease = function (p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; };
  function bicim(m) {
    if (m >= 1000) {
      var km = m / 1000, ham = km >= 100 ? Math.round(km / 10) * 10 : km >= 10 ? Math.round(km) : Math.round(km * 10) / 10;
      return new Intl.NumberFormat('tr-TR').format(ham) + ' km';
    }
    return new Intl.NumberFormat('tr-TR').format(Math.max(10, Math.round(m / 10) * 10)) + ' m';
  }
  function guncelle() {
    var p = parseFloat(getComputedStyle(inis).getPropertyValue('--sc-p')) || 0;
    var idx = Math.max(0, Math.min(N - 1, Math.round(p * (N - 1))));
    var zc = Z0 + (Z1 - Z0) * ease(idx / (N - 1));
    var genislik = 1280 * 78271.517 * Math.cos(ENLEM) / Math.pow(2, zc);
    var y = bicim(genislik);
    if (y !== sonYazi) { deger.textContent = y; sonYazi = y; }
  }
  function dongu() { guncelle(); if (vur) requestAnimationFrame(dongu); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { var onceki = vur; vur = e.isIntersecting; if (vur && !onceki) dongu(); });
    }, { rootMargin: '100px 0px' }).observe(inis);
  } else { window.addEventListener('scroll', guncelle, { passive: true }); }
  guncelle();
})();
