import Avatar from "../ui/Avatar.jsx";
import Button from "../ui/Button.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";
import { formatDate } from "../../services/documents/documentRules.js";

function roleId(profileId) {
  return `user-role-${profileId}`;
}

export default function UserTable({
  profiles,
  busy = false,
  currentProfileId,
  onSetRole,
  onSetActive,
}) {
  return (
    <div className="hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-surface shadow-sm lg:block">
      <table className="w-full table-fixed">
        <caption className="sr-only">Accounts in this workspace</caption>
        <thead className="bg-page/60">
          <tr className="border-b border-slate-200 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            <th scope="col" className="w-[30%] px-4 py-3">
              Account
            </th>
            <th scope="col" className="w-[13%] px-2.5 py-3">
              Role
            </th>
            <th scope="col" className="w-[11%] px-2.5 py-3">
              Status
            </th>
            <th scope="col" className="w-[15%] px-2.5 py-3">
              Signature
            </th>
            <th scope="col" className="w-[12%] px-2.5 py-3">
              Joined
            </th>
            <th scope="col" className="w-[19%] px-2.5 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {profiles.map((profile) => {
            const isSelf = String(profile.id) === String(currentProfileId);
            const detail =
              [profile.position, profile.department]
                .filter(Boolean)
                .join(" · ") || "No position recorded";

            return (
              <tr
                key={profile.id}
                className="transition-colors hover:bg-page/60"
              >
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      name={profile.full_name}
                      src={profile.avatar_url}
                      size="md"
                      className="ring-slate-100"
                    />
                    <div className="min-w-0">
                      <p className="flex min-w-0 items-center gap-2 font-serif text-sm font-bold text-ink">
                        <span className="truncate">{profile.full_name}</span>
                        {isSelf && (
                          <span className="shrink-0 rounded-full bg-tint px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-accent">
                            You
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {detail}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-2.5 py-3">
                  <label className="sr-only" htmlFor={roleId(profile.id)}>
                    Role for {profile.full_name}
                  </label>
                  <select
                    id={roleId(profile.id)}
                    value={profile.role}
                    onChange={(event) =>
                      onSetRole(profile.id, event.target.value)
                    }
                    disabled={busy || isSelf}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-surface px-2.5 text-xs font-medium text-ink transition-colors focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-2.5 py-3">
                  <StatusBadge
                    status={profile.is_active ? "completed" : "void"}
                    label={profile.is_active ? "Active" : "Inactive"}
                  />
                </td>
                <td className="px-2.5 py-3">
                  <span
                    className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      profile.signature_path
                        ? "bg-jade-soft text-jade-deep"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {profile.signature_path ? "On file" : "Missing"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-2.5 py-3 text-xs text-slate-500 tabular-nums">
                  {formatDate(profile.created_at)}
                </td>
                <td className="px-2.5 py-3">
                  {isSelf ? (
                    <span className="text-[10px] leading-4 text-slate-500">
                      Your account
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        onSetActive(profile.id, !profile.is_active)
                      }
                    >
                      {profile.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
