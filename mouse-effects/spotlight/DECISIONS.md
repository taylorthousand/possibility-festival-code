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

## Mouseleave Behavior

Previously the spotlight snapped back to center on mouseleave. This caused a visible jump when the mouse left the browser viewport (moving to the address bar, another app, etc.) — the section's `mouseleave` fires in both cases and there's no clean way to distinguish "left the page" from "left the viewport."

**Fix:** Removed the explicit reset-to-center animation. On mouseleave, the current damped offset is frozen (`frozenOffsetX`/`frozenOffsetY`). The spotlight holds that offset through subsequent scroll updates instead of snapping to base. When the mouse re-enters, live offset calculation resumes.

In practice the spotlight smoothly drifts back toward center as the scroll-driven base position updates, which looks natural. The key win is eliminating the jarring snap on viewport exit.

---

## Unified Ellipse + Beam Animation (Proxy Object)

Originally the ellipse and beam were rendered through separate code paths: the ellipse was animated via GSAP tweens on CSS custom properties (`--spotlight-x`/`--spotlight-y`) with 0.5s easing, while the beam was rendered synchronously via `updateBeam()` at the target position with no easing. This caused the beam to jump ahead of the ellipse during mouse movement and snap back instantly on mouseleave while the ellipse eased smoothly.

**Fix:** Replaced the two-path architecture with a single GSAP tween on a proxy object (`spotPos = {x, y, ox, oy}`). All position changes go through `animateTo()`, which tweens the proxy and uses an `onUpdate` callback to set both the CSS custom properties and call `updateBeam()` on every animation frame. Since both outputs read from the same interpolated values, they're always in perfect lockstep.

This collapsed three separate rendering call sites (mousemove handler, applyPosition helper, mouseleave handler) into one unified function.

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
- Section must use `overflow: clip` (not `hidden` — hidden breaks sticky positioning, clip works the same visually)

---

## Webflow Setup

1. Add `data-spotlight` attribute to the target section
2. Section must use `overflow: clip` (not `hidden`)
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

## Donation Spotlight Variant

A simplified spotlight for the donation header section. Same fog overlay and mouse-follow as the main spotlight, but **no beam** and uses a **fixed-position target** instead of scroll-triggered fade.

### Key Differences from Main Spotlight

| | Main Spotlight | Donation Spotlight |
|---|---|---|
| **Beam** | Dual-layer volumetric cone | None |
| **Visibility** | ScrollTrigger fade in/out | Always on (opacity tweens to 1 on init) |
| **Target tracking** | `data-spotlight-target` | `data-spotlight-target` |
| **Offset** | None | `offsetY: -4` shifts spotlight 4vh above target center |
| **Scroll position** | Eased (gsap.to) | Instant (setPos) — prevents lag on scroll |
| **Mouse position** | Eased (gsap.to) | Eased (animTo) — smooth follow |
| **Attribute** | `data-spotlight` | `data-spotlight-donate` |
| **Config object** | `spotlightCfg` (bundle) / `spotlightConfig` (standalone) | `donateSpotCfg` |

### Decisions Made

**No beam:** The donation section doesn't need the light-source effect. Keeps it clean and reduces visual complexity.

**Always on (no ScrollTrigger fade):** The donation header is typically at/near the top of its page. ScrollTrigger's `onEnter` doesn't fire if the section is already in view on load, causing the spotlight to never appear. Removed ScrollTrigger entirely — the overlay fades to `opacity: 1` immediately on init.

**Instant scroll tracking, eased mouse tracking:** The original code used `gsap.to` (0.5s ease) for all position updates including scroll. This caused the spotlight to visibly lag behind the target during scrolling. Fix: `setPos()` sets CSS vars instantly on scroll; `animTo()` with ease is only used for mouse movement.

**offsetY config:** The spotlight sits 4% of viewport height above the target element's center. Configurable via `donateSpotCfg.offsetY`. Negative = higher.

**overflow: clip on section:** The section needs to clip overflowing polaroids horizontally, but `overflow: hidden` breaks `position: sticky` on the overlay. `overflow: clip` clips visually the same way without creating a scroll container, so sticky works.

**No JS-driven size overrides:** Initially the JS set `--spotlight-rx` and `--spotlight-ry` on init, which overrode the CSS embed values. Removed — ellipse size is now controlled entirely via the CSS embed on the page so it can be tuned in Webflow without redeploying.

**Absolute positioning removed:** Attempted `position: absolute` on the overlay to bypass padding issues, but this caused double-scroll (viewport-relative getBoundingClientRect values applied to a document-flow element). Reverted to sticky. Padding is handled in Webflow by placing the overlay as first child and using negative margin or adjusting section structure.

### Webflow Setup (Donation)

1. Add `data-spotlight-donate` to `.section_donation_header`
2. Add `data-spotlight-target` to `.donation-header_container`
3. Section: `overflow: clip`
4. Add `.spotlight-overlay` div as first child of the section (sticky, pointer-events none)
5. Add the donation spotlight CSS to a code embed on the page (head)

### Files

- `spotlight-donate.js` — Standalone module (IIFE-wrapped)
- `spotlight-donate.css` — CSS for Webflow code embed
- Registered in `barba-bundle.js` as `initDonationSpotlight()` with attribute `[data-spotlight-donate]`

### CSS Custom Properties (set in page embed)

| Property | Current | Purpose |
|----------|---------|---------|
| `--spotlight-x` | `50%` | Horizontal center (overridden by JS on init) |
| `--spotlight-y` | `45%` | Vertical center (overridden by JS on init) |
| `--spotlight-rx` | `44%` | Horizontal radius of ellipse |
| `--spotlight-ry` | `44%` | Vertical radius of ellipse |

---

## Files in This Folder

- `spotlight.js` — Main spotlight: mouse tracking, beam, and GSAP animation
- `spotlight.css` — Main spotlight: overlay styling and radial gradient
- `spotlight-donate.js` — Donation spotlight: simplified, no beam
- `spotlight-donate.css` — Donation spotlight: CSS for Webflow embed
- `DECISIONS.md` — This file
