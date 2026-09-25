// Server-only implementation of the legal AI features (unit-tested with a mocked Gemini).
import { z } from "zod";
import type { Analysis, Comparison } from "./analysisTypes";
import { MAX_FILE_MB } from "./fileValidation";
import { AnalyzeInput, AskComparisonInput, AskInput, DocSchema, PairSchema } from "./legal.schemas";


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

export type Result<T> = { ok: true; value: T } | { ok: false; error: string; retryable?: boolean };


export async function friendly<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    const { GeminiError } = await import("./gemini.server");
    if (e instanceof GeminiError) {
      const retryable = e.status === 429 || e.status === 503;
      return { ok: false, error: e.message, retryable };
    }
    console.error(e);
    return { ok: false, error: "Something went wrong while talking to the AI. Please try again." };
  }
}


export const runAnalyze = (data: z.infer<typeof AnalyzeInput>): Promise<Result<Analysis>> =>
    friendly(async () => {
      const { callGemini, docParts, GeminiError } = await import("./gemini.server");
      if (data.doc.data) {
        // Base64 is ~4/3 of the binary size; decode before comparing to the limit.
        const bytes = Math.floor((data.doc.data.length * 3) / 4);
        if (bytes > MAX_FILE_MB * 1024 * 1024) {
          throw new GeminiError(
            `That file is too large — the limit is ${MAX_FILE_MB} MB. Please compress or split the PDF and try again.`,
            413,
          );
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
    });


export const runAsk = (data: z.infer<typeof AskInput>): Promise<Result<string>> =>
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
    });

// ---------- Document comparison ----------

const comparisonSchema = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    keyChanges: strings,
    changes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          category: {
            type: "STRING",
            enum: ["added", "removed", "modified", "payment", "date", "obligation", "termination", "penalty"],
          },
          section: { type: "STRING" },
          title: { type: "STRING" },
          original: { type: "STRING" },
          revised: { type: "STRING" },
          explanation: { type: "STRING" },
          importance: { type: "STRING", enum: ["High", "Medium", "Low"] },
        },
        required: ["category", "section", "title", "original", "revised", "explanation", "importance"],
      },
    },
  },
  required: ["summary", "keyChanges", "changes"],
};

async function checkPairSize(a: z.infer<typeof DocSchema>, b: z.infer<typeof DocSchema>) {
  const { GeminiError } = await import("./gemini.server");
  const size = (d: z.infer<typeof DocSchema>) =>
    d.data ? Math.floor((d.data.length * 3) / 4) : (d.text?.length ?? 0);
  for (const d of [a, b]) {
    if (!d.data && !d.text?.trim()) {
      throw new GeminiError(`"${d.name}" appears to be empty. Please choose a document with text.`, 400);
    }
  }
  if (size(a) + size(b) > MAX_FILE_MB * 1024 * 1024) {
    throw new GeminiError(
      `These files are too large together — the combined limit is ${MAX_FILE_MB} MB. Please compress the PDFs and try again.`,
      413,
    );
  }
}

function pairParts(docParts: (d: z.infer<typeof DocSchema>) => unknown[], a: z.infer<typeof DocSchema>, b: z.infer<typeof DocSchema>) {
  return [
    { text: `ORIGINAL DOCUMENT (file: ${a.name}):` },
    ...docParts(a),
    { text: `NEW DOCUMENT (file: ${b.name}):` },
    ...docParts(b),
  ];
}


export const runCompare = (data: z.infer<typeof PairSchema>): Promise<Result<Comparison>> =>
    friendly(async () => {
      const { callGemini, docParts, GeminiError } = await import("./gemini.server");
      await checkPairSize(data.original, data.revised);
      const text = await callGemini({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [
          {
            role: "user",
            parts: [
              ...pairParts(docParts, data.original, data.revised),
              {
                text: `Compare the ORIGINAL and NEW documents clause-by-clause. Return JSON only.
- changes: every important difference. category is one of: added (clause only in NEW), removed (clause only in ORIGINAL), payment (changed amounts/fees/deposits), date (changed dates/deadlines/notice periods), obligation (changed duties), termination (changed termination/renewal), penalty (changed penalties/late fees), modified (any other changed clause).
- section: clause/section reference (e.g. "§4.2"), or "—" if none.
- title: short name of the term. original / revised: the wording or meaning in each version ("Not present" if absent).
- explanation: plain-language what changed and why it matters to the reader.
- importance: High / Medium / Low for the person signing.
- summary: 2-3 sentences on the most important changes. keyChanges: 3-5 short bullets.
Order changes by importance. Only report real differences found in the documents.`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: comparisonSchema,
          temperature: 0.2,
        },
      }, { retries: 4 });
      try {
        return JSON.parse(text) as Comparison;
      } catch {
        throw new GeminiError("The AI response was incomplete. Please try again.", 502);
      }
    });


export const runAskComparison = (data: z.infer<typeof AskComparisonInput>): Promise<Result<string>> =>
    friendly(async () => {
      const { callGemini, docParts } = await import("./gemini.server");
      await checkPairSize(data.original, data.revised);
      return callGemini({
        systemInstruction: {
          parts: [
            {
              text: `${SYSTEM}
Answer questions about the differences between the ORIGINAL and NEW documents, using only these documents. Cite sections when possible. Keep answers under 150 words, plain text, no markdown headings.
If the documents don't cover the question, say so and suggest asking a qualified lawyer.`,
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              ...pairParts(docParts, data.original, data.revised),
              { text: `Comparison already produced:\n${data.comparison}` },
            ],
          },
          { role: "model", parts: [{ text: "Understood. Ask me anything about these changes." }] },
          ...data.history.map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.text }],
          })),
          { role: "user", parts: [{ text: data.question }] },
        ],
        generationConfig: { temperature: 0.3 },
      }, { retries: 2 });
    });
