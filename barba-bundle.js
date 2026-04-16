// POSSIBILITY FESTIVAL — UNIFIED BARBA BUILD

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, DrawSVGPlugin, SplitText, InertiaPlugin, CustomEase);

history.scrollRestoration = "manual";

// --- Global State ---
var lenis = null;
var nextPage = document;
var onceFunctionsInitialized = false;
var isFirstLoad = true;
var containerAbort = null;
var containerTickerFns = [];
var containerObservers = [];
var hangtagCleanupEls = [];
var heroLoadFired = false;
var loadRevealFired = false;

var hasLenis = typeof window.Lenis !== "undefined";
if (window.innerWidth < 768) hasLenis = false;
var hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";

var rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
var reducedMotion = rmMQ.matches;
rmMQ.addEventListener?.("change", function(e) { reducedMotion = e.matches; });
rmMQ.addListener?.(function(e) { reducedMotion = e.matches; });

// Hero padding animation is too busy paired with the text reveal on small screens.
// Mobile landscape and below: keep the text reveal, skip the padding tween entirely.
function shouldAnimateHeroLoad() { return window.innerWidth > 767; }

var has = function(s) { return !!nextPage.querySelector(s); };

var staggerDefault = 0.05;
var durationDefault = 0.6;

// Immediately hide preloader if already seen this session
(function() {
  var w = document.querySelector('[data-load-wrap]');
  if (w && sessionStorage.getItem('pfest-preloader-seen')) w.style.display = 'none';
})();

CustomEase.create("osmo", "0.625, 0.05, 0, 1");
gsap.defaults({ ease: "osmo", duration: durationDefault });

// Wrapper script state (persists across transitions)
var menuButton_el = null;
var menuButton_navComponent = null;
var navLogo_paths = null;
var navLogo_svg = null;
var fontsReady = false;

// FUNCTION REGISTRY

function initOnceFunctions() {
  initLenis();
  if (onceFunctionsInitialized) return;
  onceFunctionsInitialized = true;
  initMenuButton();
  initNavLinkSkew();
  initNavLogoScroll();
}

function initBeforeEnterFunctions(next) {
  // Tear down previous container's listeners and ticker functions
  if (containerAbort) containerAbort.abort();
  containerAbort = new AbortController();
  containerTickerFns.forEach(function(fn) { gsap.ticker.remove(fn); });
  containerTickerFns = [];
  containerObservers.forEach(function(o) { o.disconnect(); });
  containerObservers = [];
  hangtagCleanupEls.forEach(function(el) { el.remove(); });
  hangtagCleanupEls = [];
  nextPage = next || document;
}

function initAfterEnterFunctions(next) {
  nextPage = next || document;

  // Pin-creating ScrollTriggers first (pin-spacers must exist before other triggers measure)
  if (has('[data-carousel="polaroid"]')) initPolaroidCarousel();
  if (has('[data-stacking-cards]')) initStackingCards();
  if (has('.section_register-cta') || has('.section_home-cta') || has('.section_donate-cta')) initFooterReveal();
  // Text reveal must init before hangtag (SplitText restructures DOM first)
  if (has('[data-split="early"]') || has('[data-split="late"]')) initTextReveal();
  if (has('[data-spotlight-donate]')) initDonationHeaderScroll();
  if (has('.problem_study-trigger')) initHangtagHover();
  if (has('.section_hero')) initHeroLoad();
  if (has('.section_hero')) initHeroScroll();
  if (has('[data-momentum-hover-init]')) initMomentumHover();
  if (has('[data-spotlight]')) initSpotlight();
  if (has('[data-spotlight-donate]')) initDonationSpotlight();
  if (has('.festivals_item-link')) initFestivalHover();
  if (has('.bg-shift-overlay')) initBackgroundShift();
  if (has('.section_solution')) initGradientEmanate();
  if (has('[data-parallax]')) initParallaxSections();

  if (has('.section_solution') && has('[data-carousel="polaroid"]')) initSectionSnap();
  if (has('.steps_tabs-menu')) initStepsTabs();
  if (has('.steps_conclusion_text')) initTextColorReveal();
  if (has('.steps_conclusion_text_mobile')) initTextColorRevealMobile();
  if (has('[data-underline]')) initUnderlineDraw();
  if (has('[data-modal]')) initModal();

  // Refresh wrapper ScrollTriggers (killed during afterLeave, not yet created on first load)
  refreshMenuButtonReveal();
  refreshNavLogoScroll();

  if (hasLenis) lenis.resize();
  if (hasScrollTrigger) ScrollTrigger.refresh();
}

// PRELOADER (Osmo Logo Reveal Loader)

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

CustomEase.create('loader', preloaderCfg.loaderEase);

// PAGE TRANSITIONS

function runPageOnceAnimation(next) {
  // Force scrollbar visible so it doesn't pop in when content is revealed
  document.documentElement.style.overflowY = 'scroll';

  var wrap = document.querySelector('[data-load-wrap]');

  // No loader element or already seen this session — skip
  if (!wrap || sessionStorage.getItem(preloaderCfg.sessionKey)) {
    if (wrap) wrap.style.display = 'none';
    resetPage(next);
    var tw = document.querySelector("[data-transition-wrap]");
    if (tw) tw.style.display = "none";
    return Promise.resolve();
  }

  // Reduced motion — hide immediately
  if (reducedMotion) {
    wrap.style.display = 'none';
    sessionStorage.setItem(preloaderCfg.sessionKey, '1');
    resetPage(next);
    var tw2 = document.querySelector("[data-transition-wrap]");
    if (tw2) tw2.style.display = "none";
    return Promise.resolve();
  }

  // --- Loader sequence ---
  // Wrap is already visible (display:flex in Webflow CSS).
  // Temporarily restore lag smoothing so Lenis's lagSmoothing(0)
  // doesn't dump page-load lag into our timeline as one frame.
  gsap.ticker.lagSmoothing(500, 33);

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
  .to(progressBar, { scaleX: 1 }, '+=0.2')
  .to(logo, { clipPath: 'inset(0% 0% 0% 0%)' }, '<')
  .to(progressBar, {
    scaleX: 0, transformOrigin: 'right center',
    duration: preloaderCfg.fadeOutDuration
  }, '+=0.5')
  .add('hideContent', '<')
  .to(container, { autoAlpha: 0, duration: 0.3 }, 'hideContent+=0.25')
  .to(bg, { yPercent: -101, duration: preloaderCfg.bgRevealDuration }, 'hideContent')
  .set(wrap, { display: 'none' });

  // FOUC prevention — reveal reset targets at time 0
  if (resetTargets.length) {
    loadTl.set(resetTargets, { autoAlpha: 1 }, 0);
  }

  // Pre-hide menu button behind overlay (ScrollTrigger isn't set up until after preloader)
  var menuBtn = document.querySelector('.desktop_menu-button');
  if (menuBtn) loadTl.set(menuBtn, { yPercent: 110 }, 0);

  // Hero entrance — runs inside the preloader timeline to avoid timing gaps.
  // CSS hides load headings: [data-split-trigger="load"] { opacity: 0; }
  var hero = next.querySelector('.section_hero');
  var loadHeadings = Array.from(next.querySelectorAll('[data-split-trigger="load"]'));
  if (hero && shouldAnimateHeroLoad()) {
    loadTl.set(hero, { padding: '0rem' }, 0);
    loadTl.to(hero, { padding: '1.25rem', duration: 0.6, ease: 'power2.out' }, 'hideContent+=0.5');
    loadTl.to(hero, { padding: '.75rem', duration: 0.4, ease: 'power2.inOut' });
    heroLoadFired = true;
  }
  if (loadHeadings.length) {
    // Wait for fonts before splitting — wrong font metrics cause narrow line wrappers.
    // On normal connections fonts are loaded well before this point in the timeline.
    // On slow connections the text stays hidden until fonts arrive, then animates in.
    loadTl.call(function() {
      function splitAndReveal() {
        loadHeadings.forEach(function(heading) {
          var splitType = heading.dataset.splitReveal || 'words';
          var slow = heading.hasAttribute('data-split-slow');
          var cfg = splitRevealConfig[splitType] || splitRevealConfig.words;
          var typesToSplit = splitType === 'lines' ? 'lines' :
            splitType === 'words' ? 'lines, words' : 'lines, words, chars';

          SplitText.create(heading, {
            type: typesToSplit, mask: 'lines',
            linesClass: 'line', wordsClass: 'word', charsClass: 'letter',
            onSplit: function(instance) {
              var targets = instance[splitType];
              gsap.set(heading, { autoAlpha: 1 });
              gsap.from(targets, {
                yPercent: 110,
                duration: slow ? cfg.duration * 2 : cfg.duration,
                stagger: slow ? cfg.stagger * 2 : cfg.stagger,
                ease: 'expo.out'
              });
            }
          });
        });
      }
      if (document.fonts.status === 'loaded') {
        splitAndReveal();
      } else {
        document.fonts.ready.then(splitAndReveal);
      }
    }, null, 'hideContent+=0.5');
    loadRevealFired = true;
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

  return new Promise(function(resolve) {
    loadTl.call(function() {
      sessionStorage.setItem(preloaderCfg.sessionKey, '1');
      gsap.ticker.lagSmoothing(0);
      resetPage(next);
      // Hide transition wrap after preloader so iOS Safari doesn't sample its yellow stroke
      var tw = document.querySelector("[data-transition-wrap]");
      if (tw) tw.style.display = "none";
      resolve();
    });
  });
}

function runPageLeaveAnimation(current, next) {
  // Force scrollbar to stay visible during transition so layout doesn't shift
  document.documentElement.style.overflowY = 'scroll';

  var transitionWrap = document.querySelector("[data-transition-wrap]");
  transitionWrap.style.display = "block";
  var transitionSVGPath = transitionWrap.querySelectorAll("svg path");

  var tl = gsap.timeline({
    onComplete: function() { current.remove(); }
  });

  if (reducedMotion) {
    return tl.set(current, { autoAlpha: 0 });
  }

  tl.set(next, { autoAlpha: 0 }, 0);

  tl.set(transitionSVGPath, {
    strokeWidth: "5%",
    drawSVG: "0% 0%"
  });

  tl.to(transitionSVGPath, {
    duration: 1,
    drawSVG: "0% 85%",
    ease: "Power1.easeInOut"
  });

  tl.to(transitionSVGPath, {
    strokeWidth: "30%",
    duration: 0.75,
    ease: "Power1.easeInOut"
  }, "< 0.25");

  return tl;
}

function runPageEnterAnimation(next) {
  var transitionWrap = document.querySelector("[data-transition-wrap]");
  var transitionSVGPath = transitionWrap.querySelectorAll("svg path");

  var tl = gsap.timeline();

  if (reducedMotion) {
    tl.set(next, { autoAlpha: 1 });
    tl.add("pageReady");
    tl.call(resetPage, [next], "pageReady");
    return new Promise(function(resolve) { tl.call(resolve, null, "pageReady"); });
  }

  tl.add("startEnter", 1);

  tl.set(next, { autoAlpha: 1 }, "startEnter");

  tl.set(transitionSVGPath, { drawSVG: "0% 100%" });

  tl.to(transitionSVGPath, {
    duration: 1.25,
    drawSVG: "100% 100%",
    strokeWidth: "5%",
    ease: "Power1.easeInOut"
  }, "startEnter");

  tl.add("pageReady");
  tl.call(resetPage, [next], "pageReady");
  // Hide transition wrap so iOS Safari stops sampling its yellow SVG stroke
  tl.call(function() {
    document.querySelector("[data-transition-wrap]").style.display = "none";
  }, null, "pageReady");

  return new Promise(function(resolve) {
    tl.call(resolve, null, "pageReady");
  });
}

// BARBA HOOKS + INIT

barba.hooks.beforeEnter(function(data) {
  var footer = document.querySelector('footer');
  if (footer) gsap.set(footer, { autoAlpha: 0 });
  gsap.set(data.next.container, { position: "fixed", top: 0, left: 0, right: 0 });
  if (lenis && typeof lenis.stop === "function") lenis.stop();
  initBeforeEnterFunctions(data.next.container);
  applyThemeFrom(data.next.container);
  // On re-entry, make load headings visible before the transition reveals the page
  if (loadRevealFired) {
    data.next.container.querySelectorAll('[data-split-trigger="load"]').forEach(function(el) {
      gsap.set(el, { autoAlpha: 1 });
    });
  }
});

barba.hooks.afterLeave(function() {
  if (hasScrollTrigger) {
    ScrollTrigger.getAll().forEach(function(t) { t.kill(); });
  }
});

barba.hooks.enter(function(data) {
  initBarbaNavUpdate(data);
});

barba.hooks.afterEnter(function(data) {
  if (isFirstLoad) {
    isFirstLoad = false;
    return; // once() handles first-load init
  }
  initAfterEnterFunctions(data.next.container);
  if (hasLenis) { lenis.resize(); lenis.start(); }
  if (hasScrollTrigger) ScrollTrigger.refresh();
  if (window.Webflow) {
    var parser = new DOMParser();
    var dom = parser.parseFromString(data.next.html, 'text/html');
    var wfPageId = dom.querySelector('html').getAttribute('data-wf-page');
    if (wfPageId) document.documentElement.setAttribute('data-wf-page', wfPageId);
    Webflow.destroy();
    Webflow.ready();
    Webflow.require('ix2').init();
    document.dispatchEvent(new Event('readystatechange'));
  }
  // Hero end-state must be set after IX2 reinit (which can override inline styles)
  if (heroLoadFired && shouldAnimateHeroLoad()) {
    var hero = data.next.container.querySelector('.section_hero');
    if (hero) hero.style.padding = '0.75rem';
  }
});

if (typeof barbaPrefetch !== 'undefined') barba.use(barbaPrefetch);

// Safety refresh after all resources (images, CSS) finish loading.
// Double-rAF ensures the footer-loaded CSS bundle is painted before re-measuring.
window.addEventListener('load', function() {
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      if (hasScrollTrigger) ScrollTrigger.refresh();
      if (hasLenis && lenis) lenis.resize();
    });
  });
});

