# Parallax Sections - Decision Log

## What This Does

Creates transitions between sections with two options:

- **`data-parallax="out"`** — Section sinks DOWN, next section slides over it
- **`data-parallax="rise"`** — Section rises UP out of the way, next section comes in from below

Both require the next section to have higher z-index (set in Webflow).

---

## How It Actually Works

**Key insight:** Only the "out" section is animated. The next section just scrolls naturally.

1. Section with `data-parallax="out"`: translates DOWN as you scroll past
2. Next section: scrolls at normal speed, has higher z-index (set manually in Webflow)
3. The z-index difference makes the next section appear to slide over

**Previous incorrect approach:** We initially tried animating both sections (section 2 translating up). This caused issues with initial state and was unnecessarily complex. The real effect only requires animating the outgoing section.

---

## Why Custom Attribute (not class)

Consistent with text-reveal pattern (`data-split`, `data-split-trigger`). Benefits:
- Self-documenting in Webflow (you see `data-parallax="out"` and know what it does)
- Easy to query: `querySelectorAll('[data-parallax="out"]')`
- Portable to other projects

---

## Configuration

Tunable values in `parallaxConfig`:

```js
const parallaxConfig = {
  out: {
    yPercent: 30,        // how far section sinks (positive = down)
    start: 'top top',
    end: 'bottom top',
  },
  rise: {
    yPercent: -30,       // how far section rises (negative = up)
    start: 'top top',
    end: 'bottom top',
  }
};
```

### Adjustment Guide

**More dramatic effect:** Increase magnitude (try 40-50 for out, -40 to -50 for rise)
**Subtler effect:** Decrease magnitude (try 15-20 for out, -15 to -20 for rise)
**Longer animation:** Change `end` to extend further (e.g., `'bottom 50%'`)

---

## Z-Index Requirement (Critical)

The section following a `data-parallax="out"` section MUST have higher z-index. Set this manually in Webflow's designer on each section.

Without this, the effect won't work - the sinking section will appear on top of the one sliding over it.

---

## Potential Issue: Child ScrollTriggers

If the "out" section contains child elements with their own ScrollTriggers (like text reveals), the parent translation might cause triggers to fire at slightly unexpected times.

**If this happens:**
- Test if the offset is noticeable
- Adjust child trigger positions to compensate
- Text reveals with `data-split-trigger="load"` won't be affected

---

## Files in This Folder

- `parallax-sections.js` - Main animation code (only animates "out" sections)
- `DECISIONS.md` - This file
