// The home page: a seasonal sky behind the page, the nav rule on scroll, and live status for the open-source PRs.

// ---------------------------------------------------------------- the sky
// What drifts past follows the four season starts of the traditional Japanese calendar: petals from risshun (about
// 4 February), fireflies from rikka (about 5 May), maple leaves from risshū (about 7 August), snow from rittō (about
// 7 November). ?season=spring|summer|autumn|winter shows one regardless of the date. Each mote is drawn once into a
// sprite at its own size and then only moved, about 30 frames a second; none under reduced motion, none in a hidden
// tab (animation frames stop there), no reaction to the pointer. Colours come from CSS tokens (--snow, --petal,
// --firefly, --shu, --kincha), so they follow the light/dark switch.
(() => {
  const cv = document.getElementById("sky");
  if (!cv || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = cv.getContext("2d");
  const rnd = (a, b) => a + Math.random() * (b - a);
  const css = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  const clear = (hex) => {                         // the same colour at zero opacity: gradients fade to it, not to black
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},0)` : "transparent";
  };
  const pt = (deg, r) => [r * Math.sin(deg * Math.PI / 180), -r * Math.cos(deg * Math.PI / 180)];   // 0 deg = up
  const blank = (px) => { const c = document.createElement("canvas"); c.width = c.height = Math.max(2, Math.ceil(px)); return c; };
  let W = 0, H = 0, dpr = 1;

  function season() {
    const asked = new URLSearchParams(location.search).get("season");
    if (["spring", "summer", "autumn", "winter"].includes(asked)) return asked;
    const d = new Date(), md = (d.getMonth() + 1) * 100 + d.getDate();          // 1107 is 7 November
    return md >= 1107 || md < 204 ? "winter" : md < 505 ? "spring" : md < 807 ? "summer" : "autumn";
  }

  // ---- winter: soft flakes at three depths (nearer is larger, brighter, faster), a few line-drawn crystals
  const winter = {
    count: () => Math.max(24, Math.min(90, Math.round(W * H / 15000))),
    make(i, n) {
      const crystal = i < Math.max(3, Math.round(n / 14));
      const depth = crystal ? rnd(0.75, 1) : [0.45, 0.7, 1][Math.floor(rnd(0, 3))];
      return { crystal, depth, r: crystal ? rnd(5, 9) : depth * rnd(1.1, 2.4),
               fall: crystal ? rnd(16, 26) : rnd(14, 24) + 26 * depth, alpha: crystal ? rnd(0.45, 0.7) : 0.2 + 0.5 * depth };
    },
    sprite(f) {
      const colour = css("--snow", "#9aaeba");
      if (!f.crystal) {
        const s = f.r * 2.6 * dpr, c = blank(2 * s), g = c.getContext("2d"), grad = g.createRadialGradient(s, s, 0, s, s, s);
        grad.addColorStop(0, colour); grad.addColorStop(0.45, colour); grad.addColorStop(1, clear(colour));
        g.fillStyle = grad; g.beginPath(); g.arc(s, s, s, 0, 2 * Math.PI); g.fill();
        return c;
      }
      const s = f.r * 1.15 * dpr, c = blank(2 * s), g = c.getContext("2d"), r = f.r;   // six arms, two pairs of branches
      g.translate(s, s); g.scale(dpr, dpr); g.strokeStyle = g.fillStyle = colour; g.lineCap = "round"; g.lineWidth = 1;
      for (let k = 0; k < 6; k++) {
        g.save(); g.rotate(k * Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -r);
        for (const [at, len] of [[0.45, 0.32], [0.72, 0.22]]) {
          g.moveTo(0, -r * at); g.lineTo(-r * len * 0.8, -r * (at + len * 0.6));
          g.moveTo(0, -r * at); g.lineTo(r * len * 0.8, -r * (at + len * 0.6));
        }
        g.stroke(); g.restore();
      }
      g.beginPath(); g.arc(0, 0, r * 0.12, 0, 2 * Math.PI); g.fill();
      return c;
    },
    launch(f, top) {
      Object.assign(f, { x: rnd(-20, W + 20), y: top ? rnd(-40, -10) : rnd(0, H), swayA: rnd(6, 26) * f.depth,
                         swayW: rnd(0.25, 0.7), phase: rnd(0, 6.28), rot: rnd(0, 6.28), spin: rnd(-0.35, 0.35) });
    },
    step(f, dt, t, breeze) {
      f.y += f.fall * dt; f.x += breeze * f.depth * dt; f.rot += f.spin * dt;
      if (f.y > H + 20 || f.x < -40 || f.x > W + 40) this.launch(f, true);
    },
    draw(f, t) {
      ctx.translate(f.x + f.swayA * Math.sin(f.swayW * t + f.phase), f.y);
      if (f.crystal) ctx.rotate(f.rot);
      return f.alpha;
    },
  };

  // ---- autumn: line drawings of Japanese maple (momiji) leaves that fall, sway and turn over
  function leafShape() {                           // unit leaf: centre lobe tip at distance 1, stem pointing down
    const lobes = [[-124, 0.42], [-84, 0.74], [-42, 0.93], [0, 1], [42, 0.93], [84, 0.74], [124, 0.42]]
      .map(([a, L]) => [a + rnd(-4, 4), L * (1 + rnd(-0.06, 0.06))]);
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
  const leafShapes = Array.from({ length: 4 }, leafShape);
  const tumble = {                                 // falling, swaying, turning over: shared by leaves and petals
    launch(l, top) {
      Object.assign(l, { x: rnd(0, W), y: top ? rnd(-140, -50) : rnd(0, H), drift: rnd(-6, 6), phase: rnd(0, 6.28),
                         rot: rnd(0, 6.28), spin: rnd(-1, 1) * l.spinMax, swayA: rnd(...l.swayRange),
                         swayW: rnd(0.35, 0.8), flipW: rnd(...l.flipRange), fall: rnd(...l.fallRange) });
    },
    step(l, dt, t, breeze) {
      l.y += l.fall * dt; l.x += (l.drift + 0.6 * breeze) * dt; l.rot += l.spin * dt;
      if (l.y > H + 50 || l.x < -60 || l.x > W + 60) this.launch(l, true);
    },
    draw(l, t) {
      const sway = Math.sin(l.swayW * t + l.phase);
      ctx.translate(l.x + l.swayA * sway, l.y);
      ctx.rotate(l.rot + 0.45 * sway);
      ctx.scale(Math.cos(l.flipW * t + l.phase), 1);                       // turning over as it falls
      return l.alpha;
    },
  };
  const autumn = {
    ...tumble,
    count: () => Math.max(5, Math.min(14, Math.round(W * H / 100000))),
    make: () => ({ shape: Math.floor(rnd(0, leafShapes.length)), gold: Math.random() < 0.3, px: rnd(17, 30),
                   alpha: rnd(0.32, 0.52), spinMax: 0.25, swayRange: [10, 30], flipRange: [0.3, 1.1], fallRange: [16, 34] }),
    sprite(l) {                                    // drawn once at its own size, so its lines stay crisp
      const s = l.px * dpr, c = blank(2.4 * s), g = c.getContext("2d"), shape = leafShapes[l.shape];
      g.translate(c.width / 2, c.height * 0.46); g.scale(s, s);
      g.lineJoin = g.lineCap = "round"; g.strokeStyle = g.fillStyle = l.gold ? css("--kincha", "#b07a2a") : css("--shu", "#b9472d");
      g.beginPath(); shape.out.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
      g.globalAlpha = 0.08; g.fill();
      g.globalAlpha = 1; g.lineWidth = dpr / s; g.stroke();
      g.globalAlpha = 0.55; g.lineWidth = 0.55 * dpr / s;                    // veins, and the stem
      for (const [x, y] of shape.tips) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(x * 0.5 - y * 0.04, y * 0.5 + x * 0.04, x, y); g.stroke(); }
      g.globalAlpha = 1; g.lineWidth = 1.1 * dpr / s;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(0.02, 0.32, 0.12, 0.62); g.stroke();
      return c;
    },
  };

  // ---- spring: cherry petals, each with the small notch at its tip, fluttering down slower than leaves
  const spring = {
    ...tumble,
    count: () => Math.max(10, Math.min(28, Math.round(W * H / 40000))),
    make: () => ({ px: rnd(7, 12), alpha: rnd(0.5, 0.85), spinMax: 0.6, swayRange: [14, 36], flipRange: [0.6, 1.6],
                   fallRange: [10, 22] }),
    sprite(p) {
      const s = p.px * dpr, c = blank(1.4 * s), g = c.getContext("2d"), colour = css("--petal", "#d79aa6");
      g.translate(c.width / 2, c.height * 0.46); g.scale(s, s);
      g.beginPath(); g.moveTo(0, 0.5);
      g.bezierCurveTo(-0.55, 0.2, -0.5, -0.45, -0.13, -0.5); g.lineTo(0, -0.37); g.lineTo(0.13, -0.5);
      g.bezierCurveTo(0.5, -0.45, 0.55, 0.2, 0, 0.5); g.closePath();
      g.fillStyle = g.strokeStyle = colour; g.globalAlpha = 0.45; g.fill();
      g.globalAlpha = 1; g.lineWidth = 0.9 * dpr / s; g.lineJoin = "round"; g.stroke();
      return c;
    },
  };

  // ---- summer: fireflies that wander slowly and glow now and then, mostly dark between
  const summer = {
    count: () => Math.max(8, Math.min(22, Math.round(W * H / 60000))),
    make: () => ({ r: rnd(1.4, 2.4), speed: rnd(5, 12), blinkW: rnd(0.5, 1.1), phase: rnd(0, 6.28) }),
    sprite(f) {
      const colour = css("--firefly", "#9a9a2c"), s = f.r * 7 * dpr, c = blank(2 * s), g = c.getContext("2d");
      const grad = g.createRadialGradient(s, s, 0, s, s, s);
      grad.addColorStop(0, colour); grad.addColorStop(0.14, colour); grad.addColorStop(0.3, colour + "55");
      grad.addColorStop(1, clear(colour));
      g.fillStyle = grad; g.beginPath(); g.arc(s, s, s, 0, 2 * Math.PI); g.fill();
      return c;
    },
    launch(f) { Object.assign(f, { x: rnd(0, W), y: rnd(H * 0.15, H), heading: rnd(0, 6.28) }); },
    step(f, dt, t, breeze) {
      f.heading += rnd(-1, 1) * 1.6 * dt;
      f.x += (Math.cos(f.heading) * f.speed + 0.2 * breeze) * dt;
      f.y += (Math.sin(f.heading) * f.speed * 0.6 - 1.5) * dt;               // a slight rise
      if (f.x < -30) f.x = W + 30; else if (f.x > W + 30) f.x = -30;
      if (f.y < -30) f.y = H + 30; else if (f.y > H + 30) f.y = -30;
    },
    draw(f, t) {
      ctx.translate(f.x, f.y);
      return 0.06 + 0.9 * Math.pow(Math.max(0, Math.sin(f.blinkW * t + f.phase)), 4);
    },
  };

  const kind = { winter, spring, summer, autumn }[season()];
  let motes = [];

  function sprites() { for (const m of motes) m.img = kind.sprite(m); }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const n = kind.count();
    motes = Array.from({ length: n }, (_, i) => { const m = kind.make(i, n); kind.launch(m, false); m.img = kind.sprite(m); return m; });
  }

  let last = 0, t = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (now - last < 32) return;                   // about 30 frames a second
    const dt = Math.min((now - (last || now)) / 1000, 0.1);
    last = now; t += dt;
    const breeze = 9 * Math.sin(t * 0.07) + 4 * Math.sin(t * 0.23 + 1.3);   // px/s, changing slowly
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const m of motes) {
      kind.step(m, dt, t, breeze);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = kind.draw(m, t);
      const img = m.img, w = img.width / dpr, h = img.height / dpr;
      ctx.drawImage(img, -w / 2, kind === autumn || kind === spring ? -h * 0.46 : -h / 2, w, h);
    }
  }

  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("themechange", sprites);   // the switch, or the device
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
