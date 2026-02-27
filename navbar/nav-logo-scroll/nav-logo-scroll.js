/* ===========================================
   NAV LOGO SCROLL - Possibility Festival
   =========================================== */

/* SETUP IN WEBFLOW:
   - Embed the SVG inline inside .nav_logo (not as an <img>)
   - Paste this script in a code embed before </body>
   - Requires GSAP + ScrollTrigger (already loaded via external-scripts)
*/

(function () {
  function init() {
    const svg = document.querySelector(".nav_logo svg");
    if (!svg) return;

    // Allow paths to animate outside SVG bounds
    svg.style.overflow = "visible";

    const paths = Array.from(svg.querySelectorAll("path"));

    // Sort by x-center position (left to right, regardless of row)
    paths.sort((a, b) => {
      const aBox = a.getBBox();
      const bBox = b.getBBox();
      return aBox.x + aBox.width / 2 - (bBox.x + bBox.width / 2);
    });

    // Build the timeline
    const tl = gsap.timeline({
      paused: true,
      scrollTrigger: {
        trigger: ".section_hero",
        start: "bottom 5%", // fires when hero bottom reaches 5% from viewport top
        toggleActions: "play none none reverse",
      },
    });

    tl.to(paths, {
      x: -800,
      rotation: -20,
      opacity: 0,
      stagger: 0.04,
      duration: 0.6,
      ease: "power3.in",
    });
  }

  // Initialize after DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