barba.init({
  debug: true,
  timeout: 7000,
  preventRunning: true,
  transitions: [{
    name: "default",
    sync: true,
    async once(data) {
      initOnceFunctions();
      await runPageOnceAnimation(data.next.container);
      await document.fonts.ready;
      initAfterEnterFunctions(data.next.container);
      if (hasScrollTrigger) ScrollTrigger.refresh();
    },
    async leave(data) {
      return runPageLeaveAnimation(data.current.container, data.next.container);
    },
    async enter(data) {
      return runPageEnterAnimation(data.next.container);
    }
  }]
});

// HELPERS

var themeConfig = {
  light: { nav: "dark", transition: "light" },
  dark: { nav: "light", transition: "dark" }
};

function applyThemeFrom(container) {
  var pageTheme = (container && container.dataset && container.dataset.pageTheme) || "light";
  var cfg = themeConfig[pageTheme] || themeConfig.light;
  document.body.dataset.pageTheme = pageTheme;
  var transitionEl = document.querySelector('[data-theme-transition]');
  if (transitionEl) transitionEl.dataset.themeTransition = cfg.transition;
  var nav = document.querySelector('[data-theme-nav]');
  if (nav) nav.dataset.themeNav = cfg.nav;
}

function initLenis() {
  if (lenis) return;
  if (!hasLenis) return;
  lenis = new Lenis({ lerp: 0.165, wheelMultiplier: 1.25 });
  if (hasScrollTrigger) lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function(time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);
}

function resetPage(container) {
  window.scrollTo(0, 0);
  document.documentElement.style.overflowY = '';
  gsap.set(container, { clearProps: "position,top,left,right" });
  var footer = document.querySelector('footer');
  if (footer) gsap.set(footer, { autoAlpha: 1 });
  if (hasLenis) { lenis.resize(); lenis.start(); }
}

function initBarbaNavUpdate(data) {
  var tpl = document.createElement('template');
  tpl.innerHTML = data.next.html.trim();
  var nextNodes = tpl.content.querySelectorAll('[data-barba-update]');
  var currentNodes = document.querySelectorAll('nav [data-barba-update]');
  currentNodes.forEach(function(curr, index) {
    var next = nextNodes[index];
    if (!next) return;
    var newStatus = next.getAttribute('aria-current');
    if (newStatus !== null) curr.setAttribute('aria-current', newStatus);
    else curr.removeAttribute('aria-current');
    curr.setAttribute('class', next.getAttribute('class') || '');
  });
}

function debounceOnWidthChange(fn, ms) {
  var last = innerWidth, timer;
  return function() {
    var args = arguments, ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function() {
      if (innerWidth !== last) { last = innerWidth; fn.apply(ctx, args); }
    }, ms);
  };
}

// WRAPPER: MENU BUTTON (reveal + hover + click)

function initMenuButton() {
  var button = document.querySelector('.desktop_menu-button');
  var navComponent = document.querySelector('.nav_component');
  var textEl = document.querySelector('.desktop_menu-button_text');
  var navMenu = document.querySelector('.nav_menu');
  if (!button || !textEl) return;

  menuButton_el = button;
  menuButton_navComponent = navComponent;
  // ScrollTrigger created by refreshMenuButtonReveal() in initAfterEnterFunctions

  // Hover + Click (once only — restructures DOM)
  var height = textEl.offsetHeight;
  var width = textEl.offsetWidth;
  textEl.style.height = height + 'px';
  textEl.style.width = width + 'px';
  textEl.style.minWidth = '0';
  textEl.style.overflow = 'hidden';

  var originalHTML = textEl.innerHTML;
  var roller = document.createElement('div');
  roller.className = 'menu-text_roller';
  var original = document.createElement('div');
  original.className = 'menu-text_item';
  original.innerHTML = originalHTML;
  var clone = document.createElement('div');
  clone.className = 'menu-text_item';
  clone.innerHTML = originalHTML;
  roller.appendChild(original);
  roller.appendChild(clone);
  textEl.innerHTML = '';
  textEl.appendChild(roller);

  var hoverTl = gsap.timeline({ paused: true });
  hoverTl.to(roller, { yPercent: -50, duration: 0.25, ease: 'power2.out' });

  var isCollapsed = false;
  button.addEventListener('mouseenter', function() { if (!isCollapsed) hoverTl.play(); });
  button.addEventListener('mouseleave', function() { if (!isCollapsed) hoverTl.reverse(); });

  var clickTl = gsap.timeline({ paused: true });
  clickTl.to(roller, { yPercent: -100, duration: 0.2, ease: 'power2.in' });
  clickTl.to(textEl, {
    width: 0, marginLeft: 0, marginRight: 0, paddingLeft: 0, paddingRight: 0,
    duration: 0.3, ease: 'power2.inOut'
  }, '<').to(button, { gap: 0, duration: 0.3, ease: 'power2.inOut' }, '<');
  if (navMenu) clickTl.to(navMenu, { x: '-50rem', duration: 0.5, ease: 'power2.out' });

  function openMenu() {
    if (isCollapsed) return;
    hoverTl.pause().progress(0);
    clickTl.play();
    if (navMenu) navMenu.style.pointerEvents = 'auto';
    isCollapsed = true;
  }
  function closeMenu() {
    if (!isCollapsed) return;
    clickTl.reverse();
    if (navMenu) navMenu.style.pointerEvents = 'none';
    isCollapsed = false;
  }

  button.addEventListener('click', function() { if (isCollapsed) closeMenu(); else openMenu(); });
  var closeButton = document.querySelector('.close-button');
  if (closeButton) closeButton.addEventListener('click', closeMenu);
  if (navMenu) { navMenu.querySelectorAll('a').forEach(function(link) { link.addEventListener('click', closeMenu); }); }
  document.addEventListener('click', function(e) {
    if (!isCollapsed) return;
    if (navMenu && navMenu.contains(e.target)) return;
    if (button.contains(e.target)) return;
    closeMenu();
  });
}

function createMenuButtonRevealST() {
  if (!menuButton_el) return;
  var revealTween = gsap.fromTo(menuButton_el,
    { yPercent: 110 },
    { yPercent: 0, duration: 0.6, ease: 'expo.out', paused: true }
  );
  ScrollTrigger.create({
    trigger: document.body,
    start: function() { return Math.round(0.9 * window.innerHeight) + ' top'; },
    onEnter: function() {
      revealTween.timeScale(1).play();
      if (menuButton_navComponent) menuButton_navComponent.style.pointerEvents = 'auto';
      menuButton_el.style.pointerEvents = 'auto';
    },
    onLeaveBack: function() {
      revealTween.timeScale(2).reverse();
      if (menuButton_navComponent) menuButton_navComponent.style.pointerEvents = 'none';
      menuButton_el.style.pointerEvents = 'none';
    }
  });
}

