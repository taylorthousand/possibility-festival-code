/* ===========================================
   POLAROID CAROUSEL - 3D scroll-driven orbit
   ===========================================

   SETUP IN WEBFLOW:
   1. Section with data-carousel="polaroid"
      - Position: relative
      - Width: 100vw, Height: 100vh
      - Overflow: hidden
      - Display: flex, align-items: center, justify-content: center

   2. Center div with class "carousel-center"
      - Contains heading + subheading
      - Position: relative
      - z-index: 500

   3. Seven divs with class "polaroid vertical is-carousel"
      - Position: absolute
      - Each contains a polaroid image
      - Style with white border + shadow in Webflow

   SCROLL BEHAVIOR:
   - Section pins on scroll
   - Carousel starts spinning immediately
   - Polaroids fly in one by one from the left, catching
     their orbit position as they arrive
   - All 7 are in by the end of the first revolution
   - Continues for 0.5 more revolutions, then unpins

   Desktop only (992px+).
   =========================================== */

(function () {
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- CONFIG ---------- */
  const config = {
    // Orbit radii (vw units for responsive sizing)
    radiusX: 38,            // horizontal spread
    radiusY: 14,            // vertical spread (subtle ellipse)

    // Depth mapping (fake Z — used for scale/opacity/brightness)
    scaleMin: 0.8,
    scaleMax: 1.1,
    opacityMin: 1,
    opacityMax: 1.0,
    brightnessMin: 0.7,
    brightnessMax: 1.0,

    // Lean (Z-axis rotation that shifts as cards orbit)
    maxLean: 12,            // max degrees of casual lean

    // Scroll
    scrollMultiplier: 3,     // pin duration as multiple of viewport height
    scrub: 1,               // scrub smoothing (seconds)

    // Rotation
    revolutions: 1.5,

    // Entry: polaroids fly in one by one from the left
    // Stagger is auto-calculated for even orbit spacing
    entryDuration: 0.10,    // how long each polaroid takes to fly in (fraction of total progress)
    entryStartOffset: 0.02, // small delay before first polaroid enters
    entryStartLean: -20,    // lean angle as polaroid enters (tilted, then settles)
  };

  const TOTAL = 7;
  const TWO_PI = Math.PI * 2;
  const BACK_ANGLE = -Math.PI / 2;   // 12 o'clock = back of orbit (farthest from viewer)

  /* ---------- HELPERS ---------- */

  function map(value, inMin, inMax, outMin, outMax) {
    return gsap.utils.clamp(outMin, outMax,
      ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin
    );
  }

  // Orbit position from angle (returns vw values)
  function orbitX(angle) { return config.radiusX * Math.cos(angle); }
  function orbitY(angle) { return config.radiusY * Math.sin(angle); }

  // Depth value from angle (-1 = back, +1 = front)
  function depth(angle) { return Math.sin(angle); }

  // Lean: Z-axis rotation that shifts smoothly with orbit position
  function lean(angle, index) {
    var offset = (index / TOTAL) * Math.PI;
    return Math.sin(angle * 1.5 + offset) * config.maxLean;
  }

  // Get the carousel angle at a given progress (full progress = all revolutions)
  function carouselAngle(progress) {
    return progress * config.revolutions * TWO_PI;
  }

  // Orbit position in px at a given angle
  function orbitPxX(angle) { return orbitX(angle) * (window.innerWidth / 100); }
  function orbitPxY(angle) { return orbitY(angle) * (window.innerWidth / 100); }

  // Entry ease — soft overshoot for that magical float feel
  var entryEase = gsap.parseEase('power3.out');

  /* ---------- UPDATE ---------- */

  function updateCarousel(progress, polaroids, originX, originY) {
    // The carousel spins across the full progress range
    var spin = carouselAngle(progress);

    polaroids.forEach(function (el, i) {
      // Entry timing: each polaroid arrives at the back, evenly staggered
      // The auto-stagger = 1 / (TOTAL * revolutions) ensures even orbit spacing
      var autoStagger = 1 / (TOTAL * config.revolutions);
      var enterEnd = config.entryStartOffset + config.entryDuration + (i * autoStagger);
      var enterStart = enterEnd - config.entryDuration;

      // baseAngle set so that at enterEnd, this polaroid is at BACK_ANGLE
      // After that, carousel spin carries it forward. Even spacing is guaranteed
      // because the stagger matches the orbit's angular spacing.
      var baseAngle = BACK_ANGLE - carouselAngle(enterEnd);

      if (progress < enterStart) {
        /* --- Not yet entered: hidden off-screen left --- */
        gsap.set(el, {
          x: -window.innerWidth * 0.4,
          y: originY,
          scale: 0.8,
          opacity: 0,
          rotation: config.entryStartLean,
          filter: 'brightness(1)',
          zIndex: 0,
        });

      } else if (progress < enterEnd) {
        /* --- Flying in: targets moving orbit position for smooth handoff --- */
        var t = (progress - enterStart) / config.entryDuration;
        var eased = entryEase(t);

        // Target the actual orbit position (moves with the carousel)
        // At enterEnd, baseAngle + spin = BACK_ANGLE, so it arrives at the back
        // But during entry it tracks the slight motion, building momentum
        var angle = baseAngle + spin;
        var d = depth(angle);
        var targetX = originX + orbitPxX(angle);
        var targetY = originY + orbitPxY(angle);
        var targetScale = map(d, -1, 1, config.scaleMin, config.scaleMax);
        var targetBrightness = map(d, -1, 1, config.brightnessMin, config.brightnessMax);
        var targetLean = lean(angle, i);

        // Entry start position: off-screen left, vertically near origin
        var startX = -window.innerWidth * 0.4;
        var startY = originY;

        gsap.set(el, {
          x: gsap.utils.interpolate(startX, targetX, eased),
          y: gsap.utils.interpolate(startY, targetY, eased),
          scale: gsap.utils.interpolate(0.8, targetScale, eased),
          opacity: gsap.utils.interpolate(0, 1, Math.min(eased * 2, 1)),
          rotation: gsap.utils.interpolate(config.entryStartLean, targetLean, eased),
          filter: 'brightness(' + gsap.utils.interpolate(1, targetBrightness, eased) + ')',
          zIndex: Math.round((d + 1) * 500),
        });

      } else {
        /* --- In orbit: follow the carousel --- */
        var angle = baseAngle + spin;
        var d = depth(angle);

        var x = originX + orbitPxX(angle);
        var y = originY + orbitPxY(angle);
        var s = map(d, -1, 1, config.scaleMin, config.scaleMax);
        var b = map(d, -1, 1, config.brightnessMin, config.brightnessMax);

        gsap.set(el, {
          x: x,
          y: y,
          scale: s,
          opacity: 1,
          rotation: lean(angle, i),
          filter: 'brightness(' + b + ')',
          zIndex: Math.round((d + 1) * 500),
        });
      }
    });
  }

  /* ---------- INIT ---------- */

  function init() {
    if (window.innerWidth < 992) return;

    var section = document.querySelector('[data-carousel="polaroid"]');
    if (!section) return;

    var polaroids = gsap.utils.toArray(section.querySelectorAll('.polaroid.vertical.is-carousel'));
    if (polaroids.length < 1) return;

    var center = section.querySelector('.carousel-center');

    // Measure the center point of the carousel-center div relative to the section
    var sectionRect = section.getBoundingClientRect();
    var centerRect = center ? center.getBoundingClientRect() : sectionRect;
    var polRect = polaroids[0].getBoundingClientRect();

    // Origin = center of carousel-center div, minus half polaroid size
    var originX = (centerRect.left + centerRect.width / 2) - sectionRect.left - (polRect.width / 2);
    var originY = (centerRect.top + centerRect.height / 2) - sectionRect.top - (polRect.height / 2);

    // Initial state: hidden off-screen left
    polaroids.forEach(function (el) {
      gsap.set(el, {
        x: -window.innerWidth * 0.4,
        y: originY,
        opacity: 0,
        scale: 0.8,
        rotation: config.entryStartLean,
      });
    });

    // Pin + scrub
    ScrollTrigger.create({
      trigger: section,
      pin: true,
      start: 'top top',
      end: '+=' + (window.innerHeight * config.scrollMultiplier),
      scrub: config.scrub,
      onUpdate: function (self) {
        updateCarousel(self.progress, polaroids, originX, originY);
      },
    });

    // Refresh on resize (debounced)
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        ScrollTrigger.refresh();
      }, 250);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
