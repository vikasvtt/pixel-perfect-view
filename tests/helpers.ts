import { vi } from "vitest";

export const FAKE_KEY = "test-fake-key-not-real";

export function geminiOk(text: string) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
}
export const geminiStatus = (status: number) => new Response("error", { status });

/** Installs a fake Gemini: each call returns the next queued response (last one repeats). */
export function mockGemini(...responses: Array<Response | (() => Response) | Error>) {
  let i = 0;
  const fetchMock = vi.fn(async () => {
    const r = responses[Math.min(i++, responses.length - 1)]!;
    if (r instanceof Error) throw r;
    return typeof r === "function" ? r() : r.clone();
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
