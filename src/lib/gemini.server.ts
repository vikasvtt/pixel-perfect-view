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
  ) {
    super(message);
  }
}

export function docParts(doc: DocPayload) {
  if (doc.data) return [{ inline_data: { mime_type: doc.mimeType, data: doc.data } }];
  return [{ text: `DOCUMENT "${doc.name}":\n\n${doc.text ?? ""}` }];
}

export async function callGemini(body: unknown, opts: { retries?: number } = {}): Promise<string> {
  const retries = opts.retries ?? 0;
  for (let attempt = 0; ; attempt++) {
    try {
      return await callGeminiOnce(body);
    } catch (e) {
      const retryable = e instanceof GeminiError && (e.status === 503 || e.status === 429 || e.status === 500);
      if (!retryable || attempt >= retries) throw e;
      const wait = 1500 * 2 ** attempt + Math.random() * 500;
      console.warn(`Gemini ${(e as GeminiError).status}, retry ${attempt + 1}/${retries} in ${Math.round(wait)}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

async function callGeminiOnce(body: unknown): Promise<string> {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new GeminiError("The AI service isn't configured yet.", 500);

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
      },
    );
  } catch {
    throw new GeminiError("Couldn't reach the AI service. Check your connection and try again.", 503);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Gemini error", res.status, detail.slice(0, 500));
    const msg =
      res.status === 429
        ? "The AI service is busy right now. Please wait a moment and try again."
        : res.status === 503
          ? "The AI service is very busy right now. Please try again in a minute."
          : res.status === 400
          ? "The AI couldn't process this document. Try a different file or a text-based PDF."
          : res.status === 401 || res.status === 403
            ? "The AI key was rejected. Please check the saved Gemini key."
            : "The AI service had a problem. Please try again shortly.";
    throw new GeminiError(msg, res.status);
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
