/* ===========================================
   HERO SCROLL - Scale + rotate on scroll-out
   =========================================== */

document.addEventListener('DOMContentLoaded', () => {
  const hero = document.querySelector('.section_hero');
  const inner = document.querySelector('.hero_inner');
  if (!hero || !inner) return;

  gsap.set(inner, { outline: '0rem solid #000000' });
  gsap.to(inner, {
    scale: 0.7,
    rotation: 15,
    outline: '1rem solid #000000',
    ease: 'none',
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      scrub: true
    }
  });
});
