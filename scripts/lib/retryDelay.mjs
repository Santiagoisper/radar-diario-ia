const MAX_DELAY_MS = 180_000;

/**
 * Retry delay for arXiv fetch attempts.
 * Priority: Retry-After header → exponential backoff with ±20% jitter.
 * All delays capped at MAX_DELAY_MS to stay within GitHub Actions budget.
 *
 * Unified across 429, AbortError, and 5xx — there is no scenario in this
 * script where a 2s fallback makes sense after an arXiv rate limit.
 */
export function retryDelayMs(response, attempt) {
  const retryAfter = response?.headers?.get?.("Retry-After");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) {
      return Math.min(Math.max(seconds * 1000, 1000), MAX_DELAY_MS);
    }
    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) {
      return Math.min(Math.max(retryAt - Date.now(), 1000), MAX_DELAY_MS);
    }
  }

  const base = Math.min(15_000 * 2 ** (attempt - 1), MAX_DELAY_MS);
  return Math.floor(base * (0.8 + Math.random() * 0.4));
}
