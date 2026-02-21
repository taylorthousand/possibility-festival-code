# Polaroid Development Effect - Brainstorm

Goal: Photos "develop" like a Polaroid on scroll, taking ~2 seconds. Must be lightweight and work with many images.

---

## Approaches (Lightest to Heaviest)

### 1. CSS Filters Only (Lightest)

Animate from washed-out to normal using `filter`:

```css
/* Starting state: milky, desaturated, low contrast */
filter: brightness(1.6) contrast(0.4) saturate(0) sepia(0.6) blur(2px);

/* End state: normal photo */
filter: brightness(1) contrast(1) saturate(1) sepia(0) blur(0px);
```

**How it looks:** Image starts bright, flat, colorless with sepia tint, slightly blurry → sharpens and colors emerge.

**Pros:** Pure CSS/GSAP, GPU-accelerated, zero extra DOM elements
**Cons:** Doesn't capture the "emerging from nothing" feeling - image is always somewhat visible

---

### 2. Overlay + Filters (More Authentic) ⭐ RECOMMENDED

Add a solid overlay div on top of each image that matches undeveloped Polaroid color (milky greenish-brown). Animate:
- Overlay opacity: 1 → 0
- Image filters: washed out → normal

```
[Image]
[Overlay div - rgba(180, 175, 160, 1)]
```

**How it looks:** Starts as blank Polaroid color, image fades in while gaining saturation/contrast.

**Pros:** More authentic "emerging from blank" look
**Cons:** One extra div per image

---

### 3. Gradient Mask Reveal + Filters

Use a CSS mask or clip-path that expands from center outward (or top-down like real Polaroid development), combined with filter animation.

```css
mask-image: radial-gradient(circle, black 0%, transparent 0%);
/* Animate to: */
mask-image: radial-gradient(circle, black 100%, transparent 100%);
```

**How it looks:** Image emerges from center outward while colors develop.

**Pros:** More dynamic, closer to real Polaroid behavior
**Cons:** Mask animations can be trickier to performance-tune

---

### 4. Multi-Stage Animation (Most Realistic)

Combine multiple effects in sequence:
1. **0-0.5s:** Overlay fades from solid to 50%
2. **0.3-1.5s:** Shadows/darks appear first (via contrast animation)
3. **0.5-2s:** Colors emerge (saturation 0 → 1)
4. **1-2s:** Blur clears, final sharpness

**How it looks:** Mimics actual chemical development - darks first, then color, then clarity.

**Pros:** Most authentic
**Cons:** More complex timeline to manage

---

## Recommendation

**Start with #2 (Overlay + Filters)** — best balance of:
- Authenticity (starts truly blank)
- Performance (one extra div, CSS filters are GPU-accelerated)
- Simplicity (easy to implement with GSAP)

The overlay could be a single reusable CSS class. Trigger on scroll using the same ScrollTrigger pattern already in use for text reveals.

---

## Performance Notes for Many Images

- CSS `filter` is GPU-accelerated — very efficient
- Use `will-change: filter, opacity` on images that will animate
- Trigger with `once: true` so each image only animates once
- Could use `ScrollTrigger.batch()` to handle many images efficiently

---

## Next Steps

1. Prototype option #2 with code
2. Test performance with multiple images
3. Tune timing/easing to feel right
4. Consider mobile performance

---

## BOOKMARK: SVG Turbulence Filter

For future exploration - could create organic, irregular edges using SVG's `feTurbulence` filter. This generates procedural noise that could make mask edges look more chemical/organic rather than geometric.

```svg
<filter id="organic-edge">
  <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" />
  <feDisplacementMap in="SourceGraphic" scale="20" />
</filter>
```

Could be applied to masks or overlays for more authentic Polaroid chemical unevenness. Worth exploring if the simple overlay approach feels too clean/digital.
