// The home page: falling maple leaves behind the page, the nav rule on scroll, and live status for the open-source PRs.

// ---------------------------------------------------------------- falling maple leaves
// Line drawings of Japanese maple (momiji) leaves. Each is drawn once into a small sprite at its own size and then only
// moved, so a frame is a dozen image draws. They fall, sway and tumble; they do not react to the pointer. About 30 frames
// a second; none under reduced motion, and none in a hidden tab (animation frames stop there).
(() => {
  const cv = document.getElementById("leaves");
  if (!cv || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = cv.getContext("2d");
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pt = (deg, r) => [r * Math.sin(deg * Math.PI / 180), -r * Math.cos(deg * Math.PI / 180)];   // 0 deg = up

  function leafShape(jit) {                        // unit leaf: centre lobe tip at distance 1, stem pointing down
    const lobes = [[-124, 0.42], [-84, 0.74], [-42, 0.93], [0, 1], [42, 0.93], [84, 0.74], [124, 0.42]]
      .map(([a, L]) => [a + rnd(-4, 4) * jit, L * (1 + rnd(-0.06, 0.06) * jit)]);
    const sinus = (i) => i < 0 ? pt(-170, 0.1) : i >= lobes.length - 1 ? pt(170, 0.1)
      : pt((lobes[i][0] + lobes[i + 1][0]) / 2, i === 0 || i === lobes.length - 2 ? 0.27 : 0.33);
    const out = [];
    lobes.forEach(([a, L], i) => {
      const T = pt(a, L);
      for (const [S, rev] of [[sinus(i - 1), false], [sinus(i), true]]) {   // up one side of the lobe, down the other
        const ax = [T[0] / L, T[1] / L], off = [S[0] - ax[0] * (S[0] * ax[0] + S[1] * ax[1]), S[1] - ax[1] * (S[0] * ax[0] + S[1] * ax[1])];
        let n = [-(T[1] - S[1]), T[0] - S[0]];
        const m = Math.hypot(n[0], n[1]); n = [n[0] / m, n[1] / m];
        if (n[0] * off[0] + n[1] * off[1] < 0) n = [-n[0], -n[1]];
        const side = [];
        for (let j = 1; j <= 7; j++) {                 // a slightly convex edge with small teeth toward the tip
          const t = j / 8, bulge = 0.06 * L * Math.sin(Math.PI * t) + (t > 0.4 ? (j % 2 ? 0.022 : -0.004) * L : 0);
          side.push([S[0] + (T[0] - S[0]) * t + n[0] * bulge, S[1] + (T[1] - S[1]) * t + n[1] * bulge]);
        }
        if (!rev) out.push(S, ...side, T); else out.push(...side.reverse());
      }
    });
    out.push(sinus(lobes.length - 1));
    return { out, tips: lobes.map(([a, L]) => pt(a, L * 0.86)) };
  }

  let W = 0, H = 0, dpr = 1, colours = [], leaves = [];
  const shapes = Array.from({ length: 4 }, () => leafShape(1));

  function readColours() {
    const css = getComputedStyle(document.documentElement);
    colours = [css.getPropertyValue("--teal").trim() || "#2c5f5f", css.getPropertyValue("--leaf-red").trim() || "#b5532f"];
  }
  function sprite(l) {                             // the leaf drawn once at its own size, so its lines stay crisp
    const s = l.px * dpr, c = document.createElement("canvas"), shape = shapes[l.shape];
    c.width = c.height = Math.ceil(2.4 * s);
    const g = c.getContext("2d");
    g.translate(c.width / 2, c.height * 0.46); g.scale(s, s);
    g.lineJoin = g.lineCap = "round"; g.strokeStyle = g.fillStyle = colours[l.red ? 1 : 0];
    g.beginPath(); shape.out.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.globalAlpha = 0.08; g.fill();
    g.globalAlpha = 1; g.lineWidth = dpr / s; g.stroke();
    g.globalAlpha = 0.55; g.lineWidth = 0.55 * dpr / s;           // veins, and the stem
    for (const [x, y] of shape.tips) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(x * 0.5 - y * 0.04, y * 0.5 + x * 0.04, x, y); g.stroke(); }
    g.globalAlpha = 1; g.lineWidth = 1.1 * dpr / s;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(0.02, 0.32, 0.12, 0.62); g.stroke();
    l.img = c;
  }

  function launch(l, top) {                        // a new fall for this leaf; it keeps its shape, colour and size
    Object.assign(l, {
      x: rnd(0, W), y: top ? rnd(-140, -50) : rnd(0, H), fall: rnd(16, 34), drift: rnd(-6, 6), swayA: rnd(10, 30),
      swayW: rnd(0.35, 0.8), phase: rnd(0, 6.28), rot: rnd(0, 6.28), spin: rnd(-0.25, 0.25), flipW: rnd(0.3, 1.1),
    });
    return l;
  }
  function makeLeaf() {
    const l = { shape: Math.floor(rnd(0, shapes.length)), red: Math.random() < 0.3, px: rnd(17, 30), alpha: rnd(0.28, 0.48) };
    sprite(l);
    return launch(l, false);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    readColours();
    const n = Math.max(5, Math.min(14, Math.round(W * H / 100000)));
    leaves = Array.from({ length: n }, makeLeaf);
  }

  let last = 0, t = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (now - last < 32) return;                   // about 30 frames a second
    const dt = Math.min((now - (last || now)) / 1000, 0.1);
    last = now; t += dt;
    ctx.setTransform(1, 0, 0, 1, 0, 0);            // clear only where each leaf was: far less to repaint than the screen
    for (const l of leaves) if (l.box) ctx.clearRect(l.box[0] - l.box[2], l.box[1] - l.box[2], 2 * l.box[2], 2 * l.box[2]);
    for (const l of leaves) {
      l.y += l.fall * dt; l.x += l.drift * dt; l.rot += l.spin * dt;
      const sway = Math.sin(l.swayW * t + l.phase);
      if (l.y > H + 50 || l.x < -60 || l.x > W + 60) launch(l, true);
      const img = l.img, k = 1 / dpr, x = l.x + l.swayA * sway;
      l.box = [x * dpr, l.y * dpr, 0.75 * img.width + 2];     // covers the sprite at any rotation
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(x, l.y);
      ctx.rotate(l.rot + 0.45 * sway);
      ctx.scale(k * Math.cos(l.flipW * t + l.phase), k);     // turning over as it falls
      ctx.globalAlpha = l.alpha;
      ctx.drawImage(img, -img.width / 2, -img.height * 0.46);
    }
  }

  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("themechange", () => { readColours(); leaves.forEach(sprite); });   // the switch, or the device
  requestAnimationFrame(frame);
})();

// ---------------------------------------------------------------- nav rule and PR status
(() => {
  const nav = document.getElementById("nav");
  if (nav) {
    const set = () => nav.classList.toggle("scrolled", window.scrollY > 40);
    window.addEventListener("scroll", set, { passive: true }); set();
  }
  // Refresh PR status badges from the GitHub API; the static text is the fallback.
  document.querySelectorAll("[data-pr]").forEach(async (el) => {
    const [owner, repo, num] = el.dataset.pr.split("/");
    try {
      const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${num}`);
      if (!r.ok) return;
      const pr = await r.json(), badge = el.querySelector(".status"), state = pr.merged_at ? "merged" : pr.state;
      badge.textContent = state;
      badge.classList.toggle("merged", state === "merged");
    } catch (e) { /* offline or rate-limited: keep the static badge */ }
  });
})();
