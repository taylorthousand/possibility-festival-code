/* ===========================================
   SPOTLIGHT - Mouse-reactive fog overlay
   ===========================================

   A light fog overlay with a soft spotlight hole that shifts
   subtly in response to mouse movement. The spotlight doesn't
   follow the mouse directly — it moves ~10% of the mouse offset
   from center, creating a gentle parallax feel.

   The spotlight dynamically tracks a target element (marked with
   data-spotlight-target) so the circle stays centered on it as
   it scrolls into its sticky position. Falls back to a static
   position (65%, 30%) if no target is found.

   SETUP IN WEBFLOW:
   1. Add data-spotlight to the target section
   2. Section must NOT have overflow: hidden (breaks sticky)
   3. Add a child div as the FIRST CHILD of the section:
      - Class: spotlight-overlay
      - Position: Sticky (or static — CSS file handles it)
      - Pointer-events: None
   4. Add data-spotlight-target to the element the spotlight
      should track (e.g. the Polaroid photo)

   =========================================== */

const spotlightConfig = {
  damping: 0.04,          // fraction of mouse offset applied (0.1 = 10%)
  easeDuration: 0.5,     // smooth follow duration in seconds
  fadeInDuration: 0.6,   // overlay fade-in duration
  scrollStart: '10% top' // when 10% of section passes top of viewport
};

function initSpotlight() {
  const sections = document.querySelectorAll('[data-spotlight]');

  sections.forEach(section => {
    const overlay = section.querySelector('.spotlight-overlay');
    if (!overlay) return;

    const target = section.querySelector('[data-spotlight-target]');
    const hasTarget = !!target;

    // Fallback position when no target element is found
    const fallbackX = 65;
    const fallbackY = 30;

    // Dynamic base position — updated on scroll when target exists
    let baseX = fallbackX;
    let baseY = fallbackY;

    // Mouse tracking state
    let isHovering = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    // Set initial position
    overlay.style.setProperty('--spotlight-x', `${baseX}%`);
    overlay.style.setProperty('--spotlight-y', `${baseY}%`);

    // --- Helper: apply current spotlight position ---
    function applyPosition() {
      if (isHovering) {
        // Offset from dynamic base by damped mouse delta
        const spotX = baseX + (lastMouseX - baseX) * spotlightConfig.damping;
        const spotY = baseY + (lastMouseY - baseY) * spotlightConfig.damping;
        gsap.to(overlay, {
          '--spotlight-x': `${spotX}%`,
          '--spotlight-y': `${spotY}%`,
          duration: spotlightConfig.easeDuration,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      } else {
        // Snap to base — no tween needed during scroll
        gsap.set(overlay, {
          '--spotlight-x': `${baseX}%`,
          '--spotlight-y': `${baseY}%`
        });
      }
    }

    // --- Helper: recalculate base from target's viewport position ---
    function updateBaseFromTarget() {
      if (!hasTarget) return;
      const rect = target.getBoundingClientRect();
      baseX = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
      baseY = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
    }

    // --- Set position immediately so it's correct from the first frame ---
    updateBaseFromTarget();
    applyPosition();

    // --- Mouse events ---
    section.addEventListener('mousemove', (e) => {
      isHovering = true;
      // Mouse position as viewport percentages
      lastMouseX = (e.clientX / window.innerWidth) * 100;
      lastMouseY = (e.clientY / window.innerHeight) * 100;

      const spotX = baseX + (lastMouseX - baseX) * spotlightConfig.damping;
      const spotY = baseY + (lastMouseY - baseY) * spotlightConfig.damping;

      gsap.to(overlay, {
        '--spotlight-x': `${spotX}%`,
        '--spotlight-y': `${spotY}%`,
        duration: spotlightConfig.easeDuration,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    });

    section.addEventListener('mouseleave', () => {
      isHovering = false;
      gsap.to(overlay, {
        '--spotlight-x': `${baseX}%`,
        '--spotlight-y': `${baseY}%`,
        duration: spotlightConfig.easeDuration,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    });

    // --- ScrollTrigger 1: position tracking (entire time section is in viewport) ---
    ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: () => {
        updateBaseFromTarget();
        applyPosition();
      }
    });

    // --- ScrollTrigger 2: fog opacity fade only ---
    ScrollTrigger.create({
      trigger: section,
      start: spotlightConfig.scrollStart,
      end: 'bottom bottom',
      toggleActions: 'play none none reverse',
      onEnter: () => gsap.to(overlay, {
        opacity: 1,
        duration: spotlightConfig.fadeInDuration,
        ease: 'power2.out',
        overwrite: 'auto'
      }),
      onLeaveBack: () => gsap.to(overlay, {
        opacity: 0,
        duration: spotlightConfig.fadeInDuration,
        ease: 'power2.out',
        overwrite: 'auto'
      })
    });
  });
}

document.addEventListener("DOMContentLoaded", initSpotlight);
