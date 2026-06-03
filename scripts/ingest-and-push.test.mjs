import { describe, it, expect } from "vitest";
import { retryDelayMs } from "./lib/retryDelay.mjs";

function mockResponse(status, retryAfterHeader = null) {
  return {
    status,
    headers: { get: (name) => (name === "Retry-After" ? retryAfterHeader : null) },
  };
}

describe("retryDelayMs", () => {
  it("attempt 2 with null response (AbortError) returns 24000–36000ms, not 4000ms", () => {
    const delay = retryDelayMs(null, 2);
    expect(delay).toBeGreaterThanOrEqual(24_000);
    expect(delay).toBeLessThanOrEqual(36_000);
  });

  it("attempt 1 with 429 and no Retry-After returns 12000–18000ms", () => {
    const delay = retryDelayMs(mockResponse(429), 1);
    expect(delay).toBeGreaterThanOrEqual(12_000);
    expect(delay).toBeLessThanOrEqual(18_000);
  });

  it("Retry-After: 30 returns exactly 30000ms", () => {
    const delay = retryDelayMs(mockResponse(429, "30"), 1);
    expect(delay).toBe(30_000);
  });

  it("Retry-After: 999 is capped at 180000ms", () => {
    const delay = retryDelayMs(mockResponse(429, "999"), 1);
    expect(delay).toBe(180_000);
  });
});
