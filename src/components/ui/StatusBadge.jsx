const TONES = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
  },
  in_progress: {
    label: "In progress",
    className: "bg-tint text-accent",
    dot: "bg-accent",
  },
  completed: {
    label: "Completed",
    className: "bg-jade-soft text-jade-deep",
    dot: "bg-jade",
  },
  declined: {
    label: "Declined",
    className: "bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
  void: {
    label: "Void",
    className: "bg-slate-100 text-slate-500",
    dot: "bg-slate-400",
  },
  viewed: {
    label: "Viewed",
    className: "bg-tint text-accent",
    dot: "bg-accent",
  },
  signing: {
    label: "Signing",
    className: "bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
  },
  signed: {
    label: "Signed",
    className: "bg-jade-soft text-jade-deep",
    dot: "bg-jade",
  },
};

export default function StatusBadge({ status, label, className = "" }) {
  const tone = TONES[status] ?? {
    label: status || "Unknown",
    className: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${tone.className} ${className}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {label ?? tone.label}
    </span>
  );
}
