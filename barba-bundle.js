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
var hangtagCleanupEls = [];
var heroLoadFired = false;
var loadRevealFired = false;

var hasLenis = typeof window.Lenis !== "undefined";
var hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";

var rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
var reducedMotion = rmMQ.matches;
rmMQ.addEventListener?.("change", function(e) { reducedMotion = e.matches; });
rmMQ.addListener?.(function(e) { reducedMotion = e.matches; });

var has = function(s) { return !!nextPage.querySelector(s); };

var staggerDefault = 0.05;
var durationDefault = 0.6;

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
  initNavLogoScroll();
}

function initBeforeEnterFunctions(next) {
  // Tear down previous container's listeners and ticker functions
  if (containerAbort) containerAbort.abort();
  containerAbort = new AbortController();
  containerTickerFns.forEach(function(fn) { gsap.ticker.remove(fn); });
  containerTickerFns = [];
  hangtagCleanupEls.forEach(function(el) { el.remove(); });
  hangtagCleanupEls = [];
  nextPage = next || document;
}

function initAfterEnterFunctions(next) {
  nextPage = next || document;

  // Pin-creating ScrollTriggers first (pin-spacers must exist before other triggers measure)
  if (has('[data-carousel="polaroid"]')) initPolaroidCarousel();
  if (has('.section_register-cta') || has('.section_home-cta') || has('.section_donate-cta')) initFooterReveal();

  // Text reveal must init before hangtag (SplitText restructures DOM first)
  if (has('[data-split="early"]') || has('[data-split="late"]')) initTextReveal();
  if (has('.problem_study-trigger')) initHangtagHover();
  if (has('.section_hero')) initHeroLoad();
  if (has('.section_hero')) initHeroScroll();
  if (has('[data-momentum-hover-init]')) initMomentumHover();
  if (has('[data-spotlight]')) initSpotlight();
  if (has('[data-spotlight-donate]')) initDonationSpotlight();
  if (has('[data-festival]')) initFestivalHover();
  if (has('.bg-shift-overlay')) initBackgroundShift();
  if (has('.section_solution')) initGradientEmanate();
  if (has('[data-parallax]')) initParallaxSections();
  if (has('[data-polaroid]')) initPolaroidDevelop();
  if (has('.section_solution') && has('[data-carousel="polaroid"]')) initSectionSnap();
  if (has('.steps_tabs-menu')) initStepsTabs();
  if (has('.steps_conclusion_text')) initTextColorReveal();
  if (has('[data-underline]')) initUnderlineDraw();

  // Refresh wrapper ScrollTriggers (killed during afterLeave, not yet created on first load)
  refreshMenuButtonReveal();
  refreshNavLogoScroll();

  if (hasLenis) lenis.resize();
  if (hasScrollTrigger) ScrollTrigger.refresh();
}

// PAGE TRANSITIONS

function runPageOnceAnimation(next) {
  var tl = gsap.timeline();
  tl.call(function() { resetPage(next); }, null, 0);
  return tl;
}

function runPageLeaveAnimation(current, next) {
  var transitionWrap = document.querySelector("[data-transition-wrap]");
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

  tl.fromTo(next.querySelector("h1"), {
    yPercent: 25,
    autoAlpha: 0
  }, {
    yPercent: 0,
    autoAlpha: 1,
    ease: "expo.out",
    duration: 1
  }, "< 0.75");

  tl.add("pageReady");
  tl.call(resetPage, [next], "pageReady");

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
    document.fonts.ready.then(function() {
      requestAnimationFrame(function() {
        initAfterEnterFunctions(data.next.container);
        if (hasLenis) { lenis.resize(); lenis.start(); }
        if (hasScrollTrigger) ScrollTrigger.refresh();
      });
    });
  } else {
    initAfterEnterFunctions(data.next.container);
    if (hasLenis) { lenis.resize(); lenis.start(); }
    if (hasScrollTrigger) ScrollTrigger.refresh();
    if (window.Webflow) { Webflow.destroy(); Webflow.ready(); Webflow.require('ix2').init(); }
  }
});

if (typeof barbaPrefetch !== 'undefined') barba.use(barbaPrefetch);

