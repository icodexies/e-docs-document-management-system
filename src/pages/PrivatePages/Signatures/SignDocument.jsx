import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import PageHero from "../../../components/ui/PageHero.jsx";
import StatusBadge from "../../../components/ui/StatusBadge.jsx";
import { Spinner } from "../../../components/ui/Loading.jsx";
import PdfViewer from "../../../components/documents/PdfViewer.jsx";
import { useAuth } from "../../../hooks/auth/useAuth.js";
import { useSigningContext } from "../../../hooks/documents/useSigningContext.js";
import {
  declineDocument,
  markDocumentViewed,
  signDocument,
} from "../../../services/documents/documentService.js";
import { formatDateTime } from "../../../services/documents/documentRules.js";

export default function SignDocument() {
  const { signatoryId } = useParams();
  const { profile, refreshProfile } = useAuth();
  const { loading, error, context, fileUrl, signatureUrl, refresh } =
    useSigningContext(signatoryId, profile?.id);

  const [pageOverride, setPageOverride] = useState(null);
  const [consent, setConsent] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState("");
  const [signatureRequired, setSignatureRequired] = useState(false);
  const [signed, setSigned] = useState(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);
  const [declined, setDeclined] = useState(false);
  const viewedRef = useRef("");

  useEffect(() => {
    if (!context || viewedRef.current === signatoryId) return;
    viewedRef.current = signatoryId;
    if (context.signatory.status !== "pending") return;

    markDocumentViewed(signatoryId)
      .then(() => refresh())
      .catch(() => {
        // Viewing is a convenience; the server still guards the signature.
      });
  }, [context, signatoryId, refresh]);

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-44 animate-pulse rounded-2xl bg-tint motion-reduce:animate-none" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="h-[34rem] animate-pulse rounded-2xl bg-tint motion-reduce:animate-none" />
          <div className="h-96 animate-pulse rounded-2xl bg-tint motion-reduce:animate-none" />
        </div>
      </div>
    );
  }

  if (error || !context) {
    return (
      <div className="space-y-4">
        <PageHero
          eyebrow="Sign document"
          title="Can't open this signature request"
          description={
            error ||
            "The request wasn't found, or it isn't assigned to your account."
          }
        />
        <Link
          to="/awaiting"
          className="inline-flex rounded-xl border border-slate-300 bg-surface px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-page"
        >
          Back to awaiting signatures
        </Link>
      </div>
    );
  }

  const { signatory, document, canApprove, hasSignature } = context;
  const pageNumber = pageOverride ?? signatory.page_number;

  const overlays = [
    {
      key: signatory.id,
      pageNumber: signatory.page_number,
      x: signatory.x,
      y: signatory.y,
      width: signatory.width,
      height: signatory.height,
      label: "Your signature",
      tone: "jade",
    },
  ];

  const isSigned = signatory.status === "signed";
  const isClosed = !["pending", "in_progress"].includes(document.status);
  const isDeclined = signatory.status === "declined" || document.status === "declined";
  const canSubmit = canApprove.ok && consent && !signing && !signed && !declined;

  async function approve() {
    if (!canSubmit) return;
    setSigning(true);
    setSignError("");
    setSignatureRequired(false);
    try {
      const result = await signDocument(signatoryId);
      setSigned(result);
      refresh();
      refreshProfile();
    } catch (nextError) {
      setSignError(nextError.message || "Couldn't sign the document.");
      if (nextError.code === "SIGNATURE_REQUIRED") {
        setSignatureRequired(true);
        refresh();
        refreshProfile();
      }
    } finally {
      setSigning(false);
    }
  }

  async function confirmDecline() {
    if (declining) return;
    setDeclining(true);
    setSignError("");
    try {
      await declineDocument(signatoryId, declineReason);
      setDeclineOpen(false);
      setDeclined(true);
      refresh();
    } catch (nextError) {
      setSignError(nextError.message || "Couldn't decline the document.");
      setDeclineOpen(false);
    } finally {
      setDeclining(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Sign document"
        title={document.title}
        description={`From ${document.owner_name || "the owner"} · ${
          document.page_count
            ? `${document.page_count} page${document.page_count === 1 ? "" : "s"}`
            : "PDF"
        }`}
        actions={
          <Link
            to="/awaiting"
            className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Back to awaiting
          </Link>
        }
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={document.status} />
          <StatusBadge status={signatory.status} />
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white">
            Page {signatory.page_number}
          </span>
        </div>
      </PageHero>

      {signError && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
        >
          {signError}
          {signatureRequired && (
            <>
              {" "}
              <Link
                to={`/profile?return=${encodeURIComponent(`/sign/${signatoryId}`)}`}
                className="font-semibold underline"
              >
                Upload your signature
              </Link>
            </>
          )}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200/80 bg-surface p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span aria-hidden="true" className="h-4 w-1 rounded-full bg-navy" />
              Review the full document
            </h2>
            <span className="text-xs text-slate-500">
              Your field is highlighted
            </span>
          </div>
          {fileUrl ? (
            <PdfViewer
              source={fileUrl}
              pageNumber={pageNumber}
              onPageChange={setPageOverride}
              overlays={overlays}
              title="Check every page before signing"
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-page/60 px-5 py-10 text-center text-sm text-slate-500">
              Preparing the PDF…
            </div>
          )}
        </section>

        <div className="space-y-4">
          {signed ? (
            <section className="rounded-2xl border border-jade-line bg-jade-soft p-4 sm:p-5">
              <p className="font-serif text-xl font-bold text-jade-deep">
                Signature applied
              </p>
              <p className="mt-1 text-sm text-jade-deep">
                Version {signed.version} was recorded
                {signed.completed
                  ? "; the document is complete."
                  : ". The next signer can now act."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to={`/documents/${signed.document_id}`}
                  className="rounded-xl bg-jade-deep px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-jade dark:text-navy"
                >
                  Open the document
                </Link>
                <Link
                  to="/awaiting"
                  className="rounded-xl border border-jade-line bg-white px-4 py-2 text-sm font-semibold text-jade-deep transition-colors hover:bg-jade-soft dark:bg-jade-soft"
                >
                  Back to awaiting
                </Link>
              </div>
            </section>
          ) : declined || isDeclined ? (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5">
              <p className="font-serif text-xl font-bold text-red-800">
                This document was declined
              </p>
              <p className="mt-1 text-sm text-red-700">
                {signatory.decline_reason
                  ? `Reason: ${signatory.decline_reason}`
                  : "The document is no longer moving forward."}
              </p>
              <Link
                to="/awaiting"
                className="mt-3 inline-flex rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 dark:bg-red-50 dark:hover:bg-red-100"
              >
                Back to awaiting
              </Link>
            </section>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-200/80 bg-surface p-4 shadow-sm sm:p-5">
                <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <span aria-hidden="true" className="h-4 w-1 rounded-full bg-navy" />
                  Your signature
                </h2>

                {hasSignature ? (
                  signatureUrl ? (
                    <div className="mt-3 inline-flex max-w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2">
                      <img
                        src={signatureUrl}
                        alt="Your stored signature"
                        className="max-h-24 w-auto max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">
                      Your signature is on file.
                    </p>
                  )
                ) : (
                  <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                    <p className="font-semibold">Upload your signature first.</p>
                    <p className="mt-1">
                      You can review this document now, but the approve action
                      stays blocked until a signature is on file.
                    </p>
                    <Link
                      to={`/profile?return=${encodeURIComponent(`/sign/${signatoryId}`)}`}
                      className="mt-2 inline-flex font-semibold underline"
                    >
                      Upload signature
                    </Link>
                  </div>
                )}

                <div className="mt-4 rounded-xl bg-page px-3.5 py-3">
                  <p className="text-[11px] text-slate-500">Signing as</p>
                  <p className="text-sm font-semibold text-ink">
                    {signatory.signer_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[signatory.signer_position, signatory.signer_department]
                      .filter(Boolean)
                      .join(" · ") || "No position recorded"}
                  </p>
                </div>

                {!canApprove.ok && hasSignature && !isSigned && !isClosed && (
                  <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2.5 text-sm text-slate-700">
                    {canApprove.reason}
                  </p>
                )}

                {isSigned && (
                  <p className="mt-3 rounded-xl bg-jade-soft px-3 py-2.5 text-sm text-jade-deep">
                    You signed this document
                    {signatory.signed_at
                      ? ` on ${formatDateTime(signatory.signed_at)}`
                      : ""}
                    .
                  </p>
                )}

                {isClosed && !isSigned && (
                  <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2.5 text-sm text-slate-700">
                    This document is not open for signing.
                  </p>
                )}

                <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    disabled={!canApprove.ok || Boolean(signed)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-400"
                  />
                  <span>
                    I reviewed this document and agree to sign it
                    electronically as{" "}
                    <strong className="font-semibold">
                      {signatory.signer_name}
                    </strong>
                    .
                  </span>
                </label>

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={approve}
                    disabled={!canSubmit}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {signing && (
                      <Spinner className="h-4 w-4 border-white/40 border-t-white" />
                    )}
                    {signing ? "Signing…" : "Approve & sign"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeclineOpen(true)}
                    disabled={signing || isSigned}
                    className="rounded-xl border border-slate-300 bg-surface px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-page disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Decline
                  </button>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Your stored signature is stamped by the server. The original
                  PDF, the signed copy and its SHA-256 hash stay in the audit
                  trail.
                </p>
              </section>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={declineOpen}
        title="Decline this document?"
        description="The owner will see your reason. The document will stop moving forward."
        confirmLabel="Decline"
        busyLabel="Declining…"
        busy={declining}
        onCancel={() => !declining && setDeclineOpen(false)}
        onConfirm={confirmDecline}
      >
        <label className="block text-sm text-slate-600">
          <span className="mb-1 block text-xs font-semibold">
            Reason (optional)
          </span>
          <textarea
            value={declineReason}
            onChange={(event) => setDeclineReason(event.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Let the owner know what needs to change."
            className="w-full rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-sm text-ink shadow-[inset_0_1px_2px_rgba(11,19,48,0.02)] placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
          />
        </label>
      </ConfirmDialog>
    </div>
  );
}
