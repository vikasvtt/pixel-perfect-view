// Server-only Gemini helper. Never import from client code.
export const GEMINI_MODEL = "gemini-3.8-flash";

export type DocPayload = {
  name: string;
  mimeType: string;
  /** base64 file data (PDF) */
  data?: string | undefined;
  /** extracted plain text (DOCX or fallback context) */
  text?: string | undefined;
};

export class GeminiError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAfterMs: number | null = null,
  ) {
    super(message);
  }
}

export function docParts(doc: DocPayload) {
  if (doc.data) return [{ inline_data: { mime_type: doc.mimeType, data: doc.data } }];
  return [{ text: `DOCUMENT "${doc.name}":\n\n${doc.text ?? ""}` }];
}

/** Overall time budget for one logical Gemini request, including retries. */
export const GEMINI_DEADLINE_MS = 90_000;
/** Longest Retry-After we will honour before giving up. */
const MAX_RETRY_AFTER_MS = 30_000;

function parseRetryAfter(value: string | null | undefined): number | null {
  if (!value) return null;
  const secs = Number(value);
  if (Number.isFinite(secs) && secs >= 0) return secs * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

export async function callGemini(body: unknown, opts: { retries?: number } = {}): Promise<string> {
  const retries = Math.min(opts.retries ?? 0, 4); // hard cap: at most 5 attempts
  const deadline = Date.now() + GEMINI_DEADLINE_MS;
  for (let attempt = 0; ; attempt++) {
    try {
      return await callGeminiOnce(body, deadline - Date.now());
    } catch (e) {
      // 429 (usage limit) is never retried automatically.
      const retryable = e instanceof GeminiError && (e.status === 503 || e.status === 500);
      if (!retryable || attempt >= retries) throw e;
      const backoff = 1500 * 2 ** attempt + Math.random() * 500;
      const hinted = (e as GeminiError).retryAfterMs;
      const wait = hinted != null ? Math.min(Math.max(hinted, backoff), MAX_RETRY_AFTER_MS) : backoff;
      // Stop if waiting would leave no time for another attempt within the budget.
      if (Date.now() + wait + 2000 >= deadline) throw e;
      console.warn(`Gemini ${(e as GeminiError).status}, retry ${attempt + 1}/${retries} in ${Math.round(wait)}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

async function callGeminiOnce(body: unknown, budgetMs: number = GEMINI_DEADLINE_MS): Promise<string> {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new GeminiError("The AI service isn't configured yet.", 500);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, budgetMs));
  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );
  } catch {
    clearTimeout(timer);
    if (controller.signal.aborted) {
      throw new GeminiError("The AI took too long to respond. Please try again in a moment.", 504);
    }
    throw new GeminiError("Couldn't reach the AI service. Check your connection and try again.", 503);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Gemini error", res.status, detail.slice(0, 500));
    const msg =
      res.status === 429
        ? "The AI usage limit has been reached. Please try again later."
        : res.status === 503
          ? "The AI service is temporarily busy. Please try again in a moment."
          : res.status === 400
          ? "The AI couldn't process this document. Try a different file or a text-based PDF."
          : res.status === 401 || res.status === 403
            ? "The AI key was rejected. Please check the saved Gemini key."
            : "The AI service had a problem. Please try again shortly.";
    throw new GeminiError(msg, res.status, parseRetryAfter(res.headers?.get?.("retry-after")));
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  if (json.promptFeedback?.blockReason) {
    throw new GeminiError("The AI declined to answer this request.", 422);
  }
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new GeminiError("The AI returned an empty answer. Please try again.", 502);
  return text;
}
