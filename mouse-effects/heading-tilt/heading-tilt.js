/* ===========================================
   HEADING TILT - 3D perspective tilt from mouse
   ===========================================

   Subtle 3D tilt effect on headings that reacts
   to mouse position globally. Only active while
   the element is in the viewport.
   Includes a dynamic text-shadow that shifts opposite
   to the tilt for a "floating above the page" look.

   ATTRIBUTES:
   - data-tilt          → enables the tilt effect
   - data-tilt-amount   → (optional) max rotation in degrees, default 10

   SETUP IN WEBFLOW:
   1. Add data-tilt to any heading
   2. No other setup needed
   =========================================== */

const tiltDefaults = {
  maxRotation: 10,
  perspective: 800,
  easeDuration: 0.5,
  ease: 'power2.out',
  shadowBlur: 20,
  shadowDistance: 15,
  shadowColor: 'rgba(0, 0, 0, 0.3)'
};

function initHeadingTilt() {
  const elements = document.querySelectorAll('[data-tilt]');
  if (!elements.length) return;

  // Resting shadow (always-on floating look)
  const restingShadow = `0px 4px ${tiltDefaults.shadowBlur * 0.5}px ${tiltDefaults.shadowColor}`;

  // Track which elements are in the viewport
  const visibleSet = new Set();

  // Track last mouse position
  let lastMouseX = 0.5;
  let lastMouseY = 0.5;

  elements.forEach(el => {
    el.style.perspective = `${tiltDefaults.perspective}px`;
    gsap.set(el, { textShadow: restingShadow });

    // Use ScrollTrigger to track viewport visibility
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

  // Only update tilt on mousemove, not on scroll
  document.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX / window.innerWidth;
    lastMouseY = e.clientY / window.innerHeight;

    if (!visibleSet.size) return;

    const x = (lastMouseX - 0.5) * 2;
    const y = (lastMouseY - 0.5) * 2;
    const originX = lastMouseX * 100;
    const originY = lastMouseY * 100;

    visibleSet.forEach(el => {
      const max = parseFloat(el.getAttribute('data-tilt-amount')) || tiltDefaults.maxRotation;
      const rotateX = -y * max;
      const rotateY = x * max;

      const shadowX = -rotateY * (tiltDefaults.shadowDistance / max);
      const shadowY = rotateX * (tiltDefaults.shadowDistance / max);

      gsap.to(el, {
        rotateX: rotateX,
        rotateY: rotateY,
        transformOrigin: `${originX}% ${originY}%`,
        textShadow: `${shadowX}px ${shadowY}px ${tiltDefaults.shadowBlur}px ${tiltDefaults.shadowColor}`,
        duration: 0.3,
        ease: tiltDefaults.ease,
        overwrite: 'auto'
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', initHeadingTilt);
