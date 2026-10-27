import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BrandMark from "../../../components/ui/BrandMark.jsx";
import { useAuth } from "../../../hooks/auth/useAuth.js";
import { Spinner } from "../../../components/ui/Loading.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
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

          <form onSubmit={submit} className="mt-6 space-y-4">
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
                className="w-full rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-sm text-ink shadow-[inset_0_1px_2px_rgba(11,19,48,0.02)] placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
                placeholder="you@example.com"
              />
            </label>
            <label className="block text-sm text-slate-600">
              <span className="mb-1.5 block text-xs font-semibold">
                Password
              </span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-sm text-ink shadow-[inset_0_1px_2px_rgba(11,19,48,0.02)] placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
                placeholder="Your password"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="h-4 w-4 rounded border-slate-400"
              />
              Keep me signed in on this device
            </label>
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {busy && (
                <Spinner className="h-4 w-4 border-white/40 border-t-white" />
              )}
              {busy ? "Signing in…" : "Sign in"}
            </button>
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
