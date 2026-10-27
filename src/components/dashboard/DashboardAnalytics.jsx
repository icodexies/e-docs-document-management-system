import { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

const PANEL =
  "rounded-2xl border border-slate-200/80 bg-surface p-4 shadow-sm sm:p-5";

const STATUS_META = {
  draft: { label: "Draft", color: "bg-slate-400", dot: "bg-slate-400" },
  pending: { label: "Pending", color: "bg-amber-500", dot: "bg-amber-500" },
  in_progress: { label: "In progress", color: "bg-accent", dot: "bg-accent" },
  completed: { label: "Completed", color: "bg-jade", dot: "bg-jade" },
  declined: { label: "Declined", color: "bg-red-500", dot: "bg-red-500" },
  void: { label: "Void", color: "bg-slate-300", dot: "bg-slate-300" },
};

function Panel({ title, subtitle, children, className = "" }) {
  return (
    <section className={`${PANEL} ${className}`}>
      <div className="mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {title}
        </h3>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function UploadBars({ months, totalUploads }) {
  const [activeMonth, setActiveMonth] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const max = Math.max(1, ...months.map((month) => month.count));

  function showAt(month, x, y) {
    setActiveMonth(month);
    setTooltip({ month, x, y });
  }

  function hide() {
    setActiveMonth(null);
    setTooltip(null);
  }

  const tooltipIndex = tooltip
    ? months.findIndex((month) => month.key === tooltip.month.key)
    : -1;
  const previous = tooltipIndex > 0 ? months[tooltipIndex - 1] : null;
  const change = previous ? tooltip.month.count - previous.count : null;
  const tooltipLeft = tooltip
    ? Math.min(
        Math.max(12, tooltip.x + 16),
        Math.max(12, window.innerWidth - 236),
      )
    : 0;
  const tooltipTop = tooltip
    ? Math.min(
        Math.max(12, tooltip.y + 16),
        Math.max(12, window.innerHeight - 116),
      )
    : 0;

  if (totalUploads === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-page/50 px-4 text-center">
        <p className="font-serif text-lg font-bold text-ink">No uploads yet</p>
        <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
          The last six months have no uploads. New documents will appear here.
        </p>
        <Link
          to="/documents/new"
          className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-navy px-3 text-xs font-semibold text-white transition-colors hover:bg-navy-deep"
        >
          New document
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        Hover or focus a bar to inspect.
      </p>

      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-5 bottom-7 flex flex-col justify-between"
        >
          {[0, 1, 2, 3].map((line) => (
            <span key={line} className="border-t border-slate-100" />
          ))}
        </div>

        <div
          className="relative flex h-48 items-stretch gap-2 sm:gap-3"
          role="group"
          aria-label="Uploads by month"
        >
          {months.map((month) => {
            const height = month.count
              ? Math.max(6, Math.round((month.count / max) * 100))
              : 2;
            const active = activeMonth?.key === month.key;
            return (
              <div
                key={month.key}
                tabIndex={0}
                role="img"
                aria-label={`${month.label}: ${month.count} upload${
                  month.count === 1 ? "" : "s"
                }`}
                onMouseEnter={(event) =>
                  showAt(month, event.clientX, event.clientY)
                }
                onMouseMove={(event) =>
                  setTooltip({ month, x: event.clientX, y: event.clientY })
                }
                onMouseLeave={hide}
                onFocus={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  showAt(month, rect.right, rect.top + rect.height / 2);
                }}
                onBlur={hide}
                className={`group relative flex min-w-0 flex-1 flex-col items-center rounded-xl px-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 ${
                  active ? "bg-tint/70" : "bg-transparent"
                }`}
              >
                <span
                  className={`mb-1 text-[10px] font-semibold transition-colors ${
                    active ? "text-ink" : "text-slate-500"
                  }`}
                >
                  {month.count}
                </span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={`w-full origin-bottom rounded-t-lg bg-gradient-to-t transition-all duration-200 group-hover:from-navy group-hover:to-accent group-hover:shadow-[0_10px_24px_-12px_rgba(11,19,48,0.55)] group-focus-within:from-navy group-focus-within:to-accent ${
                      active
                        ? "from-navy to-accent shadow-[0_10px_24px_-12px_rgba(11,19,48,0.55)]"
                        : "from-accent/70 to-accent"
                    } group-hover:scale-y-[1.02]`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span
                  className={`mt-2 text-center text-[10px] font-semibold transition-colors ${
                    active ? "text-ink" : "text-slate-500"
                  }`}
                >
                  {month.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {totalUploads} upload{totalUploads === 1 ? "" : "s"} in the last 6
        months
      </p>

      {tooltip &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-50 w-44 rounded-xl bg-navy px-3 py-2.5 text-white shadow-[0_12px_30px_rgba(11,19,48,0.35)] ring-1 ring-white/10"
            style={{ left: tooltipLeft, top: tooltipTop }}
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/50">
              {tooltip.month.label}
            </p>
            <p className="mt-1 text-sm font-semibold">
              {tooltip.month.count} upload
              {tooltip.month.count === 1 ? "" : "s"}
            </p>
            {previous && (
              <p className="mt-1 text-[10px] text-white/60">
                {change === 0
                  ? `Same as ${previous.label}`
                  : `${change > 0 ? "+" : ""}${change} vs ${previous.label}`}
              </p>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

function CompletionGauge({ rate, completedCount, sentCount, averageDays }) {
  return (
    <div className="group flex flex-col items-center gap-5 sm:flex-row">
      <div
        className="relative h-36 w-36 shrink-0 transition-transform duration-200 group-hover:scale-[1.02]"
        title={`${rate}% completed · ${completedCount} of ${sentCount} sent`}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            strokeWidth="10"
            className="stroke-tint"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            strokeWidth="10"
            pathLength="100"
            strokeDasharray={`${rate} 100`}
            strokeLinecap="round"
            className="stroke-jade transition-all duration-500 group-hover:stroke-jade-deep"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-serif text-3xl font-bold text-ink">{rate}%</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            completed
          </p>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <dl className="grid gap-3">
          <div className="-mx-2 rounded-lg px-2 py-1 transition-colors hover:bg-page">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Completed documents
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-ink">
              {completedCount} of {sentCount} sent
            </dd>
          </div>
          <div className="-mx-2 rounded-lg px-2 py-1 transition-colors hover:bg-page">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Average completion
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-ink">
              {averageDays === null ? "No completed documents yet" : `${averageDays} days`}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
          Excludes drafts and voided documents.
        </p>
      </div>
    </div>
  );
}

function StatusBreakdown({ statusCounts }) {
  const entries = Object.entries(STATUS_META)
    .map(([status, meta]) => ({
      status,
      ...meta,
      count: Number(statusCounts?.[status]) || 0,
    }))
    .filter((entry) => entry.count > 0);
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);

  if (total === 0) {
    return (
      <p className="flex h-36 items-center justify-center text-sm text-slate-500">
        No documents in the last 6 months.
      </p>
    );
  }

  return (
    <div>
      <div
        className="flex h-3 overflow-hidden rounded-full bg-tint"
        role="img"
        aria-label="Document status distribution"
      >
        {entries.map((entry) => (
          <span
            key={entry.status}
            className={`${entry.color} transition-all duration-200 hover:brightness-110`}
            style={{ width: `${(entry.count / total) * 100}%` }}
            title={`${entry.label}: ${entry.count}`}
          />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
        {entries.map((entry) => (
          <li
            key={entry.status}
            className="-mx-1 flex items-center justify-between gap-2 rounded-lg px-1 py-0.5 text-xs transition-colors hover:bg-page"
          >
            <span className="flex min-w-0 items-center gap-2 text-slate-600">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${entry.dot}`}
              />
              <span className="truncate">{entry.label}</span>
            </span>
            <span className="shrink-0 font-semibold text-ink">
              {entry.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EngagementBars({ signers }) {
  if (signers.total === 0) {
    return (
      <p className="flex h-36 items-center justify-center text-sm text-slate-500">
        No signatory activity in this period.
      </p>
    );
  }

  const rows = [
    {
      label: "Viewed",
      count: signers.viewed,
      rate: signers.viewedRate,
      color: "bg-accent",
    },
    {
      label: "Signed",
      count: signers.signed,
      rate: signers.signedRate,
      color: "bg-jade",
    },
    {
      label: "Not signed",
      count: signers.remaining,
      rate: Math.round(
        (signers.remaining / Math.max(1, signers.total)) * 100,
      ),
      color: "bg-amber-400",
    },
  ];

  return (
    <div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="group -mx-2 rounded-lg px-2 py-1 transition-colors hover:bg-page"
          >
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-slate-600 transition-colors group-hover:text-ink">
                {row.label}
              </span>
              <span className="font-semibold text-ink">
                {row.count}{" "}
                <span className="font-normal text-slate-400">
                  / {signers.total}
                </span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-tint">
              <div
                className={`h-full rounded-full ${row.color} transition-all duration-500 group-hover:brightness-110 group-hover:shadow-[0_0_10px_rgba(11,19,48,0.15)]`}
                style={{ width: `${row.rate}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Across {signers.total} signature request
        {signers.total === 1 ? "" : "s"} in this period.
      </p>
    </div>
  );
}

function LoadingCharts() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" aria-hidden="true">
      <div className="h-72 animate-pulse rounded-2xl bg-tint motion-reduce:animate-none" />
      <div className="h-72 animate-pulse rounded-2xl bg-tint motion-reduce:animate-none" />
      <div className="h-52 animate-pulse rounded-2xl bg-tint motion-reduce:animate-none" />
      <div className="h-52 animate-pulse rounded-2xl bg-tint motion-reduce:animate-none" />
    </div>
  );
}

export default function DashboardAnalytics({ metrics, loading, onRefresh }) {
  return (
    <section className="space-y-5 tabular-nums" aria-busy={loading}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            Analytics
          </p>
          <h2 className="mt-1 font-serif text-2xl font-bold text-ink">
            Activity &amp; performance
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Your uploads and signing activity over the last 6 months.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl border border-slate-300 bg-surface px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:bg-page hover:text-ink"
        >
          Refresh
        </button>
      </div>

      {loading || !metrics ? (
        <LoadingCharts />
      ) : metrics.totalUploads === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-surface px-5 py-10 text-center">
          <p className="font-serif text-xl font-bold text-ink">
            No activity in the last 6 months
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Upload a PDF, route it for signature, and your upload and completion
            charts will appear here.
          </p>
          <Link
            to="/documents/new"
            className="mt-4 inline-flex rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
          >
            Upload a document
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Panel
              title="Upload activity"
              subtitle="How often you send documents, by month"
            >
              <UploadBars
                months={metrics.months}
                totalUploads={metrics.totalUploads}
              />
            </Panel>
            <Panel
              title="Completion performance"
              subtitle="How many sent documents reach completion"
            >
              <CompletionGauge
                rate={metrics.completionRate}
                completedCount={metrics.completedCount}
                sentCount={metrics.sentCount}
                averageDays={metrics.averageCompletionDays}
              />
            </Panel>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel
              title="Document status"
              subtitle="Where your documents stand in this period"
            >
              <StatusBreakdown statusCounts={metrics.statusCounts} />
            </Panel>
            <Panel
              title="Signer engagement"
              subtitle="Whether assigned signers open and sign"
            >
              <EngagementBars signers={metrics.signers} />
            </Panel>
          </div>
        </div>
      )}
    </section>
  );
}
