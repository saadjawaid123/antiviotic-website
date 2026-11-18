/* Antiviotic: scroll choreography (GSAP 3.13 + ScrollTrigger + SplitText + Lenis, Three.js scenes from js/chip.js) */
(() => {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- WebGL scenes ---------- */
  const chip = window.AVChip ? window.AVChip.init($("#chip-canvas")) : null;
  const shield = window.AVParticles ? window.AVParticles.init($("#shield-canvas")) : null;
  // The CTA chip is only built when the visitor gets near the end of the page (saves a WebGL scene at load)
  const C = { rotX: 0.9, rotY: -0.8, scale: 0.5, y: 1.35, reveal: 0, logo: 1, glow: 0.8, introY: 0, introA: 0, intensity: 0.9 };
  let ctaChip = null;
  const makeCta = () => (ctaChip || !window.AVChip ? ctaChip : (ctaChip = window.AVChip.init($("#cta-canvas"), C, C)));
  if (!chip) document.documentElement.classList.add("no-webgl");
  const S = chip ? chip.state : {};
  const P = shield ? shield.state : {};
  // Each scene renders only while its section is on screen
  const runWhileVisible = (scene, trigger) => scene && ScrollTrigger.create({ trigger, start: "top bottom", end: "bottom top", onToggle: (s) => scene.setActive(s.isActive) });

  /* Looping CSS animations (threat cards, vault, FAQ dots, footer) only run while their section is on screen */
  const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("is-off", !e.isIntersecting)), { rootMargin: "200px 0px" });
  $$(".threats, .privacy, .faq, .footer, .tour").forEach((el) => io.observe(el));

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const target = $(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis ? lenis.scrollTo(target, { duration: 1.6 }) : target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    })
  );

  /* ---------- Rolling letters for links and buttons ---------- */
  $$(".nav__links a, .footer__cols a").forEach((a) => (a.innerHTML = `<span data-roll>${a.textContent}</span>`));
  $$("[data-roll]").forEach((el) => {
    const text = el.textContent.trim();
    const host = el.closest("a, button");
    if (host && !host.hasAttribute("aria-label")) host.setAttribute("aria-label", text);
    el.innerHTML = [...text].map((c, i) => `<span class="rc" style="--i:${i}" aria-hidden="true">${c}</span>`).join("");
  });

  /* ---------- Buttons: magnetic pull, glow that follows the cursor ---------- */
  if (fine && !reduce) {
    $$(".pill, .ghost").forEach((b) => {
      const mx = gsap.quickTo(b, "x", { duration: 0.6, ease: "power3" }), my = gsap.quickTo(b, "y", { duration: 0.6, ease: "power3" });
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.22);
        my((e.clientY - r.top - r.height / 2) * 0.35);
        b.style.setProperty("--gx", e.clientX - r.left + "px");
        b.style.setProperty("--gy", e.clientY - r.top + "px");
      });
      b.addEventListener("pointerleave", () => { mx(0); my(0); });
    });
    const navInner = $(".nav__inner");
    navInner.addEventListener("pointermove", (e) => navInner.style.setProperty("--nx", e.clientX - navInner.getBoundingClientRect().left + "px"));
  }

  /* ---------- Header: glass pill on scroll, sliding highlight, progress line, mobile menu ---------- */
  const nav = $(".nav"), pill = $(".nav__pill"), navLinks = $$(".nav__links a");
  let currentLink = null;
  const movePill = (a) => a
    ? gsap.to(pill, { x: a.offsetLeft, width: a.offsetWidth, opacity: 1, duration: reduce ? 0 : 0.5, ease: "power3.out" })
    : gsap.to(pill, { opacity: 0, duration: 0.3 });
  navLinks.forEach((a) => a.addEventListener("mouseenter", () => movePill(a)));
  $(".nav__links").addEventListener("mouseleave", () => movePill(currentLink));

  // Created after the pinned sections so their positions include pin spacing
  function navTriggers() {
    const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 24); // a plain listener stays "on" even at the very bottom
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: (s) => gsap.set(".nav__progress i", { scaleX: s.progress }) });
    ["overview", "security", "privacy", "threats", "faq"].forEach((id) => {
      const link = $(`.nav__links a[href="#${id}"]`);
      ScrollTrigger.create({
        trigger: "#" + id, start: "top center", end: "bottom center",
        onToggle: (s) => {
          link.classList.toggle("is-active", s.isActive);
          if (s.isActive) currentLink = link; else if (currentLink === link) currentLink = null;
          movePill(currentLink);
        },
      });
    });
  }

  // Mobile menu
  const burger = $(".nav__burger"), menu = $("#menu");
  const menuTl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } })
    .to(menu, { autoAlpha: 1, duration: 0.4, ease: "power2.out" })
    .from(".menu__links a", { yPercent: 110, duration: 0.8, stagger: 0.06 }, 0.1)
    .from(".menu__cta", { y: 20, autoAlpha: 0, duration: 0.6 }, 0.35);
  const setMenu = (open) => {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.setAttribute("aria-hidden", String(!open));
    open ? (menuTl.timeScale(1).play(), lenis && lenis.stop()) : (menuTl.timeScale(1.6).reverse(), lenis && lenis.start());
  };
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  $$("#menu a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", (e) => e.key === "Escape" && burger.getAttribute("aria-expanded") === "true" && setMenu(false));

  /* ---------- Footer: back to top, wordmark spotlight ---------- */
  $(".totop").addEventListener("click", () => (lenis ? lenis.scrollTo(0, { duration: 2 }) : scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })));
  const mark = $(".footer__mark");
  if (fine) mark.parentElement.addEventListener("pointermove", (e) => {
    const r = mark.getBoundingClientRect();
    gsap.to(mark, { "--mx": e.clientX - r.left + "px", "--my": e.clientY - r.top + "px", duration: 0.5, ease: "power3.out" });
  });

  window.AV.form(document.querySelector(".waitlist"), "/api/waitlist", (d) => d.already ? "You are already on the list. We will email you at launch." : "You are on the list. We will email you at launch.");

  /* ---------- Reduced motion: final states, no pins ---------- */
  if (reduce) {
    Object.assign(S, { rotX: 1.12, rotY: 0.16, scale: 0.9, y: 0.6, reveal: 1.15, logo: 1, glow: 1, introY: 0, introA: 1 });
    Object.assign(P, { morph: 1 });
    Object.assign(C, { rotX: 1.38, rotY: 0.1, reveal: 1.15, introA: 1 });
    makeCta();
    [chip, shield, ctaChip].forEach((x) => x && x.renderOnce());
    gsap.set(".ov-stat, .zoom__after, .vault__badge", { autoAlpha: 1 });
    gsap.set(".zoom__title", { autoAlpha: 0 });
    $$(".tour__cap").slice(1).forEach((c) => (c.style.display = "none"));
    $$(".screen").slice(1).forEach((c) => (c.style.display = "none"));
    navTriggers();
    return;
  }

  chip && chip.setActive(true);

  /* ---------- Hero intro ---------- */
  gsap.set(".hero-eyebrow, .hero-sub, .hero-ctas", { autoAlpha: 0, y: 24 });
  document.fonts.ready.then(() => {
    const title = SplitText.create(".hero-title", { type: "chars", charsClass: "char" });
    gsap.timeline({ defaults: { ease: "expo.out" } })
      .to(".hero-eyebrow", { autoAlpha: 1, y: 0, duration: 1.2 }, 0.1)
      .from(title.chars, { autoAlpha: 0, yPercent: 30, filter: "blur(8px)", duration: 1.6, stagger: 0.045, clearProps: "filter" }, 0.2)
      .to(".hero-sub", { autoAlpha: 1, y: 0, duration: 1.2 }, 0.75)
      .to(".hero-ctas", { autoAlpha: 1, y: 0, duration: 1.2 }, 0.9)
      .to(S, { introY: 0, introA: 1, duration: 2.6, ease: "power3.out" }, 0)
      .to(S, { reveal: 0.12, duration: 2.4, ease: "power2.out" }, 0.8);
    buildScroll();
  });

  function buildScroll() {
    /* 1. Overview: chip rises, turns to face you, circuits light up */
    gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: ".overview", start: "top top", end: "+=340%", pin: true, scrub: 1.2, onLeave: () => chip && chip.setActive(false), onEnterBack: () => chip && chip.setActive(true) },
    })
      .to(".hero-copy", { autoAlpha: 0, scale: 0.9, y: -50, duration: 1.6 }, 0)
      .to(S, { rotX: 1.12, rotY: 0.16, scale: 0.98, y: 0.62, duration: 6, ease: "power2.inOut" }, 0)
      .to(S, { reveal: 1.15, duration: 5, ease: "power1.inOut" }, 0.8)
      .to(S, { logo: 1, glow: 1, duration: 2.5 }, 3)
      .fromTo(".ov-cap", { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 1.3, ease: "power2.out" }, 2.6)
      .to(".ov-cap", { autoAlpha: 0, y: -30, duration: 1, ease: "power2.in" }, 5.4)
      .to(S, { scale: 0.82, y: 0.62, rotX: 1.18, rotY: 0.08, duration: 2.2, ease: "power2.inOut" }, 6)
      .fromTo(".ov-stat", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.3, ease: "power2.out" }, 6.4)
      .to(S, { intensity: 0.6, duration: 1.5 }, 8.5)
      .to({}, { duration: 0.6 });

    /* 2. Security: title zooms in over red threat particles, then the particles fly together into the shield */
    const zoomTl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: ".zoom", start: "top top", end: "+=280%", pin: true, scrub: 1 } });
    zoomTl
      .fromTo(".zoom__title", { scale: 3.4, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 3, ease: "power3.out" }, 0)
      .fromTo(P, { alpha: 0 }, { alpha: 1, duration: 2 }, 0)
      .to(".zoom__title", { backgroundPosition: "100% 0", duration: 2, ease: "none" }, 2.4)
      .to(".zoom__title", { autoAlpha: 0, scale: 0.8, duration: 1.2, ease: "power2.in" }, 4.6)
      .to(P, { morph: 1, duration: 3.4, ease: "power2.inOut" }, 4.8)
      .fromTo(".zoom__after", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: "power2.out" }, 7.6)
      .to({}, { duration: 1 });
    // Keep the particle scene running from one screen before the pin until one screen after it
    shield && ScrollTrigger.create({ start: () => zoomTl.scrollTrigger.start - innerHeight, end: () => zoomTl.scrollTrigger.end + innerHeight, onToggle: (s) => shield.setActive(s.isActive) });

    /* 3. Phone tour */
    const caps = $$(".tour__cap"), screens = $$(".screen"), dots = $$(".tour__progress li"), words = $$(".tour__words span");
    const auras = ["#ff453a", "#ff9f0a", "#5e5ce6", "#30d158"];
    gsap.set(caps.slice(1), { autoAlpha: 0, y: 50 });
    gsap.set(screens.slice(1), { autoAlpha: 0 });
    gsap.set(words[0], { autoAlpha: 1 });
    gsap.set(".sheet", { yPercent: 112 });
    gsap.set(".toast", { yPercent: 150 });
    gsap.set(".notif--front", { autoAlpha: 0, y: -50, scale: 0.92 });
    gsap.set(".dash-ring", { scale: 0.6, autoAlpha: 0, rotate: -90 });
    gsap.set(".dash-grid div", { autoAlpha: 0, y: 20 });

    // Phone swings in from a 3D angle before the section pins
    gsap.from(".phone-tilt", { y: 260, rotateY: -38, rotateX: 22, scale: 0.78, ease: "none", scrollTrigger: { trigger: ".tour", start: "top bottom", end: "top top", scrub: 1 } });
    gsap.from(".tour__aura", { scale: 0.3, opacity: 0, ease: "none", scrollTrigger: { trigger: ".tour", start: "top bottom", end: "top top", scrub: 1 } });

    const nums = $$(".dash-grid b[data-n]");
    const counter = { v: 0 };
    const total = 13.5;
    const tour = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: ".tour", start: "top top", end: "+=420%", pin: true, scrub: 1,
        onUpdate: (s) => {
          const t = s.progress * total;
          const idx = t < 3 ? 0 : t < 6.6 ? 1 : t < 10 ? 2 : 3;
          dots.forEach((d, k) => d.classList.toggle("is-on", k === idx));
          gsap.set(".tour__bar i", { scaleY: s.progress });
        },
      },
    });
    // Slow continuous turn of the phone + drifting background words
    tour.fromTo(".phone-tilt", { rotateY: 9, rotateX: 4 }, { rotateY: -9, rotateX: -2, duration: total }, 0)
      .fromTo(".tour__words", { xPercent: 6 }, { xPercent: -6, duration: total }, 0);

    // A new screen is "scanned in" top to bottom: the wipe edge rides the beam, so the old screen never shows through
    const swap = (i, at) => {
      tour.to(caps[i - 1], { autoAlpha: 0, y: -50, duration: 0.6, ease: "power2.in" }, at)
        .to(caps[i], { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out" }, at + 0.45)
        .fromTo(screens[i], { autoAlpha: 1, clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "power1.inOut" }, at + 0.1)
        .fromTo(".scanbeam", { yPercent: -100 }, { yPercent: 194, duration: 1.1, ease: "power1.inOut" }, at + 0.1)
        .set(".scanbeam", { yPercent: -110 }, at + 1.25)
        .set(screens[i - 1], { autoAlpha: 0 }, at + 1.25)
        .to(".tour__aura", { "--aura": auras[i], duration: 0.9 }, at + 0.1)
        .to(words[i - 1], { autoAlpha: 0, duration: 0.5 }, at)
        .fromTo(words[i], { autoAlpha: 0, scale: 1.15 }, { autoAlpha: 1, scale: 1, duration: 0.9, ease: "power2.out" }, at + 0.4);
    };

    tour.fromTo(".scanbeam", { yPercent: -100 }, { yPercent: 194, duration: 1.1, ease: "power1.inOut" }, 0.1)
      .set(".scanbeam", { yPercent: -110 }, 1.25)
      .to(".msg-link", { backgroundColor: "rgba(255,69,58,0.35)", color: "#ff6961", duration: 0.5 }, 0.6)
      .to(".sheet", { yPercent: 0, duration: 1.2, ease: "power3.out" }, 1)
      .from(".sheet__icon", { scale: 0.4, rotate: -20, duration: 0.8, ease: "back.out(2)" }, 1.5);
    swap(1, 3);
    tour.to(".ring__fg", { strokeDashoffset: 0, duration: 1.3, ease: "power1.inOut" }, 4.1)
      .to(".ring", { autoAlpha: 0, scale: 0.6, duration: 0.3 }, 5.3)
      .to(".file--bad .badge", { autoAlpha: 1, duration: 0.3 }, 5.4)
      .to(".file--bad", { backgroundColor: "rgba(255,69,58,0.1)", duration: 0.4 }, 5.4)
      .to(".toast", { yPercent: 0, duration: 0.9, ease: "power3.out" }, 5.6);
    swap(2, 6.6);
    tour.to(".notif--front", { autoAlpha: 1, y: 0, scale: 1, duration: 1, ease: "back.out(1.4)" }, 7.7)
      .to(".notif--back", { y: 14, opacity: 0.4, duration: 0.8 }, 7.8);
    swap(3, 10);
    tour.to(".dash-ring", { scale: 1, autoAlpha: 1, rotate: 0, duration: 1.2, ease: "power3.out" }, 10.8)
      .to(".dash-grid div", { autoAlpha: 1, y: 0, stagger: 0.15, duration: 0.6 }, 11.3)
      .to(counter, { v: 1, duration: 1.2, onUpdate: () => nums.forEach((n) => (n.textContent = Math.round(+n.dataset.n * counter.v))) }, 11.3)
      .to({}, { duration: 0.6 }, total - 0.6);

    /* 4. Privacy: headline lights up word by word; trackers keep bouncing off the vault while it is on screen */
    const pWords = SplitText.create(".privacy__title", { type: "words", wordsClass: "w" });
    gsap.to(pWords.words, { color: "#f5f5f7", stagger: 0.1, ease: "none", scrollTrigger: { trigger: ".privacy__title", start: "top 85%", end: "bottom 50%", scrub: 0.6 } });
    gsap.from(".privacy__copy .eyebrow, .privacy__sub, .privacy__points li", { y: 30, autoAlpha: 0, duration: 1, stagger: 0.1, ease: "expo.out", scrollTrigger: { trigger: ".privacy__copy", start: "top 80%", once: true } });
    const vault = $(".vault"), trackers = $$(".tracker");
    const far = () => vault.offsetWidth * 0.95, near = () => vault.offsetWidth * 0.38 + 17;
    const bounce = gsap.timeline({ repeat: -1, paused: true });
    trackers.forEach((t, i) => {
      const ang = (i / trackers.length) * Math.PI * 2 + 0.4, at = i * 0.55;
      bounce.fromTo(t, { x: () => Math.cos(ang) * far(), y: () => Math.sin(ang) * far(), autoAlpha: 0, scale: 0.6, rotate: 0 }, { x: () => Math.cos(ang) * near(), y: () => Math.sin(ang) * near(), autoAlpha: 1, scale: 1, duration: 0.8, ease: "power2.in" }, at)
        .to(t, { x: () => Math.cos(ang) * far() * 0.85, y: () => Math.sin(ang) * far() * 0.85, autoAlpha: 0, scale: 0.4, rotate: 180, duration: 0.8, ease: "power2.out" }, at + 0.8)
        .fromTo(".vault__flash", { opacity: 0.9, scale: 0.97 }, { opacity: 0, scale: 1.06, duration: 0.5, immediateRender: false }, at + 0.8);
    });
    bounce.to({}, { duration: 0.8 });
    gsap.timeline({ scrollTrigger: { trigger: ".vault", start: "top 80%", once: true } })
      .fromTo(".vault", { scale: 0.7, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.2, ease: "expo.out" })
      .fromTo(".vlock__shackle", { y: -20 }, { y: 0, duration: 0.8, ease: "bounce.out" }, 0.6)
      .fromTo(".vault__badge", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(2)" }, 1.2);
    ScrollTrigger.create({ trigger: ".vault", start: "top bottom", end: "bottom top", onToggle: (st) => (st.isActive ? bounce.play() : bounce.pause()) });

    /* 5. Stats panel: rises in, light sweeps across, numbers count */
    gsap.from(".stat", { y: 60, autoAlpha: 0, duration: 1.1, stagger: 0.1, ease: "expo.out", scrollTrigger: { trigger: ".stats", start: "top 85%", once: true } });
    gsap.to(".stats__shine", { xPercent: 200, duration: 1.8, delay: 0.4, ease: "power2.inOut", scrollTrigger: { trigger: ".stats", start: "top 80%", once: true } });
    $$(".stat__val[data-to]").forEach((el) => {
      const to = +el.dataset.to, dec = +(el.dataset.dec || 0), pre = el.dataset.pre || "", suf = el.dataset.suf || "";
      const o = { v: +(el.dataset.from || 0) };
      gsap.to(o, { v: to, duration: 1.8, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%", once: true }, onUpdate: () => (el.textContent = pre + o.v.toFixed(dec) + suf) });
    });

    // Spy-app eye follows the cursor (wanders on touch screens)
    const pupil = $(".sc-eye__pupil"), eye = $(".sc-eye");
    let eyeOn = false;
    ScrollTrigger.create({ trigger: ".threats", start: "top bottom", end: "bottom top", onToggle: (s) => (eyeOn = s.isActive) });
    if (fine) window.addEventListener("pointermove", (e) => {
      if (!eyeOn) return;
      const r = eye.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const a = Math.atan2(dy, dx), d = Math.min(1, Math.hypot(dx, dy) / 300);
      gsap.to(pupil, { x: Math.cos(a) * 40 * d, y: Math.sin(a) * 16 * d, duration: 0.4, overwrite: true });
    });
    else gsap.to(pupil, { x: "random(-36, 36)", y: "random(-14, 14)", duration: 1.2, ease: "power2.inOut", repeat: -1, repeatRefresh: true });

    // FAQ chat: question pops, Antiviotic "types", then answers
    $$(".chat__pair").forEach((pair) => {
      const q = $(".bq", pair), a = $(".ba", pair), ty = $(".typing", pair), av = $(".ba-av", pair);
      gsap.timeline({ scrollTrigger: { trigger: pair, start: "top 82%", once: true } })
        .fromTo(q, { autoAlpha: 0, scale: 0.6, y: 20 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.8)" })
        .fromTo(av, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.3 }, "+=0.3")
        .to(ty, { autoAlpha: 1, duration: 0.2 }, "<")
        .to(ty, { autoAlpha: 0, duration: 0.15 }, "+=1")
        .fromTo(a, { autoAlpha: 0, scale: 0.6, y: 20 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.8)" }, "<");
    });

    // Big headings: line-by-line mask reveal
    $$(".specs__title, .threats__head h2, .faq__title, .cta__title").forEach((el) =>
      SplitText.create(el, {
        type: "lines", mask: "lines", autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, { yPercent: 105, duration: 1.2, stagger: 0.12, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 85%", once: true } }),
      })
    );
    const rise = (sel, trigger, extra = {}) => gsap.from(sel, { y: 50, autoAlpha: 0, duration: 1.1, stagger: 0.12, ease: "expo.out", scrollTrigger: { trigger: trigger || sel, start: "top 85%", once: true }, ...extra });
    rise(".privacy__points li", ".privacy__points");
    rise(".threats__head p");
    rise(".faq__sub");
    rise(".cta__sub, .waitlist", ".cta__sub");


    /* 5. Threats: cover-flow horizontal scroll on desktop, swipe on mobile */
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1001px)", () => {
      const track = $(".threats__track"), cards = $$(".tcard");
      gsap.set(cards, { transformPerspective: 1200 });
      const rotY = cards.map((c) => gsap.quickSetter(c, "rotationY", "deg"));
      const scl = cards.map((c) => gsap.quickSetter(c, "scale"));
      // Card centres are measured once (on refresh); while scrolling only the track's x changes, so no layout reads per frame
      let centres = [], base = 0;
      const measure = () => { const tx = gsap.getProperty(track, "x"); base = track.getBoundingClientRect().left - tx; centres = cards.map((c) => c.offsetLeft + c.offsetWidth / 2); };
      const cover = () => {
        const mid = innerWidth / 2, tx = gsap.getProperty(track, "x");
        cards.forEach((c, i) => {
          const off = gsap.utils.clamp(-1.3, 1.3, (base + tx + centres[i] - mid) / mid);
          rotY[i](-off * 24);
          scl[i](1 - Math.abs(off) * 0.07);
        });
      };
      const dist = () => track.scrollWidth - innerWidth;
      gsap.to(track, { x: () => -dist(), ease: "none", scrollTrigger: { trigger: ".threats", start: "top top", end: () => "+=" + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, onUpdate: cover, onRefresh: () => { measure(); cover(); } } });
      measure(); cover();
    });
    mm.add("(max-width: 1000px)", () => rise(".tcard", ".threats__track"));

    /* 6. CTA: the chip returns, circuits race out behind the final message */
    ScrollTrigger.create({ trigger: ".cta", start: () => "top bottom+=" + innerHeight * 1.5, once: true, onEnter: makeCta });
    ScrollTrigger.create({ trigger: ".cta", start: "top bottom", end: "bottom top", onToggle: (s) => { const c = makeCta(); c && c.setActive(s.isActive); } });
    gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: ".cta", start: "top 85%", end: "top top", scrub: 1 } })
      .to(C, { introA: 1, duration: 0.6 }, 0)
      .to(C, { rotX: 1.38, rotY: 0.1, duration: 1, ease: "power2.out" }, 0)
      .to(C, { reveal: 1.15, duration: 1 }, 0.15);

    /* 7. Header logo draws in; footer rises in and the wordmark lifts up */
    $$(".nav .logo-shield, .nav .logo-pill").forEach((el) => { const l = el.getTotalLength(); gsap.fromTo(el, { strokeDasharray: l, strokeDashoffset: l }, { strokeDashoffset: 0, duration: 1.6, delay: 0.3, ease: "power2.inOut" }); });
    gsap.from(".footer__brand > *, .footer__cols > div", { y: 30, autoAlpha: 0, duration: 1, stagger: 0.08, ease: "expo.out", scrollTrigger: { trigger: ".footer", start: "top 85%", once: true } });
    gsap.fromTo(".footer__mark", { yPercent: 45, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, ease: "none", scrollTrigger: { trigger: ".footer__mark", start: "top bottom", end: "bottom bottom", scrub: 0.8 } });
    if (!fine) gsap.to(mark, { "--mx": "random(10, 90)%", "--my": "random(20, 80)%", duration: 2.5, ease: "sine.inOut", repeat: -1, repeatRefresh: true });

    navTriggers();
    ScrollTrigger.refresh();
  }
})();
