/* ===========================================
   TEXT REVEAL - SplitText Animation System
   Source: Osmo Vault (modified)
   ===========================================

   ATTRIBUTES:
   - data-split="fast"            → triggers early (top 95%)
   - data-split="slow"            → triggers late (top 60%)
   - data-split-reveal="words"    → split type: lines, words, or chars (default: words)
   - data-split-trigger="load"    → trigger type: scroll or load (default: scroll)

   PERFORMANCE NOTE: If experiencing jank/performance issues with
   many text reveal elements (20+), consider adding font rendering
   optimization CSS. See text-reveal.css for the optional block.
   =========================================== */

gsap.registerPlugin(SplitText, ScrollTrigger);

// Configuration for different split types
const splitConfig = {
  lines: { duration: 0.8, stagger: 0.08 },
  words: { duration: 0.6, stagger: 0.06 },
  chars: { duration: 0.4, stagger: 0.01 }
}

// Trigger points for fast/slow variants
const triggerConfig = {
  fast: 'clamp(top 80%)',   // original speed
  slow: 'clamp(top 60%)',
}

function initTextReveal() {
  document.querySelectorAll('[data-split="fast"], [data-split="slow"]').forEach(heading => {
    // Reset CSS visibility (prevents FOUC)
    gsap.set(heading, { autoAlpha: 1 })

    // Get the speed variant (fast or slow)
    const speed = heading.dataset.split

    // Find the split type (default: words)
    const type = heading.dataset.splitReveal || 'words'

    // Find the trigger type (default: scroll)
    const trigger = heading.dataset.splitTrigger || 'scroll'

    const typesToSplit =
      type === 'lines' ? ['lines'] :
      type === 'words' ? ['lines', 'words'] :
      ['lines', 'words', 'chars']

    // Split the text
    SplitText.create(heading, {
      type: typesToSplit.join(', '),
      mask: 'lines',
      autoSplit: true,
      linesClass: 'line',
      wordsClass: 'word',
      charsClass: 'letter',
      onSplit: function(instance) {
        const targets = instance[type]
        const config = splitConfig[type]

        // Base animation properties (shared by both trigger types)
        const animationProps = {
          yPercent: 110,
          duration: config.duration,
          stagger: config.stagger,
          ease: 'expo.out'
        }

        // Branch based on trigger type
        if (trigger === 'load') {
          // Immediate animation on page load
          return gsap.from(targets, animationProps);
        } else {
          // Scroll-triggered animation
          return gsap.from(targets, {
            ...animationProps,
            scrollTrigger: {
              trigger: heading,
              start: triggerConfig[speed],
              once: true
            }
          });
        }
      }
    })
  })
}

document.addEventListener("DOMContentLoaded", () => {
  // Wait for fonts to load before splitting text
  // Adobe Fonts can be slow, so we add a 3-second fallback timeout
  const fontTimeout = 3000;
  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;
    initTextReveal();
    ScrollTrigger.refresh();
  }

  // Race: fonts ready vs timeout
  document.fonts.ready.then(init);
  setTimeout(init, fontTimeout);
});
