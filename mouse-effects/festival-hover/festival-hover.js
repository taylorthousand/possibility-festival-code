/* ===========================================
   FESTIVAL HOVER / SCROLL ACTIVATE
   ===========================================

   ≥768px (tablet + desktop):
   - Hovering a .festivals_item-link skews the
     heading text to create a faux-italic effect.
   - Polaroid images get a dynamic box-shadow that
     responds to their Y-axis rotation (driven by
     Webflow interaction). Shadow shifts opposite
     to rotation for a realistic depth effect.

   ≤767px (mobile landscape + portrait):
   - No hover listeners and no shadow ticker (touch
     devices can fire synthetic mouse events that
     would fight the scroll system).
   - Instead: a virtual activation line at 45% of
     the viewport height. As the user scrolls, the
     item whose link block intersects that line
     becomes active — its polaroid reveals (fade +
     scale), its register tag turns blue, and its
     heading un-dims + italicizes. Non-active items
     are dimmed while the list is in range.

   SETUP IN WEBFLOW:
   - Each .festivals_item-link gets data-festival attribute
   - Heading inside link has class .heading-style-h4-56.is-festivals
   - Polaroid elements have matching data-festival attribute
   - Polaroid Y-axis rotation driven by Webflow mouse interaction (≥768px only)

   Requires: GSAP, ScrollTrigger
   =========================================== */

(function () {

  function initFestivalHoverDesktop() {
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

  function initFestivalScrollActivateMobile() {
    if (typeof ScrollTrigger === 'undefined') return;

    var list = document.querySelector('.festivals_list');
    if (!list) return;

    var links = Array.prototype.slice.call(
      document.querySelectorAll('.festivals_item-link[data-festival]')
    );
    if (!links.length) return;

    // Activation line = 45% down from viewport top.
    var LINE = '45%';

    // Track the currently active link/polaroid as state. We only ever activate
    // on enter/enterBack and swap from whatever was previously active — never
    // deactivate on leave. This makes the last-active item persist through
    // micro-gaps between triggers (sub-pixel rounding, Lenis fractional
    // scroll, layout margins) instead of flickering back to base state.
    // List-level onLeave/onLeaveBack handles the real "exit" cleanup.
    var activeLink = null;
    var activePolaroid = null;

    function setActive(link, polaroid) {
      if (activeLink === link) return;
      if (activeLink) activeLink.classList.remove('is-active');
      if (activePolaroid) activePolaroid.classList.remove('is-active');
      activeLink = link;
      activePolaroid = polaroid;
      if (activeLink) activeLink.classList.add('is-active');
      if (activePolaroid) activePolaroid.classList.add('is-active');
    }

    function clearActive() {
      if (activeLink) activeLink.classList.remove('is-active');
      if (activePolaroid) activePolaroid.classList.remove('is-active');
      activeLink = null;
      activePolaroid = null;
    }

    // List-level trigger: toggle .is-list-active AND tear down the per-item
    // active state when the line exits the list entirely.
    ScrollTrigger.create({
      trigger: list,
      start: 'top ' + LINE,
      end: 'bottom ' + LINE,
      onEnter: function () { list.classList.add('is-list-active'); },
      onEnterBack: function () { list.classList.add('is-list-active'); },
      onLeave: function () {
        list.classList.remove('is-list-active');
        clearActive();
      },
      onLeaveBack: function () {
        list.classList.remove('is-list-active');
        clearActive();
      },
    });

    // Properties Webflow mouse interactions write inline that we need to strip
    // to keep polaroids under our CSS's control. Any time one of these shows up
    // in a polaroid's inline style, we immediately remove it.
    var STRIP_PROPS = ['display', 'opacity', 'transform', 'visibility', 'pointer-events'];

    function stripInlineProps(el) {
      for (var i = 0; i < STRIP_PROPS.length; i++) {
        el.style.removeProperty(STRIP_PROPS[i]);
      }
    }

    // Per-item triggers: only activate on enter/enterBack. No leave handlers —
    // last-active persists until another item takes over or the list exits.
    links.forEach(function (link) {
      var name = link.getAttribute('data-festival');
      var polaroid = document.querySelector(
        '[data-festival="' + name + '"]:not(.festivals_item-link)'
      );

      // Strip inline styles at init (first-line defense) AND set up a
      // MutationObserver that re-strips on every attribute change. This
      // overrides any Webflow mouse interaction that keeps trying to write
      // display:none / opacity:0 as the cursor moves over the festival area.
      if (polaroid) {
        stripInlineProps(polaroid);
        var observer = new MutationObserver(function (mutations) {
          for (var i = 0; i < mutations.length; i++) {
            if (mutations[i].attributeName === 'style') {
              stripInlineProps(polaroid);
              break;
            }
          }
        });
        observer.observe(polaroid, { attributes: true, attributeFilter: ['style'] });
      }

      ScrollTrigger.create({
        trigger: link,
        start: 'top ' + LINE,
        end: 'bottom ' + LINE,
        onEnter: function () { setActive(link, polaroid); },
        onEnterBack: function () { setActive(link, polaroid); },
      });
    });
  }

  function initFestivalHover() {
    if (window.innerWidth >= 768) {
      initFestivalHoverDesktop();
    } else {
      initFestivalScrollActivateMobile();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFestivalHover);
  } else {
    initFestivalHover();
  }
})();
