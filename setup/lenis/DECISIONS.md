# Lenis Smooth Scroll - Decision Log

## What This Is

Lenis is a smooth scroll library that creates buttery, momentum-based scrolling. It overrides the browser's native scroll behavior with a "virtual" scroll.

---

## Why Integration Code Is Needed

**Problem:** Lenis and GSAP ScrollTrigger can conflict because:
- Lenis creates a virtual scroll position that can differ from native scroll
- ScrollTrigger by default reads native scroll position
- This mismatch causes animations to trigger at wrong times

**Solution:** One line of integration:
```js
lenis.on('scroll', ScrollTrigger.update);
```
This tells ScrollTrigger to update whenever Lenis scrolls.

---

## Lenis Configuration

Using Osmo's recommended setup with `autoRaf: true`:

```js
const lenis = new Lenis({
  autoRaf: true,
});
```

**What `autoRaf: true` does:** Handles the requestAnimationFrame loop automatically. In older Lenis versions, you had to manually sync with GSAP's ticker. This option simplifies everything.

**Additional options you can add if needed:**

| Option | Default | What It Does |
|--------|---------|--------------|
| `duration` | `1.2` | Scroll momentum duration. Lower = snappier, higher = floatier |
| `easing` | ease-out | The feel of scroll deceleration |
| `smoothWheel` | `true` | Smooth scroll for mouse wheel |
| `touchMultiplier` | `2` | Touch/swipe sensitivity on mobile |

Example with custom duration:
```js
const lenis = new Lenis({
  autoRaf: true,
  duration: 0.9,  // snappier feel
});
```

---

## Load Order (Critical)

Scripts must load and execute in this order:

1. GSAP core (`gsap.min.js`)
2. ScrollTrigger (`ScrollTrigger.min.js`)
3. SplitText (`SplitText.min.js`)
4. Lenis (`lenis.min.js`)
5. **Lenis initialization + GSAP integration** ← this file
6. Text reveal initialization (`text-reveal.js`)

**Why this order matters:**
- Lenis integration references `ScrollTrigger`, so GSAP must load first
- Lenis must be connected to ScrollTrigger BEFORE any ScrollTriggers are created
- Text reveal creates ScrollTriggers, so it must come after Lenis integration

---

## Alternative Considered

**GSAP ScrollSmoother:** GSAP's own smooth scroll plugin that integrates seamlessly with ScrollTrigger. We chose Lenis instead because:
- Client preference / familiarity
- Lenis is free and open source
- Can switch to ScrollSmoother later if needed

---

## Files in This Folder

- `lenis.js` - Initialization and GSAP integration code
- `external-scripts.html` - Lenis CDN script tag
- `DECISIONS.md` - This file

---

## Troubleshooting

**Animations trigger at wrong scroll positions:**
- Ensure Lenis initializes BEFORE text-reveal.js
- Check that `lenis.on('scroll', ScrollTrigger.update)` is running

**Scroll feels janky:**
- Check for CSS `scroll-behavior: smooth` (remove it - conflicts with Lenis)
- Check for other scroll libraries/code that might conflict

**Mobile scroll issues:**
- Adjust `touchMultiplier` value
- Some iOS versions have quirks with virtual scroll
