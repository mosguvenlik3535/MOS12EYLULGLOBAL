/* MOSBARKODYAZILIM — tanıtım sitesi etkileşimleri
   Mobil menü, ekran görüntüsü kaydırma, yıl etiketi. */

document.addEventListener('DOMContentLoaded', () => {
  /* yıl */
  const yil = document.getElementById('yil');
  if (yil) yil.textContent = String(new Date().getFullYear());

  /* mobil menü */
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', () => nav.classList.toggle('open'));
    nav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') nav.classList.remove('open');
    });
  }

  /* ekran görüntüleri: oklarla kaydırma */
  const scroll = document.getElementById('shotsScroll');
  const prev = document.getElementById('shotPrev');
  const next = document.getElementById('shotNext');
  if (scroll && prev && next) {
    const step = () => Math.min(360, scroll.clientWidth * 0.8);
    prev.addEventListener('click', () => scroll.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => scroll.scrollBy({ left: step(), behavior: 'smooth' }));
  }
});
