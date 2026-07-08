/* Sathyaya — menu + scroll animations (GSAP 3 + ScrollTrigger)
   Content is fully visible without JS; animations are additive.
   Respects prefers-reduced-motion. */

(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var motionOK = !reduceMotion && typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";

  // --- Overlay menu (works with or without GSAP; CSS drives the choreography) ---
  var btn = document.getElementById("menu-btn");
  var menu = document.getElementById("menu");

  if (btn && menu) {
    btn.hidden = false;

    function setMenu(open) {
      document.body.classList.toggle("menu-open", open);
      btn.setAttribute("aria-expanded", String(open));
    }

    btn.addEventListener("click", function () {
      setMenu(!document.body.classList.contains("menu-open"));
    });

    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("menu-open")) {
        setMenu(false);
        btn.focus();
      }
    });
  }

  if (!motionOK) return;

  gsap.registerPlugin(ScrollTrigger);

  // --- Hero: orchestrated intro on load ---
  var wordmark = document.querySelector(".hero-wordmark");
  var heroRise = gsap.utils.toArray(".hero [data-rise]").filter(function (el) {
    return el !== wordmark;
  });

  // split the wordmark into letters (accessible: label on the h1, letters hidden)
  var letters = [];
  if (wordmark) {
    var text = wordmark.textContent;
    wordmark.setAttribute("aria-label", text);
    wordmark.textContent = "";
    text.split("").forEach(function (ch) {
      var s = document.createElement("span");
      s.textContent = ch;
      s.setAttribute("aria-hidden", "true");
      s.style.display = "inline-block";
      wordmark.appendChild(s);
      letters.push(s);
    });
  }

  gsap.timeline({ defaults: { ease: "power3.out" } })
    .from(letters, { yPercent: 60, autoAlpha: 0, duration: 1.1, stagger: 0.055 }, 0.15)
    .from(heroRise, { y: 30, autoAlpha: 0, duration: 1, stagger: 0.12 }, 0.7);

  // --- Hero: recedes and fades as you scroll into the story ---
  gsap.to(".hero", {
    yPercent: -6,
    autoAlpha: 0,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom 45%",
      scrub: true
    }
  });

  // --- The thread story: pin and step through the four lines ---
  var story = document.querySelector(".story");
  if (story) {
    story.classList.add("is-pinned");
    var steps = gsap.utils.toArray(".story-step");
    gsap.set(steps, { autoAlpha: 0, y: 50 });

    var storyTl = gsap.timeline({
      scrollTrigger: {
        trigger: story,
        start: "top top",
        end: "+=" + steps.length * 85 + "%",
        pin: true,
        scrub: 0.6
      }
    });

    steps.forEach(function (step, i) {
      storyTl.to(step, { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out" });
      if (i < steps.length - 1) {
        storyTl.to(step, { autoAlpha: 0, y: -50, duration: 1, ease: "power2.in" }, "+=0.5");
      } else {
        storyTl.to({}, { duration: 0.8 }); // hold the last line before unpinning
      }
    });
  }

  // --- Full-bleed line: words surface one by one, scrubbed to scroll ---
  var breakEm = document.querySelector(".break-line em");
  if (breakEm) {
    breakEm.innerHTML = breakEm.textContent
      .split(" ")
      .map(function (w) { return '<span class="w">' + w + "</span>"; })
      .join(" ");
    gsap.from(breakEm.querySelectorAll(".w"), {
      autoAlpha: 0.12,
      y: 14,
      stagger: 0.15,
      ease: "none",
      scrollTrigger: {
        trigger: ".break",
        start: "top 75%",
        end: "center center",
        scrub: true
      }
    });
  }

  // --- Progress thread: draws down the page edge as you read ---
  var thread = document.querySelector(".thread");
  if (thread) {
    thread.classList.add("thread-on");
    gsap.to(thread.querySelector("i"), {
      scaleY: 1,
      ease: "none",
      scrollTrigger: {
        trigger: document.documentElement,
        start: 0,
        end: "max",
        scrub: true
      }
    });
  }

  // --- Text below the fold: rise and fade in on scroll ---
  gsap.utils.toArray("[data-rise]").forEach(function (el) {
    if (el.closest(".hero")) return;
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

  // --- Marquee: slight speed-up while scrolling fast (CSS runs the base loop) ---
  var track = document.querySelector(".marquee-track");
  if (track) {
    ScrollTrigger.create({
      trigger: ".marquee",
      start: "top bottom",
      end: "bottom top",
      onUpdate: function (self) {
        track.style.animationDuration = Math.abs(self.getVelocity()) > 800 ? "22s" : "38s";
      }
    });
  }
})();
