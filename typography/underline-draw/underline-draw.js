/* ===========================================
   UNDERLINE DRAW - SVG stroke draw-in on scroll
   ===========================================

   Dynamically injects a hand-drawn SVG underline
   beneath each [data-underline] span, sized to the
   word width. Animates with GSAP DrawSVG on scroll.

   ATTRIBUTES (on the span):
   - data-underline          → marks a span for the underline effect
   - data-underline-duration → (optional) seconds, default 0.8
   - data-underline-delay    → (optional) seconds, default 0
   - data-underline-color    → (optional) stroke color, default #FFCC00
   - data-underline-offset   → (optional) rem below the text, default 0.875rem

   SETUP IN WEBFLOW:
   1. Wrap the target word(s) in a span
   2. Add data-underline to the span
   3. No SVG placement needed — JS handles it
   =========================================== */

const underlineDefaults = {
  duration: 2,
  delay: 0,
  ease: 'power2.out',
  start: 'top 50%',
  color: '#FFCC00',
  strokeWidth: 3,
  svgHeight: '0.75rem',
  offset: '1.2rem'
};

// Original SVG viewBox width for the hand-drawn path
const SVG_VIEWBOX_W = 439;
const SVG_VIEWBOX_H = 10;
const UNDERLINE_PATH = 'M1.5 7.93157C1.55019 7.93157 1.60038 7.93157 12.814 7.86226C24.0276 7.79295 46.4032 7.65434 70.0981 6.6518C93.7931 5.64927 118.129 3.78703 173.215 3.36682C228.3 2.94661 313.397 4.02487 360.682 4.50535C407.966 4.98583 414.859 4.83585 419.281 4.90118C425.468 4.99256 428.846 5.68074 428.642 6.1333C427.118 9.51428 406.195 8.24382 387.358 8.35875C369.57 8.46728 347.073 3.88081 339.225 3.13732C336.176 2.84845 327.076 2.53792 309.52 1.75771C299.668 1.31991 287.854 1.43652 272.42 2.13352C256.986 2.83051 238.278 4.26781 227.548 5.00824C216.818 5.74867 214.633 5.74867 193.765 5.83843C172.896 5.92819 133.41 6.10771 97.6189 5.7531C61.8277 5.39848 30.9279 4.50428 15.7067 4.03455C0.485466 3.56481 1.87913 3.54663 5.53748 3.78496C15.0938 4.40752 29.9477 5.11997 52.1522 5.45823C65.5464 5.66228 83.2508 6.10668 96.1356 6.0372C109.02 5.96772 116.548 5.41552 143.124 5.49521C169.7 5.5749 215.096 6.30321 243.789 7.09823C272.481 7.89325 283.094 8.73291 310.831 8.35875C338.568 7.98459 383.108 6.37118 406.714 5.46276C430.32 4.55435 431.641 4.39982 433.064 4.32022C434.487 4.24061 435.971 4.24061 437.5 4.24061';

function initUnderlineDraw() {
  gsap.registerPlugin(DrawSVGPlugin);

  const spans = document.querySelectorAll('[data-underline]');

  spans.forEach(span => {
    const duration = parseFloat(span.getAttribute('data-underline-duration')) || underlineDefaults.duration;
    const delay = parseFloat(span.getAttribute('data-underline-delay')) || underlineDefaults.delay;
    const color = span.getAttribute('data-underline-color') || underlineDefaults.color;
    const offset = span.getAttribute('data-underline-offset') || underlineDefaults.offset;

    // Ensure the span is a positioning context
    span.style.position = 'relative';
    span.style.display = 'inline-block';

    // Create and inject the SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${SVG_VIEWBOX_W} ${SVG_VIEWBOX_H}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.cssText = `
      position: absolute;
      bottom: -${offset};
      left: 0;
      width: 100%;
      height: ${underlineDefaults.svgHeight};
      overflow: visible;
      pointer-events: none;
    `;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', UNDERLINE_PATH);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', underlineDefaults.strokeWidth);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('fill', 'none');

    svg.appendChild(path);
    span.appendChild(svg);

    // Animate
    gsap.set(path, { drawSVG: '0%' });

    gsap.to(path, {
      drawSVG: '100%',
      duration: duration,
      delay: delay,
      ease: underlineDefaults.ease,
      scrollTrigger: {
        trigger: span,
        start: underlineDefaults.start,
        toggleActions: 'play none none none'
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', initUnderlineDraw);
