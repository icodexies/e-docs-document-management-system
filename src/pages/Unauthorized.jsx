import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <div className="theme-light flex min-h-screen items-center justify-center bg-page px-6 text-ink">
      <div className="max-w-sm text-center">
        <p className="text-xs font-semibold text-slate-500">Access denied</p>
        <h1 className="mt-1 font-serif text-2xl font-bold">
          Your account can't open this page
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          If you think this is a mistake, ask an administrator to check your role.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
        >
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
