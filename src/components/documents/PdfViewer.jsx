import PdfPage from "./PdfPage.jsx";
import { usePdfDocument } from "../../hooks/documents/usePdfDocument.js";

const TONES = {
  jade: {
    box: "border-jade bg-jade/10",
    label: "bg-jade-soft text-jade-deep",
  },
  accent: {
    box: "border-accent bg-accent/10",
    label: "bg-tint text-accent",
  },
  amber: {
    box: "border-amber-500 bg-amber-50/70",
    label: "bg-amber-50 text-amber-800",
  },
  red: {
    box: "border-red-500 bg-red-50/70",
    label: "bg-red-50 text-red-700",
  },
  slate: {
    box: "border-slate-400 bg-slate-50/70",
    label: "bg-slate-100 text-slate-600",
  },
};

function OverlayBox({ overlay }) {
  const tone = TONES[overlay.tone] ?? TONES.slate;
  const x = Number(overlay.x) || 0;
  const y = Number(overlay.y) || 0;
  const width = Number(overlay.width) || 0;
  const height = Number(overlay.height) || 0;

  return (
    <div
      className={`absolute rounded-md border-2 border-dashed ${tone.box}`}
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${width * 100}%`,
        height: `${height * 100}%`,
      }}
      title={overlay.label}
    >
      <span
        className={`absolute -top-5 left-0 max-w-[14rem] truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tone.label}`}
      >
        {overlay.label}
      </span>
    </div>
  );
}

export default function PdfViewer({
  source,
  pageNumber = 1,
  onPageChange,
  overlays = [],
  title = "Document preview",
  className = "",
}) {
  const { pdf, pageCount, loading, error } = usePdfDocument(source);
  const currentPage =
    pageCount > 0
      ? Math.min(Math.max(1, Number(pageNumber) || 1), pageCount)
      : 1;
  const pageOverlays = overlays.filter(
    (overlay) => Number(overlay.pageNumber) === currentPage,
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
        {title && (
          <p className="text-xs font-semibold text-slate-500">{title}</p>
        )}
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
          {pageOverlays.map((overlay) => (
            <OverlayBox key={overlay.key} overlay={overlay} />
          ))}
        </PdfPage>
      )}

    </div>
  );
}
