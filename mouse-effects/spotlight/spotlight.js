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

   A dual-layer volumetric beam (outer cone + inner column)
   connects a light source to the spotlight ellipse, using
   tangent-to-ellipse geometry for accurate alignment.

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
  damping: 0.04,          // fraction of mouse offset applied
  easeDuration: 0.5,      // smooth follow duration in seconds
  fadeInDuration: 0.6,    // overlay fade-in duration
  scrollStart: '10% top', // when 10% of section passes top of viewport

  // Beam origin (viewport %)
  beamOriginX: 100,
  beamOriginY: 37,

  // Ellipse radii (must match CSS --spotlight-rx / --spotlight-ry)
  ellipseRX: 28,
  ellipseRY: 40,
  ellipseEdge: 0.85,      // visible fog edge vs geometric edge

  // Origin width: pushes virtual source behind origin to widen cone at source end
  originWidth: 37,

  // Beam color (RGB)
  beamColorR: 255,
  beamColorG: 248,
  beamColorB: 230,

  // Outer cone
  outerSoftEdge: 0.025,   // soft edge multiplier
  outerIntensity: 0.5,    // peak opacity
  outerBlur: 4,           // px

  // Inner column
  innerWidthRatio: 0.5,   // fraction of outer tangent span
  innerIntensity: 0.55,   // peak opacity
  innerSoftEdge: 0.374,   // soft edge multiplier
  innerBlur: 10,          // px

  // Mask (length fade along beam axis)
  maskStart: 0,           // % where beam is fully visible
  maskEnd: 21,            // % where beam fades to transparent
};

/* --- Tangent-to-ellipse beam computation --- */
function computeBeamTangents(srcX, srcY, spotX, spotY) {
  var cfg = spotlightConfig;
  var vw = window.innerWidth;
  var vh = window.innerHeight;

  // Convert to pixels, scaled by visible edge factor
  var srcPxX = srcX / 100 * vw;
  var srcPxY = srcY / 100 * vh;
  var ctrPxX = spotX / 100 * vw;
  var ctrPxY = spotY / 100 * vh;
  var aPx = cfg.ellipseRX * cfg.ellipseEdge / 100 * vw;
  var bPx = cfg.ellipseRY * cfg.ellipseEdge / 100 * vh;

  // Source in normalized ellipse space (transforms ellipse to unit circle)
  var normSrcX = (srcPxX - ctrPxX) / aPx;
  var normSrcY = (srcPxY - ctrPxY) / bPx;
  var normDist = Math.sqrt(normSrcX * normSrcX + normSrcY * normSrcY);

  if (normDist <= 1.01) return null; // source inside ellipse

  // Angle from center to source in normalized space
  var normAlpha = Math.atan2(normSrcY, normSrcX);

  // Half-angle of tangent cone in normalized space
  var normBeta = Math.acos(1 / normDist);

  // Tangent touch point angles (on unit circle)
  var touchAngle1 = normAlpha + normBeta;
  var touchAngle2 = normAlpha - normBeta;

  // Touch points in pixel space
  var t1px = { x: ctrPxX + aPx * Math.cos(touchAngle1), y: ctrPxY + bPx * Math.sin(touchAngle1) };
  var t2px = { x: ctrPxX + aPx * Math.cos(touchAngle2), y: ctrPxY + bPx * Math.sin(touchAngle2) };

  // Angles from source to each tangent point (screen space)
  var ang1 = Math.atan2(t1px.y - srcPxY, t1px.x - srcPxX);
  var ang2 = Math.atan2(t2px.y - srcPxY, t2px.x - srcPxX);

  // Center angle from source to ellipse center
  var centerAng = Math.atan2(ctrPxY - srcPxY, ctrPxX - srcPxX);

  // CSS conic convention: 0deg = up, clockwise
  var cssAng1 = ang1 * (180 / Math.PI) + 90;
  var cssAng2 = ang2 * (180 / Math.PI) + 90;
  var cssCenterAngle = centerAng * (180 / Math.PI) + 90;

  // Offsets from center (signed, in degrees)
  var offset1 = cssAng1 - cssCenterAngle;
  var offset2 = cssAng2 - cssCenterAngle;
  // Normalize to [-180, 180]
  while (offset1 > 180) offset1 -= 360;
  while (offset1 < -180) offset1 += 360;
  while (offset2 > 180) offset2 -= 360;
  while (offset2 < -180) offset2 += 360;

  return {
    negOffset: Math.min(offset1, offset2),
    posOffset: Math.max(offset1, offset2),
    cssCenterAngle: cssCenterAngle,
    mathCenterAngleDeg: centerAng * (180 / Math.PI),
  };
}

