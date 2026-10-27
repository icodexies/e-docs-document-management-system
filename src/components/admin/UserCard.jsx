import Avatar from "../ui/Avatar.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";
import { formatDate } from "../../services/documents/documentRules.js";

const SECONDARY_BUTTON =
  "rounded-xl border border-slate-300 bg-surface px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:bg-page hover:text-ink disabled:cursor-not-allowed disabled:text-slate-400";

export default function UserCard({
  profile,
  busy = false,
  isSelf = false,
  onSetRole,
  onSetActive,
}) {
  return (
    <li className="rounded-2xl border border-slate-200/80 bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <Avatar
          name={profile.full_name}
          src={profile.avatar_url}
          size="md"
          className="ring-slate-100"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 break-words font-serif text-lg font-bold text-ink">
                {profile.full_name}
                {isSelf && (
                  <span className="rounded-full bg-tint px-2 py-0.5 text-[10px] font-semibold text-accent">
                    You
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {[profile.position, profile.department]
                  .filter(Boolean)
                  .join(" · ") || "No position recorded"}
              </p>
            </div>
            <StatusBadge
              status={profile.is_active ? "completed" : "void"}
              label={profile.is_active ? "Active" : "Inactive"}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            profile.signature_path
              ? "bg-jade-soft text-jade-deep"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          {profile.signature_path ? "Signature on file" : "No signature yet"}
        </span>
        <span className="text-slate-500">
          Joined {formatDate(profile.created_at)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
        <label className="block text-xs font-semibold text-slate-600">
          Role
          <select
            value={profile.role}
            onChange={(event) => onSetRole(profile.id, event.target.value)}
            disabled={busy || isSelf}
            className="mt-1 block rounded-xl border border-slate-300 bg-surface px-3 py-1.5 text-sm text-ink transition-colors focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none disabled:bg-slate-100"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => onSetActive(profile.id, !profile.is_active)}
          disabled={busy || isSelf}
          className={SECONDARY_BUTTON}
        >
          {profile.is_active ? "Deactivate" : "Activate"}
        </button>
      </div>

      {isSelf && (
        <p className="mt-2 text-xs text-slate-500">
          You can't change your own role or active status here.
        </p>
      )}
    </li>
  );
}
