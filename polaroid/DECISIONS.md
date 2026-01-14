# Polaroid Develop - Decision Log

## Current Approach: Overlay + Filters

Milky overlay fades while image develops from washed-out to normal.

**Why this approach:**
- Authentic "from nothing" feel — image emerges from milky blank, not darkness
- No desaturation — colors emerge WITH the image (real Polaroid behavior)
- Simple and reliable — GSAP handles opacity and CSS filters perfectly
- Performant — GPU-accelerated, one extra div per image

**Webflow setup:**
1. Wrapper div with `data-polaroid`
2. Image inside
3. Overlay div with class `polaroid-overlay`:
   - Position: absolute, inset: 0
   - Background: milky color (#d8d4c8)
   - Pointer-events: none

---

## Previous Approach: SVG Turbulence (ABANDONED)

Tried using SVG `feTurbulence` filter for organic edges. **Problems:**
- GSAP can't interpolate between "has SVG filter" and "no SVG filter"
- Filter snapped off abruptly instead of fading
- Looked like B&W → color (wrong) because of saturate(0) in filter chain

---

## Even Earlier Approach: Overlay + Desaturation (WRONG)

Had `saturate(0)` and `sepia(0.3)` in the filter chain. **Problem:** Made image look like B&W converting to color. Real Polaroids don't work that way — colors emerge WITH the image, not after.

---

## Other Approaches Tried

**Clip-path circle:** Too sharp, mechanical edges
**Mask-image radial gradient:** Still too regular/geometric
**CSS filters only (no overlay):** Image always somewhat visible, no "from nothing" feel

---

## Future Option: Textured Overlay

If the solid milky overlay feels too clean/digital, swap the solid background color for an actual Polaroid chemical texture image. The animation logic stays the same — just the overlay appearance changes.