/* --- Render both beam layers --- */
function updateBeam(beamOuter, beamInner, spotX, spotY, mouseOffsetX, mouseOffsetY) {
  var cfg = spotlightConfig;

  // Source shifts with mouse (same damping as spotlight)
  var srcX = cfg.beamOriginX + mouseOffsetX;
  var srcY = cfg.beamOriginY + mouseOffsetY;

  // Direction from source to spotlight center
  var dirX = spotX - srcX;
  var dirY = spotY - srcY;
  var dirLen = Math.sqrt(dirX * dirX + dirY * dirY);
  if (dirLen < 0.1) return;
  var ndx = dirX / dirLen;
  var ndy = dirY / dirLen;

  // Pushed-back virtual source (widens cone at origin end)
  var virtualSrcX = srcX - ndx * cfg.originWidth;
  var virtualSrcY = srcY - ndy * cfg.originWidth;

  // Compute tangents from virtual source
  var result = computeBeamTangents(virtualSrcX, virtualSrcY, spotX, spotY);
  if (!result) return;

  var negOff = result.negOffset;
  var posOff = result.posOffset;
  var beamSpan = posOff - negOff;

  // Color
  var r = cfg.beamColorR;
  var g = cfg.beamColorG;
  var b = cfg.beamColorB;

  // Mask (shared by both layers)
  var maskAngle = 90 + result.mathCenterAngleDeg;
  var maskGradient = 'linear-gradient(' + maskAngle + 'deg, white 0%, white ' + cfg.maskStart + '%, transparent ' + cfg.maskEnd + '%)';

  // --- Outer cone ---
  var outerSoftEdge = beamSpan * cfg.outerSoftEdge * 0.5;
  var outerPeak = cfg.outerIntensity;
  var outerEdge = outerPeak * 0.7;

  var outerFromAngle = result.cssCenterAngle + negOff - outerSoftEdge;
  var outerStopEdge1 = outerSoftEdge;
  var outerStopPeak  = outerSoftEdge + (-negOff);
  var outerStopEdge2 = outerSoftEdge + beamSpan;
  var outerStopEnd   = outerSoftEdge + beamSpan + outerSoftEdge;

  beamOuter.style.background =
    'conic-gradient(' +
      'from ' + outerFromAngle + 'deg at ' + virtualSrcX + '% ' + virtualSrcY + '%, ' +
      'transparent 0deg, ' +
      'rgba(' + r + ',' + g + ',' + b + ',' + outerEdge + ') ' + outerStopEdge1 + 'deg, ' +
      'rgba(' + r + ',' + g + ',' + b + ',' + outerPeak + ') ' + outerStopPeak + 'deg, ' +
      'rgba(' + r + ',' + g + ',' + b + ',' + outerEdge + ') ' + outerStopEdge2 + 'deg, ' +
      'transparent ' + outerStopEnd + 'deg, ' +
      'transparent 360deg' +
    ')';
  beamOuter.style.maskImage = maskGradient;
  beamOuter.style.webkitMaskImage = maskGradient;
  beamOuter.style.filter = 'blur(' + cfg.outerBlur + 'px)';
  beamOuter.style.opacity = 1;

  // --- Inner column ---
  var innerNegOff = negOff * cfg.innerWidthRatio;
  var innerPosOff = posOff * cfg.innerWidthRatio;
  var innerSpan = innerPosOff - innerNegOff;
  var innerSoftEdge = innerSpan * cfg.innerSoftEdge * 0.5;
  var innerPeak = cfg.innerIntensity;
  var innerEdge = innerPeak * 0.7;

  var innerFromAngle = result.cssCenterAngle + innerNegOff - innerSoftEdge;
  var innerStopEdge1 = innerSoftEdge;
  var innerStopPeak  = innerSoftEdge + (-innerNegOff);
  var innerStopEdge2 = innerSoftEdge + innerSpan;
  var innerStopEnd   = innerSoftEdge + innerSpan + innerSoftEdge;

  beamInner.style.background =
    'conic-gradient(' +
      'from ' + innerFromAngle + 'deg at ' + virtualSrcX + '% ' + virtualSrcY + '%, ' +
      'transparent 0deg, ' +
      'rgba(' + r + ',' + g + ',' + b + ',' + innerEdge + ') ' + innerStopEdge1 + 'deg, ' +
      'rgba(' + r + ',' + g + ',' + b + ',' + innerPeak + ') ' + innerStopPeak + 'deg, ' +
      'rgba(' + r + ',' + g + ',' + b + ',' + innerEdge + ') ' + innerStopEdge2 + 'deg, ' +
      'transparent ' + innerStopEnd + 'deg, ' +
      'transparent 360deg' +
    ')';
  beamInner.style.maskImage = maskGradient;
  beamInner.style.webkitMaskImage = maskGradient;
  beamInner.style.filter = 'blur(' + cfg.innerBlur + 'px)';
  beamInner.style.opacity = 1;
}

