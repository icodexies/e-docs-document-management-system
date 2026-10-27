import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import AppearanceMenu from "../../components/ui/AppearanceMenu.jsx";
import Avatar from "../../components/ui/Avatar.jsx";
import BrandMark from "../../components/ui/BrandMark.jsx";
import SkipLink from "../../components/ui/SkipLink.jsx";
import { DisplaySizeProvider } from "../../context/display/DisplaySizeProvider.jsx";
import { useAuth } from "../../hooks/auth/useAuth.js";
import { isPageActive, visibleMemberPages } from "../../routes/memberPages.js";
import { ROLE_LABELS } from "../../routes/roles.js";

const NAV_PATHS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  documents: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="m8 8 4-4 4 4" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  awaiting: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
};

function NavIcon({ id, className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-[18px] w-[18px] shrink-0 ${className}`}
    >
      {NAV_PATHS[id] ?? NAV_PATHS.documents}
    </svg>
  );
}

const navLinkClass = (active) =>
  `group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all ${
    active
      ? "bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
      : "text-white/75 hover:bg-white/[0.07] hover:text-white"
  }`;

const tabClass = (active) =>
  `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
    active
      ? "bg-navy text-white shadow-sm"
      : "bg-surface text-slate-600 ring-1 ring-slate-200 hover:text-accent"
  }`;

export default function MemberLayout() {
  return (
    <DisplaySizeProvider>
      <MemberWorkspace />
    </DisplaySizeProvider>
  );
}

function MemberWorkspace() {
  const { profile, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pages = visibleMemberPages(role);
  const currentPage = pages.find((page) =>
    isPageActive(page, location.pathname),
  );
  const profileName = profile?.full_name || "Your profile";
  const roleText = `${ROLE_LABELS[role] ?? role ?? "Member"}${
    profile && !profile.signature_path ? " · Signature needed" : ""
  }`;

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // The session may already be gone; the guard handles the rest.
    }
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-page text-ink">
      <SkipLink href="#member-content" />
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 self-start flex-col overflow-y-auto border-r border-white/10 bg-gradient-to-b from-navy via-navy to-navy-deep text-white sm:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <BrandMark className="bg-white/10 text-white" />
            <span>
              <span className="block font-serif text-lg font-bold leading-tight">
                E-Docs
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                Electronic signing
              </span>
            </span>
          </Link>
        </div>

        <div className="flex-1 px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
            Workspace
          </p>
          <nav aria-label="Pages" className="space-y-1">
            {pages.map((page) => {
              const active = isPageActive(page, location.pathname);
              return (
                <Link
                  key={page.id}
                  to={page.path}
                  aria-current={active ? "page" : undefined}
                  className={navLinkClass(active)}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-jade-line transition-opacity ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <NavIcon
                    id={page.id}
                    className={active ? "text-jade-line" : "text-white/60"}
                  />
                  <span className="truncate">{page.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 p-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
              Private workspace
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/70">
              Signed copies stay private. Every action is recorded in the audit
              trail.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-surface shadow-[0_1px_2px_rgba(11,19,48,0.04)]">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
            <div className="flex min-w-0 items-center gap-2.5">
              <BrandMark className="bg-navy text-white sm:hidden" />
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  E-Docs
                </p>
                <p className="truncate text-sm font-semibold text-ink">
                  {currentPage?.label ?? "Workspace"}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
              <AppearanceMenu />
              <Link
                to="/profile"
                title={profile?.full_name || "Profile & signature"}
                className="flex min-h-11 min-w-11 items-center gap-2 rounded-xl border border-transparent px-1.5 py-1 transition-colors hover:border-slate-200 hover:bg-page"
              >
                <Avatar
                  name={profile?.full_name}
                  src={profile?.avatar_url}
                  alt=""
                  decorative
                  className="ring-slate-200"
                />
                <span className="hidden min-w-0 text-left sm:block">
                  <span className="block max-w-[11rem] truncate text-xs font-semibold text-ink">
                    {profileName}
                  </span>
                  <span
                    className={`block text-[10px] font-medium ${
                      profile && !profile.signature_path
                        ? "text-amber-700"
                        : "text-slate-500"
                    }`}
                  >
                    {roleText}
                  </span>
                </span>
                <span className="sr-only sm:hidden">
                  {profileName} {roleText}. Open profile and signature.
                </span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-surface px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:bg-page hover:text-ink"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="h-4 w-4"
                >
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                  <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
                </svg>
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <div className="relative sm:hidden">
          <nav
            aria-label="Pages"
            className="flex gap-1.5 overflow-x-auto border-b border-slate-200/80 bg-page px-4 py-2 pr-10"
          >
            {pages.map((page) => {
              const active = isPageActive(page, location.pathname);
              return (
                <Link
                  key={page.id}
                  to={page.path}
                  aria-current={active ? "page" : undefined}
                  className={tabClass(active)}
                >
                  <NavIcon id={page.id} />
                  {page.label}
                </Link>
              );
            })}
          </nav>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-page to-transparent"
          />
        </div>

        <main
          id="member-content"
          className="mx-auto w-full max-w-7xl flex-1 px-5 py-7 sm:px-8 sm:py-8"
        >
          <Outlet />
        </main>

        <footer className="border-t border-slate-200/80 bg-surface px-5 py-5 sm:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-1.5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} E-Docs · Electronic document signing
            </p>
            <p>Signed copies stay private and are recorded in the audit trail.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
