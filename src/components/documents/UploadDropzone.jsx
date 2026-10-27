import { useState } from "react";
import { Spinner } from "../ui/Loading.jsx";
import { formatBytes } from "../../services/documents/documentRules.js";

export default function UploadDropzone({
  file,
  onFile,
  busy = false,
  progress = { page: 0, total: 0 },
  error = "",
}) {
  const [dragging, setDragging] = useState(false);

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    const next = event.dataTransfer.files?.[0];
    if (next) onFile(next);
  }

  function handleChange(event) {
    const next = event.target.files?.[0];
    event.target.value = "";
    if (next) onFile(next);
  }

  return (
    <div className="space-y-3">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging
            ? "border-accent bg-tint/60"
            : "border-slate-300 bg-page/60 hover:border-accent/60"
        } ${busy ? "cursor-wait" : "cursor-pointer"}`}
      >
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleChange}
          disabled={busy}
          className="sr-only"
        />

        {busy ? (
          <>
            <Spinner />
            <p className="mt-3 font-serif text-lg font-bold text-ink">
              Scanning the document…
            </p>
            <p className="mt-1 text-sm text-slate-500" role="status">
              {progress.total > 0
                ? `Page ${progress.page} of ${progress.total}`
                : "Reading the PDF…"}
            </p>
          </>
        ) : (
          <>
            <span
              aria-hidden="true"
              className="grid h-12 w-12 place-items-center rounded-full bg-tint text-accent"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-5 w-5"
              >
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <path d="M14 3v5h5" />
                <path d="M12 11v6M9 14h6" strokeLinecap="round" />
              </svg>
            </span>
            <p className="mt-3 font-serif text-lg font-bold text-ink">
              {file ? "Choose a different PDF" : "Choose a PDF to send"}
            </p>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              {file
                ? `${file.name} · ${formatBytes(file.size)}`
                : "Click to browse or drop the file here. PDF only, up to 25 MB."}
            </p>
          </>
        )}
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}
