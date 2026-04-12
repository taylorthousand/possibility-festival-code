/* ===========================================
   GRADIENT EMANATE - Scroll-scrubbed radial gradient
   =========================================== */

const emanateConfig = {
  stop1End: 0,
  stop2End: 0,
  blackStartEnd: 0,   // black edge collapses from 100% to 0%
  start: 'center 16%',
  end: 'bottom top',
};

function initGradientEmanate() {
  if (window.innerWidth < 768) return;
  const sections = document.querySelectorAll('.section_solution');

  sections.forEach(section => {
    gsap.to(section, {
      '--stop1': `${emanateConfig.stop1End}%`,
      '--stop2': `${emanateConfig.stop2End}%`,
      '--black-start': `${emanateConfig.blackStartEnd}%`,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: emanateConfig.start,
        end: emanateConfig.end,
        scrub: true
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", initGradientEmanate);
