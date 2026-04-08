/* ===========================================
   NAV LINK SKEW — faux-italic hover on menu links
   ===========================================

   Hovering a .menu-linkblock skews the text and
   activates variable-font italic (slant axis),
   matching the festival list hover treatment.

   CSS handles font-variation-settings transition
   (in css-bundle.css). JS handles skewX via GSAP.

   Requires: GSAP
   =========================================== */

(function () {

  function initNavLinkSkew() {
    document.querySelectorAll('.menu-linkblock').forEach(function (link) {
      link.addEventListener('mouseenter', function () {
        gsap.to(link, { skewX: -10, duration: 0.3, ease: 'power2.out', overwrite: true });
      });

      link.addEventListener('mouseleave', function () {
        gsap.to(link, { skewX: 0, duration: 0.2, ease: 'power2.out', overwrite: true });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavLinkSkew);
  } else {
    initNavLinkSkew();
  }
})();
