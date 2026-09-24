import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Disclaimer, RiskBadge } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { sampleDocument } from "@/data/mockData";
import { loadCurrent } from "@/lib/documentStore";
import type { Analysis as AnalysisData } from "@/lib/analysisTypes";

export const Route = createFileRoute("/analysis")({
  head: () => ({
    meta: [
      { title: "Rental agreement analysis — LegalEase AI" },
      {
        name: "description",
        content:
          "A plain-language breakdown of a rental agreement: summary, key clauses, payments, dates, obligations, risks and action items.",
      },
      { property: "og:title", content: "Rental agreement analysis — LegalEase AI" },
      {
        property: "og:description",
        content: "Summary, clauses, payments, deadlines and risks in plain language.",
      },
    ],
  }),
  component: Analysis,
});

function Card({
  title,
  accent = "muted",
  children,
  className = "",
}: {
  title: string;
  accent?: "muted" | "cyan" | "accent";
  children: React.ReactNode;
  className?: string;
}) {
  const tone =
    accent === "cyan" ? "text-cyan" : accent === "accent" ? "text-accent/80" : "text-muted-foreground";
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-border bg-glass/60 p-6 ${className}`}
    >
      <div className={`eyebrow ${tone}`}>{title}</div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Rows({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="space-y-3 text-[12px]">
      {items.map((r, i) => (
        <div
          key={r.label}
          className={`flex justify-between gap-3 ${i < items.length - 1 ? "border-b border-border pb-2" : ""}`}
        >
          <span className="text-muted-foreground">{r.label}</span>
          <span className="font-semibold">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5 text-[13px] leading-relaxed">
      {items.map((t) => (
        <li key={t} className="flex gap-3">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cyan" />
          <span className="text-foreground/85">{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Analysis() {
  const [doc, setDoc] = useState<AnalysisData & { status: string }>(sampleDocument);
  useEffect(() => {
    const s = loadCurrent();
    if (s) setDoc({ ...s.analysis, status: `AI analysis · ${s.name}` });
  }, []);
  return (
    <AppShell>
      <div className="anim-in flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="eyebrow text-cyan">{doc.status}</div>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">{doc.title}</h1>
          <div className="mt-1 text-[13px] text-muted-foreground">{doc.subtitle}</div>
        </div>
        <Link
          to="/upload"
          className="rounded-xl bg-accent px-5 py-3 font-display text-sm font-bold text-accent-foreground shadow-lg shadow-accent/20"
        >
          New upload
        </Link>
      </div>

      <div
        className="anim-in relative mt-7 overflow-hidden rounded-2xl border border-border bg-secondary/60 p-6"
        style={{ animationDelay: "0.12s" }}
      >
        <div className="pointer-events-none absolute -top-10 -right-10 size-48 -rotate-12 bg-gradient-to-br from-accent/15 to-transparent" />
        <div className="eyebrow text-accent/80">Plain-language summary</div>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-foreground/85">{doc.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {doc.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="anim-in mt-6 grid gap-5 lg:grid-cols-3" style={{ animationDelay: "0.2s" }}>
        <Card title="Key clauses" accent="cyan" className="lg:col-span-2">
          <div className="pointer-events-none absolute top-0 right-0 h-full w-24 -skew-x-12 bg-gradient-to-b from-cyan/20 to-transparent" />
          <div className="space-y-3">
            {doc.clauses.map((c) => (
              <div key={c.section} className="flex items-start gap-3 rounded-xl bg-secondary p-3">
                <span className="mt-0.5 w-10 shrink-0 text-[11px] font-medium text-muted-foreground">
                  {c.section}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-sm font-semibold">{c.title}</div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">{c.detail}</div>
                </div>
                <RiskBadge risk={c.risk} />
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="Dates & penalties">
            <div className="pointer-events-none absolute -bottom-8 -left-8 size-32 rotate-12 bg-gradient-to-tr from-accent/20 to-transparent" />
            <Rows items={doc.dates} />
          </Card>
          <Card title="Payment terms" accent="cyan">
            <Rows items={doc.paymentTerms} />
          </Card>
        </div>
      </div>

      <div className="anim-in mt-6 grid gap-5 lg:grid-cols-2" style={{ animationDelay: "0.28s" }}>
        <Card title="Key points" accent="accent">
          <Bullets items={doc.keyPoints} />
        </Card>
        <Card title="Your obligations">
          <Bullets items={doc.obligations} />
        </Card>
        <Card title="Termination conditions" accent="cyan">
          <Bullets items={doc.termination} />
        </Card>
        <Card title="Penalties & risks">
          <div className="space-y-3">
            {doc.risks.map((r) => (
              <div key={r.title} className="rounded-xl bg-secondary p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-display text-sm font-semibold">{r.title}</div>
                  <RiskBadge risk={r.risk} />
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground">{r.detail}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="anim-in mt-6 grid gap-4 lg:grid-cols-4" style={{ animationDelay: "0.36s" }}>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-glass/60 p-4 text-center">
          <div className="font-display text-3xl font-bold text-accent">{doc.riskGrade}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">Risk grade</div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-glass/60 p-5 lg:col-span-3">
          <div className="bob pointer-events-none absolute -right-6 -bottom-6 size-28 -rotate-12 bg-gradient-to-tl from-accent/25 to-transparent" />
          <div className="eyebrow text-muted-foreground">Action items</div>
          <ul className="mt-3 space-y-2 text-[13px]">
            {doc.actionItems.map((a) => (
              <li key={a} className="flex gap-3">
                <span className="mt-0.5 size-4 shrink-0 rounded-md border border-accent/50" />
                <span className="text-foreground/85">{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/assistant"
          className="rounded-xl border border-border bg-secondary px-5 py-3 font-display text-sm font-semibold hover:bg-muted"
        >
          Ask about this document
        </Link>
        <Link
          to="/compare"
          className="rounded-xl border border-border bg-secondary px-5 py-3 font-display text-sm font-semibold hover:bg-muted"
        >
          Compare with another version
        </Link>
      </div>

      <Disclaimer />
    </AppShell>
  );
}
