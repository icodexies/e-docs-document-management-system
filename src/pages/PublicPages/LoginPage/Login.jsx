import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BrandMark from "../../../components/ui/BrandMark.jsx";
import Button from "../../../components/ui/Button.jsx";
import { useAuth } from "../../../hooks/auth/useAuth.js";
import { useDocumentTitle } from "../../../hooks/shared/useDocumentTitle.js";
import { Spinner } from "../../../components/ui/Loading.jsx";

function EyeIcon({ off = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      {off && <path d="m4 4 16 16" />}
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  useDocumentTitle("Sign in · E-Docs");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await login({ email, password, remember });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.message || "Couldn't sign in. Check your details and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="theme-light relative flex min-h-screen items-center justify-center overflow-hidden bg-page px-6 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full border border-navy/5 bg-tint/40"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full border border-navy/5 bg-jade-soft/60"
      />

      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="mx-auto mb-5 flex w-fit items-center gap-2.5 font-serif text-lg font-bold text-ink"
        >
          <BrandMark />
          <span>
            <span className="block leading-tight">E-Docs</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Electronic signing
            </span>
          </span>
        </Link>

        <div className="rounded-3xl border border-slate-200/80 bg-surface p-6 shadow-[0_24px_60px_-36px_rgba(11,19,48,0.35)] sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            Welcome back
          </p>
          <h1 className="mt-2 font-serif text-2xl font-bold text-ink">
            Sign in to E-Docs
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Use the account provided by your administrator.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4" aria-busy={busy}>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
              >
                {error}
              </p>
            )}
            <label className="block text-sm text-slate-600">
              <span className="mb-1.5 block text-xs font-semibold">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full min-h-11 rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-sm text-ink shadow-[inset_0_1px_2px_rgba(11,19,48,0.02)] placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
                placeholder="you@example.com"
              />
            </label>
            <div className="block text-sm text-slate-600">
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-xs font-semibold"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full min-h-11 rounded-xl border border-slate-300 bg-surface py-2.5 pl-3.5 pr-12 text-sm text-ink shadow-[inset_0_1px_2px_rgba(11,19,48,0.02)] placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-slate-500 transition-colors hover:bg-page hover:text-ink"
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="h-4 w-4 rounded border-slate-400"
              />
              Keep me signed in on this device
            </label>
            <Button
              type="submit"
              disabled={busy}
              variant="primary"
              className="w-full"
            >
              {busy && (
                <Spinner className="h-4 w-4 border-white/40 border-t-white" />
              )}
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            Forgot your password? Ask an administrator to send a reset link.{" "}
            <Link to="/" className="font-semibold text-accent hover:underline">
              Back to home
            </Link>
          </p>
        </div>

        <p className="mt-5 text-center text-[11px] text-slate-400">
          Private documents · Verified audit trail
        </p>
      </div>
    </main>
  );
}
