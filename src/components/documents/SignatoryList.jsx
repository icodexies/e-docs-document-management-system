import { Link } from "react-router-dom";
import StatusBadge from "../ui/StatusBadge.jsx";
import {
  formatDateTime,
  percent,
} from "../../services/documents/documentRules.js";

export default function SignatoryList({
  signatories = [],
  currentProfileId,
  showSignLink = false,
  onSelectPage,
}) {
  if (signatories.length === 0) {
    return <p className="text-sm text-slate-500">No signatories recorded.</p>;
  }

  return (
    <ul className="space-y-2">
      {signatories.map((signatory) => {
        const isMe =
          currentProfileId &&
          String(signatory.profile_id) === String(currentProfileId);
        const canSign =
          showSignLink &&
          isMe &&
          ["pending", "viewed"].includes(signatory.status);

        return (
          <li
            key={signatory.id}
            className={`rounded-xl border p-3 ${
              isMe
                ? "border-accent/40 bg-tint/40"
                : "border-slate-200 bg-surface"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                  <span className="break-words">{signatory.signer_name}</span>
                  {isMe && (
                    <span className="rounded-full bg-tint px-2 py-0.5 text-[10px] font-semibold text-accent">
                      You
                    </span>
                  )}
                  <span className="text-[11px] font-normal text-slate-500">
                    #{signatory.sign_order}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {[signatory.signer_position, signatory.signer_department]
                    .filter(Boolean)
                    .join(" · ") || "No position recorded"}
                </p>
              </div>
              <StatusBadge status={signatory.status} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>
                Detected “{signatory.detected_name}” ·{" "}
                {percent(signatory.match_score)} match · page{" "}
                {signatory.page_number}
              </span>
              {signatory.viewed_at && (
                <span className="font-medium text-accent">
                  Viewed {formatDateTime(signatory.viewed_at)}
                </span>
              )}
              <span>
                {signatory.signed_at
                  ? `Signed ${formatDateTime(signatory.signed_at)}`
                  : "Not signed yet"}
              </span>
              {onSelectPage && (
                <button
                  type="button"
                  onClick={() => onSelectPage(signatory.page_number)}
                  className="font-semibold text-accent hover:underline"
                >
                  Show field
                </button>
              )}
              {canSign && (
                <Link
                  to={`/sign/${signatory.id}`}
                  className="font-semibold text-jade-deep hover:underline"
                >
                  Review &amp; sign
                </Link>
              )}
            </div>

            {signatory.decline_reason && (
              <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                Reason: {signatory.decline_reason}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
