import { Link } from "react-router-dom";
import DashboardAnalytics from "../../../components/dashboard/DashboardAnalytics.jsx";
import PageHero from "../../../components/ui/PageHero.jsx";
import StatCard from "../../../components/ui/StatCard.jsx";
import { useAuth } from "../../../hooks/auth/useAuth.js";
import { useDashboard } from "../../../hooks/dashboard/useDashboard.js";
import { ROLE_LABELS } from "../../../routes/roles.js";

export default function Dashboard() {
  const { user, profile, role } = useAuth();
  const { loading, error, data, refresh } = useDashboard({
    userId: user?.id,
    profileId: profile?.id,
  });

  const counts = data?.counts ?? {
    awaiting: 0,
    inProgress: 0,
    completed: 0,
    drafts: 0,
  };
  const hasSignature = Boolean(profile?.signature_path);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Dashboard"
        title={`Welcome${profile?.full_name ? `, ${profile.full_name}` : ""}`}
        description="A snapshot of your uploads, approvals, and signing performance."
        actions={
          <>
            <Link
              to="/documents/new"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-slate-100"
            >
              Upload a document
            </Link>
            <Link
              to="/awaiting"
              className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Awaiting my signature
            </Link>
          </>
        }
      >
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white">
            {ROLE_LABELS[role] ?? role}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
              hasSignature
                ? "border-white/15 bg-white/10 text-white"
                : "border-amber-300/30 bg-amber-300/10 text-amber-200"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                hasSignature ? "bg-jade-line" : "bg-amber-300"
              }`}
            />
            {hasSignature ? "Signature on file" : "Signature needed"}
          </span>
        </div>
      </PageHero>

      {!hasSignature && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Upload your signature before approving
              </p>
              <p className="mt-1 text-sm text-amber-800">
                You can still review documents, but the approve action is
                blocked until a signature is on file.
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

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-100 bg-red-50 px-5 py-6 text-sm text-red-700"
        >
          {error}{" "}
          <button type="button" onClick={refresh} className="font-semibold underline">
            Retry
          </button>
        </div>
      ) : (
        <>
          <section
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-busy={loading}
          >
            {loading ? (
              [0, 1, 2, 3].map((key) => (
                <div
                  key={key}
                  aria-hidden="true"
                  className="h-28 animate-pulse rounded-2xl bg-tint motion-reduce:animate-none"
                />
              ))
            ) : (
              <>
                <StatCard
                  label="Awaiting my signature"
                  value={counts.awaiting}
                  hint="Documents routed to you"
                  tone="amber"
                />
                <StatCard
                  label="In progress"
                  value={counts.inProgress}
                  hint="Sent by you, still moving"
                  tone="accent"
                />
                <StatCard
                  label="Completed"
                  value={counts.completed}
                  hint="Fully signed"
                  tone="jade"
                />
                <StatCard
                  label="Drafts"
                  value={counts.drafts}
                  hint="Not sent yet"
                  tone="navy"
                />
              </>
            )}
          </section>

          <DashboardAnalytics
            metrics={data?.metrics}
            loading={loading}
            onRefresh={refresh}
          />
        </>
      )}
    </div>
  );
}
