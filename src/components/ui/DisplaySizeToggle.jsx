// The text-size switch for the member workspace. It cycles Normal → Large →
// Extra large and is shown on large screens and above; the chosen size is
// remembered per browser. Public pages always keep their designed sizes.
import { useDisplaySize } from "../../hooks/shared/useDisplaySize.js";
import {
  DISPLAY_LABELS,
  DISPLAY_SIZES,
} from "../../context/display/displaySizeStore.js";

export function TextSizeGlyph({ className = "h-4 w-4", level = 0 }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <text
        x="1"
        y="15"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="10"
        fill="currentColor"
      >
        A
      </text>
      <text
        x="11"
        y="19"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="14"
        fill="currentColor"
      >
        A
      </text>
      {level > 0 && (
        <text
          x="19.5"
          y="8"
          fontFamily="Arial, sans-serif"
          fontWeight="700"
          fontSize="7.5"
          fill="currentColor"
        >
          {level}
        </text>
      )}
    </svg>
  );
}

export default function DisplaySizeToggle({ className = "" }) {
  const { size, label, level, cycleSize } = useDisplaySize();
  const next =
    DISPLAY_SIZES[(DISPLAY_SIZES.indexOf(size) + 1) % DISPLAY_SIZES.length];
  const title = `Text size: ${label}. Click for ${DISPLAY_LABELS[next]}.`;

  return (
    <button
      type="button"
      onClick={cycleSize}
      aria-label={title}
      title={title}
      className={`hidden shrink-0 place-items-center rounded-xl border p-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:grid ${
        level > 0
          ? "border-ink bg-ink text-page hover:opacity-90"
          : "border-slate-300 bg-surface text-ink hover:border-slate-400 hover:bg-page"
      } ${className}`}
    >
      <TextSizeGlyph level={level} />
    </button>
  );
}
