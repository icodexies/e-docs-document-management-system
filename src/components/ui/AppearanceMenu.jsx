import { useEffect, useId, useRef, useState } from "react";
import {
  DISPLAY_LABELS,
  DISPLAY_SIZES,
} from "../../context/display/displaySizeStore.js";
import { useDisplaySize } from "../../hooks/shared/useDisplaySize.js";
import { useTheme } from "../../hooks/shared/useTheme.js";

function SlidersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

const OPTION_BASE =
  "min-h-11 rounded-lg px-2.5 text-xs font-semibold transition-colors";

function Segmented({ label, options, value, onChange }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid grid-cols-3 gap-1 rounded-xl bg-tint p-1"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`${OPTION_BASE} ${
              selected
                ? "bg-surface text-ink shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default function AppearanceMenu({ className = "" }) {
  const { theme, choice, setTheme } = useTheme();
  const { size, setSize } = useDisplaySize();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const containerRef = useRef(null);
  const panelId = useId();

  const displaySizeLabel = DISPLAY_LABELS[size];
  const title = `Appearance: ${theme} mode, ${displaySizeLabel.toLowerCase()} text.`;

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Appearance settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        title={title}
        className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl border border-slate-300 bg-surface text-ink transition-colors hover:border-slate-400 hover:bg-page"
      >
        <SlidersIcon />
      </button>

      {open && (
        <div
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-label="Appearance settings"
          tabIndex={-1}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-surface p-4 shadow-[0_20px_50px_-24px_rgba(11,19,48,0.5)] focus:outline-none"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-serif text-lg font-bold text-ink">Appearance</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Make the workspace comfortable to read.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              aria-label="Close appearance settings"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-tint hover:text-ink"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="space-y-5">
            <section>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Color mode
              </p>
              <Segmented
                label="Color mode"
                value={choice ?? "system"}
                onChange={setTheme}
                options={[
                  { value: "system", label: "System" },
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ]}
              />
            </section>

            <section>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Text size
                </p>
                <p className="text-[10px] text-slate-500">Large screens only</p>
              </div>
              <Segmented
                label="Text size"
                value={size}
                onChange={setSize}
                options={DISPLAY_SIZES.map((value) => ({
                  value,
                  label: DISPLAY_LABELS[value],
                }))}
              />
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
