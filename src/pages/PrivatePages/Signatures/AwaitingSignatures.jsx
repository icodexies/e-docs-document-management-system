import { Link } from "react-router-dom";
import Button from "../../../components/ui/Button.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import SignatureRequestCard from "../../../components/documents/SignatureRequestCard.jsx";
import { useAuth } from "../../../hooks/auth/useAuth.js";
import { useAwaitingSignatures } from "../../../hooks/documents/useAwaitingSignatures.js";

export default function AwaitingSignatures() {
  const { profile } = useAuth();
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
  } = useAwaitingSignatures({ profileId: profile?.id });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Signatures"
        title="Awaiting your signature"
        description="Documents routed to you. Open one to review the full PDF before applying your stored signature."
        actions={
          <Button to="/documents" variant="secondary">
            My documents
          </Button>
        }
      />

      {profile && !profile.signature_path && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Upload your signature before approving
              </p>
              <p className="mt-1 text-sm text-amber-800">
                You can review everything now, but the approve action is blocked
                until a signature is on file.
              </p>
            </div>
            <Link
              to="/profile"
              className="rounded-xl bg-amber-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-900 dark:text-navy"
            >
              Upload signature
            </Link>
          </div>
        </section>
      )}

      <section aria-busy={loading}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span aria-hidden="true" className="h-4 w-1 rounded-full bg-navy" />
            Requests
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500" role="status">
              {total > 0 ? `${total} request${total === 1 ? "" : "s"}` : "No requests"}
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((key) => (
              <div
                key={key}
                className="h-40 animate-pulse rounded-2xl bg-tint motion-reduce:animate-none"
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
            title="You're all caught up"
            description="When someone routes a document to you for signature, it will appear here."
            action={
              <Button to="/dashboard" variant="secondary" size="sm">
                Back to the dashboard
              </Button>
            }
          />
        ) : (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((request) => (
                <li key={request.id}>
                  <SignatureRequestCard request={request} />
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
