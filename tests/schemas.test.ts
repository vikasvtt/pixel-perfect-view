import { describe, expect, it } from "vitest";
import { AnalyzeInput, AskComparisonInput, AskInput, DocSchema } from "@/lib/legal.schemas";

const doc = { name: "lease.pdf", mimeType: "application/pdf", data: "AAAA" };
const turn = { role: "user" as const, text: "hi" };

describe("server input validation", () => {
  it("accepts a valid document", () => {
    expect(() => AnalyzeInput.parse({ doc })).not.toThrow();
  });
  it("rejects a missing or empty file name", () => {
    expect(() => DocSchema.parse({ mimeType: "text/plain", text: "x" })).toThrow();
    expect(() => DocSchema.parse({ ...doc, name: "" })).toThrow();
    expect(() => DocSchema.parse({ ...doc, name: "a".repeat(301) })).toThrow();
  });
  it("rejects a missing document", () => {
    expect(() => AnalyzeInput.parse({})).toThrow();
  });
  it("rejects blank and oversized questions", () => {
    expect(() => AskInput.parse({ doc, history: [], question: "" })).toThrow();
    expect(() => AskInput.parse({ doc, history: [], question: "x".repeat(2001) })).toThrow();
    expect(() => AskInput.parse({ doc, history: [], question: "x".repeat(2000) })).not.toThrow();
  });
  it("limits chat history to 30 messages", () => {
    expect(() => AskInput.parse({ doc, history: Array(30).fill(turn), question: "q" })).not.toThrow();
    expect(() => AskInput.parse({ doc, history: Array(31).fill(turn), question: "q" })).toThrow();
  });
  it("rejects unknown roles and oversized history messages", () => {
    expect(() => AskInput.parse({ doc, history: [{ role: "system", text: "x" }], question: "q" })).toThrow();
    expect(() => AskInput.parse({ doc, history: [{ role: "user", text: "x".repeat(8001) }], question: "q" })).toThrow();
  });
  it("compare questions need both documents", () => {
    const base = { original: doc, revised: doc, comparison: "{}", history: [], question: "q" };
    expect(() => AskComparisonInput.parse(base)).not.toThrow();
    expect(() => AskComparisonInput.parse({ ...base, revised: undefined })).toThrow();
    expect(() => AskComparisonInput.parse({ ...base, history: Array(31).fill(turn) })).toThrow();
  });
});
