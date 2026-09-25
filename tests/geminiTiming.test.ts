import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callGemini, GEMINI_DEADLINE_MS } from "@/lib/gemini.server";
import { FAKE_KEY, geminiOk, mockGemini } from "./helpers";

const body = { contents: [] };
async function settle<T>(p: Promise<T>) {
  const out = p.then((v) => ({ v }), (e) => ({ e }));
  await vi.runAllTimersAsync();
  return out as Promise<{ v?: T; e?: { status: number; message: string } }>;
}

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
  vi.restoreAllMocks();
});

describe("Gemini request timing", () => {
  it("uses a 90-second overall budget", () => {
    expect(GEMINI_DEADLINE_MS).toBe(90_000);
  });

  it("caps automatic retries at 4 even if more are requested", async () => {
    const f = mockGemini(new Response("busy", { status: 503 }));
    const r = await settle(callGemini(body, { retries: 10 }));
    expect(r.e?.status).toBe(503);
    expect(f).toHaveBeenCalledTimes(5);
  });

  it("honours Retry-After on a 503 before retrying", async () => {
    const f = mockGemini(new Response("busy", { status: 503, headers: { "retry-after": "20" } }), geminiOk("ok"));
    const p = callGemini(body, { retries: 2 });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(f).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(11_000);
    expect(await p).toBe("ok");
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("stops retrying when Retry-After would exceed the time budget", async () => {
    const f = mockGemini(() => new Response("busy", { status: 503, headers: { "retry-after": "30" } }));
    const r = await settle(callGemini(body, { retries: 4 }));
    expect(r.e?.status).toBe(503);
    expect(f.mock.calls.length).toBeLessThan(5);
  });

  it("never auto-retries 429 even with Retry-After", async () => {
    const f = mockGemini(new Response("quota", { status: 429, headers: { "retry-after": "1" } }));
    const r = await settle(callGemini(body, { retries: 4 }));
    expect(r.e?.status).toBe(429);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("times out a hung request with a friendly 504", async () => {
    vi.stubGlobal("fetch", vi.fn((_u: string, init: RequestInit) => new Promise((_, rej) => {
      init.signal?.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")));
    })));
    const r = await settle(callGemini(body));
    expect(r.e?.status).toBe(504);
    expect(r.e?.message).toMatch(/took too long/);
  });
});
