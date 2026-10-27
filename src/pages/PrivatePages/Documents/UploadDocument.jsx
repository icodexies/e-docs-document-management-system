import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageHero from "../../../components/ui/PageHero.jsx";
import { Spinner } from "../../../components/ui/Loading.jsx";
import PdfFieldEditor from "../../../components/documents/PdfFieldEditor.jsx";
import SignatoryReviewList from "../../../components/documents/SignatoryReviewList.jsx";
import UploadDropzone from "../../../components/documents/UploadDropzone.jsx";
import { useAuth } from "../../../hooks/auth/useAuth.js";
import { useDocumentUpload } from "../../../hooks/documents/useDocumentUpload.js";
import { formatBytes } from "../../../services/documents/documentRules.js";

const STEPS = [
  { number: 1, label: "Choose PDF" },
  { number: 2, label: "Review signatories" },
  { number: 3, label: "Send" },
];

const DETECTION_MODES = {
  garamond: "Garamond Bold · 14–18 pt",
  none: "Manual only",
};

const DETECTION_TITLES = {
  garamond:
    "Kept every name-like line in Garamond-like bold type at 14–18 pt, with or without a signature label.",
  none: "No Garamond Bold 14–18 pt names found. Add signatories manually.",
};

export default function UploadDocument() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const upload = useDocumentUpload({ userId: user?.id });

  const [pageNumber, setPageNumber] = useState(1);
  const [selectedKey, setSelectedKey] = useState(null);
  const [failedDocumentId, setFailedDocumentId] = useState(null);
  const [fileError, setFileError] = useState("");

  const selected =
    upload.signatories.find((signatory) => signatory.key === selectedKey) ??
    upload.signatories[0] ??
    null;
  const resolvedKey = selected?.key ?? null;
  const showReview = Boolean(
    upload.file && upload.pageCount > 0 && !upload.detecting,
  );
  const currentStep = upload.sending ? 3 : !upload.file ? 1 : 2;
  const canSend =
    upload.ready &&
    upload.title.trim().length > 0 &&
    !upload.sending &&
    !upload.detecting &&
    !failedDocumentId;

  async function handleFile(file) {
    setSelectedKey(null);
    setPageNumber(1);
    setFailedDocumentId(null);
    setFileError("");
    const result = await upload.selectFile(file);
    if (!result?.ok && !result?.cancelled) {
      setFileError(result?.error || "Couldn't read that file.");
    }
  }

  function handleClear() {
    upload.clearFile();
    setSelectedKey(null);
    setPageNumber(1);
    setFailedDocumentId(null);
    setFileError("");
  }

  function handleSelect(key) {
    setSelectedKey(key);
    const field = upload.signatories.find((signatory) => signatory.key === key);
    if (field) setPageNumber(field.pageNumber);
  }

  async function handleSend() {
    if (!canSend) return;
    setFailedDocumentId(null);
    const result = await upload.send();
    if (result.ok) {
      navigate(`/documents/${result.documentId}`);
    } else {
      setFailedDocumentId(result.documentId ?? null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Upload"
        title="Send a PDF for signature"
        description="We read the text layer locally, match printed names to active accounts at 90% or higher, and let you confirm every box before anything is sent."
      />

      <ol className="grid gap-2 sm:grid-cols-3" aria-label="Upload steps">
        {STEPS.map((step) => {
          const done = step.number < currentStep;
          const current = step.number === currentStep;
          return (
            <li
              key={step.number}
              aria-current={current ? "step" : undefined}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                done
                  ? "border-jade-line bg-jade-soft text-jade-deep"
                  : current
                    ? "border-navy bg-navy text-white"
                    : "border-slate-200 bg-surface text-slate-500"
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                  done
                    ? "bg-jade text-white dark:text-navy"
                    : current
                      ? "bg-white/15 text-white"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {step.number}
              </span>
              <span className="text-xs font-semibold">{step.label}</span>
            </li>
          );
        })}
      </ol>

      {!upload.file && (
        <section className="rounded-2xl border border-slate-200/80 bg-surface p-4 shadow-sm sm:p-5">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span aria-hidden="true" className="h-4 w-1 rounded-full bg-navy" />
            Choose a PDF
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Nothing is uploaded until you press Send. Password-protected PDFs
            can't be scanned.
          </p>
          <div className="mt-4">
            <UploadDropzone
              file={upload.file}
              onFile={handleFile}
              busy={upload.detecting}
              progress={upload.progress}
              error={fileError}
            />
          </div>
        </section>
      )}

      {upload.file && (
        <>
          {upload.detectionNote && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
              {upload.detectionNote}
            </p>
          )}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-slate-200/80 bg-surface p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <span aria-hidden="true" className="h-4 w-1 rounded-full bg-navy" />
                  Place the signature boxes
                </h2>
                {upload.detectionMode && (
                  <span
                    className="rounded-full bg-tint px-2.5 py-0.5 text-[10px] font-semibold text-accent"
                    title={DETECTION_TITLES[upload.detectionMode] ?? ""}
                  >
                    {DETECTION_MODES[upload.detectionMode] ??
                      upload.detectionMode}
                  </span>
                )}
              </div>
              <div className="mt-3">
                {showReview ? (
                  <PdfFieldEditor
                    source={upload.sourceUrl}
                    fields={upload.signatories}
                    selectedKey={resolvedKey}
                    onSelect={handleSelect}
                    onChangeField={upload.updateSignatory}
                    pageNumber={pageNumber}
                    onPageChange={setPageNumber}
                  />
                ) : (
                  <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-page/60 px-5 py-10 text-center">
                    {upload.detecting ? (
                      <>
                        <Spinner />
                        <p className="mt-3 font-serif text-lg font-bold text-ink">
                          Scanning the document…
                        </p>
                        <p className="mt-1 text-sm text-slate-500" role="status">
                          {upload.progress.total > 0
                            ? `Page ${upload.progress.page} of ${upload.progress.total}`
                            : "Reading the PDF…"}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Preparing the preview…
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>

            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200/80 bg-surface p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <span aria-hidden="true" className="h-4 w-1 rounded-full bg-navy" />
                      File &amp; title
                    </h2>
                    <p className="mt-1.5 text-xs text-slate-500">
                      {upload.detecting
                        ? "Scanning the document…"
                        : upload.ready
                          ? "Ready to submit."
                          : upload.signatories.length === 0
                            ? "Add at least one signatory before submitting."
                            : `${upload.unresolvedCount} signator${upload.unresolvedCount === 1 ? "y" : "ies"} need attention.`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!canSend}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {upload.sending && (
                      <Spinner className="h-4 w-4 border-white/40 border-t-white" />
                    )}
                    {upload.sending ? "Submitting…" : "Submit file"}
                  </button>
                </div>

                <label className="mt-3 block text-sm text-slate-600">
                  <span className="mb-1 block text-xs font-semibold">
                    Document title
                  </span>
                  <input
                    value={upload.title}
                    onChange={(event) => upload.setTitle(event.target.value)}
                    maxLength={160}
                    placeholder="e.g. Travel request — Juan Dela Cruz"
                    className="w-full rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-sm text-ink shadow-[inset_0_1px_2px_rgba(11,19,48,0.02)] placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
                  />
                </label>

                <div className="mt-3 rounded-xl border border-slate-200 bg-page/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-serif text-base font-bold text-ink">
                        {upload.file.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatBytes(upload.file.size)}
                        {upload.pageCount
                          ? ` · ${upload.pageCount} page${upload.pageCount === 1 ? "" : "s"}`
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClear}
                      disabled={upload.sending}
                      className="shrink-0 rounded-xl border border-slate-300 bg-surface px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-page disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      Remove
                    </button>
                  </div>

                  {upload.detectionError && (
                    <p
                      role="alert"
                      className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                    >
                      {upload.detectionError}{" "}
                      <button
                        type="button"
                        onClick={handleClear}
                        className="font-semibold underline"
                      >
                        Choose another file
                      </button>
                    </p>
                  )}

                  {upload.sendError && (
                    <p
                      role="alert"
                      className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                    >
                      {upload.sendError}
                      {failedDocumentId && (
                        <>
                          {" "}
                          <Link
                            to={`/documents/${failedDocumentId}`}
                            className="font-semibold underline"
                          >
                            Open the saved draft
                          </Link>{" "}
                          to delete it, or remove this file and start again.
                        </>
                      )}
                    </p>
                  )}
                </div>
              </section>

              {showReview && (
                <section className="rounded-2xl border border-slate-200/80 bg-surface p-4 shadow-sm sm:p-5">
                  <SignatoryReviewList
                    signatories={upload.signatories}
                    selectedKey={resolvedKey}
                    onSelect={handleSelect}
                    onRemove={upload.removeSignatory}
                    onMove={upload.moveSignatory}
                    onChooseMatch={upload.chooseMatch}
                    onChangeName={(key, value) =>
                      upload.updateSignatory(key, { detectedName: value })
                    }
                    onFindMatches={upload.rerunMatch}
                    matchingKey={upload.matchingKey}
                    onAdd={upload.addManualSignatory}
                    signingMode={upload.signingMode}
                    onModeChange={upload.setSigningMode}
                    pageNumber={pageNumber}
                  />
                </section>
              )}
            </div>
          </div>

        </>
      )}
    </div>
  );
}
