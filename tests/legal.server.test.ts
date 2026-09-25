import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runAnalyze, runAsk, runAskComparison, runCompare } from "@/lib/legal.server";
import { FAKE_KEY, geminiOk, geminiStatus, mockGemini } from "./helpers";

const MB = 1024 * 1024;
const b64OfBytes = (bytes: number) => "A".repeat(Math.ceil((bytes * 4) / 3));
const pdf = (bytes = 1000, name = "lease.pdf") => ({ name, mimeType: "application/pdf", data: b64OfBytes(bytes) });
const txt = (text: string, name = "lease.docx") => ({ name, mimeType: "text/plain", text });

const analysis = {
  title: "Lease", type: "Rental agreement", subtitle: "A & B", riskGrade: "B", summary: "S",
  tags: [], keyPoints: [], clauses: [], paymentTerms: [], dates: [], termination: [],
  obligations: [], risks: [], actionItems: [],
};
const comparison = {
  summary: "Rent went up.",
  keyChanges: ["Rent +10%"],
  changes: [{ category: "payment", section: "§3", title: "Rent", original: "$1000", revised: "$1100", explanation: "Higher", importance: "High" }],
};

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", FAKE_KEY);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function settle<T>(p: Promise<T>) {
  await vi.runAllTimersAsync();
  return p;
}

describe("Document Analysis", () => {
  it("returns the structured analysis produced by (mocked) Gemini", async () => {
    const fetchMock = mockGemini(geminiOk(JSON.stringify(analysis)));
    const res = await settle(runAnalyze({ doc: pdf() }));
    expect(res).toEqual({ ok: true, value: analysis });
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.contents[0].parts[0].inline_data.mime_type).toBe("application/pdf");
  });

  it("rejects a PDF over 14 MB on the server before Gemini is called", async () => {
    const fetchMock = mockGemini(geminiOk("{}"));
    const res = await settle(runAnalyze({ doc: pdf(14 * MB + 1024) }));
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/too large — the limit is 14 MB/);
      expect(res.retryable).toBe(false);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a PDF just under 14 MB", async () => {
    const fetchMock = mockGemini(geminiOk(JSON.stringify(analysis)));
    const res = await settle(runAnalyze({ doc: pdf(14 * MB - 1024) }));
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports a malformed (non-JSON) Gemini answer", async () => {
    mockGemini(geminiOk("{ not json"));
    const res = await settle(runAnalyze({ doc: pdf() }));
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/incomplete/) });
  });

  it("marks 503 after all retries as retryable with the busy message", async () => {
    const fetchMock = mockGemini(geminiStatus(503));
    const res = await settle(runAnalyze({ doc: pdf() }));
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(res).toEqual({
      ok: false,
      error: "The AI service is temporarily busy. Please try again in a moment.",
      retryable: true,
    });
  });

  it("marks 429 as retryable (manual Try again) without automatic retries", async () => {
    const fetchMock = mockGemini(geminiStatus(429));
    const res = await settle(runAnalyze({ doc: pdf() }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res).toEqual({
      ok: false,
      error: "The AI usage limit has been reached. Please try again later.",
      retryable: true,
    });
  });

  it("marks a rejected key as not retryable", async () => {
    mockGemini(geminiStatus(401));
    const res = await settle(runAnalyze({ doc: pdf() }));
    expect(res).toMatchObject({ ok: false, retryable: false });
  });

  it("turns unexpected errors into a generic friendly message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => { throw new Error("boom"); } })));
    const res = await settle(runAnalyze({ doc: pdf() }));
    expect(res).toEqual({ ok: false, error: "Something went wrong while talking to the AI. Please try again." });
  });
});

describe("AI Assistant", () => {
  it("sends the document, the conversation and the new question", async () => {
    const fetchMock = mockGemini(geminiOk("Rent is due on the 1st (§3)."));
    const res = await settle(
      runAsk({ doc: txt("Rent is due on the 1st."), history: [{ role: "user", text: "Q1" }, { role: "assistant", text: "A1" }], question: "When is rent due?" }),
    );
    expect(res).toEqual({ ok: true, value: "Rent is due on the 1st (§3)." });
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.contents.map((c: { role: string }) => c.role)).toEqual(["user", "model", "user", "model", "user"]);
    expect(body.contents.at(-1).parts[0].text).toBe("When is rent due?");
    expect(body.contents[0].parts[0].text).toContain("Rent is due on the 1st.");
  });

  it("returns a friendly 429 error", async () => {
    mockGemini(geminiStatus(429));
    const res = await settle(runAsk({ doc: txt("x"), history: [], question: "q" }));
    expect(res).toMatchObject({ ok: false, retryable: true, error: expect.stringMatching(/usage limit/) });
  });
});

describe("Compare Documents", () => {
  it("returns the Gemini comparison for two documents", async () => {
    const fetchMock = mockGemini(geminiOk(JSON.stringify(comparison)));
    const res = await settle(runCompare({ original: txt("Rent $1000", "v1.docx"), revised: pdf(1000, "v2.pdf") }));
    expect(res).toEqual({ ok: true, value: comparison });
    const parts = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).contents[0].parts;
    expect(parts[0].text).toContain("ORIGINAL DOCUMENT (file: v1.docx)");
    expect(parts[2].text).toContain("NEW DOCUMENT (file: v2.pdf)");
  });

  it.each([
    ["an empty text document", txt("   ", "empty.docx")],
    ["a document with no content", { name: "blank.pdf", mimeType: "application/pdf" }],
  ])("rejects %s before calling Gemini", async (_l, bad) => {
    const fetchMock = mockGemini(geminiOk("{}"));
    const res = await settle(runCompare({ original: pdf(), revised: bad }));
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/appears to be empty/) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects two files that together exceed 14 MB before calling Gemini", async () => {
    const fetchMock = mockGemini(geminiOk("{}"));
    const res = await settle(runCompare({ original: pdf(8 * MB), revised: pdf(7 * MB) }));
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/combined limit is 14 MB/) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a malformed comparison", async () => {
    mockGemini(geminiOk("oops"));
    const res = await settle(runCompare({ original: pdf(), revised: pdf() }));
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/incomplete/) });
  });

  it("answers questions about the changes, including the prior comparison", async () => {
    const fetchMock = mockGemini(geminiOk("Yes, rent rose by $100."));
    const res = await settle(
      runAskComparison({ original: pdf(), revised: pdf(), comparison: JSON.stringify(comparison), history: [], question: "Did rent go up?" }),
    );
    expect(res).toEqual({ ok: true, value: "Yes, rent rose by $100." });
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(JSON.stringify(body.contents[0])).toContain("Rent +10%");
  });

  it("rejects comparison questions for empty documents before calling Gemini", async () => {
    const fetchMock = mockGemini(geminiOk("x"));
    const res = await settle(
      runAskComparison({ original: txt(""), revised: pdf(), comparison: "{}", history: [], question: "q" }),
    );
    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
