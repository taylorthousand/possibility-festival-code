/* ===========================================
   FESTIVAL HOVER — polaroid mouse-follow
   ===========================================

   Hovering a .festivals_item-link reveals the
   matched .polaroid.vertical.is-festival image
   (paired via data-festival="N") and follows the
   cursor with eased movement.

   SETUP IN WEBFLOW:
   - Each .festivals_item-link gets data-festival="1" through "5"
   - Each .polaroid.vertical.is-festival gets a matching data-festival
   - Polaroids are position: fixed (set by JS on init)

   Requires: GSAP
   =========================================== */

(function () {

  function initFestivalHover() {
    var OFFSET_X = 20;
    var OFFSET_Y = 20;
    var mouseX = 0, mouseY = 0;
    var activePolaroid = null;

    document.querySelectorAll('[data-festival]:not(.festivals_item-link)').forEach(function (p) {
      gsap.set(p, { display: 'block', position: 'fixed', left: 0, top: 0, right: 'auto', bottom: 'auto', autoAlpha: 0, pointerEvents: 'none', zIndex: 999 });
    });

    window.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (activePolaroid) {
        gsap.to(activePolaroid, {
          x: mouseX + OFFSET_X,
          y: mouseY + OFFSET_Y,
          duration: 0.35,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }
    });

    document.querySelectorAll('.festivals_item-link[data-festival]').forEach(function (link) {
      var id = link.getAttribute('data-festival');
      var polaroid = document.querySelector('[data-festival="' + id + '"]:not(.festivals_item-link)');
      if (!polaroid) return;

      var heading = link.querySelector('.heading-style-h4-56.is-festivals');

      link.addEventListener('mouseenter', function () {
        activePolaroid = polaroid;
        gsap.set(polaroid, { x: mouseX + OFFSET_X, y: mouseY + OFFSET_Y });
        gsap.to(polaroid, { autoAlpha: 1, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
        if (heading) gsap.to(heading, { skewX: -10, duration: 0.3, ease: 'power2.out', overwrite: true });
      });

      link.addEventListener('mouseleave', function () {
        gsap.to(polaroid, {
          autoAlpha: 0,
          duration: 0.25,
          ease: 'power2.in',
          overwrite: 'auto',
          onComplete: function () { activePolaroid = null; }
        });
        if (heading) gsap.to(heading, { skewX: 0, duration: 0.2, ease: 'power2.out', overwrite: true });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFestivalHover);
  } else {
    initFestivalHover();
  }
})();
