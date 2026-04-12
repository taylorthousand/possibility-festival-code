// Footer Reveal — pins the last section while footer slides up over it
// Requires GSAP + ScrollTrigger

window.addEventListener("load", () => {
  if (window.innerWidth < 992) return;
  const section =
    document.querySelector(".section_register-cta") ||
    document.querySelector(".section_home-cta") ||
    document.querySelector(".section_donate-cta");
  const footer = document.querySelector("footer");
  if (!section || !footer) return;

  ScrollTrigger.refresh();

  ScrollTrigger.create({
    trigger: section,
    start: "bottom bottom",
    end: () => `+=${footer.offsetHeight}`,
    pin: true,
    pinSpacing: false,
});
});
