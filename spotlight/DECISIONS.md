# Spotlight - Decision Log

## What This Does

A light fog overlay with a soft-edged spotlight hole that shifts subtly with mouse movement. The spotlight doesn't track the mouse directly — it moves about 10% of the mouse offset from center, creating a gentle parallax feel.

---

## Why Radial Gradient (not mask or canvas)

Several approaches could create a "hole in an overlay":

- **CSS `mask-image`** — more flexible but adds complexity for no benefit here
- **Canvas** — powerful but overkill for a single soft circle
- **SVG mask** — similar trade-off to canvas

**Chose radial gradient** because:
- Natural soft/feathered edges without extra work
- CSS custom properties animate the gradient center position
- Same pattern already used in `gradient-emanate.js`
- GPU-accelerated, no JavaScript rendering loop needed

---

## Mouse Damping Approach

The spotlight position is calculated as:
```
spotlightX = 65 + (mouseX - 65) * 0.1
spotlightY = 30 + (mouseY - 30) * 0.1
```

This means the spotlight stays near its resting position (65%, 30%) and shifts only 10% of the mouse's offset from that point. The resting position is upper-right of center to match the Webflow design.

GSAP's `gsap.to()` with `overwrite: true` adds smooth easing on top of the damping, so the spotlight glides rather than jumps.

---

## Mouseleave Reset

When the mouse leaves the section, the spotlight smoothly returns to center. This avoids the spotlight being stuck at an off-center position.

---

## Dynamic Target Tracking (`data-spotlight-target`)

The spotlight position used to be hardcoded at 65%/30%. Problem: the overlay is `position: sticky` and viewport-locked, but the Polaroid photo inside the section is also sticky — it hasn't reached its sticky position when the section first enters. So the spotlight circle was misaligned until you scrolled further.

**Fix:** The JS now finds `[data-spotlight-target]` inside the section and reads its `getBoundingClientRect()` on every scroll frame via ScrollTrigger's `onUpdate`. The target's center is converted to viewport percentages (`left + width/2 / innerWidth * 100`) and stored as `baseX`/`baseY`. The spotlight moves to match.

**Coordinate space:** Everything is in viewport percentages — both the target's center and the mouse position (`clientX / innerWidth * 100`). This matches the overlay, which covers the full viewport via sticky positioning.

**Mouse interaction with dynamic base:** When hovering, the damped offset is calculated from the current `baseX`/`baseY` (not hardcoded values). The scroll callback also reapplies the mouse offset so the spotlight tracks smoothly even while scrolling with the mouse over the section.

**Fallback:** If no `[data-spotlight-target]` exists in the section, the spotlight stays at the static 65/30 position (original behavior).

**Webflow setup:** Add `data-spotlight-target` to the element the spotlight should track (e.g. the Polaroid photo) inside the `[data-spotlight]` section.

---

## Mobile Handling

No special touch handling. On touch devices, no `mousemove` fires, so the spotlight stays centered. Since the fog is light (~20% opacity), this looks fine — just a subtle vignette.

---

## Overlay Positioning: Sticky (not Absolute)

The overlay uses `position: sticky` instead of `position: absolute`. This keeps the fog + spotlight locked to the viewport while the section scrolls, so it covers the full screen for the entire section duration.

Key CSS trick: `margin-bottom: -100vh` collapses the overlay's space so section content isn't pushed down — content scrolls underneath naturally.

**Requirements:**
- Overlay must be the **first child** of the section
- Section must **not** have `overflow: hidden` (breaks sticky positioning)

---

## Webflow Setup

1. Add `data-spotlight` attribute to the target section
2. Section must **not** have `overflow: hidden` (breaks sticky)
3. Add a child div as the **first child** of the section:
   - Class: `spotlight-overlay`
   - Position: Sticky (or static — the CSS file handles it)
   - Pointer-events: None
4. Add the CSS to page custom code (head)
5. Add the JS to page custom code (footer), after lenis.js

---

## Configuration

Adjust in the JS file's `spotlightConfig` object:

| Property | Current | Purpose |
|----------|---------|---------|
| `damping` | `0.1` | Mouse offset multiplier (0.1 = 10% of movement) |
| `easeDuration` | `0.5` | Smooth follow duration in seconds |
| `fadeInDuration` | `0.6` | Overlay fade-in/out duration |
| `scrollStart` | `top 50%` | When section top hits 50% down viewport |

Adjust spotlight size/softness in the CSS file's `radial-gradient` stops:

| Stop | Current | Purpose |
|------|---------|---------|
| Transparent end | `28%` | Size of fully clear center area |
| Fog start | `30%` | Where fog reaches full opacity — larger = softer edge |
| Fog opacity | `0.22` | How dark the fog is (rgba alpha) |

---

## Files in This Folder

- `spotlight.js` — Mouse tracking and GSAP animation
- `spotlight.css` — Overlay styling and radial gradient
- `DECISIONS.md` — This file
