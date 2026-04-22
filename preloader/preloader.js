/* ===========================================
   PRELOADER - Osmo Logo Reveal Loader
   ===========================================

   Shows a brand-color overlay with logo (clipPath reveal),
   progress bar, optional SplitText word cycling, then
   slides background up to reveal the page.

   Only plays on first visit per browser session.

   SETUP IN WEBFLOW:
   1. Wrapper: add data-load-wrap to a fixed full-screen div
      (brand bg, z-index above data-transition-wrap, display:flex)
   2. Background: add data-load-bg to a position:absolute inset:0
      div with brand background color
   3. Container: add data-load-container to the centered content div
   4. Logo: add data-load-logo (CSS initial: clip-path: inset(0% 100% 0% 0%))
   5. Progress bar: add data-load-progress
      (CSS initial: transform: scaleX(0); transform-origin: left center)
   6. Text elements (optional, need 2+): add data-load-text
      (CSS initial: visibility: hidden)
   7. FOUC targets (optional): add data-load-reset to elements
      hidden in CSS that should snap visible at time 0
      (do NOT use on elements with their own entrance animation)

   ATTRIBUTES:
   - data-load-wrap       -> wrapper div
   - data-load-bg         -> background div
   - data-load-container  -> content container
   - data-load-logo       -> logo element
   - data-load-progress   -> progress bar
   - data-load-text       -> text elements (need 2+ for cycling)
   - data-load-reset      -> FOUC prevention targets
   =========================================== */

// Configuration — adjust these to tune the effect
var preloaderCfg = {
  sessionKey: 'pfest-preloader-seen',
  loaderEase: '0.65, 0.01, 0.05, 0.99',
  timelineDuration: 1.8,
  fadeOutDuration: 0.5,
  bgRevealDuration: 1,
  textInDuration: 0.6,
  textInStagger: 0.02,
  textOutDuration: 0.4,
  textOutStagger: 0.02,
  textHoldDelay: 0.4,
  sparkDuration: 0.15,
  sparkDelay: 2
};

function runPreloader() {
  var wrap = document.querySelector('[data-load-wrap]');
  if (!wrap) return;

  // Failsafe watchdog — installed BEFORE GSAP/CustomEase calls so even if
  // plugin registration throws, the wrap still dismisses at 6s. Belt-and-
  // suspenders with the CSS @keyframes in css-bundle.css and the inline
  // <script> in the Webflow <head>.
  if (!sessionStorage.getItem(preloaderCfg.sessionKey) && window.innerWidth >= 768) {
    setTimeout(function() {
      if (wrap.style.display !== 'none') {
        console.warn('[pfest] preloader failsafe fired — wrap still visible at 6s');
        wrap.style.setProperty('display', 'none', 'important');
      }
    }, 6000);
  }

  gsap.registerPlugin(CustomEase, SplitText, DrawSVGPlugin);
  CustomEase.create('loader', preloaderCfg.loaderEase);

  // Session gate — skip if already seen this session
  if (sessionStorage.getItem(preloaderCfg.sessionKey)) {
    wrap.style.setProperty('display', 'none', 'important');
    return;
  }

  // Mobile — skip preloader. The timeline competes with first-load script parsing
  // and font loading on the main thread, producing visible jank.
  if (window.innerWidth < 768) {
    wrap.style.setProperty('display', 'none', 'important');
    return;
  }

  // Reduced motion — skip all animation
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    wrap.style.setProperty('display', 'none', 'important');
    sessionStorage.setItem(preloaderCfg.sessionKey, '1');
    return;
  }

  var container   = wrap.querySelector('[data-load-container]');
  var bg          = wrap.querySelector('[data-load-bg]');
  var progressBar = wrap.querySelector('[data-load-progress]');
  var logo        = wrap.querySelector('[data-load-logo]');
  var textEls     = Array.from(wrap.querySelectorAll('[data-load-text]'));
  var resetTargets = Array.from(
    wrap.querySelectorAll('[data-load-reset]:not([data-load-text])')
  );

  var loadTl = gsap.timeline({
    defaults: { ease: 'loader', duration: preloaderCfg.timelineDuration }
  })
  .set(wrap, { display: 'block' })
  .to(progressBar, { scaleX: 1 })
  .to(logo, { clipPath: 'inset(0% 0% 0% 0%)' }, '<')
  .to(container, { autoAlpha: 0, duration: preloaderCfg.fadeOutDuration })
  .to(progressBar, {
    scaleX: 0, transformOrigin: 'right center',
    duration: preloaderCfg.fadeOutDuration
  }, '<')
  .add('hideContent', '<')
  .to(bg, { yPercent: -101, duration: preloaderCfg.bgRevealDuration }, 'hideContent')
  .set(wrap, { display: 'none' });

  // FOUC prevention — reveal reset targets at time 0
  if (resetTargets.length) {
    loadTl.set(resetTargets, { autoAlpha: 1 }, 0);
  }

  // DrawSVG sparks — draw inside-to-outside during logo reveal
  var sparkWrap = wrap.querySelector('[data-load-sparks]');
  var sparks = sparkWrap ? Array.from(sparkWrap.querySelectorAll('path')) : [];
  if (sparks.length) {
    gsap.set(sparks, { drawSVG: '0%' });
    loadTl.to(sparks, {
      drawSVG: '100%',
      duration: preloaderCfg.sparkDuration,
      ease: 'power2.out'
    }, preloaderCfg.sparkDelay);
  }

  // Text cycling (requires 2+ data-load-text elements)
  if (textEls.length >= 2) {
    var firstWord  = new SplitText(textEls[0], { type: 'lines,chars', mask: 'lines' });
    var secondWord = new SplitText(textEls[1], { type: 'lines,chars', mask: 'lines' });
    gsap.set([firstWord.chars, secondWord.chars], { autoAlpha: 0, yPercent: 125 });
    gsap.set(textEls, { autoAlpha: 1 });

    loadTl.to(firstWord.chars, {
      autoAlpha: 1, yPercent: 0,
      duration: preloaderCfg.textInDuration,
      stagger: { each: preloaderCfg.textInStagger }
    }, 0);
    loadTl.to(firstWord.chars, {
      autoAlpha: 0, yPercent: -125,
      duration: preloaderCfg.textOutDuration,
      stagger: { each: preloaderCfg.textOutStagger }
    }, '>+=' + preloaderCfg.textHoldDelay);
    loadTl.to(secondWord.chars, {
      autoAlpha: 1, yPercent: 0,
      duration: preloaderCfg.textInDuration,
      stagger: { each: preloaderCfg.textInStagger }
    }, '<');
    loadTl.to(secondWord.chars, {
      autoAlpha: 0, yPercent: -125,
      duration: preloaderCfg.textOutDuration,
      stagger: { each: preloaderCfg.textOutStagger }
    }, 'hideContent-=0.5');
  }

  // Mark as seen when timeline completes
  loadTl.call(function() {
    sessionStorage.setItem(preloaderCfg.sessionKey, '1');
  });
}

// Initialize after DOM is ready
document.addEventListener('DOMContentLoaded', runPreloader);
