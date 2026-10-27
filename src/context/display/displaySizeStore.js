import { createContext } from "react";

export const DisplaySizeContext = createContext(null);

// Three display sizes, smallest to largest. The larger two only take effect
// on large screens and above (see index.css).
export const DISPLAY_SIZES = ["normal", "large", "larger"];

export const DISPLAY_LABELS = {
  normal: "Normal",
  large: "Large",
  larger: "Extra large",
};