function refreshMenuButtonReveal() { createMenuButtonRevealST(); }

// WRAPPER: NAV LINK SKEW

function initNavLinkSkew() {
  document.querySelectorAll('.menu-linkblock').forEach(function(link) {
    link.addEventListener('mouseenter', function() {
      gsap.to(link, { skewX: -10, duration: 0.3, ease: 'power2.out', overwrite: true });
    });
    link.addEventListener('mouseleave', function() {
      gsap.to(link, { skewX: 0, duration: 0.2, ease: 'power2.out', overwrite: true });
    });
  });
}

// WRAPPER: NAV LOGO SCROLL

function initNavLogoScroll() {
  navLogo_svg = document.querySelector(".nav_logo svg");
  if (!navLogo_svg) return;
  navLogo_svg.style.overflow = "visible";
  navLogo_paths = Array.from(navLogo_svg.querySelectorAll("path"));
  navLogo_paths.sort(function(a, b) {
    var aBox = a.getBBox(); var bBox = b.getBBox();
    return aBox.x + aBox.width / 2 - (bBox.x + bBox.width / 2);
  });
  // ScrollTrigger created by refreshNavLogoScroll() in initAfterEnterFunctions
}

function createNavLogoScrollST() {
  if (!navLogo_paths || !navLogo_paths.length) return;
  var hero = nextPage.querySelector('.section_hero');
  if (!hero) return;
  var tl = gsap.timeline({ paused: true });
  tl.to(navLogo_paths, { x: -800, rotation: -20, opacity: 0, stagger: 0.025, duration: 0.36, ease: "power3.in" });
  ScrollTrigger.create({
    trigger: hero,
    start: "bottom 5%",
    onEnter: function() { tl.play(tl.totalDuration()); },
    onLeaveBack: function() { tl.reverse(); }
  });
}

function refreshNavLogoScroll() { createNavLogoScrollST(); }

// CONTAINER: HERO LOAD

function initHeroLoad() {
  var hero = nextPage.querySelector('.section_hero');
  if (!hero) return;
  if (!shouldAnimateHeroLoad()) return;
  if (heroLoadFired) {
    hero.style.padding = '0.75rem';
    return;
  }
  heroLoadFired = true;
  var tl = gsap.timeline();
  tl.set(hero, { padding: '0rem' })
    .to(hero, { padding: '1.25rem', duration: 0.6, ease: 'power2.out' })
    .to(hero, { padding: '.75rem', duration: 0.4, ease: 'power2.inOut' });
}

// CONTAINER: HERO SCROLL

function initHeroScroll() {
  if (window.innerWidth < 768) return;
  var hero = nextPage.querySelector('.section_hero');
  var inner = nextPage.querySelector('.hero_inner');
  if (!hero || !inner) return;
  gsap.set(inner, { outline: '0rem solid #000000' });
  gsap.to(inner, {
    scale: 0.7,
    rotation: 15,
    opacity: 0.85,
    outline: '1rem solid #000000',
    ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
  });
}

// CONTAINER: TEXT REVEAL

var splitRevealConfig = {
  lines: { duration: 0.8, stagger: 0.08 },
  words: { duration: 0.6, stagger: 0.06 },
  chars: { duration: 0.4, stagger: 0.01 }
};
var triggerRevealConfig = { early: 'clamp(top 80%)', late: 'clamp(top 60%)' };

function preserveSpans(heading) {
  var spans = heading.querySelectorAll('span[data-hangtag]');
  if (!spans.length) return [];
  var preserved = [];
  spans.forEach(function(span) {
    preserved.push({
      text: span.textContent.trim(), className: span.className,
      hangtag: span.getAttribute('data-hangtag'), style: span.getAttribute('style') || ''
    });
  });
  return preserved;
}

function restoreSpans(heading, preserved) {
  if (!preserved.length) return;
  preserved.forEach(function(item) {
    var walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    var node;
    while (node = walker.nextNode()) {
      var idx = node.textContent.indexOf(item.text);
      if (idx === -1) continue;
      var before = node.textContent.substring(0, idx);
      var after = node.textContent.substring(idx + item.text.length);
      var span = document.createElement('span');
      if (item.className) span.className = item.className;
      span.setAttribute('data-hangtag', item.hangtag);
      if (item.style) span.setAttribute('style', item.style);
      span.textContent = item.text;
      var parent = node.parentNode;
      if (after) parent.insertBefore(document.createTextNode(after), node.nextSibling);
      parent.insertBefore(span, node.nextSibling);
      if (before) node.textContent = before;
      else parent.removeChild(node);
      break;
    }
  });
}

function doTextReveal() {
  nextPage.querySelectorAll('[data-split="early"], [data-split="late"]').forEach(function(heading) {
    var preserved = preserveSpans(heading);
    gsap.set(heading, { visibility: 'visible' });
    var speed = heading.dataset.split;
    var type = heading.dataset.splitReveal || 'words';
    var slow = heading.hasAttribute('data-split-slow');
    var trigger = heading.dataset.splitTrigger || 'scroll';
    // Re-entry: load headings don't need splitting — just show them
    if (trigger === 'load' && loadRevealFired) {
      gsap.set(heading, { autoAlpha: 1 });
      return;
    }
    var typesToSplit = type === 'lines' ? ['lines'] : type === 'words' ? ['lines', 'words'] : ['lines', 'words', 'chars'];

    SplitText.create(heading, {
      type: typesToSplit.join(', '), mask: 'lines', autoSplit: true,
      linesClass: 'line', wordsClass: 'word', charsClass: 'letter',
      onSplit: function(instance) {
        restoreSpans(heading, preserved);
        gsap.set(heading, { autoAlpha: 1 });
        var targets = instance[type];
        var cfg = splitRevealConfig[type];
        var animProps = {
          yPercent: 110,
          duration: slow ? cfg.duration * 2 : cfg.duration,
          stagger: slow ? cfg.stagger * 2 : cfg.stagger,
          ease: 'expo.out'
        };
        if (trigger === 'load') {
          if (loadRevealFired) { gsap.set(targets, { yPercent: 0 }); return; }
          loadRevealFired = true;
          return gsap.from(targets, animProps);
        }
        animProps.scrollTrigger = { trigger: heading, start: triggerRevealConfig[speed], once: true };
        return gsap.from(targets, animProps);
      }
    });
  });
}

function initTextReveal() {
  if (fontsReady) { doTextReveal(); return; }
  var done = false;
  function ready() { if (done) return; done = true; fontsReady = true; doTextReveal(); }
  document.fonts.ready.then(ready);
  setTimeout(ready, 3000);
}

// CONTAINER: HANGTAG HOVER

function initHangtagHover() {
  var FOLLOW = 0.1, OFFSET_Y_REM = 0.5;
  var REST_ANGLE = 10, ANGLE_FRICTION = 0.7, ANGLE_VEL_INFLUENCE = 0.03;
  var ANGLE_DRIFT_BACK = 0.06, ANGLE_MIN = -5, ANGLE_MAX = 20;
  var tagStates = {};
  var currentMouseX = 0, currentMouseY = 0;
  var activeTriggerId = null, activeTriggerEl = null, isExiting = false;
  var signal = containerAbort ? containerAbort.signal : undefined;

  function getTagState(id) {
    if (!tagStates[id]) tagStates[id] = { pinX: 0, pinY: 0, velX: 0, angle: REST_ANGLE, angleVel: 0, active: false, raf: null };
    return tagStates[id];
  }
  function getOffsetY() { return OFFSET_Y_REM * parseFloat(getComputedStyle(document.documentElement).fontSize); }

  function setupTag(tag) {
    document.body.appendChild(tag);
    hangtagCleanupEls.push(tag);
    tag.style.cssText = 'visibility:hidden;opacity:0;position:fixed;left:0;top:0;pointer-events:none;z-index:999;transform-origin:top left;will-change:transform,opacity;';
  }

  function updatePhysics(tag, state) {
    if (!state.active) return;
    var targetX = currentMouseX, targetY = currentMouseY + getOffsetY();
    var prevX = state.pinX;
    state.pinX += (targetX - state.pinX) * FOLLOW;
    state.pinY += (targetY - state.pinY) * FOLLOW;
    state.velX = state.pinX - prevX;
    state.angleVel += state.velX * ANGLE_VEL_INFLUENCE;
    state.angleVel *= ANGLE_FRICTION;
    state.angle += state.angleVel;
    state.angle += (REST_ANGLE - state.angle) * ANGLE_DRIFT_BACK;
    state.angle = Math.max(ANGLE_MIN, Math.min(ANGLE_MAX, state.angle));
    tag.style.transform = "translate(" + state.pinX + "px, " + state.pinY + "px) rotate(" + state.angle + "deg)";
    state.raf = requestAnimationFrame(function() { updatePhysics(tag, state); });
  }

  function showTag(id) {
    var tag = document.querySelector('.problem_study-hangtag[data-hangtag="' + id + '"]');
    if (!tag) return;
    var state = getTagState(id);
    if (state.active || isExiting) return;
    state.pinX = currentMouseX; state.pinY = currentMouseY + getOffsetY();
    state.velX = 0; state.angle = REST_ANGLE; state.angleVel = 0; state.active = true;
    tag.style.transform = "translate(" + state.pinX + "px, " + state.pinY + "px) rotate(" + REST_ANGLE + "deg)";
    gsap.killTweensOf(tag);
    tag.style.visibility = "visible"; tag.style.opacity = "1";
    gsap.fromTo(tag, { scale: 0 }, { scale: 1, duration: 0.3, ease: "power2.out" });
    state.raf = requestAnimationFrame(function() { updatePhysics(tag, state); });
  }

  function hideTag(id) {
    var tag = document.querySelector('.problem_study-hangtag[data-hangtag="' + id + '"]');
    if (!tag) return;
    var state = getTagState(id);
    if (!state.active) return;
    state.active = false; isExiting = true;
    if (state.raf) cancelAnimationFrame(state.raf);
    var frozenTransform = "translate(" + state.pinX + "px, " + state.pinY + "px) rotate(" + state.angle + "deg)";
    gsap.killTweensOf(tag);
    gsap.fromTo(tag, { scale: 1, transform: frozenTransform }, {
      scale: 0, duration: 0.25, ease: "power2.in",
      onUpdate: function() {
        tag.style.transform = frozenTransform + " scale(" + gsap.getProperty(tag, "scale") + ")";
      },
      onComplete: function() { tag.style.visibility = "hidden"; tag.style.opacity = "0"; isExiting = false; }
    });
  }

  function findTrigger(el) {
    while (el) { if (el.classList && el.classList.contains("problem_study-trigger")) return el; el = el.parentElement; }
    return null;
  }
  function isCursorOverElement(el) {
    var rect = el.getBoundingClientRect();
    return currentMouseX >= rect.left && currentMouseX <= rect.right && currentMouseY >= rect.top && currentMouseY <= rect.bottom;
  }

  nextPage.querySelectorAll(".problem_study-hangtag").forEach(setupTag);

  window.addEventListener("mousemove", function(e) { currentMouseX = e.clientX; currentMouseY = e.clientY; }, { signal: signal });
  document.addEventListener("mouseover", function(e) {
    var trigger = findTrigger(e.target); if (!trigger) return;
    var id = trigger.getAttribute("data-hangtag"); if (!id || id === activeTriggerId) return;
    if (activeTriggerId) hideTag(activeTriggerId);
    activeTriggerId = id; activeTriggerEl = trigger; showTag(id);
  }, { signal: signal });
  document.addEventListener("mouseout", function(e) {
    var trigger = findTrigger(e.target); if (!trigger) return;
    var related = e.relatedTarget; if (related && trigger.contains(related)) return;
    var id = trigger.getAttribute("data-hangtag");
    if (id && id === activeTriggerId) { hideTag(id); activeTriggerId = null; activeTriggerEl = null; }
  }, { signal: signal });
  window.addEventListener("scroll", function() {
    if (!activeTriggerId || !activeTriggerEl) return;
    if (!isCursorOverElement(activeTriggerEl)) { hideTag(activeTriggerId); activeTriggerId = null; activeTriggerEl = null; }
  }, { passive: true, signal: signal });
}

