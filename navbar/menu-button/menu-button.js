/* ===========================================
   MENU BUTTON — reveal, hover, and click
   ===========================================

   Three interactions on the desktop menu button:

   REVEAL: Masked slide-up of the button after scrolling
   past the hero section. Reverses on scroll-back.

   HOVER: Text-roll effect. Clones the label text, stacks
   both vertically inside a mask, rolls upward on hover.

   CLICK: Rolls text out of mask, collapses width so button
   shrinks to just the hamburger, slides nav menu in.
   Reverses on dismiss/close.

   SETUP IN WEBFLOW:
   - .desktop_menu-button inside .menu_button-wrapper
   - .desktop_menu-button_text contains the label text ("menu")
   - .desktop_menu_hamburger is the other child of the button
   - .nav_menu is the slide-in navigation panel
   - Set overflow: hidden on .menu_button-wrapper
   - Set pointer-events: none on the sticky bar

   Requires: GSAP + ScrollTrigger
   =========================================== */

(function () {

  /* ---- REVEAL on scroll ---- */
  function initReveal() {
    const button = document.querySelector('.desktop_menu-button');
    const navComponent = document.querySelector('.nav_component');
    if (!button) return;

    const revealTween = gsap.fromTo(button,
      { yPercent: 110 },
      { yPercent: 0, duration: 0.6, ease: 'expo.out', paused: true }
    );

    ScrollTrigger.create({
      trigger: '.section_hero',
      start: 'bottom 15%',
      onEnter: () => {
        revealTween.timeScale(1).play();
        if (navComponent) navComponent.style.pointerEvents = 'auto';
        button.style.pointerEvents = 'auto';
      },
      onLeaveBack: () => {
        revealTween.timeScale(2).reverse();
        if (navComponent) navComponent.style.pointerEvents = 'none';
        button.style.pointerEvents = 'none';
      },
    });
  }

  /* ---- HOVER + CLICK ---- */
  function initHoverAndClick() {
    const textEl = document.querySelector('.desktop_menu-button_text');
    const button = document.querySelector('.desktop_menu-button');
    const navMenu = document.querySelector('.nav_menu');
    if (!textEl || !button) return;

    // Lock mask dimensions before restructuring
    const height = textEl.offsetHeight;
    const width = textEl.offsetWidth;
    textEl.style.height = height + 'px';
    textEl.style.width = width + 'px';
    textEl.style.minWidth = '0';
    textEl.style.overflow = 'hidden';

    // Capture original content
    const originalHTML = textEl.innerHTML;

    // Build roller with original + clone
    const roller = document.createElement('div');
    roller.className = 'menu-text_roller';

    const original = document.createElement('div');
    original.className = 'menu-text_item';
    original.innerHTML = originalHTML;

    const clone = document.createElement('div');
    clone.className = 'menu-text_item';
    clone.innerHTML = originalHTML;

    roller.appendChild(original);
    roller.appendChild(clone);

    textEl.innerHTML = '';
    textEl.appendChild(roller);

    // --- HOVER TIMELINE ---
    const hoverTl = gsap.timeline({ paused: true });
    hoverTl.to(roller, {
      yPercent: -50,
      duration: 0.25,
      ease: 'power2.out',
    });

    let isCollapsed = false;

    button.addEventListener('mouseenter', () => {
      if (!isCollapsed) hoverTl.play();
    });
    button.addEventListener('mouseleave', () => {
      if (!isCollapsed) hoverTl.reverse();
    });

    // --- CLICK TIMELINE ---
    const clickTl = gsap.timeline({ paused: true });

    // Step 1: Roll text up out of mask
    clickTl.to(roller, {
      yPercent: -100,
      duration: 0.2,
      ease: 'power2.in',
    });

    // Step 2: Collapse width + close flex gap
    clickTl.to(textEl, {
      width: 0,
      marginLeft: 0,
      marginRight: 0,
      paddingLeft: 0,
      paddingRight: 0,
      duration: 0.3,
      ease: 'power2.inOut',
    }, '<')
    .to(button, {
      gap: 0,
      duration: 0.3,
      ease: 'power2.inOut',
    }, '<');

    // Step 3: Slide nav menu in from the right
    if (navMenu) {
      clickTl.to(navMenu, {
        x: '-50rem',
        duration: 0.5,
        ease: 'power2.out',
      });
    }

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

    // Open on menu button click
    button.addEventListener('click', () => {
      if (isCollapsed) closeMenu();
      else openMenu();
    });

    // Close on close button click
    const closeButton = document.querySelector('.close-button');
    if (closeButton) {
      closeButton.addEventListener('click', closeMenu);
    }

    // Close on nav link click (Barba navigations don't reload the page)
    if (navMenu) {
      navMenu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', closeMenu);
      });
    }

    // Close on click outside nav menu
    document.addEventListener('click', (e) => {
      if (!isCollapsed) return;
      if (navMenu && navMenu.contains(e.target)) return;
      if (button.contains(e.target)) return;
      closeMenu();
    });
  }

  function init() {
    initReveal();
    initHoverAndClick();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
