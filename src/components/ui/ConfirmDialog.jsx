import { useEffect, useId, useRef } from "react";

// The one dialog shell for the project (see docs/06). Native <dialog> gives
// focus handling and Escape for free; the styling matches the design system.
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Remove",
  busyLabel = "Working…",
  busy = false,
  tone = "danger",
  onConfirm,
  onCancel,
  children = null,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (event) => {
      event.preventDefault();
      if (!busy) onCancel();
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [busy, onCancel]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="w-[min(28rem,92vw)] rounded-2xl border border-slate-200 bg-surface p-0 shadow-[0_8px_32px_rgba(11,19,48,0.2)] backdrop:bg-navy/40"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-navy via-navy-deep to-accent px-5 py-4 dark:to-navy-deep">
        <p className="pr-8 font-serif text-lg font-bold text-white" id={titleId}>
          {title}
        </p>
        <button
          type="button"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onCancel}
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="space-y-3 px-5 py-4">
        {description && <p className="text-sm text-slate-600">{description}</p>}
        {children}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 bg-page/60 px-5 py-3">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-xl border border-slate-300 bg-surface px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-page disabled:cursor-not-allowed disabled:text-slate-400"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={
            tone === "primary"
              ? "rounded-xl bg-navy px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:bg-slate-400"
              : "rounded-xl bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 dark:text-navy"
          }
        >
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