// CONTAINER: MOMENTUM HOVER

function initMomentumHover() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  var xyMul = 30, rotMul = 20, resistance = 200;
  var clampXY = gsap.utils.clamp(-1080, 1080), clampRot = gsap.utils.clamp(-60, 60);

  nextPage.querySelectorAll('[data-momentum-hover-init]').forEach(function(root) {
    var prevX = 0, prevY = 0, velX = 0, velY = 0, rafId = null;
    root.addEventListener('mousemove', function(e) {
      if (rafId) return;
      rafId = requestAnimationFrame(function() {
        velX = e.clientX - prevX; velY = e.clientY - prevY;
        prevX = e.clientX; prevY = e.clientY; rafId = null;
      });
    });
    root.querySelectorAll('[data-momentum-hover-element]').forEach(function(el) {
      el.addEventListener('mouseenter', function(e) {
        var target = el.querySelector('[data-momentum-hover-target]'); if (!target) return;
        var rect = target.getBoundingClientRect();
        var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        var ox = e.clientX - cx, oy = e.clientY - cy;
        var torque = ox * velY - oy * velX;
        var lever = Math.hypot(ox, oy) || 1;
        gsap.to(target, { inertia: {
          x: { velocity: clampXY(velX * xyMul), end: 0 },
          y: { velocity: clampXY(velY * xyMul), end: 0 },
          rotation: { velocity: clampRot((torque / lever) * rotMul), end: 0 },
          resistance: resistance
        }});
      });
    });
  });
}

// CONTAINER: SPOTLIGHT

var spotlightCfg = {
  damping: 0.04, easeDuration: 0.5, fadeInDuration: 0.6, scrollStart: '10% top',
  beamOriginX: 100, beamOriginY: 37,
  ellipseRX: 28, ellipseRY: 40, ellipseEdge: 0.85, originWidth: 37,
  beamColorR: 255, beamColorG: 248, beamColorB: 230,
  outerSoftEdge: 0.025, outerIntensity: 0.5, outerBlur: 4,
  innerWidthRatio: 0.5, innerIntensity: 0.55, innerSoftEdge: 0.374, innerBlur: 10,
  maskStart: 0, maskEnd: 21
};

function computeBeamTangents(srcX, srcY, spotX, spotY) {
  var c = spotlightCfg, vw = window.innerWidth, vh = window.innerHeight;
  var srcPxX = srcX/100*vw, srcPxY = srcY/100*vh, ctrPxX = spotX/100*vw, ctrPxY = spotY/100*vh;
  var aPx = c.ellipseRX*c.ellipseEdge/100*vw, bPx = c.ellipseRY*c.ellipseEdge/100*vh;
  var nsx = (srcPxX-ctrPxX)/aPx, nsy = (srcPxY-ctrPxY)/bPx;
  var nd = Math.sqrt(nsx*nsx+nsy*nsy);
  if (nd <= 1.01) return null;
  var na = Math.atan2(nsy, nsx), nb = Math.acos(1/nd);
  var ta1 = na+nb, ta2 = na-nb;
  var t1 = {x:ctrPxX+aPx*Math.cos(ta1),y:ctrPxY+bPx*Math.sin(ta1)};
  var t2 = {x:ctrPxX+aPx*Math.cos(ta2),y:ctrPxY+bPx*Math.sin(ta2)};
  var a1 = Math.atan2(t1.y-srcPxY,t1.x-srcPxX), a2 = Math.atan2(t2.y-srcPxY,t2.x-srcPxX);
  var ca = Math.atan2(ctrPxY-srcPxY,ctrPxX-srcPxX);
  var css1 = a1*180/Math.PI+90, css2 = a2*180/Math.PI+90, cssCA = ca*180/Math.PI+90;
  var o1 = css1-cssCA, o2 = css2-cssCA;
  while(o1>180)o1-=360; while(o1<-180)o1+=360;
  while(o2>180)o2-=360; while(o2<-180)o2+=360;
  return {negOffset:Math.min(o1,o2),posOffset:Math.max(o1,o2),cssCenterAngle:cssCA,mathCenterAngleDeg:ca*180/Math.PI};
}

function updateBeam(bOut, bIn, spotX, spotY, moX, moY) {
  var c = spotlightCfg;
  var srcX = c.beamOriginX+moX, srcY = c.beamOriginY+moY;
  var dx = spotX-srcX, dy = spotY-srcY, dl = Math.sqrt(dx*dx+dy*dy);
  if (dl < 0.1) return;
  var nx = dx/dl, ny = dy/dl;
  var vsx = srcX-nx*c.originWidth, vsy = srcY-ny*c.originWidth;
  var r = computeBeamTangents(vsx, vsy, spotX, spotY); if (!r) return;
  var span = r.posOffset-r.negOffset;
  var cr = c.beamColorR, cg = c.beamColorG, cb = c.beamColorB;
  var mAng = 90+r.mathCenterAngleDeg;
  var mask = 'linear-gradient('+mAng+'deg,white 0%,white '+c.maskStart+'%,transparent '+c.maskEnd+'%)';

  var ose = span*c.outerSoftEdge*0.5, op = c.outerIntensity, oe = op*0.7;
  var ofa = r.cssCenterAngle+r.negOffset-ose;
  bOut.style.background = 'conic-gradient(from '+ofa+'deg at '+vsx+'% '+vsy+'%,transparent 0deg,rgba('+cr+','+cg+','+cb+','+oe+') '+ose+'deg,rgba('+cr+','+cg+','+cb+','+op+') '+(ose+(-r.negOffset))+'deg,rgba('+cr+','+cg+','+cb+','+oe+') '+(ose+span)+'deg,transparent '+(ose+span+ose)+'deg,transparent 360deg)';
  bOut.style.maskImage = mask; bOut.style.webkitMaskImage = mask;
  bOut.style.filter = 'blur('+c.outerBlur+'px)'; bOut.style.opacity = 1;

  var ino = r.negOffset*c.innerWidthRatio, ipo = r.posOffset*c.innerWidthRatio;
  var iSpan = ipo-ino, ise = iSpan*c.innerSoftEdge*0.5, ip = c.innerIntensity, ie = ip*0.7;
  var ifa = r.cssCenterAngle+ino-ise;
  bIn.style.background = 'conic-gradient(from '+ifa+'deg at '+vsx+'% '+vsy+'%,transparent 0deg,rgba('+cr+','+cg+','+cb+','+ie+') '+ise+'deg,rgba('+cr+','+cg+','+cb+','+ip+') '+(ise+(-ino))+'deg,rgba('+cr+','+cg+','+cb+','+ie+') '+(ise+iSpan)+'deg,transparent '+(ise+iSpan+ise)+'deg,transparent 360deg)';
  bIn.style.maskImage = mask; bIn.style.webkitMaskImage = mask;
  bIn.style.filter = 'blur('+c.innerBlur+'px)'; bIn.style.opacity = 1;
}

