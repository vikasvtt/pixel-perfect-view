import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  MAX_FILE_MB,
  categorizeChanges,
  compareFileError,
  historyForAi,
  isSupportedFileName,
  retryPlan,
  uploadFileError,
} from "@/lib/fileValidation";
import type { ComparisonChange } from "@/lib/analysisTypes";

const f = (name: string, size = 1000) => ({ name, size });

describe("file type validation", () => {
  it.each(["lease.pdf", "lease.docx", "LEASE.PDF", "Contract.DOCX", "my.file.v2.Pdf"])("accepts %s", (n) => {
    expect(isSupportedFileName(n)).toBe(true);
    expect(uploadFileError(f(n))).toBeNull();
    expect(compareFileError(f(n))).toBeNull();
  });

  it.each(["lease.doc", "notes.txt", "virus.exe", "noextension", "file.pdf.exe", "image.png", ".pdfx", "pdf"])(
    "rejects %s",
    (n) => {
      expect(isSupportedFileName(n)).toBe(false);
      expect(uploadFileError(f(n))).toMatch(/isn't supported/);
      expect(compareFileError(f(n))).toMatch(/isn't supported/);
    },
  );
});

describe("14 MB size limit", () => {
  it("limit is 14 MB", () => {
    expect(MAX_FILE_MB).toBe(14);
    expect(MAX_FILE_BYTES).toBe(14 * 1024 * 1024);
  });
  it("accepts a file of exactly 14 MB", () => {
    expect(uploadFileError(f("a.pdf", MAX_FILE_BYTES))).toBeNull();
    expect(compareFileError(f("a.pdf", MAX_FILE_BYTES))).toBeNull();
  });
  it("rejects one byte over 14 MB with a friendly message showing the size", () => {
    const err = uploadFileError(f("a.pdf", MAX_FILE_BYTES + 1));
    expect(err).toMatch(/too large/);
    expect(err).toMatch(/limit is 14 MB/);
  });
  it("reports the actual size of an oversized file", () => {
    expect(uploadFileError(f("a.pdf", 16 * 1024 * 1024))).toContain("it's 16.0 MB");
    expect(compareFileError(f("a.docx", 20 * 1024 * 1024))).toContain("it's 20.0 MB");
  });
});

describe("empty files", () => {
  it("compare slots reject an empty file", () => {
    expect(compareFileError(f("a.pdf", 0))).toMatch(/empty/);
  });
});

const change = (category: ComparisonChange["category"], importance: ComparisonChange["importance"] = "Low"): ComparisonChange => ({
  category,
  importance,
  section: "§1",
  title: category,
  original: "a",
  revised: "b",
  explanation: "x",
});

describe("comparison result categorisation", () => {
  it("splits added, removed and all other changes, and counts High items", () => {
    const r = categorizeChanges([
      change("added", "High"),
      change("removed"),
      change("payment", "High"),
      change("date"),
      change("obligation"),
      change("termination"),
      change("penalty", "Medium"),
      change("modified"),
    ]);
    expect(r.added).toHaveLength(1);
    expect(r.removed).toHaveLength(1);
    expect(r.other.map((c) => c.category)).toEqual([
      "payment", "date", "obligation", "termination", "penalty", "modified",
    ]);
    expect(r.high).toBe(2);
  });
  it("handles a missing result", () => {
    expect(categorizeChanges(undefined)).toEqual({ added: [], removed: [], other: [], high: 0 });
  });
});

describe("assistant chat history", () => {
  const msgs = [
    { id: 1, role: "assistant" as const, text: "Welcome, I've read your document." },
    { id: 2, role: "user" as const, text: "Q1" },
    { id: 3, role: "assistant" as const, text: "A1" },
    { id: 4, role: "user" as const, text: "Q2" },
    { id: 5, role: "assistant" as const, text: "⚠ busy" },
  ];
  it("never sends the welcome message and strips ids", () => {
    const h = historyForAi(msgs);
    expect(h[0]).toEqual({ role: "user", text: "Q1" });
    expect(h.some((m) => m.text.startsWith("Welcome"))).toBe(false);
    expect(h[0]).not.toHaveProperty("id");
  });
  it("retry re-asks the question before the error with the earlier history only", () => {
    expect(retryPlan(msgs, 5)).toEqual({
      question: "Q2",
      history: [
        { role: "user", text: "Q1" },
        { role: "assistant", text: "A1" },
      ],
    });
  });
  it("retry does nothing for unknown ids or when no question precedes", () => {
    expect(retryPlan(msgs, 99)).toBeNull();
    expect(retryPlan(msgs, 1)).toBeNull();
    expect(retryPlan(msgs, 3)?.question).toBe("Q1");
    expect(retryPlan(msgs, 4)).toBeNull();
  });
});
