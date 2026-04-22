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
    radiusY: 16,            // vertical spread (subtle ellipse)
    orbitOffsetY: 2,        // vertical offset of entire orbit (rem units, negative = up)

    // Depth mapping (fake Z — used for scale/opacity/brightness)
    scaleMin: 0.8,
    scaleMax: 1.1,
    opacityMin: 1,
    opacityMax: 1.0,
    brightnessMin: 0.75,
    brightnessMax: 1.0,

    // Lean (Z-axis rotation that shifts as cards orbit)
    maxLean: 12,            // max degrees of casual lean

    // Scroll
    scrollMultiplier: 2.5,     // pin duration as multiple of viewport height
    scrub: 1,               // scrub smoothing (seconds)

    // Rotation
    revolutions: 1.75,

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

  /* ---------- RESPONSIVE HELPERS ---------- */
  // Value increases as viewport narrows (linear interpolation between two widths)
  function inverseScale(atWide, atNarrow, wideVW, narrowVW) {
    var t = (window.innerWidth - narrowVW) / (wideVW - narrowVW);
    return atNarrow + t * (atWide - atNarrow);
  }

  function isLowPowerDevice() {
    if (window.location.search.indexOf('lowpower=1') !== -1) return true;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    if (/CrOS/i.test(navigator.userAgent)) return true;
    return !!(navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  }

  /* ---------- RESPONSIVE OVERRIDES ---------- */
  var tabletOverrides = {
    radiusX: inverseScale(44, 55, 992, 768),
    radiusY: inverseScale(21, 26, 992, 768),
    orbitOffsetY: 2,
  };
  var mobileOverrides = {
    radiusX: 38,
    radiusY: 14,
    scaleMax: 0.6,
    scaleMin: 0.45,
    orbitOffsetY: 1,
    scrub: true,
  };
  if (window.innerWidth < 992) Object.assign(config, tabletOverrides);
  if (window.innerWidth < 768) Object.assign(config, mobileOverrides);

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

  function updateCarousel(progress, polaroids, originX, originY, baseAngles, exitStarts, exitEnds, dropFilter) {
    var spin = carouselAngle(progress);

    // Cache per-frame constants so we don't re-read window.innerWidth
    // or recompute config-derived ranges inside each card's inner loop.
    var vwPx = window.innerWidth / 100;
    var radiusXpx = config.radiusX * vwPx;
    var radiusYpx = config.radiusY * vwPx;
    var exitToX = window.innerWidth * 1.2;
    var scaleMin = config.scaleMin;
    var scaleRange = config.scaleMax - scaleMin;
    var brightnessMin = config.brightnessMin;
    var brightnessRange = config.brightnessMax - brightnessMin;

    polaroids.forEach(function (el, i) {
      var baseAngle = baseAngles[i];
      var exitStart = exitStarts[i];
      var exitEnd = exitEnds[i];

      if (progress < exitStart) {
        /* --- Orbiting: follow the carousel --- */
        el._carouselGone = false;
        var angle = baseAngle + spin;
        var sa = Math.sin(angle);
        var ca = Math.cos(angle);
        var dNorm = (sa + 1) * 0.5;  // sin(angle) mapped from [-1,1] to [0,1]

        // Blend idle waver out over early scroll progress
        var waverBlend = gsap.utils.clamp(0, 1, 1 - progress / config.waverBlendDuration);

        var props = {
          x: originX + ca * radiusXpx,
          y: originY + sa * radiusYpx,
          scale: scaleMin + dNorm * scaleRange,
          rotation: gsap.utils.interpolate(waverRotation(i), lean(angle, i), 1 - waverBlend),
          zIndex: Math.round(dNorm * 1000),
        };
        if (!dropFilter) props.filter = 'brightness(' + (brightnessMin + dNorm * brightnessRange) + ')';
        gsap.set(el, props);

      } else if (progress < exitEnd) {
        /* --- Flying out: peel off to the right --- */
        el._carouselGone = false;
        var t = (progress - exitStart) / config.exitDuration;
        var eased = exitEase(t);

        // Live orbit position: card keeps following the carousel, gradually peels away
        var angle = baseAngle + spin;
        var sa = Math.sin(angle);
        var ca = Math.cos(angle);
        var dNorm = (sa + 1) * 0.5;
        var fromX = originX + ca * radiusXpx;
        var fromY = originY + sa * radiusYpx;
        var fromScale = scaleMin + dNorm * scaleRange;
        var fromLean = lean(angle, i);

        var props = {
          x: gsap.utils.interpolate(fromX, exitToX, eased),
          y: gsap.utils.interpolate(fromY, originY, eased),
          scale: gsap.utils.interpolate(fromScale, 1, eased),
          rotation: gsap.utils.interpolate(fromLean, config.exitLean, eased),
          zIndex: Math.round(dNorm * 1000),
        };
        if (!dropFilter) {
          var fromBrightness = brightnessMin + dNorm * brightnessRange;
          props.filter = 'brightness(' + gsap.utils.interpolate(fromBrightness, 1, eased) + ')';
        }
        gsap.set(el, props);

      } else {
        /* --- Gone: off-screen right. Write once per entering-gone-state,
           then short-circuit subsequent frames since values never change. --- */
        if (el._carouselGone) return;
        el._carouselGone = true;
        var props = {
          x: exitToX,
          y: originY,
          scale: 1,
          rotation: config.exitLean,
          zIndex: 0,
        };
        if (!dropFilter) props.filter = 'brightness(1)';
        gsap.set(el, props);
      }
    });
  }

  /* ---------- INIT ---------- */

  function init() {
    if (window.innerWidth < 768) return; // Mobile: cards hidden via CSS, no JS work

    // Drop per-frame filter: brightness() on devices where rasterization is the
    // bottleneck — tablets (modest GPU vs pixel count), Chromebooks, <=4 cores,
    // prefers-reduced-motion, ?lowpower=1. Scale still carries the depth cue.
    var dropFilter = isLowPowerDevice() || window.innerWidth < 992;

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

    // Precompute per-card constants — baseAngle, exitStart, exitEnd are deterministic
    // by card index, so we build them once here instead of redoing them each tick.
    var baseAngles = new Array(TOTAL);
    var exitStarts = new Array(TOTAL);
    var exitEnds = new Array(TOTAL);
    var maxExitEnd = 0;
    for (var i = 0; i < TOTAL; i++) {
      baseAngles[i] = BACK_ANGLE + (i / TOTAL) * TWO_PI;
      exitStarts[i] = calcExitStart(i);
      exitEnds[i] = exitStarts[i] + config.exitDuration;
      if (exitEnds[i] > maxExitEnd) maxExitEnd = exitEnds[i];
    }
    var progressScale = Math.max(1, maxExitEnd);

    // Initial state: cards in their orbit positions at progress 0
    polaroids.forEach(function (el, i) {
      var angle = baseAngles[i];
      var d = depth(angle);

      var props = {
        x: originX + orbitPxX(angle),
        y: originY + orbitPxY(angle),
        scale: map(d, -1, 1, config.scaleMin, config.scaleMax),
        opacity: 1,
        rotation: lean(angle, i),
        zIndex: Math.round((d + 1) * 500),
      };
      if (!dropFilter) props.filter = 'brightness(' + map(d, -1, 1, config.brightnessMin, config.brightnessMax) + ')';
      gsap.set(el, props);
    });

    // Progress bar — scaleX transform avoids per-frame layout/paint (vs. animating width %)
    var progressBar = document.createElement('div');
    progressBar.style.cssText = 'position:absolute;bottom:0;left:0;width:100%;height:0.375rem;background:#FFCC00;z-index:2000;transform-origin:left center;transform:scaleX(0);will-change:transform;';
    section.appendChild(progressBar);

    // Idle waver ticker — runs continuously to advance time,
    // applies wobble rotation directly when scroll is inactive AND the
    // section is anywhere near the viewport (skips writes when offscreen).
    var scrollActive = false;
    var sectionInView = false;

    var idleTickerFn = function () {
      waverTime += gsap.ticker.deltaRatio() / 60;
      if (sectionInView && !scrollActive) {
        polaroids.forEach(function (el, i) {
          gsap.set(el, { rotation: waverRotation(i) });
        });
      }
    };
    gsap.ticker.add(idleTickerFn);

    // Track whether the section overlaps the viewport at all
    ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: function (self) { sectionInView = self.isActive; },
    });

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
        updateCarousel(self.progress * progressScale, polaroids, originX, originY, baseAngles, exitStarts, exitEnds, dropFilter);
        progressBar.style.transform = 'scaleX(' + self.progress + ')';
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
