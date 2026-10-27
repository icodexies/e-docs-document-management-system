import { pageWindow } from "../../services/pagination.js";

const PAGE_BUTTON =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400";

export default function Pagination({
  page = 1,
  pageCount = 0,
  hasNext = false,
  total = null,
  onPageChange,
  disabled = false,
  className = "",
}) {
  const current = Math.max(1, Number(page) || 1);
  const last = Math.max(
    1,
    Number(pageCount) || (hasNext ? current + 1 : current),
  );

  if (last <= 1 && !hasNext) return null;

  const items = pageWindow(current, last);

  function go(nextPage) {
    if (disabled || !onPageChange) return;
    if (nextPage < 1 || nextPage > last || nextPage === current) return;
    onPageChange(nextPage);
  }

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 ${className}`}
    >
      <p className="text-xs text-slate-500">
        Page {current} of {last}
        {total !== null && total !== undefined && Number.isFinite(Number(total))
          ? ` · ${Number(total)} item${Number(total) === 1 ? "" : "s"}`
          : ""}
      </p>

      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => go(current - 1)}
          disabled={disabled || current <= 1}
          className={`${PAGE_BUTTON} border-slate-400 bg-slate-100 text-slate-700 hover:bg-page`}
        >
          Previous
        </button>

        <span className="hidden items-center gap-1 sm:inline-flex">
          {items.map((item) =>
            typeof item === "number" ? (
              <button
                key={item}
                type="button"
                aria-label={`Page ${item}`}
                aria-current={item === current ? "page" : undefined}
                onClick={() => go(item)}
                disabled={disabled}
                className={`${PAGE_BUTTON} ${
                  item === current
                    ? "border-navy bg-navy text-white"
                    : "border-slate-400 bg-slate-100 text-slate-700 hover:bg-page"
                }`}
              >
                {item}
              </button>
            ) : (
              <span
                key={item}
                aria-hidden="true"
                className="px-1 text-xs text-slate-400"
              >
                …
              </span>
            ),
          )}
        </span>

        <button
          type="button"
          onClick={() => go(current + 1)}
          disabled={disabled || current >= last}
          className={`${PAGE_BUTTON} border-slate-400 bg-slate-100 text-slate-700 hover:bg-page`}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
