/* ===========================================
   PARALLAX SECTIONS - Scroll-driven section transitions
   ===========================================

   ATTRIBUTES:
   - data-parallax="out"   → section sinks DOWN as you scroll past
   - data-parallax="rise"  → section rises UP out of the way

   Both require the next section to have higher z-index (set in Webflow).
   =========================================== */

// Configuration - adjust these to tune the effect
const parallaxConfig = {
  out: {
    y: '18.75rem',       // how far down the section sinks (300px at 16px base)
    start: 'top top',
    end: 'bottom top',
  },
  rise: {
    y: '-18.75rem',      // how far up the section rises (300px at 16px base)
    start: 'top top',
    end: 'bottom top',
  }
};

function initParallaxSections() {
  // Sections that sink down as you scroll past
  document.querySelectorAll('[data-parallax="out"]').forEach(section => {
    gsap.to(section, {
      y: parallaxConfig.out.y,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: parallaxConfig.out.start,
        end: parallaxConfig.out.end,
        scrub: true
      }
    });
  });

  // Sections that rise up out of the way
  document.querySelectorAll('[data-parallax="rise"]').forEach(section => {
    gsap.to(section, {
      y: parallaxConfig.rise.y,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: parallaxConfig.rise.start,
        end: parallaxConfig.rise.end,
        scrub: true
      }
    });
  });
}

// Initialize after DOM is ready
document.addEventListener("DOMContentLoaded", initParallaxSections);
