export type QuireTheme = "light" | "dark";

/** Changes the colour system with a brief fade rather than a hard visual cut. */
export function applyThemeWithFade(theme: QuireTheme) {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    root.setAttribute("data-theme", theme);
    return;
  }

  root.classList.remove("quire-theme-transition");
  root.classList.add("quire-theme-transition");
  // Ensure the transition rule is present before the colour variables change.
  void root.offsetWidth;
  root.setAttribute("data-theme", theme);
  window.setTimeout(() => root.classList.remove("quire-theme-transition"), 380);
}
