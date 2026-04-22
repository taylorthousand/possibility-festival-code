/* ===========================================
   HANGTAG HOVER - Possibility Festival
   =========================================== */

/* SETUP IN WEBFLOW:
   - Add class .problem_study-trigger to each trigger span
   - Add class .problem_study-hangtag to each hang tag div
   - Add data-hangtag="1" (or "2") to both the span and its matching hang tag
   - Leave hang tags visible in Webflow (CSS + script hides them on load)
   - Paste this script in a code embed before </body>
   - Requires GSAP (already loaded via external-scripts)
   - Must load AFTER text-reveal.js (uses event delegation so SplitText can restructure DOM first)
*/

(function () {
  // Position: how fast the tag follows the cursor (0–1, no overshoot)
  var FOLLOW = 0.1;
  // Offset below cursor in rem
  var OFFSET_Y_REM = 0.5;

  // Angle tuning
  var REST_ANGLE = 10;
  var ANGLE_FRICTION = 0.7;
  var ANGLE_VEL_INFLUENCE = 0.03;
  var ANGLE_DRIFT_BACK = 0.06;
  var ANGLE_MIN = -5;
  var ANGLE_MAX = 20;

  // Track state per hang tag
  var tagStates = {};

  // Current mouse position (always updated)
  var currentMouseX = 0;
  var currentMouseY = 0;

  // Currently active trigger ID
  var activeTriggerId = null;
  // Reference to the active trigger element (for scroll checking)
  var activeTriggerEl = null;
  // True while a hide animation is playing
  var isExiting = false;

  function getTagState(id) {
    if (!tagStates[id]) {
      tagStates[id] = {
        pinX: 0,
        pinY: 0,
        velX: 0,
        angle: REST_ANGLE,
        angleVel: 0,
        active: false,
        raf: null,
      };
    }
    return tagStates[id];
  }

  function getOffsetY() {
    return OFFSET_Y_REM * parseFloat(getComputedStyle(document.documentElement).fontSize);
  }

  function setupTag(tag) {
    document.body.appendChild(tag);
    tag.style.visibility = "hidden";
    tag.style.opacity = "0";
    tag.style.position = "fixed";
    tag.style.left = "0px";
    tag.style.top = "0px";
    tag.style.pointerEvents = "none";
    tag.style.zIndex = "999";
    tag.style.transformOrigin = "top left";
    tag.style.willChange = "transform, opacity";
  }

  function updatePhysics(tag, state) {
    if (!state.active) return;

    var targetX = currentMouseX;
    var targetY = currentMouseY + getOffsetY();

    var prevX = state.pinX;

    // Lerp — no overshoot
    state.pinX += (targetX - state.pinX) * FOLLOW;
    state.pinY += (targetY - state.pinY) * FOLLOW;

    // Derive velocity for angle
    state.velX = state.pinX - prevX;

    // Angle physics
    state.angleVel += state.velX * ANGLE_VEL_INFLUENCE;
    state.angleVel *= ANGLE_FRICTION;
    state.angle += state.angleVel;
    state.angle += (REST_ANGLE - state.angle) * ANGLE_DRIFT_BACK;
    state.angle = Math.max(ANGLE_MIN, Math.min(ANGLE_MAX, state.angle));

    tag.style.transform =
      "translate(" + state.pinX + "px, " + state.pinY + "px) rotate(" + state.angle + "deg)";

    state.raf = requestAnimationFrame(function () {
      updatePhysics(tag, state);
    });
  }

  function showTag(id) {
    var tag = document.querySelector('.problem_study-hangtag[data-hangtag="' + id + '"]');
    if (!tag) return;

    var state = getTagState(id);
    if (state.active || isExiting) return;

    state.pinX = currentMouseX;
    state.pinY = currentMouseY + getOffsetY();
    state.velX = 0;
    state.angle = REST_ANGLE;
    state.angleVel = 0;
    state.active = true;

    tag.style.transform =
      "translate(" + state.pinX + "px, " + state.pinY + "px) rotate(" + REST_ANGLE + "deg)";

    gsap.killTweensOf(tag);
    tag.style.visibility = "visible";
    tag.style.opacity = "1";
    gsap.fromTo(
      tag,
      { scale: 0 },
      { scale: 1, duration: 0.3, ease: "power2.out" }
    );

    state.raf = requestAnimationFrame(function () {
      updatePhysics(tag, state);
    });
  }

  function hideTag(id) {
    var tag = document.querySelector('.problem_study-hangtag[data-hangtag="' + id + '"]');
    if (!tag) return;

    var state = getTagState(id);
    if (!state.active) return;

    state.active = false;
    isExiting = true;
    if (state.raf) cancelAnimationFrame(state.raf);

    // Freeze position at last known physics state
    var frozenTransform =
      "translate(" + state.pinX + "px, " + state.pinY + "px) rotate(" + state.angle + "deg)";

    gsap.killTweensOf(tag);
    gsap.fromTo(
      tag,
      { scale: 1, transform: frozenTransform },
      {
        scale: 0,
        duration: 0.25,
        ease: "power2.in",
        onUpdate: function () {
          // Keep position locked, only let scale change
          var currentScale = gsap.getProperty(tag, "scale");
          tag.style.transform = frozenTransform + " scale(" + currentScale + ")";
        },
        onComplete: function () {
          tag.style.visibility = "hidden";
          tag.style.opacity = "0";
          isExiting = false;
        },
      }
    );
  }

  // Find the closest .problem_study-trigger ancestor
  function findTrigger(el) {
    while (el) {
      if (el.classList && el.classList.contains("problem_study-trigger")) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  // Check if cursor is still over the active trigger (for scroll events)
  function isCursorOverElement(el) {
    var rect = el.getBoundingClientRect();
    return (
      currentMouseX >= rect.left &&
      currentMouseX <= rect.right &&
      currentMouseY >= rect.top &&
      currentMouseY <= rect.bottom
    );
  }

  function init() {
    if (window.innerWidth < 992) return;
    document.querySelectorAll(".problem_study-hangtag").forEach(setupTag);

    // Track mouse position globally
    window.addEventListener("mousemove", function (e) {
      currentMouseX = e.clientX;
      currentMouseY = e.clientY;
    });

    // Detect hover via event delegation (works with SplitText DOM)
    document.addEventListener("mouseover", function (e) {
      var trigger = findTrigger(e.target);
      if (!trigger) return;

      var id = trigger.getAttribute("data-hangtag");
      if (!id || id === activeTriggerId) return;

      // Hide previous if switching triggers
      if (activeTriggerId) hideTag(activeTriggerId);

      activeTriggerId = id;
      activeTriggerEl = trigger;
      showTag(id);
    });

    document.addEventListener("mouseout", function (e) {
      var trigger = findTrigger(e.target);
      if (!trigger) return;

      // Ignore if moving to a child of the same trigger
      var related = e.relatedTarget;
      if (related && trigger.contains(related)) return;

      var id = trigger.getAttribute("data-hangtag");
      if (id && id === activeTriggerId) {
        hideTag(id);
        activeTriggerId = null;
        activeTriggerEl = null;
      }
    });

    // On scroll, check if cursor is still over the active trigger
    window.addEventListener("scroll", function () {
      if (!activeTriggerId || !activeTriggerEl) return;

      if (!isCursorOverElement(activeTriggerEl)) {
        hideTag(activeTriggerId);
        activeTriggerId = null;
        activeTriggerEl = null;
      }
    }, { passive: true });
  }

  // Wait for fonts + SplitText to finish
  document.addEventListener("DOMContentLoaded", function () {
    var fontTimeout = 3500;
    var initialized = false;

    function run() {
      if (initialized) return;
      initialized = true;
      init();
    }

    document.fonts.ready.then(function () {
      setTimeout(run, 200);
    });
    setTimeout(run, fontTimeout);
  });
})();
