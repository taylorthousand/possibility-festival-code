# Momentum-Based Hover — Decision Log

## What This Does

Polaroid photos react to the mouse with physics-based inertia: when the cursor enters an element, it gets a momentum kick in the direction and speed the mouse was traveling, then settles back to rest. Uses GSAP InertiaPlugin for the physics.

Source: Osmo's momentum-based hover resource. Code used as-is; all decisions below are about integration into this project's layout.

---

## External Script: InertiaPlugin

Added `InertiaPlugin.min.js` to `setup/external-scripts/head.html` alongside the existing GSAP plugins. Same CDN pattern (`cdn.jsdelivr.net/npm/gsap@3.13.0`), loads after GSAP core.

Confirmed plugin loads correctly: `gsap.plugins.inertia` returns the constructor in the console.

---

## Attribute Structure (Three Layers)

Osmo's code requires three nested data attributes:

| Attribute | Role |
|-----------|------|
| `[data-momentum-hover-init]` | Root container — tracks mouse velocity via `mousemove` |
| `[data-momentum-hover-element]` | Hover trigger — `mouseenter` fires here |
| `[data-momentum-hover-target]` | Animated element — receives the inertia tween |

**Element and target cannot be on the same element.** The code uses `el.querySelector('[data-momentum-hover-target]')` to find a descendant — it won't match the element itself.

---

## Init Container Placement

The init container must **visually cover** the area the mouse travels through before reaching any hover element. The `mousemove` listener on the init container builds up velocity data — if the mouse enters an element without crossing the init container first, velocity is 0 and nothing happens.

Per Osmo's docs: "Make sure to add some extra padding above so the script can properly track your mouse before it enters the element."

**On this project:** Init attribute lives on the section. The polaroids are absolutely positioned and scattered across the section, so the section is the only element that visually encompasses all of them plus the approach area.

---

## Absolute Positioning Problem

The polaroids were originally absolutely positioned relative to `cta_home-container`, a box much smaller than the visual spread of the photos. This caused two problems:

1. **Only 1 of 7 photos responded** — the only one whose visual position overlapped the init container's bounds
2. **Putting init on an ancestor didn't help** — `padding-global` didn't extend into the visual area either

**Fix:** Each polaroid needs its own wrapper div. The wrapper handles absolute positioning and gets `[data-momentum-hover-element]`. The photo inside gets `[data-momentum-hover-target]`.

---

## Rotation Conflict: CSS vs. GSAP

The polaroids have aesthetic CSS rotations for a scattered look. Problem: the inertia tween animates `rotation` with `end: 0`, so after the first hover, the element settles at 0° — losing its styled rotation.

**Fix:** Put the aesthetic rotation on the wrapper (`[data-momentum-hover-element]`), not on the target. The target starts at 0° rotation relative to its wrapper, GSAP animates rotation and settles back to 0°, and the visual rotation is preserved by the wrapper.

---

## RAF Throttle on Velocity Tracking

The original code RAF-throttles the `mousemove` handler. Initially suspected this caused stale velocity reads, but this is Osmo's shipped code — the throttle is intentional for performance. The real issues were container sizing and attribute placement, not velocity staleness.

---

## File Location

`mouse-effects/momentum-hover/` — grouped with other pointer-driven effects (spotlight, etc.) rather than in `components/` since the interaction is mouse-behavior-driven, not component-driven.

---

## Files in This Folder

- `momentum-hover.js` — Osmo's script (unmodified logic, debug console.log currently present)
- `DECISIONS.md` — This file
