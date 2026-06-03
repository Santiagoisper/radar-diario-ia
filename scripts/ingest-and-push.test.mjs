import { describe, it, expect, vi } from "vitest";
import { retryDelayMs } from "./lib/retryDelay.mjs";
import { deduplicateByExternalId, fetchAllCategories } from "./lib/arxivUtils.mjs";

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

// Helpers shared across arxivUtils tests
function makePayload(externalId, sourceId) {
  return { external_id: externalId, source_id: sourceId };
}

const noDelay = () => Promise.resolve();

describe("deduplicateByExternalId", () => {
  it("removes cross-category duplicate, preserves first occurrence", () => {
    const first = makePayload("arxiv:2506.00001", "source-arxiv-cs-ai");
    const duplicate = makePayload("arxiv:2506.00001", "source-arxiv-cs-lg");
    const other = makePayload("arxiv:2506.00002", "source-arxiv-cs-lg");

    const result = deduplicateByExternalId([first, other, duplicate]);

    expect(result).toHaveLength(2);
    expect(result.find((p) => p.external_id === "arxiv:2506.00001").source_id).toBe("source-arxiv-cs-ai");
  });

  it("preserves all unique papers unchanged", () => {
    const payloads = [
      makePayload("arxiv:2506.00001", "source-arxiv-cs-ai"),
      makePayload("arxiv:2506.00002", "source-arxiv-cs-lg"),
      makePayload("arxiv:2506.00003", "source-arxiv-cs-cl"),
    ];
    expect(deduplicateByExternalId(payloads)).toHaveLength(3);
  });
});

describe("fetchAllCategories", () => {
  it("all categories fail: returns empty payloads with all in failedCategories, never calls parseFeed", async () => {
    const fetchForCategory = vi.fn().mockRejectedValue(new Error("arXiv HTTP 429"));
    const parseFeed = vi.fn();

    const { payloads, failedCategories } = await fetchAllCategories(["cs.AI", "cs.LG", "cs.CL"], 8, {
      fetchForCategory,
      parseFeed,
      delayMs: noDelay,
    });

    expect(payloads).toEqual([]);
    expect(failedCategories).toEqual(["cs.AI", "cs.LG", "cs.CL"]);
    expect(parseFeed).not.toHaveBeenCalled();
    // deduplicateByExternalId([]) === [] and payloads.length === 0 →
    // main exits non-zero via explicit guard: if (payloads.length === 0) process.exit(1)
  });

  it("partial success: returns only real payloads, failed category listed, parseFeed not called for failure", async () => {
    const aiPayload = makePayload("arxiv:2506.00001", "source-arxiv-cs-ai");
    const clPayload = makePayload("arxiv:2506.00002", "source-arxiv-cs-cl");

    const fetchForCategory = vi
      .fn()
      .mockResolvedValueOnce("<xml>cs.AI</xml>")
      .mockRejectedValueOnce(new Error("arXiv HTTP 429"))
      .mockResolvedValueOnce("<xml>cs.CL</xml>");

    const parseFeed = vi.fn().mockReturnValueOnce([aiPayload]).mockReturnValueOnce([clPayload]);

    const { payloads, failedCategories } = await fetchAllCategories(["cs.AI", "cs.LG", "cs.CL"], 8, {
      fetchForCategory,
      parseFeed,
      delayMs: noDelay,
    });

    expect(payloads).toEqual([aiPayload, clPayload]);
    expect(failedCategories).toEqual(["cs.LG"]);
    expect(fetchForCategory).toHaveBeenCalledTimes(3);
    expect(parseFeed).toHaveBeenCalledTimes(2);
  });
});