function initSpotlight() {
  if (window.innerWidth <= 767) return;
  var isTablet = window.innerWidth <= 991 && window.innerWidth >= 768;
  spotlightCfg.ellipseRY = isTablet ? 25 : 40;
  nextPage.querySelectorAll('[data-spotlight]').forEach(function(section) {
    var overlay = section.querySelector('.spotlight-overlay'); if (!overlay) return;
    var target = section.querySelector('[data-spotlight-target]');
    var hasTarget = !!target;
    var beamOuter = document.createElement('div'); beamOuter.classList.add('spotlight-beam'); overlay.appendChild(beamOuter);
    var beamInner = document.createElement('div'); beamInner.classList.add('spotlight-beam'); overlay.appendChild(beamInner);
    var baseX = 65, baseY = 30, isHov = false, lmX = 0, lmY = 0, frX = 0, frY = 0;
    var sp = {x:baseX,y:baseY,ox:0,oy:0};
    overlay.style.setProperty('--spotlight-x',baseX+'%'); overlay.style.setProperty('--spotlight-y',baseY+'%');

    function animTo(tx,ty,ox,oy) {
      gsap.to(sp,{x:tx,y:ty,ox:ox,oy:oy,duration:spotlightCfg.easeDuration,ease:'power2.out',overwrite:'auto',
        onUpdate:function(){overlay.style.setProperty('--spotlight-x',sp.x+'%');overlay.style.setProperty('--spotlight-y',sp.y+'%');updateBeam(beamOuter,beamInner,sp.x,sp.y,sp.ox,sp.oy);}});
    }
    function applyPos() {
      var ox = isHov ? (lmX-50)*spotlightCfg.damping : frX;
      var oy = isHov ? (lmY-50)*spotlightCfg.damping : frY;
      animTo(baseX+ox,baseY+oy,ox,oy);
    }
    function updBase() {
      if (!hasTarget) return;
      var r = target.getBoundingClientRect();
      var oRect = overlay.getBoundingClientRect();
      baseX = ((r.left+r.width/2-oRect.left)/oRect.width)*100;
      baseY = ((r.top+r.height/2-oRect.top)/oRect.height)*100;
    }
    updBase(); applyPos();

    if (!isTablet) {
      section.addEventListener('mousemove',function(e){
        isHov=true; lmX=(e.clientX/window.innerWidth)*100; lmY=(e.clientY/window.innerHeight)*100;
        var ox=(lmX-50)*spotlightCfg.damping, oy=(lmY-50)*spotlightCfg.damping;
        animTo(baseX+ox,baseY+oy,ox,oy);
      });
      section.addEventListener('mouseleave',function(){
        frX=(lmX-50)*spotlightCfg.damping; frY=(lmY-50)*spotlightCfg.damping; isHov=false;
      });
    }
    ScrollTrigger.create({trigger:section,start:'top bottom',end:'bottom top',onUpdate:function(){updBase();applyPos();}});

    ScrollTrigger.create({trigger:section,start:spotlightCfg.scrollStart,end:'92% bottom',
      onEnter:function(){gsap.to(overlay,{opacity:1,duration:spotlightCfg.fadeInDuration,ease:'power2.out',overwrite:'auto'});},
      onLeave:function(){gsap.to(overlay,{opacity:0,duration:spotlightCfg.fadeInDuration,ease:'power2.out',overwrite:'auto'});},
      onEnterBack:function(){gsap.to(overlay,{opacity:1,duration:spotlightCfg.fadeInDuration,ease:'power2.out',overwrite:'auto'});},
      onLeaveBack:function(){gsap.to(overlay,{opacity:0,duration:spotlightCfg.fadeInDuration,ease:'power2.out',overwrite:'auto'});}
    });
  });
}

// CONTAINER: DONATION SPOTLIGHT

var donateSpotCfg = { damping: 0.04, easeDuration: 0.5, fadeInDuration: 0.6, baseX: 50, baseY: 50, offsetY: -4 };

function initDonationSpotlight() {
  if (window.innerWidth <= 767) return;
  nextPage.querySelectorAll('[data-spotlight-donate]').forEach(function(section) {
    var overlay = section.querySelector('.spotlight-overlay'); if (!overlay) return;
    var target = section.querySelector('[data-spotlight-target]');
    var baseX = donateSpotCfg.baseX, baseY = donateSpotCfg.baseY;
    var isHov = false, lmX = 0, lmY = 0, frX = 0, frY = 0;
    var sp = {x:baseX,y:baseY};
    overlay.style.setProperty('--spotlight-x',baseX+'%'); overlay.style.setProperty('--spotlight-y',baseY+'%');

    function animTo(tx,ty) {
      gsap.to(sp,{x:tx,y:ty,duration:donateSpotCfg.easeDuration,ease:'power2.out',overwrite:'auto',
        onUpdate:function(){overlay.style.setProperty('--spotlight-x',sp.x+'%');overlay.style.setProperty('--spotlight-y',sp.y+'%');}});
    }
    function updBase() {
      if (!target) return;
      var r = target.getBoundingClientRect();
      baseX = ((r.left+r.width/2)/window.innerWidth)*100;
      baseY = ((r.top+r.height/2)/window.innerHeight)*100 + donateSpotCfg.offsetY;
    }
    function applyPos() {
      var ox = isHov ? (lmX-baseX)*donateSpotCfg.damping : frX;
      var oy = isHov ? (lmY-baseY)*donateSpotCfg.damping : frY;
      animTo(baseX+ox,baseY+oy);
    }
    updBase(); applyPos();

    var isTablet = window.innerWidth <= 991 && window.innerWidth >= 768;
    if (!isTablet) {
      section.addEventListener('mousemove',function(e){
        isHov=true; lmX=(e.clientX/window.innerWidth)*100; lmY=(e.clientY/window.innerHeight)*100;
        var ox=(lmX-baseX)*donateSpotCfg.damping, oy=(lmY-baseY)*donateSpotCfg.damping;
        animTo(baseX+ox,baseY+oy);
      });
      section.addEventListener('mouseleave',function(){
        frX=(lmX-baseX)*donateSpotCfg.damping; frY=(lmY-baseY)*donateSpotCfg.damping; isHov=false;
      });
    }
    ScrollTrigger.create({trigger:section,start:'top bottom',end:'bottom top',onUpdate:function(){updBase();applyPos();}});

    gsap.to(overlay,{opacity:1,duration:donateSpotCfg.fadeInDuration,ease:'power2.out'});
  });
}

// CONTAINER: DONATION HEADER SCROLL

var donateScrollCfg = {
  contentStart: 0.6,         // when content reverse triggers (0–1 of scroll)
  spotlightStart: 0.85,      // when spotlight hole starts closing (0–1 of scroll)
  dissolveStart: 0.5,        // when content dissolves (0–1 of scroll)
  flyDistance: 1.3,
  rotationBase: 80,
  rotationVariance: 32,
  photoEase: 'power4.in',
  verticalBias: 0.6,
  contentRevealDuration: 0.32,
  contentRevealStagger: 0.064,
};

function initDonationHeaderScroll() {
  var section = nextPage.querySelector('[data-spotlight-donate]');
  if (!section) return;

  var container = section.querySelector('[data-spotlight-target]');
  if (!container) return;

  var photos = section.querySelectorAll('.polaroid_momentum-wrapper');
  if (!photos.length) return;

  var containerRect = container.getBoundingClientRect();
  var cx = containerRect.left + containerRect.width / 2;
  var cy = containerRect.top + containerRect.height / 2;
  var flyDist = Math.max(window.innerWidth, window.innerHeight) * donateScrollCfg.flyDistance;

  // Phase 1: Photos fly off (scrub-linked to section scroll)
  var tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
    }
  });

  photos.forEach(function(photo) {
    var rect = photo.getBoundingClientRect();
    var px = rect.left + rect.width / 2;
    var py = rect.top + rect.height / 2;
    var dx = px - cx;
    var dy = py - cy;
    if (dy < 0) dy *= (1 + donateScrollCfg.verticalBias);
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = dx / dist;
    var ny = dy / dist;
    var rot = nx * donateScrollCfg.rotationBase + ny * donateScrollCfg.rotationVariance;

    tl.to(photo, {
      x: '+=' + (nx * flyDist),
      y: '+=' + (ny * flyDist),
      rotation: '+=' + rot,
      duration: 1,
      ease: donateScrollCfg.photoEase,
    }, 0);
  });

  // Phase 2: Content reverse — triggered at contentStart
  var scrollDist = section.offsetHeight - window.innerHeight;
  var triggerOffset = scrollDist * donateScrollCfg.contentStart;

  // Phase 3: Spotlight hole fill (scrub-linked, same timeline)
  var overlay = section.querySelector('.spotlight-overlay');
  if (overlay) {
    var startRX = null, startRY = null;
    var spotHole = { scale: 1 };
    tl.to(spotHole, {
      scale: 0,
      duration: 0.4,
      ease: 'power2.in',
      onUpdate: function() {
        if (startRX === null) {
          startRX = parseFloat(getComputedStyle(overlay).getPropertyValue('--spotlight-rx')) || 20;
          startRY = parseFloat(getComputedStyle(overlay).getPropertyValue('--spotlight-ry')) || 28;
        }
        overlay.style.setProperty('--spotlight-rx', (startRX * spotHole.scale) + '%');
        overlay.style.setProperty('--spotlight-ry', (startRY * spotHole.scale) + '%');
      }
    }, donateScrollCfg.spotlightStart);
  }

  // Phase 2: Content dissolve (scrub-linked)
  var inner = container.querySelector('.container-inner');
  if (inner) {
    tl.to(inner, {
      opacity: 0,
      filter: 'blur(20px)',
      duration: 0.4,
      ease: 'power2.in',
    }, donateScrollCfg.dissolveStart);
  }
}

// CONTAINER: FESTIVAL HOVER / SCROLL ACTIVATE
// ≥768px: existing hover + dynamic shadow ticker.
// ≤767px: scroll-driven activation — no hover listeners, no ticker.
//   A virtual activation line at 45vh toggles .is-active on whichever
//   link block it intersects, plus .is-list-active on the list while
//   any item is in range. Visual state lives in festivals-list-hover.css.

function initFestivalHover() {
  if (window.innerWidth >= 768) {
    initFestivalHoverDesktop();
  } else {
    initFestivalScrollActivateMobile();
  }
}

function initFestivalHoverDesktop() {
  // Heading skew on list hover
  nextPage.querySelectorAll('.festivals_item-link[data-festival]').forEach(function(link) {
    var heading = link.querySelector('.heading-style-h4-56.is-festivals');
    if (!heading) return;

    link.addEventListener('mouseenter', function() {
      gsap.to(heading, { skewX: -10, duration: 0.3, ease: 'power2.out', overwrite: true });
    });

    link.addEventListener('mouseleave', function() {
      gsap.to(heading, { skewX: 0, duration: 0.2, ease: 'power2.out', overwrite: true });
    });
  });

  // Dynamic shadow on polaroid rotation
  var polaroids = nextPage.querySelectorAll('[data-festival]:not(.festivals_item-link)');
  if (polaroids.length) {
    var BASE_X = 3, BASE_Y = 3, BASE_BLUR = 5;
    var SHIFT = 0.15;      // px of shadow shift per degree of rotateY
    var BLUR_EXTRA = 0.1;  // extra blur px per degree of rotation

    function updateShadows() {
      polaroids.forEach(function(p) {
        var rotY = gsap.getProperty(p, 'rotateY') || 0;
        var offsetX = BASE_X - rotY * SHIFT;
        var blur = BASE_BLUR + Math.abs(rotY) * BLUR_EXTRA;
        p.style.boxShadow = offsetX + 'px ' + BASE_Y + 'px ' + blur + 'px 0px rgba(0,0,0,0.35)';
      });
    }

    gsap.ticker.add(updateShadows);
    containerTickerFns.push(updateShadows);
  }
}

