// Pure, client-safe helpers shared by the upload/compare/assistant screens (unit-tested).
import type { ComparisonChange } from "./analysisTypes";

export const MAX_FILE_MB = 14;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

export const isSupportedFileName = (name: string) => /\.(pdf|docx)$/i.test(name);

const mb = (size: number) => (size / 1024 / 1024).toFixed(1);

/** Validation used by the single-document upload page. */
export function uploadFileError(f: { name: string; size: number }): string | null {
  if (!isSupportedFileName(f.name)) return "That file type isn't supported yet. Upload a PDF or DOCX.";
  if (f.size > MAX_FILE_BYTES)
    return `That file is too large — it's ${mb(f.size)} MB, and the limit is ${MAX_FILE_MB} MB. Please compress or split the PDF and try again.`;
  return null;
}

/** Validation used by each slot on the compare page. */
export function compareFileError(f: { name: string; size: number }): string | null {
  if (!isSupportedFileName(f.name)) return "That file type isn't supported. Upload a PDF or DOCX.";
  if (f.size === 0) return "That file is empty. Please choose a document with content.";
  if (f.size > MAX_FILE_BYTES)
    return `That file is too large — it's ${mb(f.size)} MB, and the limit is ${MAX_FILE_MB} MB.`;
  return null;
}

/** Splits comparison changes into the three result sections. */
export function categorizeChanges(changes: ComparisonChange[] = []) {
  return {
    added: changes.filter((c) => c.category === "added"),
    removed: changes.filter((c) => c.category === "removed"),
    other: changes.filter((c) => c.category !== "added" && c.category !== "removed"),
    high: changes.filter((c) => c.importance === "High").length,
  };
}

type ChatMsg = { id: number; role: "user" | "assistant"; text: string };

/** History sent to the AI: drops the assistant's welcome message (index 0). */
export function historyForAi(messages: ChatMsg[], end?: number) {
  return messages.slice(1, end).map(({ role, text }) => ({ role, text }));
}

/** For "Try again" on an error bubble: the question to re-ask and the history before it. */
export function retryPlan(messages: ChatMsg[], errorId: number) {
  const errIdx = messages.findIndex((m) => m.id === errorId);
  const prev = errIdx > 0 ? messages[errIdx - 1] : undefined;
  if (!prev || prev.role !== "user") return null;
  return { question: prev.text, history: historyForAi(messages, errIdx - 1) };
}
