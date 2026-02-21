/* ===========================================
   LENIS SMOOTH SCROLL + GSAP INTEGRATION
   Source: Osmo Vault
   ===========================================

   IMPORTANT: This code must run BEFORE text-reveal.js
   Lenis needs to be initialized before any ScrollTriggers are created.
   =========================================== */

// Initialize Lenis with autoRaf (handles animation loop automatically)
const lenis = new Lenis({
  autoRaf: true,
});

// Connect Lenis scroll to ScrollTrigger updates
// This syncs smooth scroll position with GSAP ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);
