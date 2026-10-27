import { Link } from "react-router-dom";
import StatusBadge from "../ui/StatusBadge.jsx";
import { formatDate } from "../../services/documents/documentRules.js";

function PenIcon() {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

export default function SignatureRequestCard({ request }) {
  const document = request.document ?? {};

  return (
    <Link
      to={`/sign/${request.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-slate-200/80 bg-surface p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-accent"
      />

      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tint text-accent">
          <PenIcon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 truncate font-serif text-lg font-bold text-ink transition-colors group-hover:text-accent">
              {document.title || "Untitled document"}
            </p>
            <StatusBadge status={document.status} className="shrink-0" />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            From {document.owner_name || "a colleague"} ·{" "}
            {formatDate(document.created_at)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={request.status} />
        <span className="rounded-full bg-page px-2 py-0.5 text-[10px] font-medium text-slate-500">
          {document.page_count
            ? `${document.page_count} page${document.page_count === 1 ? "" : "s"}`
            : "PDF"}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <span className="text-xs text-slate-500">
          {request.status === "signing"
            ? "Processing your signature…"
            : "Awaiting your signature"}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent group-hover:underline">
          Review &amp; sign
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
