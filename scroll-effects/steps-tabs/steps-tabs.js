/* ===========================================
   STEPS TABS — scroll-driven tab indicator + sticky centering
   ===========================================

   A white pill slides between tabs as the user scrolls
   past each content box. The active tab's text italicizes.

   Also vertically centers .steps_desktop-image-wrapper
   in the viewport (sticky positioning workaround).

   SETUP IN WEBFLOW:
   1. Tab menu wrapper: .steps_tabs-menu
      - Position: relative (pill is positioned inside it)
   2. Three tab links: .steps_tab-link (in DOM order matching content boxes)
   3. Three content boxes (scroll triggers):
      - .steps_content-box
      - .steps_content-box-2
      - .steps_content-box-3
   4. .steps_desktop-image-wrapper: position sticky (any top value)

   Requires: GSAP + ScrollTrigger
   =========================================== */

(function () {
  gsap.registerPlugin(ScrollTrigger);

  /* --- Sticky centering --- */
  function centerSticky() {
    var el = document.querySelector('.steps_desktop-image-wrapper');
    if (!el) return;
    var offsetTop = (window.innerHeight - el.offsetHeight) / 2;
    el.style.setProperty('top', offsetTop + 'px', 'important');
  }

  function init() {
    centerSticky();

    var tabMenu = document.querySelector('.steps_tabs-menu');
    if (!tabMenu) return;

    var tabs = tabMenu.querySelectorAll('.steps_tab-link');
    if (tabs.length < 3) return;

    var contentBoxes = [
      document.querySelector('.steps_content-box'),
      document.querySelector('.steps_content-box-2'),
      document.querySelector('.steps_content-box-3'),
    ];
    if (contentBoxes.some(function (b) { return !b; })) return;

    /* --- Create the pill --- */
    var pill = document.createElement('div');
    pill.style.cssText =
      'position:absolute;background:#fff;border-radius:3px;' +
      'border:1.5px solid #000;pointer-events:none;z-index:0;transition:none;';
    tabMenu.insertBefore(pill, tabMenu.firstChild);

    /* --- Ensure tab text sits above pill --- */
    tabs.forEach(function (tab) {
      tab.style.position = 'relative';
      tab.style.zIndex = '1';
    });

    var activeIndex = 0;   /* where the pill currently is (or was last) */
    var targetIndex = 0;   /* where the pill is heading */
    var activeTween = null;
    var textTweens = [];

    var MAX_SKEW_DEG = 11;
    var MOVE_DURATION = 0.6;

    /* Track previous left position for velocity-based skew */
    var prevLeft = null;

    /* --- Position pill over a given tab --- */
    function movePill(index, animate) {
      var tab = tabs[index];
      var menuRect = tabMenu.getBoundingClientRect();
      var tabRect = tab.getBoundingClientRect();

      var isTablet = window.innerWidth <= 991 && window.innerWidth >= 768;
      var targetLeft, targetTop, targetWidth, targetHeight;
      if (isTablet) {
        targetWidth = Math.round(tabRect.width * 1.02);
        targetHeight = Math.round(tabRect.height * 1.03);
        targetLeft = Math.round(tabRect.left - menuRect.left - tabRect.width * 0.02);
        targetTop = Math.round(tabRect.top - menuRect.top - tabRect.height * 0.07);
      } else {
        targetLeft = tabRect.left - menuRect.left - 3;
        targetTop = tabRect.top - menuRect.top - 3;
        targetWidth = tabRect.width + 2;
        targetHeight = tabRect.height + 2;
      }

      /* Kill any in-progress tween */
      if (activeTween) {
        activeTween.kill();
        activeTween = null;
      }

      if (animate) {
        /* Calculate total travel distance for normalizing velocity */
        var startLeft = gsap.getProperty(pill, 'left');
        var totalDist = Math.abs(targetLeft - startLeft);
        prevLeft = startLeft;

        /* Kill any in-progress text tweens */
        textTweens.forEach(function (tw) { tw.kill(); });
        textTweens = [];

        /* Ease all non-target tabs back to upright (no snap) */
        tabs.forEach(function (t, i) {
          if (i !== index) {
            textTweens.push(gsap.to(t, {
              skewX: 0,
              duration: 0.2,
              ease: 'power2.out',
              overwrite: true,
            }));
          }
        });

        /* Skew new tab text to simulate italic */
        textTweens.push(gsap.to(tabs[index], {
          skewX: -10,
          duration: 0.3,
          delay: MOVE_DURATION * 0.5,
          ease: 'power2.out',
          overwrite: true,
        }));

        activeTween = gsap.to(pill, {
          left: targetLeft,
          top: targetTop,
          width: targetWidth,
          height: targetHeight,
          duration: MOVE_DURATION,
          ease: 'power3.inOut',
          onUpdate: function () {
            /* Derive skew from instantaneous velocity */
            var currentLeft = gsap.getProperty(pill, 'left');
            var velocity = currentLeft - prevLeft;
            prevLeft = currentLeft;

            /* Normalize: max velocity ≈ totalDist * 0.15 per frame at peak */
            var normalizedVelocity = totalDist > 0 ? velocity / (totalDist * 0.12) : 0;
            var clampedVelocity = gsap.utils.clamp(-1, 1, normalizedVelocity);
            var skew = clampedVelocity * MAX_SKEW_DEG;

            gsap.set(pill, { skewX: skew });
          },
          onComplete: function () {
            /* Settle skew to 0 */
            gsap.to(pill, {
              skewX: 0,
              duration: 0.15,
              ease: 'power2.out',
            });
            activeIndex = index;
            activeTween = null;
          },
        });
      } else {
        gsap.set(pill, {
          left: targetLeft,
          top: targetTop,
          width: targetWidth,
          height: targetHeight,
          skewX: 0,
        });
        tabs.forEach(function (t, i) {
          gsap.set(t, { skewX: i === index ? -10 : 0 });
        });
        activeIndex = index;
      }

      targetIndex = index;
    }

    /* --- Initial position (no animation) --- */
    movePill(0, false);

    /* --- ScrollTrigger per content box --- */
    contentBoxes.forEach(function (box, i) {
      ScrollTrigger.create({
        trigger: box,
        start: 'top 75%',
        onEnter: function () {
          if (targetIndex !== i) movePill(i, true);
        },
        onLeaveBack: function () {
          if (i > 0 && targetIndex !== i - 1) movePill(i - 1, true);
        },
      });
    });

    /* --- Recalculate pill position + sticky center on resize --- */
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        movePill(activeIndex, false);
        centerSticky();
      }, 250);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
