import { Link } from "react-router-dom";
import StatusBadge from "../ui/StatusBadge.jsx";
import {
  documentProgress,
  formatDate,
} from "../../services/documents/documentRules.js";

const TABS = {
  draft: "bg-navy",
  pending: "bg-amber-500",
  in_progress: "bg-accent",
  completed: "bg-jade",
  declined: "bg-red-500",
  void: "bg-slate-400",
};

function FileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

export default function DocumentCard({ document }) {
  const signatories = document.document_signatories ?? [];
  const progress = documentProgress(signatories);
  const viewedCount = signatories.filter(
    (signatory) => signatory.viewed_at,
  ).length;

  return (
    <Link
      to={`/documents/${document.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-slate-200/80 bg-surface p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1 ${TABS[document.status] ?? TABS.draft}`}
      />

      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tint text-accent">
          <FileIcon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 truncate font-serif text-lg font-bold text-ink transition-colors group-hover:text-accent">
              {document.title}
            </p>
            <StatusBadge status={document.status} className="shrink-0" />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Created {formatDate(document.created_at)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-medium text-slate-600">
            {progress.total === 0
              ? "No signatories yet"
              : `${progress.signed} of ${progress.total} signed`}
          </span>
          <span className="text-slate-500 tabular-nums">{progress.percent}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-tint">
          <div
            className="h-full rounded-full bg-jade transition-[width] duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        {viewedCount > 0 && (
          <p className="mt-2 inline-flex rounded-full bg-tint px-2 py-0.5 text-[10px] font-semibold text-accent">
            Viewed by {viewedCount} signer{viewedCount === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <span className="text-xs text-slate-500">
          {document.page_count
            ? `${document.page_count} page${document.page_count === 1 ? "" : "s"}`
            : "PDF"}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent group-hover:underline">
          Open
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
