import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import PageHero from "../../../components/ui/PageHero.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import StatusBadge from "../../../components/ui/StatusBadge.jsx";
import DocumentTimeline from "../../../components/documents/DocumentTimeline.jsx";
import PdfViewer from "../../../components/documents/PdfViewer.jsx";
import SignatoryList from "../../../components/documents/SignatoryList.jsx";
import { useAuth } from "../../../hooks/auth/useAuth.js";
import { useDocument } from "../../../hooks/documents/useDocument.js";
import {
  deleteDraft,
  voidDocument,
} from "../../../services/documents/documentService.js";
import {
  documentProgress,
  formatBytes,
  formatDate,
  formatDateTime,
} from "../../../services/documents/documentRules.js";

function FieldTile({ label, children, className = "" }) {
  return (
    <div className={`rounded-xl bg-page px-3.5 py-3 ${className}`}>
      <p className="text-[11px] text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-ink">{children}</div>
    </div>
  );
}

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();
  const { loading, error, document, fileUrl, refresh } = useDocument(id);

  const [pageNumber, setPageNumber] = useState(1);
  const [activityPager, setActivityPager] = useState({
    documentId: id,
    page: 1,
  });
  const [pendingAction, setPendingAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const activityPage =
    activityPager.documentId === id ? activityPager.page : 1;

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-44 animate-pulse rounded-2xl bg-tint motion-reduce:animate-none" />
        <div className="h-28 animate-pulse rounded-2xl bg-tint motion-reduce:animate-none" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="h-[32rem] animate-pulse rounded-2xl bg-tint motion-reduce:animate-none" />
          <div className="space-y-6">
            <div className="h-48 animate-pulse rounded-2xl bg-tint motion-reduce:animate-none" />
            <div className="h-48 animate-pulse rounded-2xl bg-tint motion-reduce:animate-none" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="space-y-4">
        <PageHero
          eyebrow="Document"
          title="Can't open this document"
          description={
            error ||
            "The document wasn't found, or your account doesn't have access."
          }
        />
        <Link
          to="/documents"
          className="inline-flex rounded-xl border border-slate-300 bg-surface px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-page"
        >
          Back to documents
        </Link>
      </div>
    );
  }

  const progress = documentProgress(document.document_signatories ?? []);
  const viewedCount = (document.document_signatories ?? []).filter(
    (signatory) => signatory.viewed_at,
  ).length;
  const isOwner = String(document.owner_id) === String(user?.id);
  const canManage = isOwner || role === "admin";
  const canVoid =
    canManage && !["draft", "completed", "void"].includes(document.status);
  const canDelete = isOwner && document.status === "draft";
  const latestVersion = (document.document_versions ?? []).reduce(
    (best, version) =>
      !best || Number(version.version_number) > Number(best.version_number)
        ? version
        : best,
    null,
  );
  const currentHash = latestVersion?.sha256 ?? document.original_sha256;
  const events = document.document_events ?? [];
  const activityPageCount = Math.max(
    1,
    Math.ceil(events.length / 6),
  );
  const safeActivityPage = Math.min(
    Math.max(1, activityPage),
    activityPageCount,
  );
  const visibleEvents = events.slice(
    (safeActivityPage - 1) * 6,
    safeActivityPage * 6,
  );

  const overlays = (document.document_signatories ?? []).map((signatory) => ({
    key: signatory.id,
    pageNumber: signatory.page_number,
    x: signatory.x,
    y: signatory.y,
    width: signatory.width,
    height: signatory.height,
    label: signatory.signer_name,
    tone:
      signatory.status === "signed"
        ? "jade"
        : signatory.status === "declined"
          ? "red"
          : "amber",
  }));

  async function confirmAction() {
    if (!document || !pendingAction || busy) return;
    setBusy(true);
    setActionError("");
    try {
      if (pendingAction === "delete") {
        await deleteDraft(document.id, document.original_path);
        navigate("/documents");
        return;
      }
      await voidDocument(document.id);
      setPendingAction(null);
      refresh();
    } catch (nextError) {
      setActionError(nextError.message || "Couldn't complete that action.");
      setPendingAction(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Document"
        title={document.title}
        description={`From ${document.owner_name || "the owner"} · created ${formatDate(document.created_at)}`}
        actions={
          <>
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-slate-100"
              >
                Download PDF
              </a>
            )}
            {canVoid && (
              <button
                type="button"
                onClick={() => setPendingAction("void")}
                className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Void document
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => setPendingAction("delete")}
                className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Delete draft
              </button>
            )}
          </>
        }
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={document.status} />
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white">
            {document.signing_mode === "parallel"
              ? "All at once"
              : "One at a time"}
          </span>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white">
            {progress.signed} of {progress.total} signed
          </span>
        </div>
      </PageHero>

      {actionError && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
        >
          {actionError}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200/80 bg-surface p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span aria-hidden="true" className="h-4 w-1 rounded-full bg-navy" />
              Preview
            </h2>
            <span className="text-xs text-slate-500">
              {Number(document.current_version) > 0
                ? `Signed version ${document.current_version}`
                : "Original PDF"}
            </span>
          </div>

          {fileUrl ? (
            <PdfViewer
              source={fileUrl}
              pageNumber={pageNumber}
              onPageChange={setPageNumber}
              overlays={overlays}
              title="Signature fields"
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-page/60 px-5 py-10 text-center text-sm text-slate-500">
              The PDF is not available yet.
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200/80 bg-surface p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span aria-hidden="true" className="h-4 w-1 rounded-full bg-navy" />
                Signatories
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {progress.signed}/{progress.total} signed · {viewedCount} viewed
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
            <SignatoryList
              signatories={document.document_signatories ?? []}
              currentProfileId={profile?.id}
              showSignLink={["pending", "in_progress"].includes(document.status)}
              onSelectPage={setPageNumber}
            />
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-surface p-4 shadow-sm sm:p-5">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span aria-hidden="true" className="h-4 w-1 rounded-full bg-navy" />
              Details
            </h2>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <FieldTile label="Status">
                <StatusBadge status={document.status} />
              </FieldTile>
              <FieldTile label="Signing order">
                {document.signing_mode === "parallel"
                  ? "All at once"
                  : "One at a time"}
              </FieldTile>
              <FieldTile label="Pages">
                {document.page_count || "Not recorded"}
              </FieldTile>
              <FieldTile label="File size">
                {formatBytes(document.file_size)}
              </FieldTile>
              <FieldTile label="Created">
                {formatDate(document.created_at)}
              </FieldTile>
              <FieldTile label="Completed">
                {document.completed_at
                  ? formatDateTime(document.completed_at)
                  : "Not completed"}
              </FieldTile>
              <FieldTile label="Current file" className="sm:col-span-2">
                <span className="break-all text-xs text-slate-600">
                  {document.file_name || "Not recorded"}
                </span>
              </FieldTile>
              <FieldTile
                label="Current file SHA-256"
                className="sm:col-span-2"
              >
                <span
                  className="break-all font-mono text-[11px] text-slate-600"
                  title={currentHash || ""}
                >
                  {currentHash
                    ? `${currentHash.slice(0, 24)}…${currentHash.slice(-8)}`
                    : "Not recorded"}
                </span>
              </FieldTile>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-surface p-4 shadow-sm sm:p-5">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span aria-hidden="true" className="h-4 w-1 rounded-full bg-navy" />
              Activity
            </h2>
            <div className="mt-3">
              <DocumentTimeline events={visibleEvents} />
            </div>
            <Pagination
              page={safeActivityPage}
              pageCount={activityPageCount}
              total={events.length}
              onPageChange={(nextPage) =>
                setActivityPager({ documentId: id, page: nextPage })
              }
              className="mt-4"
            />
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={
          pendingAction === "delete"
            ? "Delete this draft?"
            : "Void this document?"
        }
        description={
          pendingAction === "delete"
            ? "The uploaded PDF, signatories and draft history will be removed. This can't be undone."
            : "Signers will no longer be able to sign. Signed versions already recorded stay in the audit trail."
        }
        confirmLabel={pendingAction === "delete" ? "Delete draft" : "Void document"}
        busyLabel={pendingAction === "delete" ? "Deleting…" : "Voiding…"}
        busy={busy}
        onCancel={() => !busy && setPendingAction(null)}
        onConfirm={confirmAction}
      />
    </div>
  );
}
