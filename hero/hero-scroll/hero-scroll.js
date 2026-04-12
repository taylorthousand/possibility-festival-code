/* ===========================================
   HERO SCROLL - Scale + rotate on scroll-out
   =========================================== */

document.addEventListener('DOMContentLoaded', () => {
  const hero = document.querySelector('.section_hero');
  const inner = document.querySelector('.hero_inner');
  if (!hero || !inner) return;

  const isMobile = window.innerWidth < 768;
  const tweenProps = isMobile
    ? { scale: 0.7, rotation: 15, opacity: 0.85, ease: 'none' }
    : { scale: 0.7, rotation: 15, opacity: 0.85, outline: '1rem solid #000000', ease: 'none' };
  if (!isMobile) gsap.set(inner, { outline: '0rem solid #000000' });
  tweenProps.scrollTrigger = {
    trigger: hero,
    start: 'top top',
    end: 'bottom top',
    scrub: true
  };
  gsap.to(inner, tweenProps);
});
