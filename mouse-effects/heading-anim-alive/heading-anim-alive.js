/* ===========================================
   ALIVE - Layered subtle mouse-responsive effects
   ===========================================

   Makes headings feel "alive" by layering three
   barely-perceptible effects that respond to mouse
   position: parallax drift, soft skew, and letter
   spacing shift. Only active while element is in
   the viewport.

   ATTRIBUTES:
   - data-alive          → enables the effect

   SETUP IN WEBFLOW:
   1. Add data-alive to any heading
   2. No other setup needed
   =========================================== */

const aliveDefaults = {
  driftX: 10,           // max px horizontal drift
  driftY: 5,            // max px vertical drift
  maxSkew: 2,           // max degrees skewX
  spacingShift: 0.02,   // max em added to letter spacing
  duration: 0.6,
  ease: 'power2.out'
};

function initAlive() {
  const elements = document.querySelectorAll('[data-alive]');
  if (!elements.length) return;

  const visibleSet = new Set();

  elements.forEach(el => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onEnter: () => visibleSet.add(el),
      onLeave: () => visibleSet.delete(el),
      onEnterBack: () => visibleSet.add(el),
      onLeaveBack: () => visibleSet.delete(el)
    });
  });

  document.addEventListener('mousemove', (e) => {
    if (!visibleSet.size) return;

    // Mouse position normalized to -1 to 1 from viewport center
    const mx = (e.clientX / window.innerWidth - 0.5) * 2;
    const my = (e.clientY / window.innerHeight - 0.5) * 2;

    visibleSet.forEach(el => {
      // Drift: opposite to mouse direction
      const driftX = -mx * aliveDefaults.driftX;
      const driftY = -my * aliveDefaults.driftY;

      // Skew: lean based on horizontal mouse position
      const skew = mx * aliveDefaults.maxSkew;

      // Letter spacing: expand slightly based on mouse distance from center
      const distance = Math.sqrt(mx * mx + my * my);
      const spacing = distance * aliveDefaults.spacingShift;

      gsap.to(el, {
        x: driftX,
        y: driftY,
        skewX: skew,
        letterSpacing: `${spacing}em`,
        duration: aliveDefaults.duration,
        ease: aliveDefaults.ease,
        overwrite: 'auto'
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', initAlive);
