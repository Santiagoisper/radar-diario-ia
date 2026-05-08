import { describe, expect, it } from "vitest";
import type { Paper } from "../../models";
import { deduplicatePapers } from "./deduplicatePapers";

function paper(overrides: Partial<Paper>): Paper {
  return {
    id: "paper-id",
    external_id: "ext-1",
    source_id: "source-1",
    title: "Title",
    abstract: "Abstract body.",
    authors: ["A. Author"],
    published_at: "2026-05-01T10:00:00Z",
    updated_at: "2026-05-01T10:00:00Z",
    categories: ["cs.AI"],
    url: "https://example.com/abs/1",
    raw_payload: {},
    is_new_today: true,
    ...overrides,
  };
}

describe("deduplicatePapers", () => {
  it("conserva la versión con updated_at más reciente para el mismo external_id", () => {
    const older = paper({
      id: "older",
      external_id: "arxiv:dup",
      updated_at: "2026-05-01T10:00:00Z",
    });
    const newer = paper({
      id: "newer",
      external_id: "arxiv:dup",
      updated_at: "2026-05-02T10:00:00Z",
    });

    expect(deduplicatePapers([older, newer])).toEqual([newer]);
    expect(deduplicatePapers([newer, older])).toEqual([newer]);
  });

  it("mantiene papers con external_id distinto", () => {
    const a = paper({ id: "a", external_id: "ext-a" });
    const b = paper({ id: "b", external_id: "ext-b" });
    const result = deduplicatePapers([a, b]);
    expect(result).toHaveLength(2);
    expect(new Set(result.map((p) => p.external_id))).toEqual(new Set(["ext-a", "ext-b"]));
  });
});
