/* ===========================================
   HERO LOAD - Padding expand/settle on page load
   =========================================== */

document.addEventListener('DOMContentLoaded', () => {
  const hero = document.querySelector('.section_hero');
  if (!hero) return;

  // Mobile landscape and below: skip the padding tween; text reveal runs solo.
  if (window.innerWidth <= 767) return;

  const tl = gsap.timeline();

  tl.set(hero, { padding: '0rem' })
    .to(hero, {
      padding: '1.25rem',
      duration: 0.6,
      ease: 'power2.out'
    })
    .to(hero, {
      padding: '.75rem',
      duration: 0.4,
      ease: 'power2.inOut'
    });
});
