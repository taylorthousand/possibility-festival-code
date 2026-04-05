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
    scrollStart: '10% top',
    baseX: 50,
    baseY: 50,
  };

  function initDonationSpotlight() {
    document.querySelectorAll('[data-spotlight-donate]').forEach(function (section) {
      var overlay = section.querySelector('.spotlight-overlay');
      if (!overlay) return;
      section.style.position = section.style.position || 'relative';
      gsap.set(overlay, { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', margin: 0 });

      var baseX = donateSpotCfg.baseX;
      var baseY = donateSpotCfg.baseY;
      var isHov = false, lmX = 0, lmY = 0, frX = 0, frY = 0;
      var sp = { x: baseX, y: baseY };

      overlay.style.setProperty('--spotlight-x', baseX + '%');
      overlay.style.setProperty('--spotlight-y', baseY + '%');
      overlay.style.setProperty('--spotlight-rx', '20%');
      overlay.style.setProperty('--spotlight-ry', '28%');

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

      function applyPos() {
        var ox = isHov ? (lmX - baseX) * donateSpotCfg.damping : frX;
        var oy = isHov ? (lmY - baseY) * donateSpotCfg.damping : frY;
        animTo(baseX + ox, baseY + oy);
      }

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

      gsap.fromTo(overlay, { opacity: 0 }, {
        opacity: 1,
        duration: donateSpotCfg.fadeInDuration,
        ease: 'power2.out',
        paused: true,
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
          end: 'bottom 20%',
          toggleActions: 'play reverse play reverse'
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDonationSpotlight);
  } else {
    initDonationSpotlight();
  }
})();
