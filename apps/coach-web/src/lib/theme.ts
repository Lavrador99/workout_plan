// Per device: the choice stays out of the synced data, as one coach may want
// dark on the phone at night and light on the PC.

export type Theme = "system" | "light" | "dark";

export const THEMES: [Theme, string][] = [
  ["system", "Sistema"],
  ["light", "Claro"],
  ["dark", "Escuro"],
];

const KEY = "coach-theme";
const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)");

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function apply() {
  const theme = getTheme();
  const dark = theme === "dark" || (theme === "system" && prefersDark().matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0f0f0f" : "#f6f6f3");
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // no storage: it holds until the app closes
  }
  apply();
}

export function startTheme() {
  apply();
  prefersDark().addEventListener("change", apply);
}
