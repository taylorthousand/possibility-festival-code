/* ===========================================
   DONATION SPOTLIGHT — fog-only mouse-follow
   ===========================================

   Simplified spotlight for the donation header section.
   Same mouse-follow fog overlay as the main spotlight,
   but no beam and a fixed center position.

   SETUP IN WEBFLOW:
   1. Add data-spotlight-donate to .section_donation_header
   2. Add a child div as FIRST CHILD of the section:
      - Class: spotlight-overlay
      - Position: Sticky
      - Pointer-events: None
   3. Set CSS custom properties on the overlay for ellipse size:
      --spotlight-rx and --spotlight-ry

   Requires: GSAP + ScrollTrigger
   =========================================== */

(function () {

  var donateSpotCfg = {
    damping: 0.04,
    easeDuration: 0.5,
    fadeInDuration: 0.6,
    baseX: 50,
    baseY: 50,
    offsetY: -4,
  };

  function initDonationSpotlight() {
    document.querySelectorAll('[data-spotlight-donate]').forEach(function (section) {
      var overlay = section.querySelector('.spotlight-overlay');
      if (!overlay) return;
      var target = section.querySelector('[data-spotlight-target]');
      var baseX = donateSpotCfg.baseX;
      var baseY = donateSpotCfg.baseY;
      var isHov = false, lmX = 0, lmY = 0, frX = 0, frY = 0;
      var sp = { x: baseX, y: baseY };

      overlay.style.setProperty('--spotlight-x', baseX + '%');
      overlay.style.setProperty('--spotlight-y', baseY + '%');

      function animTo(tx, ty) {
        gsap.to(sp, {
          x: tx,
          y: ty,
          duration: donateSpotCfg.easeDuration,
          ease: 'power2.out',
          overwrite: 'auto',
          onUpdate: function () {
            overlay.style.setProperty('--spotlight-x', sp.x + '%');
            overlay.style.setProperty('--spotlight-y', sp.y + '%');
          }
        });
      }

      function updBase() {
        if (!target) return;
        var r = target.getBoundingClientRect();
        baseX = ((r.left + r.width / 2) / window.innerWidth) * 100;
        baseY = ((r.top + r.height / 2) / window.innerHeight) * 100 + donateSpotCfg.offsetY;
      }

      function setPos(tx, ty) {
        sp.x = tx; sp.y = ty;
        overlay.style.setProperty('--spotlight-x', tx + '%');
        overlay.style.setProperty('--spotlight-y', ty + '%');
      }

      function applyPos() {
        var ox = isHov ? (lmX - baseX) * donateSpotCfg.damping : frX;
        var oy = isHov ? (lmY - baseY) * donateSpotCfg.damping : frY;
        setPos(baseX + ox, baseY + oy);
      }

      updBase();
      applyPos();

      section.addEventListener('mousemove', function (e) {
        isHov = true;
        lmX = (e.clientX / window.innerWidth) * 100;
        lmY = (e.clientY / window.innerHeight) * 100;
        var ox = (lmX - baseX) * donateSpotCfg.damping;
        var oy = (lmY - baseY) * donateSpotCfg.damping;
        animTo(baseX + ox, baseY + oy);
      });

      section.addEventListener('mouseleave', function () {
        frX = (lmX - baseX) * donateSpotCfg.damping;
        frY = (lmY - baseY) * donateSpotCfg.damping;
        isHov = false;
      });

      ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: function () { updBase(); applyPos(); }
      });

      gsap.to(overlay, { opacity: 1, duration: donateSpotCfg.fadeInDuration, ease: 'power2.out' });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDonationSpotlight);
  } else {
    initDonationSpotlight();
  }
})();