function initFestivalScrollActivateMobile() {
  if (!hasScrollTrigger) return;

  var list = nextPage.querySelector('.festivals_list');
  if (!list) return;

  var links = Array.prototype.slice.call(
    nextPage.querySelectorAll('.festivals_item-link[data-festival]')
  );
  if (!links.length) return;

  // Activation line = 45% down from viewport top.
  var LINE = '45%';

  // Track the currently active link/polaroid as state. We only ever activate
  // on enter/enterBack and swap from whatever was previously active — never
  // deactivate on leave. This makes the last-active item persist through
  // micro-gaps between triggers (sub-pixel rounding, Lenis fractional scroll,
  // layout margins) instead of flickering back to base state. List-level
  // onLeave/onLeaveBack handles the real "exit" cleanup.
  var activeLink = null;
  var activePolaroid = null;

  function setActive(link, polaroid) {
    if (activeLink === link) return;
    if (activeLink) activeLink.classList.remove('is-active');
    if (activePolaroid) activePolaroid.classList.remove('is-active');
    activeLink = link;
    activePolaroid = polaroid;
    if (activeLink) activeLink.classList.add('is-active');
    if (activePolaroid) activePolaroid.classList.add('is-active');
  }

  function clearActive() {
    if (activeLink) activeLink.classList.remove('is-active');
    if (activePolaroid) activePolaroid.classList.remove('is-active');
    activeLink = null;
    activePolaroid = null;
  }

  // List-level trigger: toggle .is-list-active AND tear down the per-item
  // active state when the line exits the list entirely.
  ScrollTrigger.create({
    trigger: list,
    start: 'top ' + LINE,
    end: 'bottom ' + LINE,
    onEnter: function() { list.classList.add('is-list-active'); },
    onEnterBack: function() { list.classList.add('is-list-active'); },
    onLeave: function() {
      list.classList.remove('is-list-active');
      clearActive();
    },
    onLeaveBack: function() {
      list.classList.remove('is-list-active');
      clearActive();
    },
  });

  // Properties Webflow mouse interactions write inline that we need to strip
  // to keep polaroids under our CSS's control. Any time one of these shows up
  // in a polaroid's inline style, we immediately remove it.
  var STRIP_PROPS = ['display', 'opacity', 'transform', 'visibility', 'pointer-events'];

  function stripInlineProps(el) {
    for (var i = 0; i < STRIP_PROPS.length; i++) {
      el.style.removeProperty(STRIP_PROPS[i]);
    }
  }

  // Per-item triggers: only activate on enter/enterBack. No leave handlers —
  // last-active persists until another item takes over or the list exits.
  links.forEach(function(link) {
    var name = link.getAttribute('data-festival');
    var polaroid = nextPage.querySelector(
      '[data-festival="' + name + '"]:not(.festivals_item-link)'
    );

    // Strip inline styles at init (first-line defense) AND set up a
    // MutationObserver that re-strips on every attribute change. This
    // overrides any Webflow mouse interaction that keeps trying to write
    // display:none / opacity:0 as the cursor moves over the festival area.
    // Observer is disconnected on container leave (see containerObservers).
    if (polaroid) {
      stripInlineProps(polaroid);
      var observer = new MutationObserver(function(mutations) {
        for (var i = 0; i < mutations.length; i++) {
          if (mutations[i].attributeName === 'style') {
            stripInlineProps(polaroid);
            break;
          }
        }
      });
      observer.observe(polaroid, { attributes: true, attributeFilter: ['style'] });
      containerObservers.push(observer);
    }

    ScrollTrigger.create({
      trigger: link,
      start: 'top ' + LINE,
      end: 'bottom ' + LINE,
      onEnter: function() { setActive(link, polaroid); },
      onEnterBack: function() { setActive(link, polaroid); },
    });
  });
}

// CONTAINER: BACKGROUND SHIFT

function initBackgroundShift() {
  nextPage.querySelectorAll('.bg-shift-overlay').forEach(function(overlay) {
    var section = overlay.parentElement;
    gsap.to(overlay, {
      opacity: 1, duration: 0.8, ease: 'power2.out',
      scrollTrigger: { trigger: section, start: 'top 60%', toggleActions: 'play none none reverse' }
    });
  });
}

// CONTAINER: GRADIENT EMANATE

var _emanateCfg = { stop1End: 0, stop2End: 0, blackStartEnd: 0, start: 'center 16%', end: 'bottom top' };

function initGradientEmanate() {
  if (window.innerWidth < 768) return;
  nextPage.querySelectorAll('.section_solution').forEach(function(section) {
    gsap.to(section, {
      '--stop1': _emanateCfg.stop1End + '%',
      '--stop2': _emanateCfg.stop2End + '%',
      '--black-start': _emanateCfg.blackStartEnd + '%',
      ease: 'none',
      scrollTrigger: { trigger: section, start: _emanateCfg.start, end: _emanateCfg.end, scrub: true }
    });
  });
}

// CONTAINER: FOOTER REVEAL

function initFooterReveal() {
  var section = nextPage.querySelector('.section_register-cta')
    || nextPage.querySelector('.section_home-cta')
    || nextPage.querySelector('.section_donate-cta');
  var footer = document.querySelector('footer');
  if (!section || !footer) return;

  var st = null;

  function shouldPin() {
    return window.innerWidth >= 992 && section.offsetHeight > window.innerHeight;
  }

  function apply() {
    var need = shouldPin();
    if (need && !st) {
      st = ScrollTrigger.create({
        trigger: section, start: 'bottom bottom',
        end: function() { return '+=' + footer.offsetHeight; },
        pin: true, pinSpacing: false
      });
    } else if (!need && st) {
      st.kill();
      st = null;
      ScrollTrigger.refresh();
    }
  }

  apply();

  var resizeTimer;
  function scheduleApply() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(apply, 250);
  }

  var signal = containerAbort ? containerAbort.signal : undefined;
  window.addEventListener('resize', scheduleApply, { signal: signal });

  var ro = new ResizeObserver(scheduleApply);
  ro.observe(section);
  containerObservers.push(ro);
}

// CONTAINER: PARALLAX SECTIONS

var parallaxCfg = {
  out: { y: '18.75rem', start: 'top top', end: 'bottom top' },
  rise: { y: '-18.75rem', start: 'top top', end: 'bottom top' }
};

function initParallaxSections() {
  nextPage.querySelectorAll('[data-parallax="out"]').forEach(function(section) {
    gsap.to(section, {
      y: parallaxCfg.out.y, ease: 'none',
      scrollTrigger: { trigger: section, start: parallaxCfg.out.start, end: parallaxCfg.out.end, scrub: true }
    });
  });
  nextPage.querySelectorAll('[data-parallax="rise"]').forEach(function(section) {
    gsap.to(section, {
      y: parallaxCfg.rise.y, ease: 'none',
      scrollTrigger: { trigger: section, start: parallaxCfg.rise.start, end: parallaxCfg.rise.end, scrub: true }
    });
  });
}

// CONTAINER: POLAROID CAROUSEL

