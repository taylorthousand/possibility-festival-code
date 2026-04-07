# Menu Button Reveal - Decision Log

This document explains why certain decisions were made in this code, so future modifications don't break things or repeat solved problems.

---

## Files in This Folder

- `menu-button-reveal.js` - Scroll-triggered masked reveal of the menu button
- `menu-button-reveal.css` - FOUC prevention, pointer-events defaults, designer overrides
- `menu-button-hover.js` - Hover text-roll + click collapse + menu open/close
- `DECISIONS.md` - This file

---

## Key Decisions

### 1. Masked reveal (no opacity)

**Decision date:** 2026-04-02
**Reason:** Same mechanic as the text-reveal system. The button is always full opacity — it's hidden by being translated outside its `overflow: hidden` wrapper (`.menu_button-wrapper`), and revealed by translating into it. No `autoAlpha` or opacity changes.

**Why not opacity:** Taylor's explicit direction. The visual language across the site is masked reveals, not fades.

---

### 2. ScrollTrigger start value: `bottom 15%`

**Decision date:** 2026-04-02
**Problem:** Initial attempt used `top top-=90vh` to trigger after 90vh of scroll. It fired too early (~30vh).

**Root cause:** The `-=` offset syntax in ScrollTrigger start strings only accepts pixel values. `90vh` was likely parsed as `90` (pixels), triggering almost immediately.

**Solution:** Switched to `bottom 15%` on `.section_hero` — fires when the hero's bottom edge reaches 15% from the viewport top. Taylor tuned this value in the browser.

**If trigger timing needs adjustment:** Change the percentage. Lower = triggers later (hero bottom must reach higher on screen). Higher = triggers earlier.

---

### 3. Pointer-events on `.nav_component`

**Decision date:** 2026-04-02
**Problem:** The sticky nav bar blocks clicks on content beneath it (hero section) while the menu button is hidden.

**Solution:** `.nav_component` starts with `pointer-events: none` (in CSS). The reveal script toggles it to `auto` when the button reveals, and back to `none` when it hides on scroll-back.

**Important:** `.nav_menu` also lives inside `.nav_component` and inherits `pointer-events: none`. The click/open script explicitly sets `pointer-events: auto` on `.nav_menu` when the menu opens, and `none` when it closes. Without this, link blocks inside the menu don't work.

---

### 4. Hover and click combined in one file

**Decision date:** 2026-04-02
**Reason:** Both interactions manipulate the same text element (`.desktop_menu-button_text`). The hover animates the roller's `yPercent` to -50%, the click animates it to -100%. Separate files would cause GSAP tween conflicts on the same property.

**State coordination:** An `isCollapsed` flag prevents hover from firing while the menu is open. On click-open, the hover timeline is killed (`hoverTl.pause().progress(0)`) before the click timeline plays.

---

### 5. Text roller built by JS (not Webflow)

**Decision date:** 2026-04-02
**Reason:** The hover text-roll effect requires a duplicate of the label text stacked vertically. Building the clone in JS keeps the Webflow structure clean — only one "menu" text exists in the CMS/designer.

**How it works:** JS captures `textEl.innerHTML`, creates a roller div with two copies (original + clone), replaces the text element's content. The text element's height is locked to single-line height before restructuring, and `overflow: hidden` makes it the mask.

---

### 6. Click collapse animates gap to 0

**Decision date:** 2026-04-02
**Problem:** `.desktop_menu-button` uses flexbox with a gap between the text label and hamburger. When the text collapses to `width: 0`, the flex gap remains, leaving dead space.

**Solution:** The click timeline animates the button's `gap` to 0 in parallel with the text width collapse. Both use the same duration and ease (`power2.inOut`, 0.3s) and start at the same time (`'<'` position parameter).

---

### 7. Three close triggers

**Decision date:** 2026-04-02
**Decision:** The menu closes via:
1. `.close-button` click
2. Click anywhere outside `.nav_menu` and `.desktop_menu-button`
3. Clicking the menu button again (toggle)

All three call the same `closeMenu()` function, which reverses the click timeline and resets pointer-events.

---

### 8. Menu slide distance: 50rem

**Decision date:** 2026-04-02
**Setup:** `.nav_menu` is positioned 50rem off-screen to the right in Webflow's native UI. The click timeline translates it `x: '-50rem'` to bring it on-screen. The code does NOT set an initial position — Webflow owns the resting state.

**If changing menu position in Webflow:** Update the `x` value in the click timeline to match.

---

## Webflow Setup Requirements

| Element | Requirement |
|---------|-------------|
| `.menu_button-wrapper` | `overflow: hidden` (mask for button reveal) |
| `.nav_component` | No special setup (CSS handles `pointer-events: none`) |
| `.desktop_menu-button` | `cursor: pointer` |
| `.nav_menu` | Positioned 50rem off-screen right |
| `.desktop_menu-button_text` | Contains the label text ("menu") |
| `.desktop_menu_hamburger` | Other child of the button |
| `.close-button` | Inside `.nav_menu` |
