/* ===========================================
   FESTIVAL HOVER — heading skew + dynamic shadow
   ===========================================

   Hovering a .festivals_item-link skews the
   heading text to create a faux-italic effect.

   Polaroid images get a dynamic box-shadow that
   responds to their Y-axis rotation (driven by
   Webflow interaction). Shadow shifts opposite
   to rotation for a realistic depth effect.

   SETUP IN WEBFLOW:
   - Each .festivals_item-link gets data-festival attribute
   - Heading inside link has class .heading-style-h4-56.is-festivals
   - Polaroid elements have matching data-festival attribute
   - Polaroid Y-axis rotation driven by Webflow mouse interaction

   Requires: GSAP
   =========================================== */

(function () {

  function initFestivalHover() {
    // Heading skew on list hover
    document.querySelectorAll('.festivals_item-link[data-festival]').forEach(function (link) {
      var heading = link.querySelector('.heading-style-h4-56.is-festivals');
      if (!heading) return;

      link.addEventListener('mouseenter', function () {
        gsap.to(heading, { skewX: -10, duration: 0.3, ease: 'power2.out', overwrite: true });
      });

      link.addEventListener('mouseleave', function () {
        gsap.to(heading, { skewX: 0, duration: 0.2, ease: 'power2.out', overwrite: true });
      });
    });

    // Dynamic shadow on polaroid rotation
    var polaroids = document.querySelectorAll('[data-festival]:not(.festivals_item-link)');
    if (polaroids.length) {
      var BASE_X = 3, BASE_Y = 3, BASE_BLUR = 5;
      var SHIFT = 0.15;      // px of shadow shift per degree of rotateY
      var BLUR_EXTRA = 0.1;  // extra blur px per degree of rotation

      function updateShadows() {
        polaroids.forEach(function (p) {
          var rotY = gsap.getProperty(p, 'rotateY') || 0;
          var offsetX = BASE_X - rotY * SHIFT;
          var blur = BASE_BLUR + Math.abs(rotY) * BLUR_EXTRA;
          p.style.boxShadow = offsetX + 'px ' + BASE_Y + 'px ' + blur + 'px 0px rgba(0,0,0,0.35)';
        });
      }

      gsap.ticker.add(updateShadows);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFestivalHover);
  } else {
    initFestivalHover();
  }
})();
