import { useState } from "react";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import PageHero from "../../../components/ui/PageHero.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import CreateUserDialog from "../../../components/admin/CreateUserDialog.jsx";
import UserCard from "../../../components/admin/UserCard.jsx";
import { useAuth } from "../../../hooks/auth/useAuth.js";
import { useProfiles } from "../../../hooks/profile/useProfiles.js";
import {
  adminSetActive,
  adminSetRole,
} from "../../../services/profile/profileService.js";

export default function Users() {
  const { profile: currentProfile } = useAuth();
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
  } = useProfiles({ search });

  const [busyId, setBusyId] = useState("");
  const [actionError, setActionError] = useState("");
  const [pendingActive, setPendingActive] = useState(null);
  const [activating, setActivating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  async function changeRole(profileId, role) {
    if (busyId) return;
    setBusyId(profileId);
    setActionError("");
    try {
      await adminSetRole(profileId, role);
      refresh();
    } catch (error) {
      setActionError(error.message || "Couldn't change that role.");
    } finally {
      setBusyId("");
    }
  }

  function askActive(profileId, active) {
    const target = items.find((item) => String(item.id) === String(profileId));
    if (target) setPendingActive({ profile: target, active });
  }

  async function confirmActive() {
    if (!pendingActive || activating) return;
    setActivating(true);
    setActionError("");
    try {
      await adminSetActive(pendingActive.profile.id, pendingActive.active);
      setPendingActive(null);
      refresh();
    } catch (error) {
      setActionError(error.message || "Couldn't change that account.");
      setPendingActive(null);
    } finally {
      setActivating(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Administration"
        title="Users"
        description="Create accounts, promote members to admins, or deactivate access. The first admin is bootstrapped in Supabase; the rest can be added here."
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-slate-100"
          >
            Add user
          </button>
        }
      />

      <section className="rounded-2xl border border-slate-200/80 bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span aria-hidden="true" className="h-4 w-1 rounded-full bg-navy" />
              Account directory
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Use <strong>Add user</strong> to create a login and profile. If
              this is the first admin account, create it in Supabase →
              Authentication → Users and promote it once; after that, this page
              can create the rest.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="rounded-xl border border-slate-300 bg-surface px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-page"
          >
            Refresh
          </button>
        </div>

        <label className="mt-4 block text-sm text-slate-600">
          <span className="mb-1 block text-xs font-semibold">Search by name</span>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="e.g. Juan Dela Cruz"
            className="w-full rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-sm text-ink shadow-[inset_0_1px_2px_rgba(11,19,48,0.02)] placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
          />
        </label>
      </section>

      {actionError && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
        >
          {actionError}
        </p>
      )}

      <section aria-busy={loading}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span aria-hidden="true" className="h-4 w-1 rounded-full bg-navy" />
            Results
          </h2>
          <span className="text-xs text-slate-500" role="status">
            {total > 0 ? `${total} account${total === 1 ? "" : "s"}` : "No accounts"}
          </span>
        </div>

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2" aria-hidden="true">
            {[0, 1, 2, 3].map((key) => (
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
            title="No accounts found"
            description={
              search.trim()
                ? "Try a different name."
                : "Use Add user above to create the first account."
            }
            action={
              search.trim() ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-300 bg-surface px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-page"
                >
                  Clear search
                </button>
              ) : null
            }
          />
        ) : (
          <>
            <ul className="grid gap-4 lg:grid-cols-2">
              {items.map((profile) => (
                <UserCard
                  key={profile.id}
                  profile={profile}
                  busy={Boolean(busyId)}
                  isSelf={String(profile.id) === String(currentProfile?.id)}
                  onSetRole={changeRole}
                  onSetActive={askActive}
                />
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

      {createOpen && (
        <CreateUserDialog
          open
          onClose={() => setCreateOpen(false)}
          onCreated={() => refresh()}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingActive)}
        title={
          pendingActive?.active
            ? "Activate this account?"
            : "Deactivate this account?"
        }
        description={
          pendingActive
            ? pendingActive.active
              ? `${pendingActive.profile.full_name} will be able to sign in and receive documents again.`
              : `${pendingActive.profile.full_name} will no longer be able to open documents or sign. Their history stays in the audit trail.`
            : ""
        }
        confirmLabel={pendingActive?.active ? "Activate" : "Deactivate"}
        busyLabel={pendingActive?.active ? "Activating…" : "Deactivating…"}
        tone={pendingActive?.active ? "primary" : "danger"}
        busy={activating}
        onCancel={() => !activating && setPendingActive(null)}
        onConfirm={confirmActive}
      />
    </div>
  );
}
