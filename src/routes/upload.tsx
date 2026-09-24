import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { UploadCloud, FileText, X, AlertTriangle } from "lucide-react";
import { AppShell, Disclaimer } from "@/components/AppShell";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload a document — LegalEase AI" },
      {
        name: "description",
        content: "Drop a PDF or DOCX contract and LegalEase AI will explain it in plain language.",
      },
      { property: "og:title", content: "Upload a document — LegalEase AI" },
      { property: "og:description", content: "Drop a PDF or DOCX and get a plain-language read." },
    ],
  }),
  component: UploadPage,
});

const MAX_MB = 20;
const examples = [
  "Rental agreement",
  "Employment contract",
  "NDA",
  "Service agreement",
  "Legal notice",
];

function UploadPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  function accept(f: File) {
    const ok = /\.(pdf|docx)$/i.test(f.name);
    if (!ok) {
      setError("That file type isn't supported yet. Upload a PDF or DOCX.");
      setFile(null);
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`That file is larger than ${MAX_MB} MB.`);
      setFile(null);
      return;
    }
    setError(null);
    setFile({ name: f.name, size: f.size });
  }

  function analyze() {
    if (!file || progress !== null) return;
    setProgress(0);
    const timer = setInterval(() => {
      setProgress((p) => {
        const next = (p ?? 0) + 10;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => navigate({ to: "/analysis" }), 350);
          return 100;
        }
        return next;
      });
    }, 160);
  }

  return (
    <AppShell>
      <div className="anim-in">
        <div className="eyebrow text-cyan">Step 1 of 2</div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Upload a document</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          PDF or DOCX · up to {MAX_MB} MB · your file stays in this demo, nothing is sent anywhere.
        </p>
      </div>

      <div
        className="anim-in mt-7 rounded-2xl border border-border bg-glass/60 p-6"
        style={{ animationDelay: "0.12s" }}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) accept(f);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center transition-colors ${
            dragging ? "border-accent bg-accent/10" : "border-border bg-secondary/40 hover:bg-secondary"
          }`}
        >
          <UploadCloud className="size-8 text-cyan" aria-hidden />
          <div className="mt-3 font-display text-base font-semibold">
            Drag and drop your document here
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">or click to browse your files</div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) accept(f);
            }}
          />
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            {error}
          </div>
        )}

        {!file && !error && (
          <p className="mt-4 text-[12px] text-muted-foreground">
            No document selected yet — pick one to continue.
          </p>
        )}

        {file && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-secondary px-3 py-3">
            <FileText className="size-4 shrink-0 text-cyan" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-[13px] font-semibold">{file.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
            {progress === null && (
              <button
                onClick={() => setFile(null)}
                aria-label="Remove file"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        )}

        {progress !== null && (
          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{progress < 100 ? "Reading and summarizing…" : "Analysis ready"}</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-accent transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={analyze}
            disabled={!file || progress !== null}
            className="rounded-xl bg-accent px-5 py-3 font-display text-sm font-bold text-accent-foreground shadow-lg shadow-accent/20 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            Analyze Document
          </button>
          <span className="text-[11px] text-muted-foreground">
            Demo build — results use a sample rental agreement.
          </span>
        </div>
      </div>

      <div
        className="anim-in mt-6 rounded-2xl border border-border bg-glass/60 p-6"
        style={{ animationDelay: "0.2s" }}
      >
        <div className="eyebrow text-muted-foreground">Documents we handle well</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((e) => (
            <span
              key={e}
              className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground"
            >
              {e}
            </span>
          ))}
        </div>
      </div>

      <Disclaimer />
    </AppShell>
  );
}
