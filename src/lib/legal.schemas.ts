// Input validation shared by the server functions (client-safe, unit-tested).
import { z } from "zod";
import { MAX_FILE_BYTES } from "./fileValidation";

/** Largest base64 string a 14 MB file can produce (4 chars per 3 bytes). */
export const MAX_BASE64_CHARS = Math.ceil(MAX_FILE_BYTES / 3) * 4;
/** Max extracted plain text per document. */
export const MAX_TEXT_CHARS = 1_000_000;
/** Max size of the comparison JSON echoed back for follow-up questions. */
export const MAX_COMPARISON_CHARS = 100_000;

export const DocSchema = z.object({
  name: z.string().min(1).max(300),
  mimeType: z.string().max(200),
  data: z.string().max(MAX_BASE64_CHARS).optional(),
  text: z.string().max(MAX_TEXT_CHARS).optional(),
});

export const AnalyzeInput = z.object({ doc: DocSchema });

export const AskInput = z
      .object({
        doc: DocSchema,
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(8000) }))
          .max(30),
        question: z.string().min(1).max(2000),
      });

export const PairSchema = z.object({ original: DocSchema, revised: DocSchema });

export const AskComparisonInput = PairSchema.extend({
      comparison: z.string().max(MAX_COMPARISON_CHARS),
      history: z
        .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(8000) }))
        .max(30),
      question: z.string().min(1).max(2000),
    });
