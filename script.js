/* Sathyaya — menu + scroll storytelling (GSAP 3 + ScrollTrigger)
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

  // --- Hero: orchestrated intro — letters surface from below a mask ---
  var wordmark = document.querySelector(".hero-wordmark");
  var heroRise = gsap.utils.toArray(".hero [data-rise]").filter(function (el) {
    return el !== wordmark;
  });

  var letters = [];
  if (wordmark) {
    var text = wordmark.textContent;
    wordmark.setAttribute("aria-label", text);
    wordmark.style.overflow = "hidden"; // mask: letters rise from below the baseline
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

  gsap.timeline({ defaults: { ease: "power4.out" } })
    .from(letters, { yPercent: 130, rotation: 7, autoAlpha: 0, duration: 1.4, stagger: 0.06 }, 0.15)
    .from(heroRise, { y: 50, autoAlpha: 0, duration: 1.1, stagger: 0.14 }, 0.85);

  // --- Hero: recedes and fades as you scroll into the story ---
  gsap.to(".hero", {
    yPercent: -8,
    autoAlpha: 0,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom 45%",
      scrub: true
    }
  });

  // --- The thread story: a dark room; each line gets its own image.
  //     During "the erasure" the picture drains of colour; it returns for the truth. ---
  var story = document.querySelector(".story");
  if (story) {
    story.classList.add("is-pinned");
    var steps = gsap.utils.toArray(".story-step");
    var imgs = gsap.utils.toArray(".story-img");
    gsap.set(steps, { autoAlpha: 0, y: 80, scale: 0.96 });
    gsap.set(imgs, { autoAlpha: 0, scale: 1.08, filter: "grayscale(0) brightness(1)" });

    var storyTl = gsap.timeline({
      scrollTrigger: {
        trigger: story,
        start: "top top",
        end: "+=" + steps.length * 100 + "%",
        pin: true,
        scrub: 0.6
      }
    });

    steps.forEach(function (step, i) {
      var img = imgs[i];
      storyTl.to(step, { autoAlpha: 1, y: 0, scale: 1, duration: 1, ease: "power2.out" });
      if (img) {
        storyTl.to(img, { autoAlpha: 0.85, scale: 1, duration: 1.2, ease: "power2.out" }, "<");
      }
      if (i === 2 && img) {
        // the erasure: the image drains while its line is on screen
        storyTl.to(img, { filter: "grayscale(1) brightness(0.45)", duration: 1.1, ease: "power1.inOut" }, "+=0.1");
      } else {
        storyTl.to({}, { duration: 0.5 }); // hold
      }
      if (i < steps.length - 1) {
        storyTl.to(step, { autoAlpha: 0, y: -80, duration: 0.9, ease: "power2.in" });
        if (img) {
          storyTl.to(img, { autoAlpha: 0, duration: 0.9 }, "<");
        }
      } else {
        storyTl.to({}, { duration: 0.7 }); // hold the truth before unpinning
      }
    });
  }

  // --- Text below the fold: rise and fade in on scroll ---
  gsap.utils.toArray("[data-rise]").forEach(function (el) {
    if (el.closest(".hero")) return;
    gsap.from(el, {
      y: 56,
      autoAlpha: 0,
      duration: 1.1,
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
      y: 56,
      autoAlpha: 0,
      duration: 1.1,
      ease: "power3.out",
      stagger: 0.14,
      scrollTrigger: {
        trigger: group,
        start: "top 85%",
        once: true
      }
    });
  });

  // --- Full-bleed breaks: the frame opens as you approach, image drifts inside ---
  gsap.utils.toArray(".break").forEach(function (breakEl) {
    gsap.fromTo(breakEl,
      { clipPath: "inset(14% 8% 14% 8%)" },
      {
        clipPath: "inset(0% 0% 0% 0%)",
        ease: "none",
        scrollTrigger: {
          trigger: breakEl,
          start: "top 95%",
          end: "top 25%",
          scrub: true
        }
      }
    );
  });

  // --- Images: gentle parallax (image drifts slower than scroll) ---
  gsap.utils.toArray(".media[data-parallax] img").forEach(function (img) {
    gsap.fromTo(
      img,
      { yPercent: -8 },
      {
        yPercent: 8,
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

  // --- Break lines: words surface one by one, scrubbed to scroll ---
  gsap.utils.toArray(".break-line em").forEach(function (em) {
    em.innerHTML = em.textContent
      .split(" ")
      .map(function (w) { return '<span class="w">' + w + "</span>"; })
      .join(" ");
    gsap.from(em.querySelectorAll(".w"), {
      autoAlpha: 0.12,
      y: 20,
      stagger: 0.15,
      ease: "none",
      scrollTrigger: {
        trigger: em.closest(".break"),
        start: "top 75%",
        end: "center center",
        scrub: true
      }
    });
  });

  // --- The craft, up close: pin and scrub the film strip sideways ---
  var strip = document.querySelector(".strip");
  if (strip) {
    var stripTrack = strip.querySelector(".strip-track");
    strip.classList.add("is-pinned");
    gsap.to(stripTrack, {
      x: function () {
        return -(stripTrack.scrollWidth - document.documentElement.clientWidth);
      },
      ease: "none",
      scrollTrigger: {
        trigger: strip,
        start: "top top",
        end: function () {
          return "+=" + (stripTrack.scrollWidth - document.documentElement.clientWidth);
        },
        pin: true,
        scrub: 0.5,
        invalidateOnRefresh: true
      }
    });
  }

  // --- Marquee: driven by scroll — speeds up, and reverses when you scroll back up ---
  var track = document.querySelector(".marquee-track");
  if (track) {
    track.style.animation = "none";
    var loop = gsap.to(track, { xPercent: -50, ease: "none", duration: 26, repeat: -1 });
    var proxy = { ts: 1 };
    ScrollTrigger.create({
      trigger: document.body,
      start: 0,
      end: "max",
      onUpdate: function (self) {
        var v = gsap.utils.clamp(-2400, 2400, self.getVelocity());
        proxy.ts = 1 + v / 500;
        loop.timeScale(proxy.ts);
        gsap.killTweensOf(proxy);
        gsap.to(proxy, {
          ts: 1,
          duration: 1.2,
          ease: "power2.out",
          onUpdate: function () { loop.timeScale(proxy.ts); }
        });
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
})();
