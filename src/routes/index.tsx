import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileText } from "lucide-react";
import { AppShell, Disclaimer, RiskBadge } from "@/components/AppShell";
import { dashboardStats, recentDocuments } from "@/data/mockData";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LegalEase AI — Understand legal documents in simple language" },
      {
        name: "description",
        content:
          "Upload a contract, lease or notice and get a plain-language summary, key clauses, risks and answers to your questions.",
      },
      { property: "og:title", content: "LegalEase AI" },
      {
        property: "og:description",
        content: "Understand legal documents in simple language.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <AppShell>
      <div className="anim-in">
        <div className="eyebrow text-cyan">AI for legal access</div>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Understand legal documents in simple language.
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          LegalEase AI reads your rental agreement, contract, NDA or legal notice and explains what
          it actually means — the money, the deadlines, and the parts worth pushing back on.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-display text-sm font-bold text-accent-foreground shadow-lg shadow-accent/20 transition-transform hover:-translate-y-0.5"
          >
            Analyze a Document <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/compare"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-5 py-3 font-display text-sm font-semibold transition-colors hover:bg-muted"
          >
            Compare Documents
          </Link>
        </div>
      </div>

      <div className="anim-in mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4" style={{ animationDelay: "0.12s" }}>
        {dashboardStats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-glass/60 p-5">
            <div className="font-display text-3xl font-bold text-accent">{s.value}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div
        className="anim-in relative mt-6 overflow-hidden rounded-2xl border border-border bg-glass/60 p-6"
        style={{ animationDelay: "0.2s" }}
      >
        <div className="bob pointer-events-none absolute -right-6 -bottom-6 size-28 -rotate-12 bg-gradient-to-tl from-accent/25 to-transparent" />
        <div className="flex items-center justify-between">
          <div className="eyebrow text-muted-foreground">Recent documents</div>
          <Link to="/analysis" className="text-[12px] text-cyan hover:underline">
            View analysis
          </Link>
        </div>
        <div className="mt-4 divide-y divide-border">
          {recentDocuments.map((doc) => (
            <Link
              key={doc.id}
              to="/analysis"
              className="flex items-center gap-3 py-3 transition-colors hover:bg-secondary/60"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary">
                <FileText className="size-4 text-cyan" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[13px] font-semibold">
                  {doc.title}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {doc.type} · {doc.uploadedLabel} · {doc.status}
                </span>
              </span>
              <RiskBadge risk={doc.risk} />
            </Link>
          ))}
        </div>
      </div>

      <Disclaimer />
    </AppShell>
  );
}
