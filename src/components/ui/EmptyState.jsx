export default function EmptyState({
  icon = null,
  title,
  description,
  action = null,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-page/60 px-5 py-10 text-center ${className}`}
    >
      <span
        aria-hidden="true"
        className="grid h-12 w-12 place-items-center rounded-full bg-tint text-accent"
      >
        {icon ?? "+"}
      </span>
      <p className="mt-3 font-serif text-xl font-bold text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
