/* ===========================================
   BACKGROUND SHIFT - Scroll-triggered gradient to solid transition
   ===========================================

   Animates an overlay from opacity 0 to 1, creating the effect of
   a gradient transitioning to a solid color.

   SETUP IN WEBFLOW:
   1. Section has the gradient background
   2. Add a div inside (absolute, full size, pointer-events: none)
   3. Give it the solid end color, set opacity to 0
   4. Add class: .bg-shift-overlay

   =========================================== */

function initBackgroundShift() {
  document.querySelectorAll('.bg-shift-overlay').forEach(overlay => {
    // Find the parent section to use as trigger
    const section = overlay.parentElement;

    gsap.to(overlay, {
      opacity: 1,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: section,
        start: 'top 60%',
        toggleActions: 'play none none reverse'
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", initBackgroundShift);
