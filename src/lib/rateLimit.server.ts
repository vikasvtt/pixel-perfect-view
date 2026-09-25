// Lightweight per-visitor limit for AI endpoints (server-only).
// In-memory, per server instance: a deterrent against abuse, not a hard global quota.
export const RATE_LIMIT = 10;
export const RATE_WINDOW_MS = 60_000;
export const RATE_LIMIT_MESSAGE = "The AI usage limit has been reached. Please try again later.";

const hits = new Map<string, number[]>();

/** Records one request for `key`; returns false when the visitor is over the limit. */
export function allowRequest(key: string, now: number = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(k);
  return true;
}

export function resetRateLimit() {
  hits.clear();
}

/** Returns the friendly usage-limit result when the current visitor is over the limit. */
export async function rateLimitGuard(): Promise<{ ok: false; error: string; retryable: true } | null> {
  let ip = "unknown";
  try {
    const { getRequestIP, getRequestHeader } = await import("@tanstack/react-start/server");
    ip = getRequestHeader("cf-connecting-ip") ?? getRequestIP({ xForwardedFor: true }) ?? "unknown";
  } catch {
    /* outside a request (e.g. tests) */
  }
  return allowRequest(ip) ? null : { ok: false, error: RATE_LIMIT_MESSAGE, retryable: true };
}
