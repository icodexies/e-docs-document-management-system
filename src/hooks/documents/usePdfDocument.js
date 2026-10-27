import { useEffect, useState } from "react";
import { mapPdfError } from "../../services/documents/pdfErrors.js";

export function usePdfDocument(source) {
  const [result, setResult] = useState({
    key: "",
    pdf: null,
    pageCount: 0,
    error: "",
  });
  const key = source ? String(source) : "";

  useEffect(() => {
    if (!source) return undefined;
    let cancelled = false;
    let task = null;

    (async () => {
      try {
        const { pdfjs } = await import("../../lib/pdfjs.js");
        const params =
          typeof source === "string"
            ? { url: source, isEvalSupported: false }
            : { data: source, isEvalSupported: false };
        task = pdfjs.getDocument(params);
        const pdf = await task.promise;
        if (cancelled) return;
        setResult({ key, pdf, pageCount: pdf.numPages, error: "" });
      } catch (error) {
        if (cancelled) return;
        setResult({
          key,
          pdf: null,
          pageCount: 0,
          error: mapPdfError(error),
        });
      }
    })();

    return () => {
      cancelled = true;
      task?.destroy();
    };
  }, [source, key]);

  const loading = Boolean(source) && result.key !== key;
  const ready = Boolean(source) && result.key === key;

  return {
    pdf: ready ? result.pdf : null,
    pageCount: ready ? result.pageCount : 0,
    loading,
    error: ready ? result.error : "",
  };
}