barba.init({
  debug: true,
  timeout: 7000,
  preventRunning: true,
  transitions: [{
    name: "default",
    sync: true,
    async once(data) {
      initOnceFunctions();
      return runPageOnceAnimation(data.next.container);
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
  gsap.fromTo(menuButton_el,
    { yPercent: 110 },
    {
      yPercent: 0, duration: 0.6, ease: 'expo.out',
      scrollTrigger: {
        trigger: document.body,
        start: function() { return Math.round(0.9 * window.innerHeight) + ' top'; },
        toggleActions: 'play none none reverse',
        onEnter: function() {
          if (menuButton_navComponent) menuButton_navComponent.style.pointerEvents = 'auto';
          menuButton_el.style.pointerEvents = 'auto';
        },
        onLeaveBack: function() {
          if (menuButton_navComponent) menuButton_navComponent.style.pointerEvents = 'none';
          menuButton_el.style.pointerEvents = 'none';
        }
      }
    }
  );
}

function refreshMenuButtonReveal() { createMenuButtonRevealST(); }

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
  if (heroLoadFired) return;
  heroLoadFired = true;
  var hero = nextPage.querySelector('.section_hero');
  if (!hero) return;
  var tl = gsap.timeline();
  tl.set(hero, { padding: '0rem' })
    .to(hero, { padding: '1.25rem', duration: 0.6, ease: 'power2.out' })
    .to(hero, { padding: '.75rem', duration: 0.4, ease: 'power2.inOut' });
}

// CONTAINER: HERO SCROLL

function initHeroScroll() {
  var hero = nextPage.querySelector('.section_hero');
  var inner = nextPage.querySelector('.hero_inner');
  if (!hero || !inner) return;
  gsap.set(inner, { outline: '0rem solid #000000' });
  gsap.to(inner, {
    scale: 0.7, rotation: 15, opacity: 0.85, outline: '1rem solid #000000', ease: 'none',
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
    gsap.set(heading, { autoAlpha: 1 });
    var speed = heading.dataset.split;
    var type = heading.dataset.splitReveal || 'words';
    var slow = heading.hasAttribute('data-split-slow');
    var trigger = heading.dataset.splitTrigger || 'scroll';
    var typesToSplit = type === 'lines' ? ['lines'] : type === 'words' ? ['lines', 'words'] : ['lines', 'words', 'chars'];

    SplitText.create(heading, {
      type: typesToSplit.join(', '), mask: 'lines', autoSplit: true,
      linesClass: 'line', wordsClass: 'word', charsClass: 'letter',
      onSplit: function(instance) {
        restoreSpans(heading, preserved);
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
  innerWidthRatio: 0.5, innerIntensity: 0.8, innerSoftEdge: 0.325, innerBlur: 10,
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
      var ox = isHov ? (lmX-baseX)*spotlightCfg.damping : frX;
      var oy = isHov ? (lmY-baseY)*spotlightCfg.damping : frY;
      animTo(baseX+ox,baseY+oy,ox,oy);
    }
    function updBase() {
      if (!hasTarget) return;
      var r = target.getBoundingClientRect();
      baseX = ((r.left+r.width/2)/window.innerWidth)*100;
      baseY = ((r.top+r.height/2)/window.innerHeight)*100;
    }
    updBase(); applyPos();

    section.addEventListener('mousemove',function(e){
      isHov=true; lmX=(e.clientX/window.innerWidth)*100; lmY=(e.clientY/window.innerHeight)*100;
      var ox=(lmX-baseX)*spotlightCfg.damping, oy=(lmY-baseY)*spotlightCfg.damping;
      animTo(baseX+ox,baseY+oy,ox,oy);
    });
    section.addEventListener('mouseleave',function(){
      frX=(lmX-baseX)*spotlightCfg.damping; frY=(lmY-baseY)*spotlightCfg.damping; isHov=false;
    });
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

var donateSpotCfg = { damping: 0.04, easeDuration: 0.5, fadeInDuration: 0.6, scrollStart: '10% top', baseX: 50, baseY: 50 };

function initDonationSpotlight() {
  nextPage.querySelectorAll('[data-spotlight-donate]').forEach(function(section) {
    var overlay = section.querySelector('.spotlight-overlay'); if (!overlay) return;
    var baseX = donateSpotCfg.baseX, baseY = donateSpotCfg.baseY;
    var isHov = false, lmX = 0, lmY = 0, frX = 0, frY = 0;
    var sp = {x:baseX,y:baseY};
    overlay.style.setProperty('--spotlight-x',baseX+'%'); overlay.style.setProperty('--spotlight-y',baseY+'%');
    overlay.style.setProperty('--spotlight-rx','20%'); overlay.style.setProperty('--spotlight-ry','28%');

    function animTo(tx,ty) {
      gsap.to(sp,{x:tx,y:ty,duration:donateSpotCfg.easeDuration,ease:'power2.out',overwrite:'auto',
        onUpdate:function(){overlay.style.setProperty('--spotlight-x',sp.x+'%');overlay.style.setProperty('--spotlight-y',sp.y+'%');}});
    }
    function applyPos() {
      var ox = isHov ? (lmX-baseX)*donateSpotCfg.damping : frX;
      var oy = isHov ? (lmY-baseY)*donateSpotCfg.damping : frY;
      animTo(baseX+ox,baseY+oy);
    }
    applyPos();

    section.addEventListener('mousemove',function(e){
      isHov=true; lmX=(e.clientX/window.innerWidth)*100; lmY=(e.clientY/window.innerHeight)*100;
      var ox=(lmX-baseX)*donateSpotCfg.damping, oy=(lmY-baseY)*donateSpotCfg.damping;
      animTo(baseX+ox,baseY+oy);
    });
    section.addEventListener('mouseleave',function(){
      frX=(lmX-baseX)*donateSpotCfg.damping; frY=(lmY-baseY)*donateSpotCfg.damping; isHov=false;
    });

    ScrollTrigger.create({trigger:section,start:donateSpotCfg.scrollStart,end:'92% bottom',
      onEnter:function(){gsap.to(overlay,{opacity:1,duration:donateSpotCfg.fadeInDuration,ease:'power2.out',overwrite:'auto'});},
      onLeave:function(){gsap.to(overlay,{opacity:0,duration:donateSpotCfg.fadeInDuration,ease:'power2.out',overwrite:'auto'});},
      onEnterBack:function(){gsap.to(overlay,{opacity:1,duration:donateSpotCfg.fadeInDuration,ease:'power2.out',overwrite:'auto'});},
      onLeaveBack:function(){gsap.to(overlay,{opacity:0,duration:donateSpotCfg.fadeInDuration,ease:'power2.out',overwrite:'auto'});}
    });
  });
}

// CONTAINER: FESTIVAL HOVER

function initFestivalHover() {
  var signal = containerAbort ? containerAbort.signal : undefined;
  var OFFSET_X = 20;
  var OFFSET_Y = 20;
  var mouseX = 0, mouseY = 0;
  var activePolaroid = null;

  nextPage.querySelectorAll('.polaroid.vertical.is-festival').forEach(function(p) {
    gsap.set(p, { position: 'fixed', left: 0, top: 0, autoAlpha: 0, pointerEvents: 'none', zIndex: 999 });
  });

  window.addEventListener('mousemove', function(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (activePolaroid) {
      gsap.to(activePolaroid, {
        x: mouseX + OFFSET_X,
        y: mouseY + OFFSET_Y,
        duration: 0.35,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
  }, { signal: signal });

  nextPage.querySelectorAll('.festivals_item-link[data-festival]').forEach(function(link) {
    var id = link.getAttribute('data-festival');
    var polaroid = nextPage.querySelector('.polaroid.vertical.is-festival[data-festival="' + id + '"]');
    if (!polaroid) return;

    link.addEventListener('mouseenter', function() {
      activePolaroid = polaroid;
      gsap.set(polaroid, { x: mouseX + OFFSET_X, y: mouseY + OFFSET_Y });
      gsap.to(polaroid, { autoAlpha: 1, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
    }, { signal: signal });

    link.addEventListener('mouseleave', function() {
      gsap.to(polaroid, {
        autoAlpha: 0,
        duration: 0.25,
        ease: 'power2.in',
        overwrite: 'auto',
        onComplete: function() { activePolaroid = null; }
      });
    }, { signal: signal });
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
  ScrollTrigger.create({
    trigger: section, start: 'bottom bottom',
    end: function() { return '+=' + footer.offsetHeight; },
    pin: true, pinSpacing: false
  });
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
  if (window.innerWidth < 992) return;
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

// CONTAINER: POLAROID DEVELOP

var polaroidDevCfg = {
  duration: 4, ease: 'power2.out', start: 'top 95%',
  filterStart: 'brightness(2) contrast(0.3)', filterEnd: 'brightness(1) contrast(1)',
  overlayDuration: 3
};

function initPolaroidDevelop() {
  nextPage.querySelectorAll('[data-polaroid]').forEach(function(wrapper) {
    var image = wrapper.querySelector('img');
    var overlay = wrapper.querySelector('.polaroid-overlay');
    if (!image) return;
    gsap.set(image, { filter: polaroidDevCfg.filterStart });
    if (overlay) gsap.set(overlay, { opacity: 1 });
    var tl = gsap.timeline({
      scrollTrigger: { trigger: wrapper, start: polaroidDevCfg.start, once: true }
    });
    if (overlay) tl.to(overlay, { opacity: 0, duration: polaroidDevCfg.overlayDuration, ease: polaroidDevCfg.ease }, 0);
    tl.to(image, { filter: polaroidDevCfg.filterEnd, duration: polaroidDevCfg.duration, ease: polaroidDevCfg.ease }, 0);
  });
}

// CONTAINER: SCROLL JUMP

function initScrollJump() {
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
        delay: 0, ease: 'power2.inOut', directional: true,
        onStart: function() { if (lenis) lenis.stop(); },
        onComplete: function() { if (lenis) lenis.start(); }
      }
    });
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
    var tLeft = tRect.left - mRect.left - 3, tTop = tRect.top - mRect.top - 3;
    var tWidth = tRect.width + 2, tHeight = tRect.height + 2;
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
        start: isMobile ? "top 35%" : "top center",
        end: isMobile ? "bottom 90%" : "bottom center",
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
var UL_VB_W = 439, UL_VB_H = 10;
var UL_PATH = 'M1.5 7.93157C1.55019 7.93157 1.60038 7.93157 12.814 7.86226C24.0276 7.79295 46.4032 7.65434 70.0981 6.6518C93.7931 5.64927 118.129 3.78703 173.215 3.36682C228.3 2.94661 313.397 4.02487 360.682 4.50535C407.966 4.98583 414.859 4.83585 419.281 4.90118C425.468 4.99256 428.846 5.68074 428.642 6.1333C427.118 9.51428 406.195 8.24382 387.358 8.35875C369.57 8.46728 347.073 3.88081 339.225 3.13732C336.176 2.84845 327.076 2.53792 309.52 1.75771C299.668 1.31991 287.854 1.43652 272.42 2.13352C256.986 2.83051 238.278 4.26781 227.548 5.00824C216.818 5.74867 214.633 5.74867 193.765 5.83843C172.896 5.92819 133.41 6.10771 97.6189 5.7531C61.8277 5.39848 30.9279 4.50428 15.7067 4.03455C0.485466 3.56481 1.87913 3.54663 5.53748 3.78496C15.0938 4.40752 29.9477 5.11997 52.1522 5.45823C65.5464 5.66228 83.2508 6.10668 96.1356 6.0372C109.02 5.96772 116.548 5.41552 143.124 5.49521C169.7 5.5749 215.096 6.30321 243.789 7.09823C272.481 7.89325 283.094 8.73291 310.831 8.35875C338.568 7.98459 383.108 6.37118 406.714 5.46276C430.32 4.55435 431.641 4.39982 433.064 4.32022C434.487 4.24061 435.971 4.24061 437.5 4.24061';

function initUnderlineDraw() {
  nextPage.querySelectorAll('[data-underline]').forEach(function(span) {
    var dur = parseFloat(span.getAttribute('data-underline-duration')) || underlineDefs.duration;
    var del = parseFloat(span.getAttribute('data-underline-delay')) || underlineDefs.delay;
    var color = span.getAttribute('data-underline-color') || underlineDefs.color;
    var offset = span.getAttribute('data-underline-offset') || underlineDefs.offset;

    span.style.position = 'relative'; span.style.display = 'inline-block';
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + UL_VB_W + ' ' + UL_VB_H);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.cssText = 'position:absolute;bottom:-' + offset + ';left:0;width:100%;height:' + underlineDefs.svgHeight + ';overflow:visible;pointer-events:none;';
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', UL_PATH);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', underlineDefs.strokeWidth);
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
