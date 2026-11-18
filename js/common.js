/* Antiviotic: shared by every page. Glass header refraction, form sending, and the simple header on inner pages. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Glass refraction map: a lens-style edge that bends what is behind the pill (Chromium only, Safari/Firefox keep the blur) */
  const glass = () => {
    const el = document.querySelector(".nav__inner"), img = document.getElementById("nav-glass-map");
    if (!img || !/Chrome/.test(navigator.userAgent) || matchMedia("(prefers-reduced-transparency: reduce)").matches) return;
    const cv = document.createElement("canvas"), ctx = cv.getContext("2d");
    let last = "";
    const draw = () => {
      const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
      const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, h / 2), key = w + "x" + h + "x" + r;
      if (!w || !h || key === last) return;
      last = key;
      const q = 2, W = Math.ceil(w / q), H = Math.ceil(h / q), bevel = Math.min(16, h * 0.32) / q, rr = r / q; // drawn at half size, stretched by feImage
      cv.width = W; cv.height = H;
      const d = ctx.createImageData(W, H), px = d.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        // signed distance to the rounded rect and its outward normal
        const cx = Math.max(rr, Math.min(W - rr, x + 0.5)), cy = Math.max(rr, Math.min(H - rr, y + 0.5));
        let nx = x + 0.5 - cx, ny = y + 0.5 - cy, dist;
        const inCore = nx === 0 && ny === 0;
        if (inCore) {
          const dl = x + 0.5, dr = W - x - 0.5, dt = y + 0.5, db = H - y - 0.5, m = Math.min(dl, dr, dt, db);
          dist = m; nx = m === dl ? -1 : m === dr ? 1 : 0; ny = nx ? 0 : m === dt ? -1 : 1;
        } else { const l = Math.hypot(nx, ny); dist = rr - l; nx /= l; ny /= l; }
        const t = Math.max(0, 1 - dist / bevel), k = t * t * (3 - 2 * t) * 127, i = (y * W + x) * 4;
        px[i] = 128 - nx * k; px[i + 1] = 128 - ny * k; px[i + 2] = 128; px[i + 3] = 255;
      }
      ctx.putImageData(d, 0, 0);
      img.setAttribute("width", w); img.setAttribute("height", h);
      img.setAttribute("href", cv.toDataURL());
      el.classList.add("has-refract");
    };
    new ResizeObserver(draw).observe(el);
    el.addEventListener("transitionend", draw);
  };

  /* ---------- Forms: waitlist + contact, saved by worker.js ---------- */
  const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const form = (form, endpoint, done) => form && form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = form.querySelector("[role=status]"), btn = form.querySelector("button[type=submit]"), email = form.elements.email;
    const say = (text, bad) => {
      msg.classList.toggle("is-error", !!bad);
      msg.textContent = text;
      if (!reduce && window.gsap) gsap.fromTo(msg, { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5 });
    };
    if (!EMAIL_OK.test(email.value.trim())) { say("Please enter a valid email address.", true); email.focus(); return; }
    if (form.elements.message && form.elements.message.value.trim().length < 5) { say("Please write a short message.", true); form.elements.message.focus(); return; }
    form.classList.add("is-busy"); btn.disabled = true; say("Sending...");
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      form.reset(); say(done(data));
    } catch (err) {
      say(err.message && !/fetch|network|JSON/i.test(err.message) ? err.message : "Could not send right now. Please try again in a minute.", true);
    } finally { form.classList.remove("is-busy"); btn.disabled = false; }
  });
  /* Inner pages (no GSAP): header state, active link, mobile menu, rolling letters */
  const innerPage = () => {
    const nav = $(".nav"), burger = $(".nav__burger"), menu = $("#menu");
    const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 24);
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
    const setMenu = (open) => {
      burger.setAttribute("aria-expanded", String(open)); burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.setAttribute("aria-hidden", String(!open)); menu.classList.toggle("is-open", open);
    };
    burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
    addEventListener("keydown", (e) => e.key === "Escape" && setMenu(false));
    $$(".nav__links a, .footer__cols a").forEach((a) => (a.innerHTML = `<span data-roll>${a.textContent}</span>`));
    $$("[data-roll]").forEach((el) => {
      const text = el.textContent.trim(), host = el.closest("a, button");
      if (host && !host.hasAttribute("aria-label")) host.setAttribute("aria-label", text);
      el.innerHTML = [...text].map((c, i) => `<span class="rc" style="--i:${i}" aria-hidden="true">${c}</span>`).join("");
    });
    const t = $(".totop"); t && t.addEventListener("click", () => scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }));
  };

  /* Light / dark switch: remembers the choice; without one, follows the device setting */
  const root = document.documentElement;
  const isLight = () => root.dataset.theme === "light";
  const setTheme = (t, save) => {
    root.classList.add("theme-anim");
    root.dataset.theme = t;
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t === "light" ? "#f5f5f7" : "#000000";
    if (save) try { localStorage.setItem("av-theme", t); } catch (e) {}
    window.dispatchEvent(new CustomEvent("av-theme", { detail: t }));
    setTimeout(() => root.classList.remove("theme-anim"), 600);
  };
  const themeSwitch = () => {
    const b = $(".theme-btn"); if (!b) return;
    b.addEventListener("click", () => setTheme(isLight() ? "dark" : "light", true));
    matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
      try { if (localStorage.getItem("av-theme")) return; } catch (err) {}
      setTheme(e.matches ? "light" : "dark", false);
    });
  };

  window.AV = { form, isLight };
  const start = () => { glass(); themeSwitch(); if (document.body.dataset.page === "inner") innerPage(); };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", start) : start();
})();
