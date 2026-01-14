# Text Reveal - Decision Log

This document explains why certain decisions were made in this code, so future modifications don't break things or repeat solved problems.

---

## Source Code

Based on Osmo Vault's text reveal implementation using GSAP's SplitText and ScrollTrigger plugins.

---

## Key Decisions

### 1. Default split type is `words` (not `lines`)

**Decision date:** Initial setup
**Reason:** Client preference. Osmo's original default was `lines`. We changed it to `words` for this project's visual style.

**If changing:** Update the fallback in `const type = heading.dataset.splitReveal || 'words'`

---

### 2. Adobe Fonts timeout (3 seconds)

**Decision date:** Initial setup
**Problem:** The site uses Adobe Fonts. `document.fonts.ready` often doesn't properly detect Adobe Fonts because Adobe loads fonts via their own JavaScript *after* the browser's font loading API has already resolved.

**Solution:** Race between `document.fonts.ready` and a 3-second timeout. Whichever fires first initializes the animations.

**Why 3 seconds:** Long enough for most font loads, short enough not to feel broken. Can be adjusted if fonts consistently load faster or slower.

**If fonts change:** If switching away from Adobe Fonts to Google Fonts or self-hosted, the timeout may be unnecessary, but it doesn't hurt to keep it.

---

### 3. Two trigger types: `scroll` and `load`

**Decision date:** Initial setup
**Problem:** ScrollTrigger doesn't fire for elements already in the viewport on page load. It's designed around scroll *movement* and needs a scroll event to determine direction and fire "onEnter." Elements visible on load (like hero headings) would stay hidden until the user scrolled.

**What we tried that didn't work:**
- `ScrollTrigger.refresh()` - recalculates positions but doesn't dispatch enter events for elements already in view
- Setting trigger to `top 99%` - still required scroll input
- The `clamp()` function - this is about where animation starts, not whether it triggers

**Solution:** Branch logic based on `data-split-trigger` attribute:
- `scroll` (default): Uses ScrollTrigger, fires when scrolled into view
- `load`: No ScrollTrigger, animates immediately on page load

**Usage:**
- Hero/above-fold headings: Add `data-split-trigger="load"`
- Everything else: No attribute needed (defaults to scroll)

**Industry context:** Not using ScrollTrigger for above-the-fold content is the standard practice, not a workaround. ScrollTrigger is for elements that scroll into view.

---

### 4. Font rendering optimization is OFF (but ready)

**Decision date:** Initial setup
**Context:** Site may have 10-20+ text reveal elements per page.

**Decision:** Leave font rendering optimization commented out in CSS until/unless performance issues appear.

**The optimization (in text-reveal.css):**
```css
[data-split="heading"] {
  -webkit-text-rendering: optimizeSpeed;
  text-rendering: optimizeSpeed;
  -webkit-transform: translateZ(0);
  font-kerning: none;
}
```

**Tradeoff:** Improves animation performance but reduces text rendering quality (disables kerning, subpixel rendering).

**If performance issues arise:** Uncomment this block in text-reveal.css and test.

---

### 5. FOUC prevention via CSS + JS

**Problem:** Browser renders HTML before JavaScript runs. Text could flash in final position before animating.

**Solution:**
1. CSS hides elements: `[data-split="heading"] { visibility: hidden; }`
2. JS reveals right before animating: `gsap.set(heading, { autoAlpha: 1 })`

**Webflow-specific:** Added overrides so text stays visible in Designer/Editor:
```css
.wf-design-mode [data-split="heading"],
.w-editor [data-split="heading"] {
  visibility: visible !important;
}
```

---

## Attributes Reference

| Attribute | Values | Default | Purpose |
|-----------|--------|---------|---------|
| `data-split` | `heading` | (required) | Marks element for text splitting |
| `data-split-reveal` | `lines`, `words`, `chars` | `words` | What to split into |
| `data-split-trigger` | `scroll`, `load` | `scroll` | When to animate |

---

## Files in This Folder

- `text-reveal.js` - Main animation code
- `text-reveal.css` - FOUC prevention + optional performance CSS
- `external-scripts.html` - GSAP CDN script tags (for reference)
- `DECISIONS.md` - This file

---

## Future Considerations

1. **If adding more animation types** (fade, slide from left, etc.): Could add a `data-split-animation` attribute and branch on that.

2. **If scroll trigger timing needs adjustment:** Change `start: 'clamp(top 80%)'` - lower percentage = triggers later (element more centered), higher = triggers earlier.

3. **If stagger/duration feels wrong:** Adjust values in `splitConfig` object at top of JS file.
