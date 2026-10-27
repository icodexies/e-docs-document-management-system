import PdfPage from "./PdfPage.jsx";
import { usePdfDocument } from "../../hooks/documents/usePdfDocument.js";
import { clampBox } from "../../services/documents/documentRules.js";

const STATUS_TONES = {
  matched: "border-accent bg-accent/5",
  review: "border-amber-500 bg-amber-50/60",
  unmatched: "border-red-500 bg-red-50/60",
};

function FieldBox({ field, selected, onSelect, onChange }) {
  const label = field.fullName || field.detectedName || "Signer";
  const tone = selected
    ? "border-jade bg-jade/10"
    : STATUS_TONES[field.status] ?? STATUS_TONES.matched;

  function startDrag(event, mode) {
    event.preventDefault();
    event.stopPropagation();
    onSelect(field.key);

    const overlay = event.currentTarget.closest("[data-page-overlay]");
    if (!overlay) return;
    const rect = overlay.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const origin = {
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
    };

    const move = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / rect.width;
      const dy = (moveEvent.clientY - startY) / rect.height;
      if (mode === "resize") {
        onChange(
          field.key,
          clampBox({
            ...origin,
            width: origin.width + dx,
            height: origin.height + dy,
          }),
        );
      } else {
        onChange(
          field.key,
          clampBox({ ...origin, x: origin.x + dx, y: origin.y + dy }),
        );
      }
    };

    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  }

  function handleKeyDown(event) {
    const step = event.shiftKey ? 0.01 : 0.005;
    let patch = null;

    if (event.shiftKey) {
      if (event.key === "ArrowRight") patch = { width: field.width + step };
      else if (event.key === "ArrowLeft") patch = { width: field.width - step };
      else if (event.key === "ArrowDown") patch = { height: field.height + step };
      else if (event.key === "ArrowUp") patch = { height: field.height - step };
    } else if (event.key === "ArrowLeft") {
      patch = { x: field.x - step };
    } else if (event.key === "ArrowRight") {
      patch = { x: field.x + step };
    } else if (event.key === "ArrowUp") {
      patch = { y: field.y - step };
    } else if (event.key === "ArrowDown") {
      patch = { y: field.y + step };
    }

    if (patch) {
      event.preventDefault();
      onChange(field.key, clampBox({ ...field, ...patch }));
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Signature field for ${label}. Arrow keys move; Shift plus arrows resize.`}
      className={`pointer-events-auto absolute cursor-move rounded-md border-2 border-dashed focus:outline-none focus-visible:ring-2 focus-visible:ring-jade ${tone}`}
      style={{
        left: `${Number(field.x) * 100}%`,
        top: `${Number(field.y) * 100}%`,
        width: `${Number(field.width) * 100}%`,
        height: `${Number(field.height) * 100}%`,
        touchAction: "none",
      }}
      onPointerDown={(event) => startDrag(event, "move")}
      onKeyDown={handleKeyDown}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(field.key);
      }}
    >
      <span className="pointer-events-none absolute -top-5 left-0 max-w-[14rem] truncate rounded-full bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-accent shadow-[0_1px_2px_rgba(11,19,48,0.08)] dark:text-navy">
        {label}
      </span>
      <span
        aria-hidden="true"
        title="Resize"
        className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border border-white bg-navy"
        onPointerDown={(event) => startDrag(event, "resize")}
      />
    </div>
  );
}

export default function PdfFieldEditor({
  source,
  fields = [],
  selectedKey,
  onSelect,
  onChangeField,
  pageNumber = 1,
  onPageChange,
  className = "",
}) {
  const { pdf, pageCount, loading, error } = usePdfDocument(source);
  const currentPage =
    pageCount > 0
      ? Math.min(Math.max(1, Number(pageNumber) || 1), pageCount)
      : 1;
  const pageFields = fields.filter(
    (field) => Number(field.pageNumber) === currentPage,
  );

  function go(direction) {
    const next = currentPage + direction;
    if (next < 1 || (pageCount > 0 && next > pageCount)) return;
    onPageChange?.(next);
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={loading || currentPage <= 1}
            className="rounded-xl border border-slate-300 bg-surface px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-page disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Previous
          </button>
          <span role="status" className="text-xs font-medium text-slate-500">
            Page {currentPage} of {pageCount || "…"}
          </span>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={loading || pageCount === 0 || currentPage >= pageCount}
            className="rounded-xl border border-slate-300 bg-surface px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-page disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Next
          </button>
        </div>
        <p className="text-xs font-semibold text-slate-500">
          Drag the boxes to match the document
        </p>
      </div>

      {loading ? (
        <div
          aria-hidden="true"
          className="aspect-[1/1.414] animate-pulse rounded-xl border border-slate-200 bg-tint motion-reduce:animate-none"
        />
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 px-5 py-6 text-sm text-red-700"
        >
          {error}
        </div>
      ) : !pdf ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-page/60 px-5 py-10 text-center text-sm text-slate-500">
          Preparing the preview…
        </div>
      ) : (
        <PdfPage pdf={pdf} pageNumber={currentPage}>
          {pageFields.map((field) => (
            <FieldBox
              key={field.key}
              field={field}
              selected={field.key === selectedKey}
              onSelect={onSelect}
              onChange={onChangeField}
            />
          ))}
        </PdfPage>
      )}

      <p className="text-xs text-slate-500">
        Drag a box to move it. Drag its bottom-right corner to resize. With a
        box selected, arrow keys move it; Shift + arrows resize.
      </p>
    </div>
  );
}
