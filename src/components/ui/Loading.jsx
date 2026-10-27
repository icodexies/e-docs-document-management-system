export function Spinner({ className = "h-5 w-5" }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-slate-200 border-t-accent motion-reduce:animate-none ${className}`}
    />
  );
}

export function LoadingScreen({ label = "Loading…" }) {
  return (
    <div className="flex min-h-screen items-center justify-center gap-3 bg-page text-sm font-medium text-slate-600">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
