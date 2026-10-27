import { formatDateTime } from "../../services/documents/documentRules.js";

const ACTIONS = {
  created: { label: "Draft created", dot: "bg-slate-400" },
  sent: { label: "Sent for signature", dot: "bg-accent" },
  viewed: { label: "Opened", dot: "bg-slate-400" },
  signed: { label: "Signed", dot: "bg-jade" },
  declined: { label: "Declined", dot: "bg-red-500" },
  voided: { label: "Voided", dot: "bg-slate-400" },
  completed: { label: "Completed", dot: "bg-jade" },
};

export default function DocumentTimeline({ events = [] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-500">No activity recorded yet.</p>
    );
  }

  return (
    <ol className="space-y-4">
      {events.map((event) => {
        const action = ACTIONS[event.action] ?? {
          label: event.action,
          dot: "bg-slate-400",
        };
        const reason = event.detail?.reason ? String(event.detail.reason) : "";

        return (
          <li key={event.id} className="flex gap-3">
            <span
              aria-hidden="true"
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${action.dot}`}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                {action.label}
                {event.actor_name ? (
                  <span className="font-normal text-slate-600">
                    {" "}
                    — {event.actor_name}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatDateTime(event.created_at)}
              </p>
              {event.action === "declined" && reason && (
                <p className="mt-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                  “{reason}”
                </p>
              )}
              {event.action === "signed" && event.detail?.version && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Version {event.detail.version}
                  {event.detail.sha256
                    ? ` · SHA-256 ${String(event.detail.sha256).slice(0, 12)}…`
                    : ""}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
