/* ===========================================
   DONATION HEADER SCROLL — Pinned reveal sequence
   ===========================================

   Scroll-driven animation for the donation header section.
   Container is sticky (set in Webflow), section is tall.
   Scrub timeline drives photos + spotlight, triggered
   animation handles content reverse.

   Phase 1: Photos fly off (scrub-linked)
   Phase 2: Content reverse (triggered)
   Phase 3: Spotlight hole fill (scrub-linked)

   SETUP IN WEBFLOW:
   1. .section_donation_header: ~200vh, overflow clip
   2. .donation-header_container: position sticky, top centered
   3. data-spotlight-donate on section (already set)
   4. data-spotlight-target on .donation-header_container (already set)
   5. .polaroid_momentum-wrapper photos as children of container

   Requires: GSAP + ScrollTrigger + SplitText (already loaded)
   =========================================== */

var donateScrollCfg = {
  contentStart: 0.6,
  spotlightStart: 0.85,
  dissolveStart: 0.5,
  flyDistance: 1.3,
  rotationBase: 80,
  rotationVariance: 32,
  photoEase: 'power4.in',
  verticalBias: 0.6,
  contentRevealDuration: 0.32,
  contentRevealStagger: 0.064,
};

function initDonationHeaderScroll() {
  var section = document.querySelector('[data-spotlight-donate]');
  if (!section) return;

  var container = section.querySelector('[data-spotlight-target]');
  if (!container) return;

  var photos = section.querySelectorAll('.polaroid_momentum-wrapper');
  if (!photos.length) return;

  var containerRect = container.getBoundingClientRect();
  var cx = containerRect.left + containerRect.width / 2;
  var cy = containerRect.top + containerRect.height / 2;
  var flyDist = Math.max(window.innerWidth, window.innerHeight) * donateScrollCfg.flyDistance;

  // Phase 1: Photos fly off (scrub-linked to section scroll)
  var tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
    }
  });

  photos.forEach(function(photo) {
    var rect = photo.getBoundingClientRect();
    var px = rect.left + rect.width / 2;
    var py = rect.top + rect.height / 2;

    var dx = px - cx;
    var dy = py - cy;
    if (dy < 0) dy *= (1 + donateScrollCfg.verticalBias);

    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = dx / dist;
    var ny = dy / dist;
    var rot = nx * donateScrollCfg.rotationBase + ny * donateScrollCfg.rotationVariance;

    tl.to(photo, {
      x: '+=' + (nx * flyDist),
      y: '+=' + (ny * flyDist),
      rotation: '+=' + rot,
      duration: 1,
      ease: donateScrollCfg.photoEase,
    }, 0);
  });

  // Phase 2: Content reverse — triggered at contentStart
  var scrollDist = section.offsetHeight - window.innerHeight;
  var triggerOffset = scrollDist * donateScrollCfg.contentStart;

  function buildContentReverse() {
    var contentTl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top+=' + triggerOffset + ' top',
        toggleActions: 'play none none reverse',
      }
    });

    var allTargets = [];
    var splitEls = container.querySelectorAll('[data-split]');
    splitEls.forEach(function(el) {
      var lines = el.querySelectorAll('.line');
      lines.forEach(function(line) { allTargets.push(line); });
    });

    var buttonGroup = container.querySelector('.button-group');
    var button = buttonGroup ? buttonGroup.querySelector('.button') : null;
    if (buttonGroup && button) {
      buttonGroup.style.overflow = 'hidden';
      buttonGroup.style.paddingBottom = '4px';
      allTargets.push(button);
    }

    if (allTargets.length) {
      contentTl.to(allTargets, {
        yPercent: -110,
        duration: donateScrollCfg.contentRevealDuration,
        stagger: donateScrollCfg.contentRevealStagger,
        ease: 'expo.out',
      }, 0);
    }
  }

  var linesExist = container.querySelector('.line');
  if (linesExist) {
    buildContentReverse();
  } else {
    document.fonts.ready.then(function() {
      requestAnimationFrame(buildContentReverse);
    });
  }

  // Phase 3: Spotlight hole fill (scrub-linked, same timeline)
  var overlay = section.querySelector('.spotlight-overlay');
  if (overlay) {
    var startRX = null, startRY = null;
    var spotHole = { scale: 1 };
    tl.to(spotHole, {
      scale: 0,
      duration: 0.4,
      ease: 'power2.in',
      onUpdate: function() {
        if (startRX === null) {
          startRX = parseFloat(getComputedStyle(overlay).getPropertyValue('--spotlight-rx')) || 20;
          startRY = parseFloat(getComputedStyle(overlay).getPropertyValue('--spotlight-ry')) || 28;
        }
        overlay.style.setProperty('--spotlight-rx', (startRX * spotHole.scale) + '%');
        overlay.style.setProperty('--spotlight-ry', (startRY * spotHole.scale) + '%');
      }
    }, donateScrollCfg.spotlightStart);
  }

  // Phase 2: Content dissolve (scrub-linked)
  var inner = container.querySelector('.container-inner');
  if (inner) {
    tl.to(inner, {
      opacity: 0,
      filter: 'blur(20px)',
      duration: 0.4,
      ease: 'power2.in',
    }, donateScrollCfg.dissolveStart);
  }
}

document.addEventListener('DOMContentLoaded', initDonationHeaderScroll);
