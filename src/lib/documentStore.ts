// Client-side holder for the current uploaded document and its AI analysis.
import type { Analysis } from "./analysisTypes";

export type DocPayload = { name: string; mimeType: string; data?: string; text?: string };

const KEY = "legalease.current";
let memoryDoc: DocPayload | null = null;

type Stored = { analysis: Analysis; name: string; text?: string };

export async function fileToPayload(file: File): Promise<DocPayload> {
  if (/\.docx$/i.test(file.name)) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    if (!value.trim()) throw new Error("We couldn't find any text in that Word document.");
    return { name: file.name, mimeType: "text/plain", text: value };
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) {
    bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  }
  return { name: file.name, mimeType: "application/pdf", data: btoa(bin) };
}

export function saveCurrent(doc: DocPayload, analysis: Analysis) {
  memoryDoc = doc;
  try {
    const s: Stored = { analysis, name: doc.name, text: doc.text?.slice(0, 1_500_000) };
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    sessionStorage.setItem(KEY, JSON.stringify({ analysis, name: doc.name }));
  }
}

export function loadCurrent(): Stored | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

/** Best available context for the assistant. */
export function currentDocContext(fallback: DocPayload): DocPayload {
  if (memoryDoc) return memoryDoc;
  const s = loadCurrent();
  if (s?.text) return { name: s.name, mimeType: "text/plain", text: s.text };
  if (s) {
    return {
      name: s.name,
      mimeType: "text/plain",
      text: `Full text unavailable after reload. Structured analysis of the document:\n${JSON.stringify(s.analysis)}`,
    };
  }
  return fallback;
}
