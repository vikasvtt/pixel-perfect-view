import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { FileText, Plus, Minus, Pencil, Send } from "lucide-react";
import { AppShell, Disclaimer } from "@/components/AppShell";
import { fileToPayload, type DocPayload } from "@/lib/documentStore";
import {
  askComparison,
  compareDocuments,
  type Comparison,
  type ComparisonChange,
  type ChangeCategory,
} from "@/lib/legal.functions";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Compare,
});

const MAX_MB = 14;

const CATEGORY_LABEL: Record<ChangeCategory, string> = {
  added: "Added clause",
  removed: "Removed clause",
  modified: "Modified clause",
  payment: "Payment amount",
  date: "Date / deadline",
  obligation: "Obligation",
  termination: "Termination",
  penalty: "Penalty",
};

const IMPORTANCE_CLASS = {
  High: "border-destructive/40 bg-destructive/15 text-destructive",
  Medium: "border-accent/40 bg-accent/15 text-accent",
  Low: "border-border bg-secondary text-muted-foreground",
} as const;

const SUGGESTED = [
  "Which change affects me the most?",
  "Did the payments go up?",
  "Is it harder to end the agreement now?",
];

function validate(f: File): string | null {
  if (!/\.(pdf|docx)$/i.test(f.name)) return "That file type isn't supported. Upload a PDF or DOCX.";
  if (f.size === 0) return "That file is empty. Please choose a document with content.";
  if (f.size > MAX_MB * 1024 * 1024)
    return `That file is too large — it's ${(f.size / 1024 / 1024).toFixed(1)} MB, and the limit is ${MAX_MB} MB.`;
  return null;
}

