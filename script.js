(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.getElementById("year").textContent = new Date().getFullYear();

  // Nav: background on scroll + mobile menu
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");

  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 20);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const setMenu = (open) => {
    links.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  };
  toggle.addEventListener("click", () => setMenu(!links.classList.contains("open")));
  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  // Rotating headline words with a typewriter effect
  const words = [
    "get done",
    "be wired right",
    "be up to code",
    "be secured",
    "be drafted",
    "be built",
    "be fixed",
    "be designed",
    "run faster",
    "look great",
    "ride safer",
    "be figured out",
  ];
  const rotator = document.getElementById("rotator");

  if (!reduceMotion) {
    let wordIndex = 0;
    let charIndex = words[0].length;
    let deleting = true;

    const tick = () => {
      const word = words[wordIndex];
      if (deleting) {
        charIndex--;
        rotator.textContent = word.slice(0, charIndex);
        if (charIndex === 0) {
          deleting = false;
          wordIndex = (wordIndex + 1) % words.length;
        }
        setTimeout(tick, 45);
      } else {
        const next = words[wordIndex];
        charIndex++;
        rotator.textContent = next.slice(0, charIndex);
        if (charIndex === next.length) {
          deleting = true;
          setTimeout(tick, 1800);
        } else {
          setTimeout(tick, 85);
        }
      }
    };
    setTimeout(tick, 2200);
  }

  // Reveal elements as they scroll into view, staggering siblings
  const reveals = document.querySelectorAll(".reveal");
  reveals.forEach((el) => {
    el.addEventListener("transitionend", function done(e) {
      if (e.target !== el || e.propertyName !== "opacity") return;
      el.classList.remove("reveal", "visible");
      el.style.removeProperty("--delay");
      el.removeEventListener("transitionend", done);
    });
  });
  document.querySelectorAll(".cards, .work-grid, .hero").forEach((group) => {
    group.querySelectorAll(":scope > .reveal").forEach((el, i) => {
      el.style.setProperty("--delay", `${i * 0.08}s`);
    });
  });

  const countUp = (el) => {
    const target = Number(el.dataset.count);
    if (reduceMotion || target === 0) {
      el.textContent = target;
      return;
    }
    const duration = 1600;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          entry.target.querySelectorAll("[data-count]").forEach(countUp);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("visible"));
    document.querySelectorAll("[data-count]").forEach(countUp);
  }

  // Photo gallery lightbox
  const lightbox = document.getElementById("lightbox");
  if (lightbox && typeof lightbox.showModal === "function") {
    const lbImg = document.getElementById("lbImg");
    const lbCap = document.getElementById("lbCap");
    let shots = [];
    let current = 0;

    const show = (i) => {
      current = (i + shots.length) % shots.length;
      const img = shots[current].querySelector("img");
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      lbCap.innerHTML = shots[current].querySelector("figcaption").innerHTML;
    };

    document.querySelectorAll("[data-lightbox]").forEach((group) => {
      const groupShots = [...group.querySelectorAll(".shot")];
      groupShots.forEach((shot, i) => {
        shot.tabIndex = 0;
        shot.setAttribute("role", "button");
        const open = () => { shots = groupShots; show(i); lightbox.showModal(); };
        shot.addEventListener("click", open);
        shot.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
        });
      });
    });

    // PC build showcase: one large stage plus a thumbnail strip
    const showcase = document.getElementById("showcase");
    if (showcase) {
      const thumbs = [...showcase.querySelectorAll(".thumb")];
      const stage = showcase.querySelector(".stage");
      const stageImg = stage.querySelector(".stage-img");
      const stageBg = stage.querySelector(".stage-bg");
      const count = stage.querySelector(".stage-count");
      const title = stage.querySelector(".stage-caption strong");
      const sub = stage.querySelector(".stage-sub");
      let active = 0;
      let timer;

      const select = (i, animate = true) => {
        active = (i + thumbs.length) % thumbs.length;
        const img = thumbs[active].querySelector("img");
        const cap = thumbs[active].querySelector("figcaption");
        const apply = () => {
          stageImg.src = img.src;
          stageImg.alt = img.alt;
          stageBg.src = img.src;
          title.textContent = cap.querySelector("strong").textContent;
          sub.textContent = cap.querySelector("span").textContent;
          count.textContent = `${String(active + 1).padStart(2, "0")} / ${String(thumbs.length).padStart(2, "0")}`;
          stageImg.classList.remove("swap");
        };
        thumbs.forEach((t, j) => t.classList.toggle("active", j === active));
        if (animate && !reduceMotion) {
          stageImg.classList.add("swap");
          setTimeout(apply, 250);
        } else {
          apply();
        }
      };

      const restart = () => {
        clearInterval(timer);
        if (!reduceMotion) timer = setInterval(() => select(active + 1), 5000);
      };

      thumbs.forEach((t, i) => t.addEventListener("click", () => { select(i); restart(); }));
      stage.querySelector(".stage-prev").addEventListener("click", (e) => { e.stopPropagation(); select(active - 1); restart(); });
      stage.querySelector(".stage-next").addEventListener("click", (e) => { e.stopPropagation(); select(active + 1); restart(); });

      const openStage = () => { shots = thumbs; show(active); lightbox.showModal(); };
      stage.addEventListener("click", openStage);
      stage.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openStage(); }
      });

      showcase.addEventListener("mouseenter", () => clearInterval(timer));
      showcase.addEventListener("mouseleave", restart);

      select(0, false);
      restart();
    }

    lightbox.addEventListener("click", (e) => {
      const action = e.target.dataset.lb;
      if (action === "prev") show(current - 1);
      else if (action === "next") show(current + 1);
      else if (action === "close" || e.target === lightbox) lightbox.close();
    });

    lightbox.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });
  }

  // Ontario project map: site markers, plus tools popping up over sites and towers
  const ontSites = document.getElementById("ontSites");
  if (ontSites) {
    const svgNS = "http://www.w3.org/2000/svg";
    const gta = [
      [287, 341], [281, 344], [276, 347], [284, 337], [291, 337], [294, 339],
      [298, 336], [279, 340], [289, 344], [272, 344], [283, 349], [286, 334],
    ];
    const ontario = [
      [358, 296], [336, 328], [268, 325], [262, 350], [232, 364], [205, 384],
      [286, 357], [276, 353], [303, 326], [240, 250], [268, 258], [166, 252],
      [78, 256], [306, 334], [266, 344], [318, 316],
    ];

    const addSite = ([x, y], isGta, i) => {
      const ring = document.createElementNS(svgNS, "circle");
      ring.setAttribute("cx", x); ring.setAttribute("cy", y); ring.setAttribute("r", 3);
      ring.setAttribute("class", "site-ring");
      ring.style.animationDelay = `${(i * 0.37) % 3.2}s`;
      const dot = document.createElementNS(svgNS, "circle");
      dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", isGta ? 2 : 2.4);
      dot.setAttribute("class", isGta ? "site-dot gta" : "site-dot");
      ontSites.append(ring, dot);
    };
    ontario.forEach((p, i) => addSite(p, false, i));
    gta.forEach((p, i) => addSite(p, true, i + 3));

    const icons = {
      hammer: '<path d="M14 4l6 6-3 3-6-6z"/><path d="M11 7L3 15l3 3 8-8"/>',
      wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
      hardhat: '<path d="M3 18h18M5 18v-3a7 7 0 0 1 14 0v3M10 9V6h4v3"/>',
      bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
      drill: '<path d="M3 8h11v6H3zM14 9h4l3 2-3 2h-4M6 14v6h4v-6"/>',
      bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
      flame: '<path d="M12 2c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 1-3 0 2 1.5 3 1.5 3S9 8 12 2z"/>',
    };
    const iconNames = Object.keys(icons);

    const mapWrap = document.querySelector(".ont-map-wrap");
    const mapSvg = document.querySelector(".ont-map");
    const skyline = document.querySelector(".skyline");
    const towers = [...document.querySelectorAll(".skyline .tower")];

    const spawn = (container, left, top) => {
      const name = iconNames[Math.floor(Math.random() * iconNames.length)];
      const pop = document.createElement("span");
      pop.className = `tool-pop${name === "bell" || name === "flame" ? " fire" : ""}`;
      pop.style.left = `${left}px`;
      pop.style.top = `${top}px`;
      pop.innerHTML = `<svg viewBox="0 0 24 24">${icons[name]}</svg>`;
      const puff = document.createElement("span");
      puff.className = "puff";
      puff.style.left = `${left}px`;
      puff.style.top = `${top + 10}px`;
      container.append(puff, pop);
      setTimeout(() => { pop.remove(); puff.remove(); }, 1900);
    };

    const popOnMap = () => {
      const useGta = Math.random() < 0.65;
      const list = useGta ? gta : ontario;
      const [x, y] = list[Math.floor(Math.random() * list.length)];
      const wrapBox = mapWrap.getBoundingClientRect();
      const svgBox = mapSvg.getBoundingClientRect();
      const scale = Math.min(svgBox.width, svgBox.height) / 400;
      const offX = svgBox.left - wrapBox.left + (svgBox.width - 400 * scale) / 2;
      const offY = svgBox.top - wrapBox.top + (svgBox.height - 400 * scale) / 2;
      const jitter = useGta ? (Math.random() - 0.5) * 10 : 0;
      spawn(mapWrap, offX + (x + jitter) * scale, offY + (y + jitter) * scale - 14);
    };

    const popOnSkyline = () => {
      const tower = towers[Math.floor(Math.random() * towers.length)];
      const box = tower.getBoundingClientRect();
      const sky = skyline.getBoundingClientRect();
      spawn(skyline, box.left - sky.left + box.width / 2, box.top - sky.top - 16);
    };

    if (!reduceMotion) {
      let popTimer = null;
      const start = () => {
        if (popTimer) return;
        popTimer = setInterval(() => (Math.random() < 0.6 ? popOnMap() : popOnSkyline()), 420);
      };
      const stop = () => { clearInterval(popTimer); popTimer = null; };
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()))
          .observe(document.querySelector(".ont-visual"));
      } else {
        start();
      }
    }
  }

  // Remote support checklist: tick tasks in order, hold, then restart
  const rdTasks = [...document.querySelectorAll(".rd-tasks li")];
  const rdMeter = document.querySelector(".rd-meter div");
  if (rdTasks.length && rdMeter) {
    const setProgress = (n) => {
      rdTasks.forEach((li, i) => li.classList.toggle("done", i < n));
      rdMeter.style.width = `${18 + (82 * n) / rdTasks.length}%`;
    };
    if (reduceMotion) {
      setProgress(rdTasks.length);
    } else {
      let n = 0;
      const step = () => {
        n = n >= rdTasks.length ? 0 : n + 1;
        setProgress(n);
        setTimeout(step, n === 0 ? 700 : n === rdTasks.length ? 3000 : 850);
      };
      step();
    }
  }

  if (reduceMotion) return;

  // Pointer effects (desktop only)
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  if (!finePointer) return;

  const glow = document.querySelector(".cursor-glow");
  window.addEventListener(
    "pointermove",
    (e) => {
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
    },
    { passive: true }
  );

  // Spotlight + subtle 3D tilt on service cards
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      card.style.setProperty("--mx", `${x}px`);
      card.style.setProperty("--my", `${y}px`);
      const rx = ((y / r.height) - 0.5) * -8;
      const ry = ((x / r.width) - 0.5) * 8;
      card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
})();
