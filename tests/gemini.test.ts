import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callGemini, docParts, GeminiError, GEMINI_MODEL } from "@/lib/gemini.server";
import { FAKE_KEY, geminiOk, geminiStatus, mockGemini } from "./helpers";

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

async function run(p: Promise<unknown>) {
  const settled = p.then((v) => ({ v }), (e: unknown) => ({ e }));
  await vi.runAllTimersAsync();
  return settled as Promise<{ v?: unknown; e?: GeminiError }>;
}

describe("Gemini request", () => {
  it("calls the configured model server-side with the key in a header, not the URL", async () => {
    const fetchMock = mockGemini(geminiOk("hello"));
    expect((await run(callGemini({}))).v).toBe("hello");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain(`models/${GEMINI_MODEL}:generateContent`);
    expect(url).not.toContain(FAKE_KEY);
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe(FAKE_KEY);
  });

  it("fails clearly without calling Gemini when the key is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetchMock = mockGemini(geminiOk("x"));
    const { e } = await run(callGemini({}));
    expect(e?.message).toMatch(/isn't configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("503 / busy retries", () => {
  it("retries on 503 and succeeds on the third attempt", async () => {
    const fetchMock = mockGemini(geminiStatus(503), geminiStatus(503), geminiOk("done"));
    expect((await run(callGemini({}, { retries: 4 }))).v).toBe("done");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("gives up after the retry limit (1 + 4 attempts) with the busy message", async () => {
    const fetchMock = mockGemini(geminiStatus(503));
    const { e } = await run(callGemini({}, { retries: 4 }));
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(e).toBeInstanceOf(GeminiError);
    expect(e?.status).toBe(503);
    expect(e?.message).toBe("The AI service is temporarily busy. Please try again in a moment.");
  });

  it("also retries 500 errors", async () => {
    const fetchMock = mockGemini(geminiStatus(500), geminiOk("ok"));
    expect((await run(callGemini({}, { retries: 2 }))).v).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry when retries are not requested", async () => {
    const fetchMock = mockGemini(geminiStatus(503));
    await run(callGemini({}));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("429 usage limit", () => {
  it("makes exactly one call with zero automatic retries", async () => {
    const fetchMock = mockGemini(geminiStatus(429));
    const { e } = await run(callGemini({}, { retries: 4 }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(e?.status).toBe(429);
    expect(e?.message).toBe("The AI usage limit has been reached. Please try again later.");
  });
});

describe("other Gemini failures", () => {
  it.each([
    [400, /couldn't process this document/],
    [401, /key was rejected/],
    [403, /key was rejected/],
    [418, /had a problem/],
  ])("HTTP %i gives a friendly message and is not retried", async (status, msg) => {
    const fetchMock = mockGemini(geminiStatus(status));
    const { e } = await run(callGemini({}, { retries: 4 }));
    expect(e?.message).toMatch(msg);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("handles a blocked response", async () => {
    mockGemini(new Response(JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } })));
    const { e } = await run(callGemini({}));
    expect(e?.status).toBe(422);
    expect(e?.message).toMatch(/declined/);
  });

  it.each([
    ["no candidates", {}],
    ["blank text", { candidates: [{ content: { parts: [{ text: "   " }] } }] }],
  ])("handles an empty response (%s)", async (_label, body) => {
    mockGemini(new Response(JSON.stringify(body)));
    const { e } = await run(callGemini({}));
    expect(e?.message).toMatch(/empty answer/);
  });

  it("handles a network failure as a retryable 503", async () => {
    const fetchMock = mockGemini(new TypeError("fetch failed"), geminiOk("back"));
    expect((await run(callGemini({}, { retries: 1 }))).v).toBe("back");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    mockGemini(new TypeError("fetch failed"));
    const { e } = await run(callGemini({}));
    expect(e?.message).toMatch(/Couldn't reach the AI service/);
  });
});

describe("document parts", () => {
  it("sends PDFs as inline data and DOCX text as text", () => {
    expect(docParts({ name: "a.pdf", mimeType: "application/pdf", data: "QUJD" })).toEqual([
      { inline_data: { mime_type: "application/pdf", data: "QUJD" } },
    ]);
    const [part] = docParts({ name: "b.docx", mimeType: "text/plain", text: "Rent is $100" }) as [{ text: string }];
    expect(part.text).toContain('DOCUMENT "b.docx"');
    expect(part.text).toContain("Rent is $100");
  });
});
