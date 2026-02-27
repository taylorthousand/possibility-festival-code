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
   - Cards start in orbit, spinning begins immediately
   - Carousel rotates ~2 revolutions
   - Near the end, cards peel off one by one at 12 o'clock
     and fly out to the right

   Desktop only (992px+).
   =========================================== */

(function () {
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- CONFIG ---------- */
  const config = {
    // Orbit radii (vw units for responsive sizing)
    radiusX: 38,            // horizontal spread
    radiusY: 14,            // vertical spread (subtle ellipse)
    orbitOffsetY: 0,        // vertical offset of entire orbit (rem units, negative = up)

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
    scrollMultiplier: 4,     // pin duration as multiple of viewport height
    scrub: 1,               // scrub smoothing (seconds)

    // Rotation
    revolutions: 2,

    // Exit: cards peel off one by one at 12 o'clock, fly out right
    // Auto-stagger is calculated from orbit spacing (same as old entry)
    exitDuration: 0.10,     // how long each card takes to fly out
    exitLean: 20,           // lean angle as card exits (tilts toward right)

    // Spin ramp: ease into rotation speed over this fraction of scroll progress
    spinRampDuration: 0.12, // first ~12% of scroll eases in, then constant speed

    // Idle waver: subtle floating rotation before scroll begins
    waverAmplitude: 6,      // degrees of gentle wobble
    waverSpeed: 0.167,      // oscillation speed (Hz) — ~6 sec cycle
    waverBlendDuration: 0.06, // scroll progress over which waver fades out
  };

  const TOTAL = 7;
  const TWO_PI = Math.PI * 2;
  const BACK_ANGLE = -Math.PI / 2;   // 12 o'clock = back of orbit

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

  // Eased spin: quadratic ramp-up over spinRampDuration, then constant speed.
  // Continuous position AND velocity at the transition point.
  var spinRamp = config.spinRampDuration;
  var spinScale = 1 / (1 - spinRamp / 2);

  function easedSpinProgress(p) {
    var ep;
    if (p < spinRamp) {
      ep = p * p / (2 * spinRamp);
    } else {
      ep = p - spinRamp / 2;
    }
    return ep * spinScale;
  }

  function carouselAngle(progress) {
    return easedSpinProgress(progress) * config.revolutions * TWO_PI;
  }

  // Inverse: given a target angle, find the scroll progress that produces it
  function inverseCarouselProgress(angle) {
    var ep = angle / (config.revolutions * TWO_PI * spinScale);
    if (ep < spinRamp / 2) {
      return Math.sqrt(2 * spinRamp * ep);
    }
    return ep + spinRamp / 2;
  }

  // Orbit position in px at a given angle
  function orbitPxX(angle) { return orbitX(angle) * (window.innerWidth / 100); }
  function orbitPxY(angle) { return orbitY(angle) * (window.innerWidth / 100); }

  // Exit ease — slow detach from orbit, then accelerate off-screen
  var exitEase = gsap.parseEase('power3.in');

  // Idle waver — time-based floating wobble
  var waverTime = 0;

  function waverRotation(i) {
    var phase = (i / TOTAL) * TWO_PI;
    return config.waverAmplitude * Math.sin(TWO_PI * config.waverSpeed * waverTime + phase);
  }

  /* ---------- EXIT TIMING ---------- */

  // Calculate each card's exit start progress.
  // Mirror of the old entry: auto-stagger = 1 / (TOTAL * revolutions)
  // Last card exits at (1.0 - exitDuration), earlier cards stagger before it.
  function calcExitStart(i) {
    // Each card exits when it naturally reaches 12 o'clock (BACK_ANGLE).
    // Uses inverseCarouselProgress to account for the spin ease-in.
    var best = -1;
    for (var k = 1; k <= Math.ceil(config.revolutions) + 1; k++) {
      var targetAngle = (k - i / TOTAL) * TWO_PI;
      var p = inverseCarouselProgress(targetAngle);
      if (p >= 0 && p < 1.0) {
        best = p;
      }
    }
    return best >= 0 ? best : 1.0 - config.exitDuration;
  }

  /* ---------- UPDATE ---------- */

  function updateCarousel(progress, polaroids, originX, originY) {
    var spin = carouselAngle(progress);

    polaroids.forEach(function (el, i) {
      // Even orbit spacing
      var baseAngle = BACK_ANGLE + (i / TOTAL) * TWO_PI;

      // Exit timing for this card
      var exitStart = calcExitStart(i);
      var exitEnd = exitStart + config.exitDuration;

      if (progress < exitStart) {
        /* --- Orbiting: follow the carousel --- */
        var angle = baseAngle + spin;
        var d = depth(angle);

        // Blend idle waver out over early scroll progress
        var waverBlend = gsap.utils.clamp(0, 1, 1 - progress / config.waverBlendDuration);

        gsap.set(el, {
          x: originX + orbitPxX(angle),
          y: originY + orbitPxY(angle),
          scale: map(d, -1, 1, config.scaleMin, config.scaleMax),
          opacity: 1,
          rotation: gsap.utils.interpolate(waverRotation(i), lean(angle, i), 1 - waverBlend),
          filter: 'brightness(' + map(d, -1, 1, config.brightnessMin, config.brightnessMax) + ')',
          zIndex: Math.round((d + 1) * 500),
        });

      } else if (progress < exitEnd) {
        /* --- Flying out: peel off to the right --- */
        var t = (progress - exitStart) / config.exitDuration;
        var eased = exitEase(t);

        // Live orbit position: card keeps following the carousel, gradually peels away
        var angle = baseAngle + spin;
        var d = depth(angle);
        var fromX = originX + orbitPxX(angle);
        var fromY = originY + orbitPxY(angle);
        var fromScale = map(d, -1, 1, config.scaleMin, config.scaleMax);
        var fromBrightness = map(d, -1, 1, config.brightnessMin, config.brightnessMax);
        var fromLean = lean(angle, i);

        // Target: off-screen right (full viewport width)
        var toX = window.innerWidth * 1.2;
        var toY = originY;

        gsap.set(el, {
          x: gsap.utils.interpolate(fromX, toX, eased),
          y: gsap.utils.interpolate(fromY, toY, eased),
          scale: gsap.utils.interpolate(fromScale, 1, eased),
          opacity: 1,
          rotation: gsap.utils.interpolate(fromLean, config.exitLean, eased),
          filter: 'brightness(' + gsap.utils.interpolate(fromBrightness, 1, eased) + ')',
          zIndex: Math.round((d + 1) * 500),
        });

      } else {
        /* --- Gone: off-screen right --- */
        gsap.set(el, {
          x: window.innerWidth * 1.2,
          y: originY,
          scale: 1,
          opacity: 1,
          rotation: config.exitLean,
          filter: 'brightness(1)',
          zIndex: 0,
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

    // Apply vertical offset (rem → px)
    var remPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
    originY += config.orbitOffsetY * remPx;

    // Initial state: cards in their orbit positions at progress 0
    polaroids.forEach(function (el, i) {
      var angle = BACK_ANGLE + (i / TOTAL) * TWO_PI;
      var d = depth(angle);

      gsap.set(el, {
        x: originX + orbitPxX(angle),
        y: originY + orbitPxY(angle),
        scale: map(d, -1, 1, config.scaleMin, config.scaleMax),
        opacity: 1,
        rotation: lean(angle, i),
        filter: 'brightness(' + map(d, -1, 1, config.brightnessMin, config.brightnessMax) + ')',
        zIndex: Math.round((d + 1) * 500),
      });
    });

    // Pre-compute exit timing to find if any exits overflow past progress 1.0
    var maxExitEnd = 0;
    for (var i = 0; i < TOTAL; i++) {
      maxExitEnd = Math.max(maxExitEnd, calcExitStart(i) + config.exitDuration);
    }
    var progressScale = Math.max(1, maxExitEnd);

    // Progress bar
    var progressBar = document.createElement('div');
    progressBar.style.cssText = 'position:absolute;bottom:0;left:0;width:0%;height:0.375rem;background:#FFCC00;z-index:2000;';
    section.appendChild(progressBar);

    // Idle waver ticker — runs continuously to advance time,
    // applies wobble rotation directly when scroll is inactive
    var scrollActive = false;

    var idleTickerFn = function () {
      waverTime += gsap.ticker.deltaRatio() / 60;
      if (!scrollActive) {
        polaroids.forEach(function (el, i) {
          var angle = BACK_ANGLE + (i / TOTAL) * TWO_PI;
          gsap.set(el, { rotation: waverRotation(i) });
        });
      }
    };
    gsap.ticker.add(idleTickerFn);

    // Pin + scrub
    ScrollTrigger.create({
      trigger: section,
      pin: true,
      start: 'top top',
      end: '+=' + (window.innerHeight * config.scrollMultiplier),
      scrub: config.scrub,
      onEnter: function () { scrollActive = true; },
      onLeaveBack: function () { scrollActive = false; },
      onUpdate: function (self) {
        updateCarousel(self.progress * progressScale, polaroids, originX, originY);
        progressBar.style.width = (self.progress * 100) + '%';
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
