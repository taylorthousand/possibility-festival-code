document.addEventListener('DOMContentLoaded', function() {
  function isMobile() {
    return window.innerWidth <= 767;
  }

  const layoutText = new SplitType(".steps_conclusion_text", { types: "words" });
  const layoutTL = gsap.timeline();

  let startValue = isMobile() ? "top 35%" : "top center";
  let endValue = isMobile() ? "bottom 90%" : "bottom center";

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