/* --- Init --- */
function initSpotlight() {
  var isTablet = window.innerWidth <= 991 && window.innerWidth >= 768;
  spotlightConfig.ellipseRY = isTablet ? 25 : 40;

  const sections = document.querySelectorAll('[data-spotlight]');

  sections.forEach(section => {
    const overlay = section.querySelector('.spotlight-overlay');
    if (!overlay) return;

    const target = section.querySelector('[data-spotlight-target]');
    const hasTarget = !!target;

    // Create beam elements (outer cone + inner column)
    const beamOuter = document.createElement('div');
    beamOuter.classList.add('spotlight-beam');
    overlay.appendChild(beamOuter);

    const beamInner = document.createElement('div');
    beamInner.classList.add('spotlight-beam');
    overlay.appendChild(beamInner);

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
    let frozenOffsetX = 0;
    let frozenOffsetY = 0;

    // Proxy object — single source of truth for current animated position.
    // GSAP tweens this; onUpdate drives both CSS vars and beam rendering.
    const spotPos = { x: baseX, y: baseY, ox: 0, oy: 0 };

    // Set initial position
    overlay.style.setProperty('--spotlight-x', `${baseX}%`);
    overlay.style.setProperty('--spotlight-y', `${baseY}%`);

    // --- Helper: compute damped mouse offset ---
    function getMouseOffset() {
      if (!isHovering) return { x: frozenOffsetX, y: frozenOffsetY };
      return {
        x: (lastMouseX - 50) * spotlightConfig.damping,
        y: (lastMouseY - 50) * spotlightConfig.damping
      };
    }

    // --- Helper: animate ellipse + beam to a target position in lockstep ---
    function animateTo(targetX, targetY, offsetX, offsetY) {
      gsap.to(spotPos, {
        x: targetX,
        y: targetY,
        ox: offsetX,
        oy: offsetY,
        duration: spotlightConfig.easeDuration,
        ease: 'power2.out',
        overwrite: 'auto',
        onUpdate: function() {
          overlay.style.setProperty('--spotlight-x', spotPos.x + '%');
          overlay.style.setProperty('--spotlight-y', spotPos.y + '%');
          updateBeam(beamOuter, beamInner, spotPos.x, spotPos.y, spotPos.ox, spotPos.oy);
        }
      });
    }

    // --- Helper: apply current spotlight position ---
    function applyPosition() {
      var offset = getMouseOffset();
      var spotX = baseX + offset.x;
      var spotY = baseY + offset.y;
      animateTo(spotX, spotY, offset.x, offset.y);
    }

    // --- Helper: recalculate base from target's position within overlay ---
    function updateBaseFromTarget() {
      if (!hasTarget) return;
      const rect = target.getBoundingClientRect();
      const oRect = overlay.getBoundingClientRect();
      baseX = ((rect.left + rect.width / 2 - oRect.left) / oRect.width) * 100;
      baseY = ((rect.top + rect.height / 2 - oRect.top) / oRect.height) * 100;
    }

    // --- Set position immediately so it's correct from the first frame ---
    updateBaseFromTarget();
    applyPosition();

    // --- Mouse events (disabled on tablet — no parallax on touch) ---
    if (!isTablet) {
      section.addEventListener('mousemove', (e) => {
        isHovering = true;
        lastMouseX = (e.clientX / window.innerWidth) * 100;
        lastMouseY = (e.clientY / window.innerHeight) * 100;

        const offsetX = (lastMouseX - 50) * spotlightConfig.damping;
        const offsetY = (lastMouseY - 50) * spotlightConfig.damping;
        const spotX = baseX + offsetX;
        const spotY = baseY + offsetY;

        animateTo(spotX, spotY, offsetX, offsetY);
      });

      section.addEventListener('mouseleave', () => {
        // Freeze the current offset so the spotlight holds position
        frozenOffsetX = (lastMouseX - 50) * spotlightConfig.damping;
        frozenOffsetY = (lastMouseY - 50) * spotlightConfig.damping;
        isHovering = false;
      });
    }

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

    // --- ScrollTrigger 2: fog opacity fade in/out ---
    ScrollTrigger.create({
      trigger: section,
      start: spotlightConfig.scrollStart,
      end: '92% bottom',
      onEnter: () => gsap.to(overlay, {
        opacity: 1,
        duration: spotlightConfig.fadeInDuration,
        ease: 'power2.out',
        overwrite: 'auto'
      }),
      onLeave: () => gsap.to(overlay, {
        opacity: 0,
        duration: spotlightConfig.fadeInDuration,
        ease: 'power2.out',
        overwrite: 'auto'
      }),
      onEnterBack: () => gsap.to(overlay, {
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
