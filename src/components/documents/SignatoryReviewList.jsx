import { useState } from "react";
import EmptyState from "../ui/EmptyState.jsx";
import { MATCH_THRESHOLD, percent } from "../../services/documents/documentRules.js";
import { formatDetectedStyle } from "../../services/documents/nameDetectionRules.js";

const CHIPS = {
  matched: "bg-jade-soft text-jade-deep",
  review: "bg-amber-50 text-amber-800",
  unmatched: "bg-red-50 text-red-700",
};

const CHIP_LABELS = {
  matched: "Ready",
  review: "Choose person",
  unmatched: "No match",
};

const SMALL_BUTTON =
  "rounded-lg border border-slate-300 bg-surface px-2 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-page disabled:cursor-not-allowed disabled:text-slate-400";

export default function SignatoryReviewList({
  signatories = [],
  selectedKey,
  onSelect,
  onRemove,
  onMove,
  onChooseMatch,
  onChangeName,
  onFindMatches,
  matchingKey,
  onAdd,
  signingMode,
  onModeChange,
  pageNumber = 1,
}) {
  const [addName, setAddName] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState("");

  const readyCount = signatories.filter(
    (signatory) =>
      signatory.profileId &&
      Number(signatory.score) >= MATCH_THRESHOLD,
  ).length;
  const allReady =
    signatories.length > 0 && readyCount === signatories.length;

  async function handleAdd(event) {
    event.preventDefault();
    if (adding) return;
    setAddError("");
    setActionError("");
    setAdding(true);
    try {
      const result = await onAdd(addName, pageNumber);
      if (!result?.ok) {
        setAddError(result?.error || "Couldn't add that signatory.");
        return;
      }
      setAddName("");
      onSelect?.(result.key);
    } finally {
      setAdding(false);
    }
  }

  function handleChoose(key, profileId) {
    setActionError("");
    const result = onChooseMatch(key, profileId);
    if (!result?.ok) {
      setActionError(result?.error || "Couldn't select that person.");
    }
  }

  async function handleFind(key) {
    setActionError("");
    const result = await onFindMatches(key);
    if (!result?.ok) {
      setActionError(result?.error || "Couldn't find that name.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span aria-hidden className="h-4 w-1 rounded-full bg-navy" />
            Signatories
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {signatories.length} detected · {readyCount} ready
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
            allReady
              ? "bg-jade-soft text-jade-deep"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          {allReady
            ? "All set"
            : `${readyCount} of ${signatories.length} ready`}
        </span>
      </div>

      <fieldset className="rounded-xl border border-slate-200 bg-page/60 px-3.5 py-3">
        <legend className="px-1 text-[11px] font-semibold text-slate-600">
          Signing order
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="signing-mode"
              checked={signingMode === "sequential"}
              onChange={() => onModeChange("sequential")}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="font-semibold text-ink">One at a time</span>
              <span className="block text-xs text-slate-500">
                Each person is notified after the previous one signs.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="signing-mode"
              checked={signingMode === "parallel"}
              onChange={() => onModeChange("parallel")}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="font-semibold text-ink">All at once</span>
              <span className="block text-xs text-slate-500">
                Everyone can sign at the same time.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      {actionError && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
        >
          {actionError}
        </p>
      )}

      {signatories.length === 0 ? (
        <EmptyState
          title="No signatories yet"
          description="Add a name manually below, or choose another PDF with selectable text."
        />
      ) : (
        <ul className="max-h-[calc(100vh-20rem)] space-y-2 overflow-y-auto pr-1 max-lg:max-h-none max-lg:overflow-visible">
          {signatories.map((signatory, index) => {
            const ready =
              signatory.profileId &&
              Number(signatory.score) >= MATCH_THRESHOLD;
            const eligibleMatches = signatory.matches.filter(
              (match) => Number(match.score) >= MATCH_THRESHOLD,
            );
            const style = formatDetectedStyle(signatory);

            return (
              <li
                key={signatory.key}
                className={`rounded-xl border p-3 transition-colors ${
                  signatory.key === selectedKey
                    ? "border-jade bg-jade-soft/30"
                    : "border-slate-200 bg-surface"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-tint text-[11px] font-bold text-accent">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            CHIPS[signatory.status] ?? CHIPS.review
                          }`}
                        >
                          {CHIP_LABELS[signatory.status] ?? "Review"}
                        </span>
                        {signatory.hasSignature ? (
                          <span className="text-[10px] font-semibold text-jade-deep">
                            Signature on file
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-700">
                            No signature yet
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          value={signatory.detectedName}
                          onChange={(event) =>
                            onChangeName(signatory.key, event.target.value)
                          }
                          maxLength={160}
                          aria-label={`Detected name for signer ${index + 1}`}
                          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-surface px-3 py-2 text-sm text-ink shadow-[inset_0_1px_2px_rgba(11,19,48,0.02)] focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleFind(signatory.key)}
                          disabled={matchingKey === signatory.key}
                          className={SMALL_BUTTON}
                        >
                          {matchingKey === signatory.key
                            ? "Finding…"
                            : "Find account"}
                        </button>
                      </div>

                      {style && (
                        <p className="mt-1 text-[11px] text-slate-500">
                          Detected in {style}
                        </p>
                      )}

                      {ready ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-ink">
                            {signatory.fullName}
                          </span>
                          {(signatory.department || signatory.position) && (
                            <span className="text-slate-500">
                              {[
                                signatory.position,
                                signatory.department,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                          <span className="rounded-full bg-tint px-2 py-0.5 text-[10px] font-semibold text-accent">
                            {percent(signatory.score)}
                          </span>
                          {eligibleMatches.length > 1 && (
                            <select
                              value={String(signatory.profileId)}
                              onChange={(event) =>
                                handleChoose(signatory.key, event.target.value)
                              }
                              aria-label={`Choose the account for ${signatory.detectedName}`}
                              className="rounded-lg border border-slate-300 bg-surface px-2 py-1 text-xs text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
                            >
                              {eligibleMatches.map((match) => (
                                <option
                                  key={match.profile_id}
                                  value={String(match.profile_id)}
                                >
                                  {match.full_name} — {percent(match.score)}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 space-y-2">
                          <p className="text-xs text-amber-800">
                            {signatory.matches.length > 0
                              ? "Choose the right person:"
                              : "No account matched at 90% or higher. Correct the name and find again."}
                          </p>
                          {signatory.matches.length > 0 && (
                            <select
                              value=""
                              onChange={(event) => {
                                if (event.target.value) {
                                  handleChoose(
                                    signatory.key,
                                    event.target.value,
                                  );
                                }
                              }}
                              aria-label={`Choose the account for ${signatory.detectedName}`}
                              className="w-full rounded-lg border border-slate-300 bg-surface px-2 py-1.5 text-xs text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none sm:w-auto"
                            >
                              <option value="">
                                Choose the right person…
                              </option>
                              {signatory.matches.map((match) => (
                                <option
                                  key={match.profile_id}
                                  value={String(match.profile_id)}
                                  disabled={
                                    Number(match.score) < MATCH_THRESHOLD
                                  }
                                >
                                  {match.full_name} — {percent(match.score)}
                                  {Number(match.score) < MATCH_THRESHOLD
                                    ? " (below 90%)"
                                    : ""}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label="Move signer up"
                        onClick={() => onMove(signatory.key, -1)}
                        disabled={index === 0}
                        className={SMALL_BUTTON}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="Move signer down"
                        onClick={() => onMove(signatory.key, 1)}
                        disabled={index === signatories.length - 1}
                        className={SMALL_BUTTON}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        aria-label="Remove signer"
                        onClick={() => onRemove(signatory.key)}
                        className={SMALL_BUTTON}
                      >
                        ✕
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelect(signatory.key)}
                      className="text-[11px] font-semibold text-accent hover:underline"
                    >
                      Page {signatory.pageNumber} · Show box
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form
        onSubmit={handleAdd}
        className="rounded-xl border border-slate-200 bg-page/60 p-3.5"
      >
        <p className="text-xs font-semibold text-slate-600">
          Add a signatory manually
        </p>
        <p className="mt-1 text-xs text-slate-500">
          The name must match an active account at 90% or higher. The box is
          placed on page {pageNumber}; drag it after adding.
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={addName}
            onChange={(event) => setAddName(event.target.value)}
            maxLength={160}
            placeholder="e.g. Juan Dela Cruz"
            aria-label="Signatory name"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-surface px-3 py-2 text-sm text-ink shadow-[inset_0_1px_2px_rgba(11,19,48,0.02)] placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
          />
          <button
            type="submit"
            disabled={adding}
            className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {adding ? "Adding…" : "Add signatory"}
          </button>
        </div>
        {addError && (
          <p role="alert" className="mt-2 text-sm font-medium text-red-700">
            {addError}
          </p>
        )}
      </form>
    </div>
  );
}
