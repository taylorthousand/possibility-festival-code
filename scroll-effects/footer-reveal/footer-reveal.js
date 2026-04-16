// Footer Reveal — pins the last section while footer slides up over it
// Requires GSAP + ScrollTrigger
// Pin only engages when section is taller than the viewport (otherwise the
// scroll-into-place before pinning is visible and looks broken). Re-evaluates
// on resize via ResizeObserver on the section + window resize listener.

window.addEventListener("load", () => {
  const section =
    document.querySelector(".section_register-cta") ||
    document.querySelector(".section_home-cta") ||
    document.querySelector(".section_donate-cta");
  const footer = document.querySelector("footer");
  if (!section || !footer) return;

  ScrollTrigger.refresh();

  let st = null;

  const shouldPin = () =>
    window.innerWidth >= 992 && section.offsetHeight > window.innerHeight;

  const apply = () => {
    const need = shouldPin();
    if (need && !st) {
      st = ScrollTrigger.create({
        trigger: section,
        start: "bottom bottom",
        end: () => `+=${footer.offsetHeight}`,
        pin: true,
        pinSpacing: false,
      });
    } else if (!need && st) {
      st.kill();
      st = null;
      ScrollTrigger.refresh();
    }
  };

  apply();

  let resizeTimer;
  const scheduleApply = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(apply, 250);
  };

  window.addEventListener("resize", scheduleApply);

  const ro = new ResizeObserver(scheduleApply);
  ro.observe(section);
});
