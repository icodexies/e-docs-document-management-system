const TONES = {
  navy: "bg-navy",
  jade: "bg-jade",
  amber: "bg-amber-500",
  accent: "bg-accent",
};

export default function StatCard({
  label,
  value,
  hint,
  tone = "navy",
  className = "",
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-surface p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1 ${TONES[tone] ?? TONES.navy}`}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        <span
          aria-hidden="true"
          className={`mt-0.5 h-2.5 w-2.5 rounded-full ${TONES[tone] ?? TONES.navy}`}
        />
      </div>
      <p className="mt-2 font-serif text-3xl font-bold tracking-tight text-ink">
        {value ?? 0}
      </p>
      {hint && <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>}
    </div>
  );
}
