import { useState } from "react";
import Button from "../../../components/ui/Button.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import DocumentCard from "../../../components/documents/DocumentCard.jsx";
import { useAuth } from "../../../hooks/auth/useAuth.js";
import { useDocuments } from "../../../hooks/documents/useDocuments.js";
import {
  DOCUMENT_STATUSES,
  DOCUMENT_STATUS_LABELS,
} from "../../../services/documents/documentRules.js";

export default function Documents() {
  const { user } = useAuth();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const {
    loading,
    error,
    items,
    hasNext,
    total,
    pageCount,
    page,
    setPage,
    refresh,
  } = useDocuments({ userId: user?.id, status, search });

  const hasFilters = status !== "all" || search.trim() !== "";

  function resetFilters() {
    setStatus("all");
    setSearch("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documents"
        title="Your documents"
        description="Everything you've uploaded, from drafts to fully signed copies. Open a document to see its signatories and audit trail."
        actions={
          <Button to="/documents/new" variant="primary">
            New document
          </Button>
        }
      />

      <section className="rounded-2xl border border-slate-200/80 bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          <span aria-hidden="true" className="h-4 w-1 rounded-full bg-navy" />
          Refine results
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_14rem]">
          <label className="block text-sm text-slate-600">
            <span className="mb-1 block text-xs font-semibold">
              Search by title
            </span>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="e.g. Travel request"
              className="w-full rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-sm text-ink shadow-[inset_0_1px_2px_rgba(11,19,48,0.02)] placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            />
          </label>
          <label className="block text-sm text-slate-600">
            <span className="mb-1 block text-xs font-semibold">Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-sm text-ink shadow-[inset_0_1px_2px_rgba(11,19,48,0.02)] focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            >
              <option value="all">All statuses</option>
              {DOCUMENT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {DOCUMENT_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section aria-busy={loading}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span aria-hidden="true" className="h-4 w-1 rounded-full bg-navy" />
            Results
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500" role="status">
              {total > 0 ? `${total} document${total === 1 ? "" : "s"}` : "No results"}
            </span>
            <button
              type="button"
              onClick={refresh}
              className="rounded-xl border border-slate-300 bg-surface px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-page"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            aria-hidden="true"
          >
            {[0, 1, 2, 3, 4, 5].map((key) => (
              <div
                key={key}
                className="h-44 animate-pulse rounded-2xl bg-tint motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-100 bg-red-50 px-5 py-6 text-sm text-red-700"
          >
            {error}{" "}
            <button type="button" onClick={refresh} className="font-semibold underline">
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={hasFilters ? "No documents match" : "No documents yet"}
            description={
              hasFilters
                ? "Try a different title or status."
                : "Upload a PDF to send it for signature."
            }
            action={
              hasFilters ? (
                <Button type="button" onClick={resetFilters} variant="secondary">
                  Clear filters
                </Button>
              ) : (
                <Button to="/documents/new" variant="primary">
                  New document
                </Button>
              )
            }
          />
        ) : (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((document) => (
                <li key={document.id}>
                  <DocumentCard document={document} />
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              pageCount={pageCount}
              hasNext={hasNext}
              total={total}
              onPageChange={setPage}
              disabled={loading}
              className="mt-4"
            />
          </>
        )}
      </section>
    </div>
  );
}
