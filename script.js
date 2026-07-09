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
    .from(letters, {
      yPercent: 120,
      rotationX: -75,
      transformPerspective: 900,
      transformOrigin: "50% 100% -30px",
      autoAlpha: 0,
      duration: 1.5,
      stagger: 0.06
    }, 0.15)
    .from(heroRise, { y: 50, autoAlpha: 0, duration: 1.1, stagger: 0.14 }, 0.9);

  // --- Hero: the wordmark tilts gently toward the cursor (desktop only) ---
  if (window.matchMedia("(pointer: fine)").matches && wordmark) {
    var tiltX = gsap.quickTo(wordmark, "rotationY", { duration: 0.6, ease: "power2.out" });
    var tiltY = gsap.quickTo(wordmark, "rotationX", { duration: 0.6, ease: "power2.out" });
    gsap.set(wordmark, { transformPerspective: 900 });
    document.querySelector(".hero").addEventListener("mousemove", function (e) {
      var r = wordmark.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      tiltX(dx * 7);
      tiltY(dy * -7);
    });
    document.querySelector(".hero").addEventListener("mouseleave", function () {
      tiltX(0);
      tiltY(0);
    });
  }

  // --- Desktop only: full-site 3D. A woven plane runs behind the whole page,
  //     evolving with scroll, and content tilts with scroll velocity.
  //     Phones never download Three.js; the site works identically without it. ---
  var desktop3D =
    window.matchMedia("(pointer: fine)").matches && window.innerWidth >= 1024;

  if (desktop3D) {
    var threeScript = document.createElement("script");
    threeScript.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    threeScript.onload = initSite3D;
    document.head.appendChild(threeScript);

    // content leans in perspective with scroll speed, then settles.
    // pinned sections (.story, .strip) are excluded — ScrollTrigger owns their transforms.
    var skewTargets = gsap.utils.toArray(".section, .break, .marquee, .footer");
    gsap.set(skewTargets, { transformOrigin: "50% 50%", force3D: true });
    var skewSet = gsap.quickSetter(skewTargets, "skewY", "deg");
    var skewProxy = { v: 0 };
    var applySkew = function () { skewSet(skewProxy.v); };
    ScrollTrigger.create({
      trigger: document.body,
      start: 0,
      end: "max",
      onUpdate: function (self) {
        var v = gsap.utils.clamp(-3.5, 3.5, self.getVelocity() / -400);
        if (Math.abs(v) > Math.abs(skewProxy.v)) {
          skewProxy.v = v;
          applySkew();
          gsap.killTweensOf(skewProxy);
          gsap.to(skewProxy, { v: 0, duration: 0.9, ease: "power3.out", onUpdate: applySkew });
        }
      }
    });
  }

  function initSite3D() {
    try {
      var canvas = document.createElement("canvas");
      canvas.className = "site-3d";
      canvas.setAttribute("aria-hidden", "true");
      document.body.prepend(canvas);

      var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
      camera.position.set(0, 1.4, 7);
      camera.lookAt(0, -0.5, 0);

      // a wide plane of "threads" — the weave itself
      var geo = new THREE.PlaneGeometry(26, 15, 110, 62);
      var mat = new THREE.MeshBasicMaterial({
        color: 0x8a3324,
        wireframe: true,
        transparent: true,
        opacity: 0.12
      });
      var cloth = new THREE.Mesh(geo, mat);
      cloth.rotation.x = -Math.PI / 2.5; // laid back, receding like fabric on a table
      cloth.position.y = -1.6;
      scene.add(cloth);

      var pos = geo.attributes.position;
      var base = pos.array.slice();
      var mouse = { x: 0, y: 0 };
      var flow = { p: 0, turb: 0 };

      function size() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      size();
      window.addEventListener("resize", size);

      window.addEventListener("mousemove", function (e) {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
      });

      // scroll position calms the weave; scroll speed stirs it
      ScrollTrigger.create({
        trigger: document.body,
        start: 0,
        end: "max",
        onUpdate: function (self) {
          flow.p = self.progress;
          flow.turb = Math.min(1, flow.turb + Math.abs(self.getVelocity()) / 9000);
        }
      });

      var t = 0;
      function render(time, delta) {
        if (document.hidden) return;
        flow.turb *= 0.95; // turbulence dies down on its own
        var amp = (1 - flow.p * 0.5) * (1 + flow.turb * 1.6);
        t += ((delta || 16) / 1000) * (1 + flow.turb * 2);
        for (var i = 0; i < pos.count; i++) {
          var x = base[i * 3];
          var y = base[i * 3 + 1];
          pos.array[i * 3 + 2] =
            (Math.sin(x * 0.55 + t) * 0.42 +
              Math.cos(y * 0.7 + t * 0.8) * 0.32 +
              Math.sin((x + y) * 0.25 + t * 0.5) * 0.22) * amp;
        }
        pos.needsUpdate = true;
        mat.opacity = 0.12 - flow.p * 0.05 + flow.turb * 0.05;
        cloth.rotation.z += (mouse.x * 0.08 - cloth.rotation.z) * 0.04;
        cloth.rotation.x = -Math.PI / 2.5 + flow.p * 0.3; // slowly levels as you descend
        camera.position.x += (mouse.x * 0.9 - camera.position.x) * 0.04;
        camera.position.y += (1.4 - mouse.y * 0.5 - camera.position.y) * 0.04;
        camera.position.z = 7 - flow.p * 1.4; // gentle dolly-in over the page
        camera.lookAt(0, -0.5, 0);
        renderer.render(scene, camera);
      }
      gsap.ticker.add(render);
      render(0, 16); // paint the first frame immediately
    } catch (e) {
      // no WebGL — the site simply stays as it is
    }
  }

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

    var credits = gsap.utils.toArray(".story-credit");
    gsap.set(credits, { autoAlpha: 0 });
    // each line tips up from the floor of the dark room
    gsap.set(steps, { rotationX: 45, transformPerspective: 900, transformOrigin: "50% 100%" });
    gsap.set(imgs, { rotationX: 6, transformPerspective: 1400 });

    steps.forEach(function (step, i) {
      var img = imgs[i];
      var credit = credits[i];
      storyTl.to(step, { autoAlpha: 1, y: 0, scale: 1, rotationX: 0, duration: 1, ease: "power2.out" });
      if (img) {
        storyTl.to(img, { autoAlpha: 0.85, scale: 1, rotationX: 0, duration: 1.2, ease: "power2.out" }, "<");
      }
      if (credit) {
        storyTl.to(credit, { autoAlpha: 1, duration: 0.6 }, "<+=0.3");
      }
      if (i === 2 && img) {
        // the erasure: the image drains while its line is on screen
        storyTl.to(img, { filter: "grayscale(1) brightness(0.45)", duration: 1.1, ease: "power1.inOut" }, "+=0.1");
      } else {
        storyTl.to({}, { duration: 0.5 }); // hold
      }
      if (i < steps.length - 1) {
        storyTl.to(step, { autoAlpha: 0, y: -80, rotationX: -30, duration: 0.9, ease: "power2.in" });
        if (img) {
          storyTl.to(img, { autoAlpha: 0, duration: 0.9 }, "<");
        }
        if (credit) {
          storyTl.to(credit, { autoAlpha: 0, duration: 0.5 }, "<");
        }
      } else {
        storyTl.to({}, { duration: 0.7 }); // hold the truth before unpinning
      }
    });
  }

  // --- Text below the fold: rises and tips upright in perspective ---
  gsap.utils.toArray("[data-rise]").forEach(function (el) {
    if (el.closest(".hero")) return;
    gsap.from(el, {
      y: 56,
      rotationX: 24,
      transformPerspective: 900,
      transformOrigin: "50% 100%",
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

  // --- Grouped text: staggered rise with the same tilt ---
  gsap.utils.toArray("[data-rise-group]").forEach(function (group) {
    gsap.from(group.children, {
      y: 56,
      rotationX: 24,
      transformPerspective: 900,
      transformOrigin: "50% 100%",
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

  // --- Word-by-word reveals, scrubbed to scroll ---
  function splitWords(el) {
    el.innerHTML = el.textContent
      .split(" ")
      .map(function (w) { return '<span class="w" style="display:inline-block">' + w + "</span>"; })
      .join(" ");
    return el.querySelectorAll(".w");
  }

  // break lines
  gsap.utils.toArray(".break-line em").forEach(function (em) {
    gsap.from(splitWords(em), {
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

  // headlines marked data-words (manifesto)
  gsap.utils.toArray("[data-words]").forEach(function (el) {
    gsap.from(splitWords(el), {
      autoAlpha: 0.1,
      y: 24,
      stagger: 0.12,
      ease: "none",
      scrollTrigger: {
        trigger: el,
        start: "top 88%",
        end: "top 45%",
        scrub: true
      }
    });
  });

  // --- Pillar images: swing in from alternating sides like opening doors ---
  gsap.utils.toArray(".pillar-media").forEach(function (m, i) {
    var fromLeft = i % 2 === 0;
    gsap.from(m, {
      x: fromLeft ? -110 : 110,
      rotationY: fromLeft ? 40 : -40,
      transformPerspective: 1000,
      transformOrigin: fromLeft ? "0% 50%" : "100% 50%",
      autoAlpha: 0,
      duration: 1.3,
      ease: "power3.out",
      scrollTrigger: {
        trigger: m,
        start: "top 88%",
        once: true
      }
    });
  });

  // --- First film: the empty frame draws itself, then the note appears ---
  var frameRect = document.querySelector(".film-frame-rect");
  if (frameRect) {
    var perim = 2 * (638 + 358);
    gsap.set(frameRect, { strokeDasharray: perim, strokeDashoffset: perim });
    gsap.to(frameRect, {
      strokeDashoffset: 0,
      ease: "none",
      scrollTrigger: {
        trigger: ".film-frame",
        start: "top 90%",
        end: "center 55%",
        scrub: true
      }
    });
    gsap.from(".film-frame-note", {
      autoAlpha: 0,
      duration: 0.8,
      scrollTrigger: {
        trigger: ".film-frame",
        start: "center 60%",
        once: true
      }
    });
  }

  // --- Footer finale: the watermark rises to meet you ---
  var footerMark = document.querySelector(".footer-sinhala");
  if (footerMark) {
    gsap.from(footerMark, {
      yPercent: 45,
      ease: "none",
      scrollTrigger: {
        trigger: ".footer",
        start: "top bottom",
        end: "bottom bottom",
        scrub: true
      }
    });
  }

  // --- The craft, up close: pin and scrub the film strip sideways.
  //     Items curve away in perspective like cells on a carousel. ---
  var strip = document.querySelector(".strip");
  if (strip) {
    var stripTrack = strip.querySelector(".strip-track");
    var stripItems = gsap.utils.toArray(".strip-item");
    strip.classList.add("is-pinned");

    var curveItems = function () {
      var mid = document.documentElement.clientWidth / 2;
      stripItems.forEach(function (item) {
        var r = item.getBoundingClientRect();
        var offset = gsap.utils.clamp(-1, 1, (r.left + r.width / 2 - mid) / mid);
        gsap.set(item, {
          rotationY: offset * -18,
          z: Math.abs(offset) * -90,
          transformPerspective: 1200
        });
      });
    };

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
        invalidateOnRefresh: true,
        onUpdate: curveItems,
        onRefresh: curveItems
      }
    });
  }

  // --- Marquee: two rows drifting opposite ways, driven by scroll —
  //     they speed up with you and reverse when you scroll back up ---
  var tracks = gsap.utils.toArray(".marquee-track");
  if (tracks.length) {
    var loops = tracks.map(function (t, i) {
      t.style.animation = "none";
      return i % 2 === 0
        ? gsap.to(t, { xPercent: -50, ease: "none", duration: 26, repeat: -1 })
        : gsap.fromTo(t, { xPercent: -50 }, { xPercent: 0, ease: "none", duration: 30, repeat: -1 });
    });
    var proxy = { ts: 1 };
    var applyTs = function () {
      loops.forEach(function (l) { l.timeScale(proxy.ts); });
    };
    ScrollTrigger.create({
      trigger: document.body,
      start: 0,
      end: "max",
      onUpdate: function (self) {
        var v = gsap.utils.clamp(-2400, 2400, self.getVelocity());
        proxy.ts = 1 + v / 500;
        applyTs();
        gsap.killTweensOf(proxy);
        gsap.to(proxy, { ts: 1, duration: 1.2, ease: "power2.out", onUpdate: applyTs });
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
