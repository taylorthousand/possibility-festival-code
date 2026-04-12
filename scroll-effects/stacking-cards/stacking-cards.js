/* ===========================================
   STACKING CARDS - Scroll-driven card entrance with bounce
   ===========================================

   Cards are absolutely positioned in Webflow with their
   final layout (scattered/overlapping). JS scrubs each card
   in from below the section sequentially, then fires an
   elastic bounce when each card reaches its final position.

   SETUP IN WEBFLOW:
   1. Wrapper: add data-stacking-cards to the section
   2. Each card: add data-stacking-card
   3. Cards are absolutely positioned with final positions
      and rotations set in Webflow CSS
   4. Section is pinned — JS handles the pin, no extra
      height needed in Webflow

   ATTRIBUTES:
   - data-stacking-cards  -> section wrapper
   - data-stacking-card   -> each card element
   =========================================== */

// Configuration - adjust these to tune the effect
var stackingCardsCfg = {
  minWidth: 992,
  startY: '50vh',             // how far below final position cards start
  startRotation: 0,           // rotation at start of entrance (0 = no spin)
  scrubEase: 'none',
  scrollStart: 'top top',
  pinDuration: '300%',
  // Bounce
  bounce: true,
  bounceDuration: 0.1,
  bounceElasticDuration: 1,
  bounceEase: 'elastic.out(1, 0.3)',
  bounceStretchFactor: 1.5
};

function initStackingCards() {
  if (window.innerWidth < stackingCardsCfg.minWidth) return;

  var sections = document.querySelectorAll('[data-stacking-cards]');
  if (!sections.length) return;

  sections.forEach(function(section) {
    var cards = Array.from(section.querySelectorAll('[data-stacking-card]'));
    if (!cards.length) return;

    var totalCards = cards.length;

    // Build a timeline scrubbed to the pinned section's scroll range
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: stackingCardsCfg.scrollStart,
        end: '+=' + stackingCardsCfg.pinDuration,
        pin: true,
        scrub: true
      }
    });

    // Capture each card's original CSS rotation before overriding
    var originalRotations = cards.map(function(card) {
      return gsap.getProperty(card, 'rotation');
    });

    // Measure the push distance needed for each card to clear the section's
    // bottom edge. Done per-card so cards higher in the section get more push,
    // guaranteeing they clear on any viewport (portrait tablets, short screens).
    // Must run BEFORE gsap.set() so we read the card's true Webflow position.
    var sectionBottom = section.getBoundingClientRect().bottom;
    var pushDistances = cards.map(function(card) {
      var cardTop = card.getBoundingClientRect().top;
      var distance = sectionBottom - cardTop + card.offsetHeight * 0.1;
      // Fallback to configured startY if measurement is unusable
      // (e.g. card is display:none or not yet laid out at init time)
      return distance > 0 ? distance : stackingCardsCfg.startY;
    });

    // Hide all cards at their start position immediately
    cards.forEach(function(card, index) {
      gsap.set(card, { y: pushDistances[index], rotation: stackingCardsCfg.startRotation });
    });

    // Each card gets 1 unit of entrance + 0.5 units of gap before the next
    var entranceDuration = 1;
    var gapDuration = 0.5;
    var slotSize = entranceDuration + gapDuration;

    cards.forEach(function(card, index) {
      var cardStart = index * slotSize;

      // Entrance: scrub from off-screen up to Webflow-defined position
      tl.to(card, {
        y: 0,
        rotation: originalRotations[index],
        ease: stackingCardsCfg.scrubEase,
        duration: entranceDuration,
        onComplete: stackingCardsCfg.bounce
          ? function() { pulseStackingCard(card); }
          : undefined
      }, cardStart);
    });

    // Empty hold at end so the pin lingers after the last card lands
    var lastCardEnd = (totalCards - 1) * slotSize + entranceDuration;
    tl.set({}, {}, lastCardEnd + 0.6);
  });

  function pulseStackingCard(el) {
    var width = el.offsetWidth;
    var height = el.offsetHeight;
    var fontSize = parseFloat(getComputedStyle(el).fontSize);
    var stretchPx = stackingCardsCfg.bounceStretchFactor * fontSize;
    var targetScaleX = (width + stretchPx) / width;
    var targetScaleY = (height - stretchPx * 0.33) / height;

    var tl = gsap.timeline();
    tl.to(el, {
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      duration: stackingCardsCfg.bounceDuration,
      ease: 'power1.out'
    }).to(el, {
      scaleX: 1,
      scaleY: 1,
      duration: stackingCardsCfg.bounceElasticDuration,
      ease: stackingCardsCfg.bounceEase
    });
  }
}

// Initialize after DOM is ready
document.addEventListener("DOMContentLoaded", initStackingCards);
