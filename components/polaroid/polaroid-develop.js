/* ===========================================
   POLAROID DEVELOP - Scroll-triggered photo reveal
   ===========================================

   SETUP IN WEBFLOW:
   1. Create a wrapper div with data-polaroid attribute
   2. Put the image inside the wrapper
   3. Add a div with class "polaroid-overlay" inside wrapper
      - Position: absolute, full size (inset: 0)
      - Background: milky Polaroid color (#d8d4c8 or similar)
      - Pointer-events: none

   Effect: Image emerges from milky blank, like real Polaroid
   chemistry developing.
   =========================================== */

// Configuration
const polaroidConfig = {
  duration: 4,
  ease: 'power2.out',
  start: 'top 95%',
  // Image starts too bright, low contrast (washed out by chemistry)
  // No desaturation - colors emerge WITH the image, not after
  filterStart: 'brightness(2) contrast(0.3)',
  filterEnd: 'brightness(1) contrast(1)',
  // Overlay clears slightly faster than image develops
  overlayDuration: 3,
};

function initPolaroidDevelop() {
  document.querySelectorAll('[data-polaroid]').forEach(wrapper => {
    const image = wrapper.querySelector('img');
    const overlay = wrapper.querySelector('.polaroid-overlay');

    if (!image) return;

    // Set initial state - washed out (too bright, flat)
    gsap.set(image, { filter: polaroidConfig.filterStart });

    // Set overlay initial state if it exists
    if (overlay) {
      gsap.set(overlay, { opacity: 1 });
    }

    // Create timeline for coordinated animation
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapper,
        start: polaroidConfig.start,
        once: true
      }
    });

    // Overlay clears first (reveals image underneath)
    if (overlay) {
      tl.to(overlay, {
        opacity: 0,
        duration: polaroidConfig.overlayDuration,
        ease: polaroidConfig.ease,
      }, 0);
    }

    // Image develops (brightness/contrast normalize)
    tl.to(image, {
      filter: polaroidConfig.filterEnd,
      duration: polaroidConfig.duration,
      ease: polaroidConfig.ease,
    }, 0);
  });
}

document.addEventListener("DOMContentLoaded", initPolaroidDevelop);
