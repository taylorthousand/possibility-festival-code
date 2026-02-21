# Background Shift - Decision Log

## What This Does

Transitions a section's background from a gradient to a solid color on scroll.

---

## Why Overlay Approach (not direct animation)

GSAP can't interpolate between a gradient (`background-image`) and a solid color (`background-color`) - they're different CSS properties.

**Solution:** Layer a solid color div on top of the gradient and animate its opacity from 0 to 1. Visually creates a smooth transition.

---

## Triggered vs Scrubbed

**Chose triggered with easing** (`toggleActions`) over scrubbed because:
- Smooth, polished transition with proper easing
- No awkward mid-state if user stops scrolling partway
- `toggleActions: 'play none none reverse'` handles scroll direction automatically
- Plays forward on scroll down, reverses on scroll up

**Scrubbed alternative** would tie color progress directly to scroll position - feels different but valid if preferred.

---

## Using Class Instead of Attribute

Since this is only used on one section, using a class (`.bg-shift-overlay`) is simpler than an attribute. No need to encode color values - the color is set directly in Webflow on the overlay div.

---

## Webflow Setup

1. Section has gradient background (set in Webflow designer)
2. Add a div inside the section:
   - Position: Absolute
   - Size: Full (top/right/bottom/left: 0)
   - Background: Solid end color
   - Opacity: 0
   - Pointer-events: None
   - Class: `bg-shift-overlay`
3. JS animates the overlay's opacity

---

## Configuration

Adjust in the JS file:

| Property | Current | Purpose |
|----------|---------|---------|
| `duration` | `0.8` | Transition duration in seconds |
| `ease` | `power2.out` | Easing curve |
| `start` | `top 60%` | When section top hits 60% down viewport, transition triggers |

---

## Files in This Folder

- `background-shift.js` - Animation code
- `DECISIONS.md` - This file
