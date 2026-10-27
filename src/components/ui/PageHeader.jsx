// A compact page header for task screens. The dashboard and public home keep
// the larger PageHero; utility screens use this to avoid repeating a full
// decorative hero above every table, form and document.
export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = "",
}) {
  return (
    <header className={`page-header ${className}`}>
      <div className="page-header__copy">
        {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
        <h1 className="page-header__title">{title}</h1>
        {description && (
          <p className="page-header__description">{description}</p>
        )}
        {children && <div className="page-header__meta">{children}</div>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}
