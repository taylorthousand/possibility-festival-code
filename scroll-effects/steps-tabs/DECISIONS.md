# Steps Tabs Pill — Decisions Log

## What it is
A scroll-driven tab indicator for the Steps section. A white pill slides between three tabs (Choose, Attend, Rewire) as the user scrolls past corresponding content boxes. The active tab's text gets a faux-italic via CSS skew.

## Pill styling
- **Background:** white (`#fff`)
- **Border:** 1.5px solid black
- **Border-radius:** 3px — tested 100px (way too rounded), 8px (still too much), 2px (too sharp), landed on 3px
- **Size:** 2px larger than the tab in each dimension (+2 width, +2 height), offset -3px left and -3px top to stay centered. Arrived at through visual iteration — started at -2/-2, was slightly off
- **Z-index:** 0, with tab links set to z-index 1 and `position: relative` via JS so text layers above the pill

## Pill animation
- **Easing:** `power3.inOut` — slow start, fast middle, slow end. Tested `power2.out` (too uniform), `power3.in` (too abrupt at arrival), settled on inOut for the hesitant-then-zippy-then-settling feel
- **Duration:** 0.6s — started at 0.4s (too fast), went to 0.5s (still a touch fast), landed on 0.6s (~20% slower than initial)
- **Velocity-based skew on the pill:** Instead of pre-scripted skew tweens (which caused timing/snapping issues), skew is derived from the pill's instantaneous velocity each frame. Pill leans in the direction of travel proportional to how fast it's moving. Max skew: 11 degrees. Started at 6deg (too subtle), went to 8deg, landed on 11deg
- **Skew settle:** After arrival, a 0.15s `power2.out` tween eases the pill skew back to 0

## Faux-italic on active tab text
- **Method:** `skewX: -10` on the tab element — not `font-style: italic`. The font isn't variable, so real italic was a binary snap that looked bad at every trigger timing we tried (too early, too late, always jarring)
- **Skew amount:** -10 degrees. Tested -8deg (too subtle for a faux-italic feel), landed on -10deg
- **Transition in:** 0.3s duration, delayed to 50% of the pill's travel. Started at 60% delay (too late), adjusted to 50%
- **Transition out:** Non-target tabs tween to `skewX: 0` over 0.2s on each move. Originally used `gsap.set` (instant snap) which caused visible pops on interruption — switched to tweens so interrupted skews ease out smoothly
- **Text tweens are tracked** in an array and killed on each new move to prevent stale tweens from skewing the wrong tab when fast-scrolling skips a tab

## Scroll trigger
- **Method:** `onEnter` + `onLeaveBack` on the same `start` line (`top 75%`). This fires at the exact same scroll position in both directions
- **Why not `onToggle`:** `onToggle` fires at `start` going down and `end` going back up — two different scroll positions, causing asymmetric triggers
- **Trigger value:** `top 75%` — content box top hits 75% down the viewport. Tested 66% (too late), 80% (too early), 75% felt right
- **Guard:** Uses `targetIndex` (where the pill is heading) not `activeIndex` (where it arrived). Prevents the guard from blocking valid moves when the pill is mid-flight

## Mid-flight redirection
- When a fast scroll triggers a new tab before the pill arrives at the current target, the active tween is killed and a new one starts from the pill's current interpolated position. This was already working via `gsap.getProperty(pill, 'left')` reading the live position
- `activeIndex` only updates on `onComplete` (where the pill actually is), `targetIndex` updates immediately (where it's heading). This keeps direction calculation correct for skew and prevents the guard from blocking valid redirects

## Lenis integration fix
- Original setup used `autoRaf: true` on Lenis with `lenis.on('scroll', ScrollTrigger.update)`. This ran Lenis's animation loop independently from GSAP's ticker, causing frame drift — ScrollTrigger would fire at slightly different scroll positions depending on direction
- Fix: disabled `autoRaf`, drive Lenis from `gsap.ticker.add()` instead, with `gsap.ticker.lagSmoothing(0)`. Both systems now update in lockstep on every frame. This change is in `setup/lenis/lenis.js`

## Sticky centering (separate file: sticky-center.js)
- The sticky image wrapper (`steps_desktop-image-wrapper`) needs to be vertically centered in the viewport regardless of its height
- Can't use `transform: translateY(-50%)` because sticky calculates boundaries from the original box, not the transformed position — causes overflow past parent top/bottom
- Can't use a 100vh wrapper with flexbox centering because the sticky element sits alongside flowing content that it needs to align with
- Solution: JS calculates `(window.innerHeight - el.offsetHeight) / 2` and sets it as the `top` value with `!important` (needed to override Webflow's sticky top value). Recalculates on resize
- `position: sticky` must be set in Webflow's designer with an explicit top value (not auto) — Webflow won't output sticky CSS without one. The JS then overrides that top value at runtime
