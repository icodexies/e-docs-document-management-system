// Light/dark theme for the member workspace. The choice is saved per browser
// and applied as a class on <html>; index.css holds both palettes. Without a
// saved choice the device preference decides until the visitor picks a side.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeContext } from "./themeContextStore.js";

const STORAGE_KEY = "edocs-theme";

function systemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readSaved() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }) {
  const [choice, setChoice] = useState(readSaved);
  const [system, setSystem] = useState(systemTheme);
  const theme = choice ?? system;

  // Follow the device preference while the visitor has not picked one.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystem(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const dark = theme === "dark";
    document.documentElement.classList.toggle("dark", dark);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#0a0f21" : "#0b1330");
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (next === "system") {
      setChoice(null);
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage can be blocked; the device preference still applies now.
      }
      return;
    }
    if (next !== "light" && next !== "dark") return;
    setChoice(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be blocked; the theme still switches for this visit.
    }
  }, []);

  const value = useMemo(
    () => ({ theme, choice, setTheme }),
    [theme, choice, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
