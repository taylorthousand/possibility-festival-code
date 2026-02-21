/* ===========================================
   HEADING TILT 2 - Flat Z-axis rotation from mouse
   ===========================================

   Rotates headings on the Z-axis based on the angle
   from the element's center to the mouse cursor.
   Only active while the element is in the viewport.

   ATTRIBUTES:
   - data-tilt-z          → enables the effect
   - data-tilt-z-amount   → (optional) max rotation in degrees, default 5

   SETUP IN WEBFLOW:
   1. Add data-tilt-z to any heading
   2. No other setup needed
   =========================================== */

const tiltZDefaults = {
  maxRotation: 5,
  easeDuration: 0.5,
  ease: 'power2.out'
};

function initHeadingTiltZ() {
  const elements = document.querySelectorAll('[data-tilt-z]');
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

    visibleSet.forEach(el => {
      const max = parseFloat(el.getAttribute('data-tilt-z-amount')) || tiltZDefaults.maxRotation;

      // Angle from element center to mouse
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);

      // Convert to degrees, offset so 0 = directly below
      const degrees = angle * 180 / Math.PI - 90;

      // Clamp to max rotation range
      const rotation = Math.max(-max, Math.min(max, degrees * (max / 90)));

      gsap.to(el, {
        rotation: rotation,
        duration: 0.3,
        ease: tiltZDefaults.ease,
        overwrite: 'auto'
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', initHeadingTiltZ);
