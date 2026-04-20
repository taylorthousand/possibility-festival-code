/* ===========================================
   TEXT REVEAL - SplitText Animation System
   Source: Osmo Vault (modified)
   ===========================================

   ATTRIBUTES:
   - data-split="early"           → triggers early (top 80%)
   - data-split="late"            → triggers late (top 60%)
   - data-split-reveal="words"    → split type: lines, words, or chars (default: words)
   - data-split-trigger="load"    → trigger type: scroll or load (default: scroll)
   - data-split-slow               → doubles duration and stagger (for short headings)

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

// Trigger points for early/late variants
const triggerConfig = {
  early: 'clamp(top 80%)',
  late: 'clamp(top 60%)',
}

// Preserve inline spans with data attributes before SplitText destroys them
function preserveSpans(heading) {
  const spans = heading.querySelectorAll('span[data-hangtag]')
  if (!spans.length) return []

  const preserved = []
  spans.forEach(span => {
    preserved.push({
      text: span.textContent.trim(),
      className: span.className,
      hangtag: span.getAttribute('data-hangtag'),
      style: span.getAttribute('style') || ''
    })
  })
  return preserved
}

// Re-inject preserved spans by walking text nodes after split
function restoreSpans(heading, preserved) {
  if (!preserved.length) return

  preserved.forEach(item => {
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT)
    let node
    while (node = walker.nextNode()) {
      const idx = node.textContent.indexOf(item.text)
      if (idx === -1) continue

      // Split the text node around the match
      const before = node.textContent.substring(0, idx)
      const after = node.textContent.substring(idx + item.text.length)

      // Build the span
      const span = document.createElement('span')
      if (item.className) span.className = item.className
      span.setAttribute('data-hangtag', item.hangtag)
      if (item.style) span.setAttribute('style', item.style)
      span.textContent = item.text

      // Replace the text node with before + span + after
      const parent = node.parentNode
      if (after) parent.insertBefore(document.createTextNode(after), node.nextSibling)
      parent.insertBefore(span, node.nextSibling)
      if (before) {
        node.textContent = before
      } else {
        parent.removeChild(node)
      }
      break // found it, move to next preserved item
    }
  })
}

function initTextReveal() {
  document.querySelectorAll('[data-split="early"], [data-split="late"]').forEach(heading => {
    // Preserve marked spans before SplitText destroys them
    const preserved = preserveSpans(heading)

    // Make heading measurable for SplitText (keeps opacity as-is until onSplit)
    gsap.set(heading, { visibility: 'visible' })

    // Get the trigger variant (early or late)
    const speed = heading.dataset.split

    // Find the split type (default: words)
    const type = heading.dataset.splitReveal || 'words'
    const slow = heading.hasAttribute('data-split-slow')

    // Find the trigger type (default: scroll)
    const trigger = heading.dataset.splitTrigger || 'scroll'

    const typesToSplit =
      type === 'lines' ? ['lines'] :
      type === 'words' ? ['lines', 'words'] :
      ['lines', 'words', 'chars']

    // Transform-aware getBoundingClientRect would mis-group words into one-word-lines
    // if .hero_inner's scroll scrub has already applied rotation/scale (refresh past hero).
    const heroInner = heading.closest('.hero_inner')
    const savedHeroInnerTransform = heroInner ? heroInner.style.transform : null
    if (heroInner) heroInner.style.transform = 'none'

    // Split the text
    SplitText.create(heading, {
      type: typesToSplit.join(', '),
      mask: 'lines',
      autoSplit: true,
      linesClass: 'line',
      wordsClass: 'word',
      charsClass: 'letter',
      onSplit: function(instance) {
        if (heroInner && savedHeroInnerTransform !== null) heroInner.style.transform = savedHeroInnerTransform
        // Restore preserved spans after split
        restoreSpans(heading, preserved)
        gsap.set(heading, { autoAlpha: 1 })

        const targets = instance[type]
        const config = splitConfig[type]

        // Base animation properties (shared by both trigger types)
        const animationProps = {
          yPercent: 110,
          duration: slow ? config.duration * 2 : config.duration,
          stagger: slow ? config.stagger * 2 : config.stagger,
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
