import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { UploadCloud, FileText, X, AlertTriangle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Disclaimer } from "@/components/AppShell";
import { analyzeDocument } from "@/lib/legal.functions";
import { fileToPayload, saveCurrent } from "@/lib/documentStore";
import { MAX_FILE_MB, uploadFileError } from "@/lib/fileValidation";

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

const MAX_MB = MAX_FILE_MB;
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
  const [file, setFile] = useState<File | null>(null);
  const analyzeFn = useServerFn(analyzeDocument);
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  function accept(f: File) {
    const err = uploadFileError(f);
    if (err) {
      setError(err);
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
  }

  async function analyze() {
    if (!file || progress !== null) return;
    setError(null);
    setProgress(5);
    const timer = setInterval(() => {
      setProgress((p) => (p === null ? p : Math.min(92, p + (p < 60 ? 6 : 2))));
    }, 500);
    try {
      const doc = await fileToPayload(file);
      const res = await analyzeFn({ data: { doc } });
      clearInterval(timer);
      if (!res.ok) {
        setError(res.error);
        setCanRetry(res.retryable === true);
        setProgress(null);
        return;
      }
      saveCurrent(doc, res.value);
      setProgress(100);
      setTimeout(() => navigate({ to: "/analysis" }), 350);
    } catch (e) {
      clearInterval(timer);
      setError(e instanceof Error && e.message ? e.message : "Something went wrong. Please try again.");
      setCanRetry(false);
      setProgress(null);
    }
  }

  return (
    <AppShell>
      <div className="anim-in">
        <div className="eyebrow text-cyan">Step 1 of 2</div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Upload a document</h1>
        <p id="upload-hint" className="mt-1 text-[13px] text-muted-foreground">
          PDF or DOCX · up to {MAX_MB} MB · your file is read securely by our AI and not stored.
        </p>
      </div>

      <div
        className="anim-in mt-7 rounded-2xl border border-border bg-glass/60 p-6"
        style={{ animationDelay: "0.12s" }}
      >
        <div
          role="button"
          tabIndex={0}
          aria-label="Choose a PDF or DOCX document to upload, or drag and drop it here"
          aria-describedby="upload-hint"
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
            aria-label="Choose a PDF or DOCX document"
            tabIndex={-1}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) accept(f);
            }}
          />
        </div>

        {error && (
          <div role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">{error}</span>
            {canRetry && (
              <button
                onClick={analyze}
                className="shrink-0 rounded-lg border border-destructive/40 px-2.5 py-1 text-[11px] font-semibold transition-colors hover:bg-destructive/20"
              >
                Try again
              </button>
            )}
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
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>
        )}

        {progress !== null && (
          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span role="status" aria-live="polite">{progress < 100 ? "Reading and summarizing…" : "Analysis ready"}</span>
              <span>{progress}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Document analysis progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"
            >
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
            AI analysis usually takes 10–40 seconds.
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
