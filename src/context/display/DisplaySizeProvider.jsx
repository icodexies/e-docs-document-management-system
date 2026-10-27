// Display size for the member workspace: Normal → Large → Extra large.
// The level scales the type scale and rem-based spacing on large screens
// (see index.css); sticky columns and the sidebar keep their own layout.
// The attribute lives on <html> only while the member area is mounted, so
// public pages keep their designed sizes.
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  DISPLAY_LABELS,
  DISPLAY_SIZES,
  DisplaySizeContext,
} from "./displaySizeStore.js";

const STORAGE_KEY = "edocs-ui-size";

function readSaved() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return DISPLAY_SIZES.includes(saved) ? saved : "normal";
  } catch {
    return "normal";
  }
}

export function DisplaySizeProvider({ children }) {
  const [size, setSize] = useState(readSaved);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (size === "normal") delete root.dataset.uiSize;
    else root.dataset.uiSize = size;
    try {
      window.localStorage.setItem(STORAGE_KEY, size);
    } catch {
      // Storage can be blocked; the choice still works for this visit.
    }
    return () => {
      delete root.dataset.uiSize;
    };
  }, [size]);

  const cycleSize = useCallback(() => {
    setSize((current) => {
      const next = (DISPLAY_SIZES.indexOf(current) + 1) % DISPLAY_SIZES.length;
      return DISPLAY_SIZES[next];
    });
  }, []);

  const value = useMemo(
    () => ({
      size,
      label: DISPLAY_LABELS[size],
      level: DISPLAY_SIZES.indexOf(size),
      setSize,
      cycleSize,
    }),
    [size, cycleSize],
  );

  return (
    <DisplaySizeContext.Provider value={value}>
      {children}
    </DisplaySizeContext.Provider>
  );
}
