import { Link, Outlet } from "react-router-dom";
import BrandMark from "../../components/ui/BrandMark.jsx";
import SkipLink from "../../components/ui/SkipLink.jsx";

export default function PublicLayout() {
  return (
    <div className="theme-light flex min-h-screen flex-col bg-page text-ink">
      <SkipLink href="#public-content" />
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-surface shadow-[0_1px_2px_rgba(11,19,48,0.04)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-serif text-lg font-bold text-ink"
          >
            <BrandMark />
            <span>
              <span className="block leading-tight">E-Docs</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Electronic signing
              </span>
            </span>
          </Link>
          <Link
            to="/login"
            className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-deep"
          >
            Sign in
          </Link>
        </div>
      </header>

      <div className="flex-1">
        <Outlet />
      </div>

      <footer className="border-t border-slate-200/80 bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} E-Docs · Electronic document signing</p>
          <p>Private signed copies with a verifiable audit trail.</p>
        </div>
      </footer>
    </div>
  );
}
