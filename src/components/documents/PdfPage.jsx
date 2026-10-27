import { useEffect, useRef, useState } from "react";

/**
 * Renders one PDF page to a canvas and gives children an overlay that is
 * exactly the page's size (used for signature boxes).
 */
export default function PdfPage({ pdf, pageNumber = 1, children, className = "" }) {
  const canvasRef = useRef(null);
  const [view, setView] = useState({
    key: "",
    aspect: 1 / 1.414,
    rendering: true,
    error: "",
  });

  const docKey = pdf?.fingerprints?.[0] ?? pdf?.loadingTask?.docId ?? "doc";
  const viewKey = `${docKey}:${pageNumber}`;

  useEffect(() => {
    if (!pdf) return undefined;
    let cancelled = false;
    let renderTask = null;

    (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));

        setView({
          key: viewKey,
          aspect: viewport.width / viewport.height,
          rendering: true,
          error: "",
        });

        renderTask = page.render({ canvas, viewport });
        await renderTask.promise;

        if (cancelled) return;
        setView({
          key: viewKey,
          aspect: viewport.width / viewport.height,
          rendering: false,
          error: "",
        });
      } catch (error) {
        if (cancelled || error?.name === "RenderingCancelledException") return;
        setView({
          key: viewKey,
          aspect: 1 / 1.414,
          rendering: false,
          error: "Couldn't display this page.",
        });
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, pageNumber, viewKey]);

  const ready = view.key === viewKey;
  const aspect = ready ? view.aspect : 1 / 1.414;
  const rendering = !ready || view.rendering;
  const error = ready ? view.error : "";

  return (
    <div
      className={`relative w-full overflow-visible rounded-xl border border-slate-200 bg-white ${className}`}
      style={{ aspectRatio: String(aspect) }}
      role="group"
      aria-label={`Page ${pageNumber} of the document`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full rounded-xl" />

      {!error && (
        <div
          className="pointer-events-none absolute inset-0"
          data-page-overlay
        >
          {children}
        </div>
      )}

      {rendering && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse rounded-xl bg-tint motion-reduce:animate-none"
        />
      )}

      {error && (
        <div
          role="alert"
          className="absolute inset-0 grid place-items-center rounded-xl bg-red-50 px-4 text-center text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}
    </div>
  );
}
