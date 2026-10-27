export default function PageHero({
  eyebrow,
  title,
  description,
  children,
  actions,
  cornerAction,
  className = "",
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-navy via-navy to-accent px-5 py-7 text-white shadow-[0_24px_60px_-36px_rgba(11,19,48,0.65)] dark:to-navy-deep sm:px-9 sm:py-9 ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:20px_20px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full border border-white/10"
      />

      {cornerAction && (
        <div className="relative z-10 mb-4 flex justify-end sm:absolute sm:right-9 sm:top-9 sm:mb-0">
          {cornerAction}
        </div>
      )}

      <div className="relative max-w-4xl">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-balance font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
            {description}
          </p>
        )}
        {children}
        {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </section>
  );
}
