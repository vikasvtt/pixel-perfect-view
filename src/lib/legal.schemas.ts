// Input validation shared by the server functions (client-safe, unit-tested).
import { z } from "zod";

export const DocSchema = z.object({
  name: z.string().min(1).max(300),
  mimeType: z.string().max(200),
  data: z.string().max(30_000_000).optional(),
  text: z.string().max(1_000_000).optional(),
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
      comparison: z.string().max(200_000),
      history: z
        .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(8000) }))
        .max(30),
      question: z.string().min(1).max(2000),
    });
