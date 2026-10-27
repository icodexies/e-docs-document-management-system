export default function PageHero({
  eyebrow,
  title,
  description,
  children,
  actions,
  media,
  className = "",
}) {
  return (
    <section
      className={`page-hero relative overflow-hidden rounded-3xl border border-white/10 px-5 py-7 text-white shadow-[0_24px_60px_-36px_rgba(11,19,48,0.65)] sm:px-9 sm:py-9 ${className}`}
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

      <div
        className={`relative ${
          media
            ? "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.62fr)] lg:items-center"
            : ""
        }`}
      >
        <div className="max-w-4xl">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
              {eyebrow}
            </p>
          )}
          <h1 className="page-hero__title mt-2 text-balance font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              {description}
            </p>
          )}
          {children}
          {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
        </div>
        {media && <div className="relative hidden lg:block">{media}</div>}
      </div>
    </section>
  );
}
