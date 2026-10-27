import Button from "../../../components/ui/Button.jsx";
import PageHero from "../../../components/ui/PageHero.jsx";
import { useDocumentTitle } from "../../../hooks/shared/useDocumentTitle.js";

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

function DocumentPreview() {
  const signers = [
    { name: "Juan Dela Cruz", role: "Department Head", signed: true },
    { name: "Maria Santos", role: "HR Manager", signed: true },
    { name: "Pedro Reyes", role: "Operations Officer", signed: false },
  ];

  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
      <div
        aria-hidden="true"
        className="absolute -inset-3 rotate-3 rounded-3xl border border-white/15 bg-white/5"
      />
      <div className="relative -rotate-1 rounded-2xl border border-white/40 bg-surface p-5 text-ink shadow-[0_28px_60px_-30px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Approval request
            </p>
            <p className="mt-1 font-serif text-lg font-bold leading-tight">
              Travel request 2026
            </p>
          </div>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-amber-800">
            In review
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500">
          <span>Finance</span>
          <span aria-hidden="true">·</span>
          <span>2 pages</span>
          <span aria-hidden="true">·</span>
          <span>Oct 27</span>
        </div>

        <div className="mt-4 space-y-2">
          {signers.map((signer) => (
            <div
              key={signer.name}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-page/70 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink">
                  {signer.name}
                </p>
                <p className="truncate text-[10px] text-slate-500">
                  {signer.role}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${
                  signer.signed
                    ? "bg-jade-soft text-jade-deep"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                {signer.signed ? "Signed" : "Pending"}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Completion</span>
            <span>2 of 3 signatures</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-tint">
            <div className="h-full w-2/3 rounded-full bg-jade" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  useDocumentTitle("E-Docs — Document Management System");

  return (
    <main id="public-content" className="mx-auto max-w-6xl space-y-8 px-6 py-10 sm:py-14">
      <PageHero
        eyebrow="E-Docs"
        title="Send a PDF. Route it to the right people. Keep the proof."
        description="E-Docs reads the printed names on your document, matches them to the right accounts, and collects signatures in order — with a hash and audit trail behind every approval."
        actions={
          <>
            <Button to="/login" variant="inverse">
              Sign in
            </Button>
            <Button href="#how-it-works" variant="inverseOutline">
              How it works
            </Button>
          </>
        }
        media={<DocumentPreview />}
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
