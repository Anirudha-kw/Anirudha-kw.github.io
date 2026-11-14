// An ensō: one dry-brush circle, drawn once on load, then still.
(() => {
  const canvas = document.getElementById("enso");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // fixed seed so the brush stroke is the same on every visit
  let seed = 7;
  const rand = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const smooth = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

  const a0 = 0.68 * Math.PI, sweep = -1.86 * Math.PI;   // start lower left, sweep counterclockwise
  const phase1 = rand() * 6.28, phase2 = rand() * 6.28;
  const bristles = [];
  const nb = 72;
  for (let i = 0; i < nb; i++) {
    const u = (i / (nb - 1)) - 0.5;                     // position across the brush
    const edge = Math.abs(u) * 2;
    const gaps = [];
    for (let g = 0; g < 7; g++) {
      const at = 0.5 + rand() * 0.5;
      if (rand() < (0.15 + 0.6 * edge) * at) gaps.push([at, at + 0.008 + rand() * 0.04]);
    }
    bristles.push({
      u,
      end: 1 - Math.pow(rand(), 1.4) * (0.08 + 0.3 * edge),  // outer bristles run dry first
      alpha: 0.3 + 0.5 * rand() * (1 - 0.45 * edge),
      thick: 0.6 + 0.9 * rand(),
      wf: 1 + 3 * rand(), wp: rand() * 6.28,                 // each bristle wanders a little
      gaps,
    });
  }

  let size = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = canvas.clientWidth;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function point(t, b) {
    const R = size * 0.36 * (1 + 0.022 * Math.sin(6.28 * 1.3 * t + phase1) + 0.012 * Math.sin(6.28 * 3.1 * t + phase2) + 0.03 * t);
    const press = 1 + 0.3 * (1 - smooth(0, 0.14, t));      // the brush lands heavy
    const W = size * 0.068 * press * (0.82 + 0.25 * Math.sin(Math.PI * t * 0.9))
            * (0.55 + 0.45 * smooth(0, 0.015, t)) * (1 - 0.7 * smooth(0.7, 1, t));
    const u = b.u + 0.035 * Math.sin(6.28 * b.wf * t + b.wp);
    const a = a0 + sweep * t;
    const r = R + u * W;
    return [size / 2 + r * Math.cos(a), size / 2 + r * Math.sin(a)];
  }

  function draw(progress) {
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--fg").trim() || "#16181b";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const steps = 480, chunk = 24;
    for (const b of bristles) {
      const stop = Math.min(progress, b.end);
      ctx.lineWidth = Math.max(0.5, size * 0.0036 * b.thick);
      // draw in short chunks so the ink can thin out as the brush dries
      for (let k0 = 0; k0 < steps; k0 += chunk) {
        const tc = ((k0 + chunk / 2) / steps) * stop;
        ctx.globalAlpha = 0.82 * b.alpha * (1 - 0.5 * smooth(0.25, 1, tc)) * (1 + 0.35 * (1 - smooth(0, 0.1, tc)));
        ctx.beginPath();
        let pen = false;
        for (let k = k0; k <= Math.min(k0 + chunk, steps); k++) {
          const t = (k / steps) * stop;
          if (b.gaps.some(([s0, e0]) => t > s0 && t < e0)) { pen = false; continue; }
          const [x, y] = point(t, b);
          if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  resize();
  let done = reduce;
  window.addEventListener("resize", () => { resize(); if (done) draw(1); });
  document.addEventListener("themechange", () => { if (done) draw(1); });   // the switch, or the device

  if (reduce) { draw(1); return; }
  const dur = 2600, start = performance.now() + 300;
  function frame(now) {
    const x = Math.min(Math.max((now - start) / dur, 0), 1);
    draw(0.5 - 0.5 * Math.cos(Math.PI * x));             // ease in and out, like a slow breath
    if (x < 1) requestAnimationFrame(frame); else done = true;
  }
  requestAnimationFrame(frame);
})();