function initPolaroidCarousel() {
  if (window.innerWidth < 768) return; // DIAGNOSTIC: isolating mobile scroll jank
  var section = nextPage.querySelector('[data-carousel="polaroid"]');
  if (!section) return;
  var polaroids = gsap.utils.toArray(section.querySelectorAll('.polaroid.vertical.is-carousel'));
  if (polaroids.length < 1) return;

  var TOTAL = 7, TWO_PI = Math.PI * 2, BACK_ANGLE = -Math.PI / 2;
  var cc = {
    radiusX: 38, radiusY: 16, orbitOffsetY: 2,
    scaleMin: 0.8, scaleMax: 1.1, opacityMin: 1, opacityMax: 1.0,
    brightnessMin: 0.75, brightnessMax: 1.0, maxLean: 12,
    scrollMultiplier: 2.5, scrub: 1, revolutions: 1.75,
    exitDuration: 0.10, exitLean: 20,
    spinRampDuration: 0.12,
    waverAmplitude: 6, waverSpeed: 0.167, waverBlendDuration: 0.06
  };

  // Inverse scale: value increases as viewport narrows
  function inverseScale(atWide, atNarrow, wideVW, narrowVW) {
    var t = (window.innerWidth - narrowVW) / (wideVW - narrowVW);
    return atNarrow + t * (atWide - atNarrow);
  }
  // Responsive overrides
  var tabletOverrides = {
    radiusX: inverseScale(44, 55, 992, 768),
    radiusY: inverseScale(21, 26, 992, 768),
    orbitOffsetY: 2,
  };
  var mobileOverrides = {};
  if (window.innerWidth < 992) Object.assign(cc, tabletOverrides);
  if (window.innerWidth < 768) Object.assign(cc, mobileOverrides);

  function map(v, iMin, iMax, oMin, oMax) {
    return gsap.utils.clamp(oMin, oMax, ((v - iMin) / (iMax - iMin)) * (oMax - oMin) + oMin);
  }
  function orbitPxX(a) { return cc.radiusX * Math.cos(a) * (window.innerWidth / 100); }
  function orbitPxY(a) { return cc.radiusY * Math.sin(a) * (window.innerWidth / 100); }
  function depth(a) { return Math.sin(a); }
  function lean(a, i) { return Math.sin(a * 1.5 + (i / TOTAL) * Math.PI) * cc.maxLean; }

  var spinRamp = cc.spinRampDuration, spinScale = 1 / (1 - spinRamp / 2);
  function easedSpin(p) { return (p < spinRamp ? p * p / (2 * spinRamp) : p - spinRamp / 2) * spinScale; }
  function carouselAngle(p) { return easedSpin(p) * cc.revolutions * TWO_PI; }
  function inverseProg(angle) {
    var ep = angle / (cc.revolutions * TWO_PI * spinScale);
    return ep < spinRamp / 2 ? Math.sqrt(2 * spinRamp * ep) : ep + spinRamp / 2;
  }
  var exitEase = gsap.parseEase('power3.in');
  var waverTime = 0;
  function waverRot(i) { return cc.waverAmplitude * Math.sin(TWO_PI * cc.waverSpeed * waverTime + (i / TOTAL) * TWO_PI); }

  function calcExitStart(i) {
    var best = -1;
    for (var k = 1; k <= Math.ceil(cc.revolutions) + 1; k++) {
      var p = inverseProg((k - i / TOTAL) * TWO_PI);
      if (p >= 0 && p < 1.0) best = p;
    }
    return best >= 0 ? best : 1.0 - cc.exitDuration;
  }

  var center = section.querySelector('.carousel-center');
  var sectionRect = section.getBoundingClientRect();
  var centerRect = center ? center.getBoundingClientRect() : sectionRect;
  var polRect = polaroids[0].getBoundingClientRect();
  var originX = (centerRect.left + centerRect.width / 2) - sectionRect.left - (polRect.width / 2);
  var originY = (centerRect.top + centerRect.height / 2) - sectionRect.top - (polRect.height / 2);
  var remPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
  originY += cc.orbitOffsetY * remPx;

  // Initial orbit positions
  polaroids.forEach(function(el, i) {
    var angle = BACK_ANGLE + (i / TOTAL) * TWO_PI;
    var d = depth(angle);
    gsap.set(el, {
      x: originX + orbitPxX(angle), y: originY + orbitPxY(angle),
      scale: map(d, -1, 1, cc.scaleMin, cc.scaleMax), opacity: 1,
      rotation: lean(angle, i),
      filter: 'brightness(' + map(d, -1, 1, cc.brightnessMin, cc.brightnessMax) + ')',
      zIndex: Math.round((d + 1) * 500)
    });
  });

  var maxExitEnd = 0;
  for (var i = 0; i < TOTAL; i++) maxExitEnd = Math.max(maxExitEnd, calcExitStart(i) + cc.exitDuration);
  var progressScale = Math.max(1, maxExitEnd);

  var progressBar = document.createElement('div');
  progressBar.style.cssText = 'position:absolute;bottom:0;left:0;width:0%;height:0.375rem;background:#FFCC00;z-index:2000;';
  section.appendChild(progressBar);

  function updateCarousel(progress) {
    var spin = carouselAngle(progress);
    polaroids.forEach(function(el, i) {
      var baseAngle = BACK_ANGLE + (i / TOTAL) * TWO_PI;
      var es = calcExitStart(i), ee = es + cc.exitDuration;
      if (progress < es) {
        var angle = baseAngle + spin, d = depth(angle);
        var wb = gsap.utils.clamp(0, 1, 1 - progress / cc.waverBlendDuration);
        gsap.set(el, {
          x: originX + orbitPxX(angle), y: originY + orbitPxY(angle),
          scale: map(d, -1, 1, cc.scaleMin, cc.scaleMax), opacity: 1,
          rotation: gsap.utils.interpolate(waverRot(i), lean(angle, i), 1 - wb),
          filter: 'brightness(' + map(d, -1, 1, cc.brightnessMin, cc.brightnessMax) + ')',
          zIndex: Math.round((d + 1) * 500)
        });
      } else if (progress < ee) {
        var t = (progress - es) / cc.exitDuration, eased = exitEase(t);
        var angle = baseAngle + spin, d = depth(angle);
        var fX = originX + orbitPxX(angle), fY = originY + orbitPxY(angle);
        var fS = map(d, -1, 1, cc.scaleMin, cc.scaleMax);
        var fB = map(d, -1, 1, cc.brightnessMin, cc.brightnessMax);
        var fL = lean(angle, i);
        gsap.set(el, {
          x: gsap.utils.interpolate(fX, window.innerWidth * 1.2, eased),
          y: gsap.utils.interpolate(fY, originY, eased),
          scale: gsap.utils.interpolate(fS, 1, eased), opacity: 1,
          rotation: gsap.utils.interpolate(fL, cc.exitLean, eased),
          filter: 'brightness(' + gsap.utils.interpolate(fB, 1, eased) + ')',
          zIndex: Math.round((d + 1) * 500)
        });
      } else {
        gsap.set(el, {
          x: window.innerWidth * 1.2, y: originY, scale: 1, opacity: 1,
          rotation: cc.exitLean, filter: 'brightness(1)', zIndex: 0
        });
      }
    });
  }

  // Idle waver ticker
  var scrollActive = false;
  var idleTickerFn = function() {
    waverTime += gsap.ticker.deltaRatio() / 60;
    if (!scrollActive) {
      polaroids.forEach(function(el, i) {
        gsap.set(el, { rotation: waverRot(i) });
      });
    }
  };
  gsap.ticker.add(idleTickerFn);
  containerTickerFns.push(idleTickerFn);

  ScrollTrigger.create({
    trigger: section, pin: true, start: 'top top',
    end: '+=' + (window.innerHeight * cc.scrollMultiplier), scrub: cc.scrub,
    onEnter: function() { scrollActive = true; },
    onLeaveBack: function() { scrollActive = false; },
    onUpdate: function(self) {
      updateCarousel(self.progress * progressScale);
      progressBar.style.width = (self.progress * 100) + '%';
    }
  });

  var signal = containerAbort ? containerAbort.signal : undefined;
  window.addEventListener('resize', function() {
    clearTimeout(this._crTimer);
    this._crTimer = setTimeout(function() { ScrollTrigger.refresh(); }, 250);
  }, { signal: signal });
}


// CONTAINER: SCROLL JUMP

function initScrollJump() {
  if (window.innerWidth < 992) return;
  var carousel = nextPage.querySelector('.section_carousel');
  var solution = nextPage.querySelector('.section_solution');
  if (!carousel || !solution) return;

  function goTo(target) {
    gsap.to(window, { scrollTo: { y: target, autoKill: false }, duration: 2.5, ease: "power2.inOut" });
  }
  ScrollTrigger.create({ trigger: carousel, start: 'top 99%', onEnter: function() { goTo(carousel); } });
  ScrollTrigger.create({ trigger: carousel, start: 'top top', onEnterBack: function() { goTo(solution); } });
}

// CONTAINER: SECTION SNAP

function initSectionSnap() {
  if (window.innerWidth < 992) return;
  var solution = nextPage.querySelector('.section_solution');
  var carousel = nextPage.querySelector('[data-carousel="polaroid"]');
  if (!solution || !carousel) return;

  // Delay one frame so carousel's pin ScrollTrigger registers first
  requestAnimationFrame(function() {
    var dummy = { v: 0 };
    ScrollTrigger.create({
      animation: gsap.to(dummy, { v: 1 }),
      trigger: solution, start: 'center 25%', end: 'bottom top', scrub: true,
      snap: {
        snapTo: 1,
        duration: { min: 0.8, max: 1 },
        delay: 0, ease: 'power2.inOut', directional: true
      }
    });
  });
}

// CONTAINER: STACKING CARDS

var stackingCardsCfg = {
  minWidth: 992,
  startY: '50vh',             // how far below final position cards start
  startRotation: 0,           // rotation at start of entrance (0 = no spin)
  scrubEase: 'none',
  scrollStart: 'top top',
  pinDuration: '300%',
  // Bounce
  bounce: true,
  bounceDuration: 0.1,
  bounceElasticDuration: 1,
  bounceEase: 'elastic.out(1, 0.3)',
  bounceStretchFactor: 1.5
};

function initStackingCards() {
  if (window.innerWidth < stackingCardsCfg.minWidth) return;

  var sections = nextPage.querySelectorAll('[data-stacking-cards]');
  if (!sections.length) return;

  sections.forEach(function(section) {
    var cards = Array.from(section.querySelectorAll('[data-stacking-card]'));
    if (!cards.length) return;

    var totalCards = cards.length;

    // Build a timeline scrubbed to the pinned section's scroll range
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: stackingCardsCfg.scrollStart,
        end: '+=' + stackingCardsCfg.pinDuration,
        pin: true,
        scrub: true
      }
    });

    // Capture each card's original CSS rotation before overriding
    var originalRotations = cards.map(function(card) {
      return gsap.getProperty(card, 'rotation');
    });

    // Measure the push distance needed for each card to clear the section's
    // bottom edge. Done per-card so cards higher in the section get more push,
    // guaranteeing they clear on any viewport (portrait tablets, short screens).
    // Must run BEFORE gsap.set() so we read the card's true Webflow position.
    var sectionBottom = section.getBoundingClientRect().bottom;
    var pushDistances = cards.map(function(card) {
      var cardTop = card.getBoundingClientRect().top;
      var distance = sectionBottom - cardTop + card.offsetHeight * 0.1;
      // Fallback to configured startY if measurement is unusable
      // (e.g. card is display:none or not yet laid out at init time)
      return distance > 0 ? distance : stackingCardsCfg.startY;
    });

    // Hide all cards at their start position immediately
    cards.forEach(function(card, index) {
      gsap.set(card, { y: pushDistances[index], rotation: stackingCardsCfg.startRotation });
    });

    // Each card gets 1 unit of entrance + 0.5 units of gap before the next
    var entranceDuration = 1;
    var gapDuration = 0.5;
    var slotSize = entranceDuration + gapDuration;

    cards.forEach(function(card, index) {
      var cardStart = index * slotSize;

      // Entrance: scrub from off-screen up to Webflow-defined position
      tl.to(card, {
        y: 0,
        rotation: originalRotations[index],
        ease: stackingCardsCfg.scrubEase,
        duration: entranceDuration,
        onComplete: stackingCardsCfg.bounce
          ? function() { pulseStackingCard(card); }
          : undefined
      }, cardStart);
    });

    // Empty hold at end so the pin lingers after the last card lands
    var lastCardEnd = (totalCards - 1) * slotSize + entranceDuration;
    tl.set({}, {}, lastCardEnd + 0.6);
  });
}

function pulseStackingCard(el) {
  var width = el.offsetWidth;
  var height = el.offsetHeight;
  var fontSize = parseFloat(getComputedStyle(el).fontSize);
  var stretchPx = stackingCardsCfg.bounceStretchFactor * fontSize;
  var targetScaleX = (width + stretchPx) / width;
  var targetScaleY = (height - stretchPx * 0.33) / height;

  var tl = gsap.timeline();
  tl.to(el, {
    scaleX: targetScaleX,
    scaleY: targetScaleY,
    duration: stackingCardsCfg.bounceDuration,
    ease: 'power1.out'
  }).to(el, {
    scaleX: 1,
    scaleY: 1,
    duration: stackingCardsCfg.bounceElasticDuration,
    ease: stackingCardsCfg.bounceEase
  });
}

