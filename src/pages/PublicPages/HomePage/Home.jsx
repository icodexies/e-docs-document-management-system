import { Link } from "react-router-dom";
import PageHero from "../../../components/ui/PageHero.jsx";

const STEPS = [
  {
    title: "Upload the PDF",
    body: "The text layer is read locally in your browser. Nothing is sent until you confirm the signatories.",
  },
  {
    title: "Confirm the signatories",
    body: "Printed names are matched to active accounts at 90% or higher. You adjust every signature box before sending.",
  },
  {
    title: "Sign with a stored signature",
    body: "Each approver reviews the full PDF. Their saved signature is stamped by the server and the audit trail is kept.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10 sm:py-14">
      <PageHero
        eyebrow="E-Docs"
        title="Send a PDF. Route it to the right people. Keep the proof."
        description="E-Docs reads the printed names on your document, matches them to the right accounts, and collects signatures in order — with a hash and audit trail behind every approval."
        actions={
          <>
            <Link
              to="/login"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-slate-100"
            >
              Sign in
            </Link>
            <a
              href="#how-it-works"
              className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              How it works
            </a>
          </>
        }
      />

      <section id="how-it-works" className="space-y-4">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          <span aria-hidden="true" className="h-4 w-1 rounded-full bg-navy" />
          How it works
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-surface p-5 pt-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1 bg-navy/80"
              />
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-tint font-serif text-sm font-bold text-accent">
                {index + 1}
              </span>
              <h3 className="mt-4 font-serif text-lg font-bold text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          <span aria-hidden="true" className="h-4 w-1 rounded-full bg-navy" />
          Accounts and signatures
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <p className="text-sm leading-relaxed text-slate-600">
            Accounts are provisioned by your administrator. Your full name is
            what documents are matched against, so keep it exactly as it appears
            on the documents you sign.
          </p>
          <p className="text-sm leading-relaxed text-slate-600">
            Your signature is stored privately. You can approve a document only
            after saving one — the approve action is blocked until then.
          </p>
        </div>
      </section>
    </main>
  );
}
