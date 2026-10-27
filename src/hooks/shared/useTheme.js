import { useContext } from "react";
import { ThemeContext } from "../../context/theme/themeContextStore.js";

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used inside ThemeProvider.");
  return theme;
}
