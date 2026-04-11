document.addEventListener('DOMContentLoaded', function() {
  function isMobile() {
    return window.innerWidth <= 767;
  }

  const layoutText = new SplitType(".steps_conclusion_text", { types: "words" });
  const layoutTL = gsap.timeline();

  let startValue = isMobile() ? "top 65%" : "top 80%";
  let endValue = isMobile() ? "bottom 120%" : "bottom 80%";

  layoutTL.fromTo(layoutText.words,
    { opacity: 0.25, color: "#888888" },
    { opacity: 1, color: "#ffffff",
      stagger: 0.1,
      scrollTrigger: {
        trigger: ".section_layout484",
        start: startValue,
        end: endValue,
        scrub: 2
      }
    }
  );
});
