/* Sathyaya — scroll animations (GSAP 3 + ScrollTrigger)
   Content is fully visible without JS; animations are additive.
   Respects prefers-reduced-motion. */

(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // --- Text: rise and fade in ---
  gsap.utils.toArray("[data-rise]").forEach(function (el) {
    gsap.from(el, {
      y: 30,
      autoAlpha: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start: "top 88%",
        once: true
      }
    });
  });

  // --- Grouped text: staggered rise ---
  gsap.utils.toArray("[data-rise-group]").forEach(function (group) {
    gsap.from(group.children, {
      y: 30,
      autoAlpha: 0,
      duration: 1,
      ease: "power3.out",
      stagger: 0.12,
      scrollTrigger: {
        trigger: group,
        start: "top 85%",
        once: true
      }
    });
  });

  // --- Images: scale-down reveal inside overflow-hidden frame ---
  gsap.utils.toArray(".media img").forEach(function (img) {
    gsap.from(img, {
      scale: 1.08,
      duration: 1.2,
      ease: "power3.out",
      scrollTrigger: {
        trigger: img.closest(".media"),
        start: "top 85%",
        once: true
      }
    });
  });

  // --- Images: gentle parallax (image drifts slower than scroll) ---
  gsap.utils.toArray(".media[data-parallax] img").forEach(function (img) {
    gsap.fromTo(
      img,
      { yPercent: -6 },
      {
        yPercent: 6,
        ease: "none",
        scrollTrigger: {
          trigger: img.closest(".media"),
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      }
    );
  });
})();
