// Thin server-function wrappers. Implementation lives in legal.server.ts (server-only).
import { createServerFn } from "@tanstack/react-start";
import type { Analysis, Comparison } from "./analysisTypes";
import { AnalyzeInput, AskComparisonInput, AskInput, PairSchema } from "./legal.schemas";

export type { ChangeCategory, Comparison, ComparisonChange } from "./analysisTypes";

type Result<T> = { ok: true; value: T } | { ok: false; error: string; retryable?: boolean };

export const analyzeDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data }): Promise<Result<Analysis>> =>
    (await (await import("./rateLimit.server")).rateLimitGuard()) ?? (await import("./legal.server")).runAnalyze(data));

export const askDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AskInput.parse(d))
  .handler(async ({ data }): Promise<Result<string>> =>
    (await (await import("./rateLimit.server")).rateLimitGuard()) ?? (await import("./legal.server")).runAsk(data));

export const compareDocuments = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PairSchema.parse(d))
  .handler(async ({ data }): Promise<Result<Comparison>> =>
    (await (await import("./rateLimit.server")).rateLimitGuard()) ?? (await import("./legal.server")).runCompare(data));

export const askComparison = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AskComparisonInput.parse(d))
  .handler(async ({ data }): Promise<Result<string>> =>
    (await (await import("./rateLimit.server")).rateLimitGuard()) ?? (await import("./legal.server")).runAskComparison(data));
