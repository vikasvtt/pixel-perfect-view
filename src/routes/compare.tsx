import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Plus, Minus, Pencil } from "lucide-react";
import { AppShell, Disclaimer } from "@/components/AppShell";
import { comparison } from "@/data/mockData";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare document versions — LegalEase AI" },
      {
        name: "description",
        content:
          "Put two versions of a contract side by side and see exactly which clauses were added, removed or changed.",
      },
      { property: "og:title", content: "Compare document versions — LegalEase AI" },
      { property: "og:description", content: "See what changed between two contract versions." },
    ],
  }),
  component: Compare,
});

function Slot({ label, name, meta }: { label: string; name: string; meta: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-5">
      <div className="eyebrow text-muted-foreground">{label}</div>
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-secondary px-3 py-3">
        <FileText className="size-4 shrink-0 text-cyan" aria-hidden />
        <div className="min-w-0">
          <div className="truncate font-display text-[13px] font-semibold">{name}</div>
          <div className="text-[11px] text-muted-foreground">{meta}</div>
        </div>
      </div>
      <button className="mt-3 text-[11px] text-cyan hover:underline">Choose a different file</button>
    </div>
  );
}

function Compare() {
  const [compared, setCompared] = useState(false);
  const [running, setRunning] = useState(false);

  function run() {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      setCompared(true);
    }, 900);
  }

  return (
    <AppShell>
      <div className="anim-in">
        <div className="eyebrow text-cyan">Version comparison</div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
          See what changed
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Line up two drafts of the same agreement and read the differences in plain language.
        </p>
      </div>

      <div className="anim-in mt-7 grid gap-5 md:grid-cols-2" style={{ animationDelay: "0.12s" }}>
        <Slot
          label={comparison.original.label}
          name={comparison.original.name}
          meta={comparison.original.meta}
        />
        <Slot
          label={comparison.revised.label}
          name={comparison.revised.name}
          meta={comparison.revised.meta}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={run}
          disabled={running}
          className="rounded-xl bg-accent px-5 py-3 font-display text-sm font-bold text-accent-foreground shadow-lg shadow-accent/20 disabled:opacity-50"
        >
          {running ? "Comparing…" : "Compare documents"}
        </button>
        {!compared && !running && (
          <span className="text-[11px] text-muted-foreground">
            No comparison yet — run one to see added, removed and changed clauses.
          </span>
        )}
      </div>

      {compared && (
        <>
          <div
            className="anim-in mt-6 rounded-2xl border border-border bg-glass/60 p-5"
            style={{ animationDelay: "0.05s" }}
          >
            <div className="eyebrow text-muted-foreground">Net change</div>
            <div className="mt-1 font-display text-lg font-bold">
              +3 clauses, <span className="text-accent">2 risks</span>
            </div>
            <div className="mt-1 text-[12px] text-muted-foreground">
              {comparison.headlineDetail}
            </div>
          </div>

          <div className="anim-in mt-6 grid gap-5 lg:grid-cols-2" style={{ animationDelay: "0.12s" }}>
            <section className="rounded-2xl border border-border bg-glass/60 p-6">
              <div className="eyebrow flex items-center gap-2 text-success">
                <Plus className="size-3.5" aria-hidden /> Added clauses
              </div>
              <div className="mt-4 space-y-2 text-[12px]">
                {comparison.added.map((c) => (
                  <div
                    key={c.section}
                    className="rounded-xl border border-success/25 bg-success/10 p-3"
                  >
                    <span className="mr-2 font-semibold text-success">{c.section}</span>
                    {c.text}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-glass/60 p-6">
              <div className="eyebrow flex items-center gap-2 text-destructive">
                <Minus className="size-3.5" aria-hidden /> Removed clauses
              </div>
              <div className="mt-4 space-y-2 text-[12px]">
                {comparison.removed.map((c) => (
                  <div
                    key={c.section}
                    className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 line-through decoration-destructive/50"
                  >
                    <span className="mr-2 font-semibold no-underline">{c.section}</span>
                    {c.text}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section
            className="anim-in relative mt-6 overflow-hidden rounded-2xl border border-border bg-glass/60 p-6"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="pointer-events-none absolute top-3 right-3 h-24 w-10 -rotate-12 bg-gradient-to-b from-violet/25 to-transparent" />
            <div className="eyebrow flex items-center gap-2 text-cyan">
              <Pencil className="size-3.5" aria-hidden /> Modified clauses
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 font-medium">Section</th>
                    <th className="py-2 pr-4 font-medium">Term</th>
                    <th className="py-2 pr-4 font-medium">Draft v2</th>
                    <th className="py-2 font-medium">Final v3</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.modified.map((m) => (
                    <tr key={m.section} className="border-b border-border/70 last:border-0">
                      <td className="py-3 pr-4 text-muted-foreground">{m.section}</td>
                      <td className="py-3 pr-4 font-display font-semibold">{m.label}</td>
                      <td className="py-3 pr-4 text-muted-foreground line-through">{m.before}</td>
                      <td className="py-3 font-semibold text-accent">{m.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section
            className="anim-in mt-6 rounded-2xl border border-accent/30 bg-glass/70 p-6"
            style={{ animationDelay: "0.28s" }}
          >
            <div className="eyebrow text-accent/80">Important changes</div>
            <ul className="mt-3 space-y-2 text-[13px]">
              <li className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                <span className="text-foreground/85">
                  The new draft locks you in for 12 months instead of 6, and auto-renews without
                  notice.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                <span className="text-foreground/85">
                  Your deposit rose by $650 and the late fee now compounds at 5%.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                <span className="text-foreground/85">
                  You lost the right to sublet and the landlord's $200 repair allowance.
                </span>
              </li>
            </ul>
          </section>
        </>
      )}

      <Disclaimer />
    </AppShell>
  );
}
