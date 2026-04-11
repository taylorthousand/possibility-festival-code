/* ===========================================
   SECTION SNAP - Magnetic scroll snap between sections
   =========================================== */

/* SETUP IN WEBFLOW:
   - Paste this script in a code embed before </body>
   - Requires GSAP + ScrollTrigger (already loaded via external-scripts)
   - Must load AFTER polaroid-carousel.js (needs carousel's pin to exist first)
   - No Webflow setup needed — it finds the sections automatically
*/

(function () {
  /* ---------- CONFIG ---------- */
  var SNAP_EASE = 'power2.inOut';     // plunge in, smooth landing
  var SNAP_DURATION_MIN = 0.8;        // seconds (small nudge = slower pull)
  var SNAP_DURATION_MAX = 1;          // seconds (big scroll = quicker snap)
  var SNAP_DELAY = 0;                 // seconds after scroll stops before magnet kicks in

  function init() {
    // if (window.innerWidth < 992) return; // TEMP: disabled for mobile testing

    var solution = document.querySelector('.section_solution');
    var carousel = document.querySelector('[data-carousel="polaroid"]');
    if (!solution || !carousel) return;

    var dummy = { v: 0 };

    ScrollTrigger.create({
      animation: gsap.to(dummy, { v: 1 }),
      trigger: solution,
      start: 'center 25%',
      end: 'bottom top',
      scrub: true,
      snap: {
        snapTo: 1,
        duration: { min: SNAP_DURATION_MIN, max: SNAP_DURATION_MAX },
        delay: SNAP_DELAY,
        ease: SNAP_EASE,
        directional: true,
      },
    });
  }

  // Initialize after DOM ready + a tick for other ScrollTriggers to register
  document.addEventListener('DOMContentLoaded', function () {
    requestAnimationFrame(init);
  });
})();
