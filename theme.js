// Light/dark switch. The page follows the device's setting until the reader picks one with the switch; the choice is
// remembered in this browser. Loaded in <head>, not deferred, so a stored choice applies before the first paint.
(() => {
  const root = document.documentElement, dark = window.matchMedia("(prefers-color-scheme: dark)");
  const stored = () => { try { return localStorage.getItem("theme"); } catch (e) { return null; } };
  const mode = () => root.dataset.theme || (dark.matches ? "dark" : "light");
  const saved = stored();
  if (saved === "light" || saved === "dark") root.dataset.theme = saved;

  function label() {
    const m = mode();
    document.querySelectorAll(".theme-toggle").forEach((b) => {
      b.dataset.mode = m;
      b.setAttribute("aria-label", m === "dark" ? "Switch to light mode" : "Switch to dark mode");
      b.title = b.getAttribute("aria-label");
    });
  }
  function set(m) {
    root.dataset.theme = m;
    try { localStorage.setItem("theme", m); } catch (e) { /* private window: the choice lasts for this page only */ }
    label();
    document.dispatchEvent(new CustomEvent("themechange", { detail: m }));
  }
  dark.addEventListener("change", () => { if (!root.dataset.theme) { label(); document.dispatchEvent(new CustomEvent("themechange")); } });
  document.addEventListener("DOMContentLoaded", () => {
    label();
    document.querySelectorAll(".theme-toggle").forEach((b) => b.addEventListener("click", () => set(mode() === "dark" ? "light" : "dark")));
  });
})();
