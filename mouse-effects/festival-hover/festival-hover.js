/* ===========================================
   FESTIVAL HOVER — heading skew on hover
   ===========================================

   Hovering a .festivals_item-link skews the
   heading text to create a faux-italic effect.

   SETUP IN WEBFLOW:
   - Each .festivals_item-link gets data-festival attribute
   - Heading inside link has class .heading-style-h4-56.is-festivals

   Requires: GSAP
   =========================================== */

(function () {

  function initFestivalHover() {
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFestivalHover);
  } else {
    initFestivalHover();
  }
})();
