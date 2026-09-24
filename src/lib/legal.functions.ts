import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Analysis } from "./analysisTypes";

const DocSchema = z.object({
  name: z.string().min(1).max(300),
  mimeType: z.string().max(200),
  data: z.string().max(30_000_000).optional(),
  text: z.string().max(1_000_000).optional(),
});

const SYSTEM = `You are LegalEase AI, a plain-language legal document explainer for ordinary people.
Explain only what the provided document says. Use simple, friendly language. Never invent terms that are not in the document; if something is not stated, say so.
You provide general information, not legal advice, and you never claim to be a lawyer.`;

const risk = { type: "STRING", enum: ["low", "medium", "high"] };
const rows = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: { label: { type: "STRING" }, value: { type: "STRING" } },
    required: ["label", "value"],
  },
};
const strings = { type: "ARRAY", items: { type: "STRING" } };

const analysisSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    type: { type: "STRING" },
    subtitle: { type: "STRING" },
    riskGrade: { type: "STRING", enum: ["A", "B", "C", "D", "E"] },
    summary: { type: "STRING" },
    tags: strings,
    keyPoints: strings,
    clauses: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          section: { type: "STRING" },
          title: { type: "STRING" },
          detail: { type: "STRING" },
          risk,
        },
        required: ["section", "title", "detail", "risk"],
      },
    },
    paymentTerms: rows,
    dates: rows,
    termination: strings,
    obligations: strings,
    risks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { title: { type: "STRING" }, detail: { type: "STRING" }, risk },
        required: ["title", "detail", "risk"],
      },
    },
    actionItems: strings,
  },
  required: [
    "title", "type", "subtitle", "riskGrade", "summary", "tags", "keyPoints", "clauses",
    "paymentTerms", "dates", "termination", "obligations", "risks", "actionItems",
  ],
};

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** Mirror of the upload page limit — enforced server-side before any Gemini call. */
const MAX_FILE_MB = 14;

async function friendly<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    const { GeminiError } = await import("./gemini.server");
    if (e instanceof GeminiError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Something went wrong while talking to the AI. Please try again." };
  }
}

export const analyzeDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ doc: DocSchema }).parse(d))
  .handler(async ({ data }): Promise<Result<Analysis>> =>
    friendly(async () => {
      const { callGemini, docParts } = await import("./gemini.server");
      if (data.doc.data) {
        // Base64 is ~4/3 of the binary size; decode before comparing to the limit.
        const bytes = Math.floor((data.doc.data.length * 3) / 4);
        if (bytes > MAX_FILE_MB * 1024 * 1024) {
          return {
            ok: false as const,
            error: `That file is too large — the limit is ${MAX_FILE_MB} MB. Please compress or split the PDF and try again.`,
          };
        }
      }
      const text = await callGemini({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [
          {
            role: "user",
            parts: [
              ...docParts(data.doc),
              {
                text: `Analyze the document above (file: ${data.doc.name}). Return JSON only.
- title: short document title; type: document category; subtitle: parties / property / length in one line.
- summary: 2-4 plain-language sentences for a non-lawyer.
- tags: 3 short labels. keyPoints: 4-6 items. clauses: 3-6 most important clauses with section numbers (use "—" if none).
- paymentTerms and dates: label/value rows (empty array if none stated).
- termination, obligations, actionItems: short plain sentences. risks: penalties and risky terms.
- riskGrade: A (very tenant/user-friendly) to E (very risky).`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
          temperature: 0.2,
        },
      }, { retries: 4 });
      try {
        return JSON.parse(text) as Analysis;
      } catch {
        const { GeminiError } = await import("./gemini.server");
        throw new GeminiError("The AI response was incomplete. Please try again.", 502);
      }
    }),
  );

export const askDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        doc: DocSchema,
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(8000) }))
          .max(30),
        question: z.string().min(1).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<Result<string>> =>
    friendly(async () => {
      const { callGemini, docParts } = await import("./gemini.server");
      return callGemini({
        systemInstruction: {
          parts: [
            {
              text: `${SYSTEM}
Answer questions using only the document provided. Cite the clause/section when possible. Keep answers under 150 words, plain text, no markdown headings.
If the document doesn't cover the question, say so and suggest asking a qualified lawyer.`,
            },
          ],
        },
        contents: [
          { role: "user", parts: [...docParts(data.doc), { text: "This is the document I'll ask about." }] },
          { role: "model", parts: [{ text: "Understood. Ask me anything about it." }] },
          ...data.history.map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.text }],
          })),
          { role: "user", parts: [{ text: data.question }] },
        ],
        generationConfig: { temperature: 0.3 },
      });
    }),
  );
