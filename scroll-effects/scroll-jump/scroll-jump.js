/* ===========================================
   SCROLL JUMP - Auto-scroll to section on trigger
   Uses ScrollToPlugin with autoKill: false to prevent interruption
   =========================================== */

gsap.registerPlugin(ScrollToPlugin);

function goToSection(target) {
  gsap.to(window, {
    scrollTo: { y: target, autoKill: false },
    duration: 2.5,
    ease: "power2.inOut"
  });
}

function initScrollJump() {
  if (window.innerWidth < 992) return;

  const carousel = document.querySelector('.section_carousel');
  const solution = document.querySelector('.section_solution');

  if (!carousel || !solution) {
    return;
  }

  // Scroll down: snap to carousel
  ScrollTrigger.create({
    trigger: carousel,
    start: 'top 99%',
    onEnter: () => goToSection(carousel)
  });

  // Scroll up: snap back to solution
  ScrollTrigger.create({
    trigger: carousel,
    start: 'top top',
    onEnterBack: () => goToSection(solution)
  });
}

document.addEventListener("DOMContentLoaded", initScrollJump);
