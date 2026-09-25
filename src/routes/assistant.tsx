import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, FileText } from "lucide-react";
import { AppShell, Disclaimer } from "@/components/AppShell";
import { useServerFn } from "@tanstack/react-start";
import { sampleDocument, suggestedQuestions } from "@/data/mockData";
import { askDocument } from "@/lib/legal.functions";
import { currentDocContext, loadCurrent } from "@/lib/documentStore";

const sampleContext = {
  name: "Sample rental agreement",
  mimeType: "text/plain",
  text: `Sample residential lease (fictional). Structured contents:\n${JSON.stringify(sampleDocument)}`,
};

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI legal assistant — LegalEase AI" },
      {
        name: "description",
        content:
          "Ask questions about your uploaded document and get answers grounded in its own clauses.",
      },
      { property: "og:title", content: "AI legal assistant — LegalEase AI" },
      { property: "og:description", content: "Ask questions about your document in plain English." },
    ],
  }),
  component: Assistant,
});

type Msg = { id: number; role: "user" | "assistant"; text: string; retryable?: boolean };

let nextId = 3;

function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 1,
      role: "assistant",
      text: "I've read your rental agreement for Apartment 4B. Ask me anything about rent, deadlines, termination or the deposit — my answers come only from this document.",
    },
  ]);
  const [input, setInput] = useState("");
  const [docLabel, setDocLabel] = useState(`${sampleDocument.title} — ${sampleDocument.subtitle}`);
  const askFn = useServerFn(askDocument);
  const [thinking, setThinking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const s = loadCurrent();
    if (s) {
      setDocLabel(`${s.analysis.title} (${s.name})`);
      setMessages([
        {
          id: 1,
          role: "assistant",
          text: `I've read "${s.name}". Ask me anything about it — my answers come only from this document.`,
        },
      ]);
    }
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, thinking]);

  function callAi(question: string, history: { role: "user" | "assistant"; text: string }[]) {
    setThinking(true);
    askFn({ data: { doc: currentDocContext(sampleContext), history, question } })
      .then((res) => {
        setMessages((m) => [
          ...m,
          res.ok
            ? { id: nextId++, role: "assistant" as const, text: res.value }
            : {
                id: nextId++,
                role: "assistant" as const,
                text: `⚠ ${res.error}`,
                ...(res.retryable ? { retryable: true } : {}),
              },
        ]);
      })
      .catch(() => {
        setMessages((m) => [
          ...m,
          { id: nextId++, role: "assistant" as const, text: "⚠ Couldn't reach the AI. Please try again." },
        ]);
      })
      .finally(() => {
        setThinking(false);
        inputRef.current?.focus();
      });
  }

  function send(question: string) {
    const q = question.trim();
    if (!q || thinking) return;
    setMessages((m) => [...m, { id: nextId++, role: "user", text: q }]);
    setInput("");
    callAi(q, messages.slice(1).map(({ role, text }) => ({ role, text })));
  }

  function retry(msgId: number) {
    if (thinking) return;
    const errIdx = messages.findIndex((m) => m.id === msgId);
    const prev = errIdx > 0 ? messages[errIdx - 1] : undefined;
    if (!prev || prev.role !== "user") return;
    setMessages((m) => m.filter((x) => x.id !== msgId));
    callAi(prev.text, messages.slice(1, errIdx - 1).map(({ role, text }) => ({ role, text })));
  }

  return (
    <AppShell>
      <div className="anim-in">
        <div className="eyebrow text-cyan">AI legal assistant</div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Ask your document</h1>
        <div className="mt-1 flex items-center gap-2 text-[13px] text-muted-foreground">
          <FileText className="size-4 text-cyan" aria-hidden />
          Answers are based on {docLabel} · general information, not legal advice
        </div>
      </div>

      <div className="anim-in mt-7 grid gap-5 lg:grid-cols-3" style={{ animationDelay: "0.12s" }}>
        <div className="flex h-[560px] flex-col rounded-2xl border border-border bg-glass/60 p-6 lg:col-span-2">
          <div className="eyebrow text-accent/80">Conversation</div>
          <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1 text-[13px]">
            {messages.map((m) =>
              m.role === "user" ? (
                <div
                  key={m.id}
                  className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-accent/90 px-3 py-2 font-medium text-accent-foreground"
                >
                  {m.text}
                </div>
              ) : (
                <div
                  key={m.id}
                  className="max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary px-3 py-2 leading-relaxed text-foreground/90"
                >
                  {m.text}
                  {m.retryable && (
                    <button
                      onClick={() => retry(m.id)}
                      disabled={thinking}
                      className="mt-2 block rounded-lg border border-destructive/40 px-2.5 py-1 text-[11px] font-semibold text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-40"
                    >
                      Try again
                    </button>
                  )}
                </div>
              ),
            )}
            {thinking && (
              <div className="max-w-[60%] rounded-2xl rounded-tl-sm bg-secondary px-3 py-2 text-muted-foreground">
                Reading the document…
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/70"
              placeholder="Ask about your document…"
            />
            <button
              type="submit"
              aria-label="Send question"
              disabled={!input.trim() || thinking}
              className="grid size-8 place-items-center rounded-lg bg-accent text-accent-foreground disabled:opacity-40"
            >
              <ArrowUp className="size-4" />
            </button>
          </form>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-glass/60 p-6">
            <div className="eyebrow text-muted-foreground">Suggested questions</div>
            <div className="mt-3 space-y-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-left text-[12px] transition-colors hover:bg-muted"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-accent/30 bg-glass/70 p-5">
            <div className="eyebrow text-accent/80">Grounded answers</div>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
              Every answer cites only what's written in the uploaded agreement. If a clause isn't
              there, the assistant will say so rather than guess.
            </p>
          </div>
        </div>
      </div>

      <Disclaimer />
    </AppShell>
  );
}