function Slot({
  label,
  file,
  onFile,
  testId,
}: {
  label: string;
  file: File | null;
  onFile: (f: File) => void;
  testId: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      className="rounded-2xl border border-dashed border-border bg-secondary/40 p-5"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
    >
      <div className="eyebrow text-muted-foreground">{label}</div>
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-secondary px-3 py-3">
        <FileText className="size-4 shrink-0 text-cyan" aria-hidden />
        <div className="min-w-0">
          <div className="truncate font-display text-[13px] font-semibold">
            {file ? file.name : "No file selected"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {file
              ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
              : `PDF or DOCX · up to ${MAX_MB} MB · drop here`}
          </div>
        </div>
      </div>
      <input
        ref={ref}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        data-testid={testId}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <button onClick={() => ref.current?.click()} className="mt-3 text-[11px] text-cyan hover:underline">
        {file ? "Choose a different file" : "Choose a file"}
      </button>
    </div>
  );
}

function ChangeCard({ c }: { c: ComparisonChange }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-4 text-[12px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-muted-foreground">{c.section}</span>
        <span className="font-display text-[13px] font-semibold">{c.title}</span>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-cyan">
          {CATEGORY_LABEL[c.category]}
        </span>
        <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-semibold ${IMPORTANCE_CLASS[c.importance]}`}>
          {c.importance}
        </span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Original</div>
          <div className="mt-1 text-muted-foreground">{c.original}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">New</div>
          <div className="mt-1 font-semibold text-accent">{c.revised}</div>
        </div>
      </div>
      <p className="mt-3 text-foreground/85">{c.explanation}</p>
    </div>
  );
}

type Msg = { role: "user" | "assistant"; text: string; retryable?: boolean };

function Compare() {
  const compareFn = useServerFn(compareDocuments);
  const askFn = useServerFn(askComparison);
  const [original, setOriginal] = useState<File | null>(null);
  const [revised, setRevised] = useState<File | null>(null);
  const [docs, setDocs] = useState<{ original: DocPayload; revised: DocPayload } | null>(null);
  const [result, setResult] = useState<Comparison | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false);

  function pick(set: (f: File | null) => void) {
    return (f: File) => {
      const err = validate(f);
      setError(err);
      set(err ? null : f);
    };
  }

  async function run() {
    if (!original || !revised || running) return;
    setRunning(true);
    setError(null);
    setCanRetry(false);
    setResult(null);
    setMsgs([]);
    try {
      const pair = { original: await fileToPayload(original), revised: await fileToPayload(revised) };
      const res = await compareFn({ data: pair });
      if (!res.ok) {
        setError(res.error);
        setCanRetry(res.retryable === true);
      } else {
        setDocs(pair);
        setResult(res.value);
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Something went wrong. Please try again.");
      setCanRetry(false);
    } finally {
      setRunning(false);
    }
  }

  async function requestAnswer(question: string, history: Msg[]) {
    if (!docs || !result) return;
    setAsking(true);
    try {
      const res = await askFn({
        data: { ...docs, comparison: JSON.stringify(result), history, question },
      });
      setMsgs((m) => [
        ...m,
        res.ok
          ? { role: "assistant" as const, text: res.value }
          : {
              role: "assistant" as const,
              text: res.error,
              ...(res.retryable ? { retryable: true } : {}),
            },
      ]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant" as const, text: "Something went wrong. Please try again." }]);
    } finally {
      setAsking(false);
    }
  }

  async function ask(question: string) {
    if (!docs || !result || !question.trim() || asking) return;
    const history = msgs;
    setMsgs([...history, { role: "user", text: question }]);
    setQ("");
    requestAnswer(question, history);
  }

  function retryAsk(msgIndex: number) {
    if (!docs || !result || asking) return;
    const prev = msgs[msgIndex - 1];
    if (!prev || prev.role !== "user") return;
    setMsgs(msgs.filter((_, i) => i !== msgIndex));
    requestAnswer(prev.text, msgs.slice(0, msgIndex - 1));
  }

  const added = result?.changes.filter((c) => c.category === "added") ?? [];
  const removed = result?.changes.filter((c) => c.category === "removed") ?? [];
  const other = result?.changes.filter((c) => c.category !== "added" && c.category !== "removed") ?? [];
  const high = result?.changes.filter((c) => c.importance === "High").length ?? 0;

  return (
    <AppShell>
      <div className="anim-in">
        <div className="eyebrow text-cyan">Version comparison</div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">See what changed</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Line up two drafts of the same agreement and read the differences in plain language.
        </p>
      </div>

      <div className="anim-in mt-7 grid gap-5 md:grid-cols-2" style={{ animationDelay: "0.12s" }}>
        <Slot label="Original Document" file={original} onFile={pick(setOriginal)} testId="original-input" />
        <Slot label="New Document" file={revised} onFile={pick(setRevised)} testId="revised-input" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={run}
          disabled={running || !original || !revised}
          className="rounded-xl bg-accent px-5 py-3 font-display text-sm font-bold text-accent-foreground shadow-lg shadow-accent/20 disabled:opacity-50"
        >
          {running ? "Comparing…" : "Compare documents"}
        </button>
        {!result && !running && !error && (
          <span className="text-[11px] text-muted-foreground">
            Choose both documents, then compare to see added, removed and changed clauses.
          </span>
        )}
        {running && (
          <span className="text-[11px] text-muted-foreground">
            Reading both documents clause by clause — this can take up to a minute.
          </span>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-[12px] text-destructive"
        >
          <span className="min-w-0 flex-1">{error}</span>
          {canRetry && (
            <button
              onClick={run}
              className="shrink-0 rounded-lg border border-destructive/40 px-2.5 py-1 text-[11px] font-semibold transition-colors hover:bg-destructive/20"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {result && (
        <>
          <div className="anim-in mt-6 rounded-2xl border border-border bg-glass/60 p-5" style={{ animationDelay: "0.05s" }}>
            <div className="eyebrow text-muted-foreground">Net change</div>
            <div className="mt-1 font-display text-lg font-bold">
              {result.changes.length} differences, <span className="text-accent">{high} high importance</span>
            </div>
            <div className="mt-1 text-[12px] text-muted-foreground">{result.summary}</div>
          </div>

          <section className="anim-in mt-6 rounded-2xl border border-accent/30 bg-glass/70 p-6" style={{ animationDelay: "0.1s" }}>
            <div className="eyebrow text-accent/80">Important changes</div>
            <ul className="mt-3 space-y-2 text-[13px]">
              {result.keyChanges.map((k, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span className="text-foreground/85">{k}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="anim-in mt-6 grid gap-5 lg:grid-cols-2" style={{ animationDelay: "0.15s" }}>
            <section className="rounded-2xl border border-border bg-glass/60 p-6">
              <div className="eyebrow flex items-center gap-2 text-success">
                <Plus className="size-3.5" aria-hidden /> Added clauses
              </div>
              <div className="mt-4 space-y-2">
                {added.length ? added.map((c, i) => <ChangeCard key={i} c={c} />) : (
                  <p className="text-[12px] text-muted-foreground">No added clauses found.</p>
                )}
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-glass/60 p-6">
              <div className="eyebrow flex items-center gap-2 text-destructive">
                <Minus className="size-3.5" aria-hidden /> Removed clauses
              </div>
              <div className="mt-4 space-y-2">
                {removed.length ? removed.map((c, i) => <ChangeCard key={i} c={c} />) : (
                  <p className="text-[12px] text-muted-foreground">No removed clauses found.</p>
                )}
              </div>
            </section>
          </div>

          <section className="anim-in relative mt-6 overflow-hidden rounded-2xl border border-border bg-glass/60 p-6" style={{ animationDelay: "0.2s" }}>
            <div className="eyebrow flex items-center gap-2 text-cyan">
              <Pencil className="size-3.5" aria-hidden /> Modified clauses, payments, dates, obligations, termination & penalties
            </div>
            <div className="mt-4 space-y-2">
              {other.length ? other.map((c, i) => <ChangeCard key={i} c={c} />) : (
                <p className="text-[12px] text-muted-foreground">No modified clauses found.</p>
              )}
            </div>
          </section>

          <section className="anim-in mt-6 rounded-2xl border border-border bg-glass/60 p-6" style={{ animationDelay: "0.25s" }}>
            <div className="eyebrow text-cyan">Ask about these changes</div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Answers are based only on the two documents you uploaded.
            </p>
            <div className="mt-4 space-y-3">
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-3 text-[13px] ${
                    m.role === "user" ? "ml-auto bg-accent text-accent-foreground" : "border border-border bg-secondary/60"
                  }`}
                >
                  {m.text}
                  {m.retryable && (
                    <button
                      onClick={() => retryAsk(i)}
                      disabled={asking}
                      className="mt-2 block rounded-lg border border-destructive/40 px-2.5 py-1 text-[11px] font-semibold text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-40"
                    >
                      Try again
                    </button>
                  )}
                </div>
              ))}
              {asking && <div className="text-[12px] text-muted-foreground">Thinking…</div>}
            </div>
            {msgs.length === 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {SUGGESTED.map((s) => (
                  <button key={s} onClick={() => ask(s)} className="rounded-full border border-border px-3 py-1.5 text-[11px] hover:border-cyan">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                ask(q);
              }}
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ask a question about the changes…"
                aria-label="Ask about these changes"
                className="flex-1 rounded-xl border border-border bg-secondary px-4 py-2.5 text-[13px] outline-none focus:border-cyan"
              />
              <button type="submit" disabled={asking || !q.trim()} aria-label="Send" className="rounded-xl bg-accent px-4 text-accent-foreground disabled:opacity-50">
                <Send className="size-4" />
              </button>
            </form>
          </section>
        </>
      )}

      <Disclaimer />
    </AppShell>
  );
}