// CONTAINER: STEPS TABS

function initStepsTabs() {
  // Sticky centering
  var stickyEl = nextPage.querySelector('.steps_desktop-image-wrapper');
  function centerSticky() {
    if (!stickyEl) return;
    stickyEl.style.setProperty('top', ((window.innerHeight - stickyEl.offsetHeight) / 2) + 'px', 'important');
  }
  centerSticky();

  var tabMenu = nextPage.querySelector('.steps_tabs-menu'); if (!tabMenu) return;
  var tabs = tabMenu.querySelectorAll('.steps_tab-link'); if (tabs.length < 3) return;
  var contentBoxes = [
    nextPage.querySelector('.steps_content-box'),
    nextPage.querySelector('.steps_content-box-2'),
    nextPage.querySelector('.steps_content-box-3')
  ];
  if (contentBoxes.some(function(b) { return !b; })) return;

  // Create pill
  var pill = document.createElement('div');
  pill.style.cssText = 'position:absolute;background:#fff;border-radius:3px;border:1.5px solid #000;pointer-events:none;z-index:0;transition:none;';
  tabMenu.insertBefore(pill, tabMenu.firstChild);
  tabs.forEach(function(tab) { tab.style.position = 'relative'; tab.style.zIndex = '1'; });

  var activeIndex = 0, targetIndex = 0, activeTween = null, textTweens = [];
  var MAX_SKEW = 11, MOVE_DUR = 0.6, prevLeft = null;

  function movePill(index, animate) {
    var tab = tabs[index];
    var mRect = tabMenu.getBoundingClientRect(), tRect = tab.getBoundingClientRect();
    var isTablet = window.innerWidth <= 991 && window.innerWidth >= 768;
    var tLeft, tTop, tWidth, tHeight;
    if (isTablet) {
      tWidth = Math.round(tRect.width * 1.02); tHeight = Math.round(tRect.height * 1.03);
      tLeft = Math.round(tRect.left - mRect.left - tRect.width * 0.02);
      tTop = Math.round(tRect.top - mRect.top - tRect.height * 0.07);
    } else {
      tLeft = tRect.left - mRect.left - 3; tTop = tRect.top - mRect.top - 3;
      tWidth = tRect.width + 2; tHeight = tRect.height + 2;
    }
    if (activeTween) { activeTween.kill(); activeTween = null; }

    if (animate) {
      var startLeft = gsap.getProperty(pill, 'left');
      var totalDist = Math.abs(tLeft - startLeft);
      prevLeft = startLeft;
      textTweens.forEach(function(tw) { tw.kill(); }); textTweens = [];
      tabs.forEach(function(t, i) {
        if (i !== index) textTweens.push(gsap.to(t, { skewX: 0, duration: 0.2, ease: 'power2.out', overwrite: true }));
      });
      textTweens.push(gsap.to(tabs[index], { skewX: -10, duration: 0.3, delay: MOVE_DUR * 0.5, ease: 'power2.out', overwrite: true }));

      activeTween = gsap.to(pill, {
        left: tLeft, top: tTop, width: tWidth, height: tHeight, duration: MOVE_DUR, ease: 'power3.inOut',
        onUpdate: function() {
          var cur = gsap.getProperty(pill, 'left');
          var vel = cur - prevLeft; prevLeft = cur;
          var nv = totalDist > 0 ? vel / (totalDist * 0.12) : 0;
          gsap.set(pill, { skewX: gsap.utils.clamp(-1, 1, nv) * MAX_SKEW });
        },
        onComplete: function() {
          gsap.to(pill, { skewX: 0, duration: 0.15, ease: 'power2.out' });
          activeIndex = index; activeTween = null;
        }
      });
    } else {
      gsap.set(pill, { left: tLeft, top: tTop, width: tWidth, height: tHeight, skewX: 0 });
      tabs.forEach(function(t, i) { gsap.set(t, { skewX: i === index ? -10 : 0 }); });
      activeIndex = index;
    }
    targetIndex = index;
  }

  movePill(0, false);

  contentBoxes.forEach(function(box, i) {
    ScrollTrigger.create({
      trigger: box, start: 'top 75%',
      onEnter: function() { if (targetIndex !== i) movePill(i, true); },
      onLeaveBack: function() { if (i > 0 && targetIndex !== i - 1) movePill(i - 1, true); }
    });
  });

  var signal = containerAbort ? containerAbort.signal : undefined;
  window.addEventListener('resize', function() {
    clearTimeout(this._stTimer);
    this._stTimer = setTimeout(function() { movePill(activeIndex, false); centerSticky(); }, 250);
  }, { signal: signal });
}

// CONTAINER: TEXT COLOR REVEAL

function initTextColorReveal() {
  var el = nextPage.querySelector('.steps_conclusion_text'); if (!el) return;
  var isMobile = window.innerWidth <= 767;
  var layout = new SplitType(el, { types: "words" });
  gsap.fromTo(layout.words,
    { opacity: 0.25, color: "#888888" },
    { opacity: 1, color: "#ffffff", stagger: 0.1,
      scrollTrigger: {
        trigger: nextPage.querySelector('.section_layout484') || el,
        start: isMobile ? "top 65%" : "top 80%",
        end: isMobile ? "bottom 120%" : "bottom 80%",
        scrub: 2
      }
    }
  );
}

function initTextColorRevealMobile() {
  if (window.innerWidth > 767) return;
  var el = nextPage.querySelector('.steps_conclusion_text_mobile'); if (!el) return;
  var layout = new SplitType(el, { types: "words" });
  gsap.fromTo(layout.words,
    { opacity: 0.25, color: "#888888" },
    { opacity: 1, color: "#ffffff", stagger: 0.1,
      scrollTrigger: {
        trigger: el,
        start: "top 75%",
        end: "bottom 30%",
        scrub: 2
      }
    }
  );
}

// CONTAINER: UNDERLINE DRAW

var underlineDefs = {
  duration: 2, delay: 0, ease: 'power2.out', start: 'top 50%',
  color: '#FFCC00', strokeWidth: 3, svgHeight: '0.75rem', offset: '1.2rem'
};
function getUnderlineSizes() {
  var w = window.innerWidth;
  if (w < 480) return { svgHeight: '0.35rem', offset: '0.5rem', strokeWidth: 2 };
  if (w < 768) return { svgHeight: '0.45rem', offset: '0.65rem', strokeWidth: 2 };
  if (w < 992) return { svgHeight: '0.55rem', offset: '0.85rem', strokeWidth: 2.5 };
  return { svgHeight: underlineDefs.svgHeight, offset: underlineDefs.offset, strokeWidth: underlineDefs.strokeWidth };
}
var UL_VB_W = 439, UL_VB_H = 10;
var UL_PATH = 'M1.5 7.93157C1.55019 7.93157 1.60038 7.93157 12.814 7.86226C24.0276 7.79295 46.4032 7.65434 70.0981 6.6518C93.7931 5.64927 118.129 3.78703 173.215 3.36682C228.3 2.94661 313.397 4.02487 360.682 4.50535C407.966 4.98583 414.859 4.83585 419.281 4.90118C425.468 4.99256 428.846 5.68074 428.642 6.1333C427.118 9.51428 406.195 8.24382 387.358 8.35875C369.57 8.46728 347.073 3.88081 339.225 3.13732C336.176 2.84845 327.076 2.53792 309.52 1.75771C299.668 1.31991 287.854 1.43652 272.42 2.13352C256.986 2.83051 238.278 4.26781 227.548 5.00824C216.818 5.74867 214.633 5.74867 193.765 5.83843C172.896 5.92819 133.41 6.10771 97.6189 5.7531C61.8277 5.39848 30.9279 4.50428 15.7067 4.03455C0.485466 3.56481 1.87913 3.54663 5.53748 3.78496C15.0938 4.40752 29.9477 5.11997 52.1522 5.45823C65.5464 5.66228 83.2508 6.10668 96.1356 6.0372C109.02 5.96772 116.548 5.41552 143.124 5.49521C169.7 5.5749 215.096 6.30321 243.789 7.09823C272.481 7.89325 283.094 8.73291 310.831 8.35875C338.568 7.98459 383.108 6.37118 406.714 5.46276C430.32 4.55435 431.641 4.39982 433.064 4.32022C434.487 4.24061 435.971 4.24061 437.5 4.24061';

function initUnderlineDraw() {
  var sizes = getUnderlineSizes();
  nextPage.querySelectorAll('[data-underline]').forEach(function(span) {
    var dur = parseFloat(span.getAttribute('data-underline-duration')) || underlineDefs.duration;
    var del = parseFloat(span.getAttribute('data-underline-delay')) || underlineDefs.delay;
    var color = span.getAttribute('data-underline-color') || underlineDefs.color;
    var offset = span.getAttribute('data-underline-offset') || sizes.offset;

    span.style.position = 'relative'; span.style.display = 'inline-block';
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + UL_VB_W + ' ' + UL_VB_H);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.cssText = 'position:absolute;bottom:-' + offset + ';left:0;width:100%;height:' + sizes.svgHeight + ';overflow:visible;pointer-events:none;';
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', UL_PATH);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', sizes.strokeWidth);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('fill', 'none');
    svg.appendChild(path); span.appendChild(svg);

    gsap.set(path, { drawSVG: '0%' });
    gsap.to(path, {
      drawSVG: '100%', duration: dur, delay: del, ease: underlineDefs.ease,
      scrollTrigger: { trigger: span, start: underlineDefs.start, toggleActions: 'play none none none' }
    });
  });
}

// CONTAINER: MODAL

function initModal() {
  var modal = nextPage.querySelector('[data-modal]');
  if (!modal) return;

  var signal = containerAbort.signal;

  function openModal() {
    modal.setAttribute('data-modal', 'active');
  }

  function closeModal() {
    modal.setAttribute('data-modal', 'not-active');
  }

  // Open
  nextPage.querySelectorAll('[data-modal-open]').forEach(function(btn) {
    btn.addEventListener('click', openModal, { signal: signal });
  });

  // Close button
  modal.querySelectorAll('[data-modal-close]').forEach(function(btn) {
    btn.addEventListener('click', closeModal, { signal: signal });
  });

  // Close on overlay click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) closeModal();
  }, { signal: signal });

  // Close on Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  }, { signal: signal });
}
