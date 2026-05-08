import { describe, expect, it } from "vitest";
import type { AuthorWatch, Paper, PaperTheme } from "../../models";
import { calculatePaperScore } from "./calculatePaperScore";
import type { RadarScoringWeights } from "./types";

const equalWeights: RadarScoringWeights = {
  novelty_score: 0.2,
  authority_score: 0.2,
  relevance_score: 0.2,
  concept_score: 0.2,
  personal_score: 0.2,
};

function basePaper(overrides: Partial<Paper> = {}): Paper {
  return {
    id: "paper-1",
    external_id: "arxiv:1",
    source_id: "src-1",
    title: "Test",
    abstract: "x".repeat(200),
    authors: ["Someone"],
    published_at: "2026-05-05T00:00:00Z",
    updated_at: "2026-05-05T00:00:00Z",
    categories: ["cs.AI"],
    url: "https://example.com/1",
    raw_payload: {},
    is_new_today: false,
    ...overrides,
  };
}

const emptyWatch: AuthorWatch[] = [];

describe("calculatePaperScore", () => {
  it("calcula score con lista de temas vacía (usa valores por defecto internos)", () => {
    const score = calculatePaperScore(basePaper(), [], emptyWatch, equalWeights);
    expect(score.paper_id).toBe("paper-1");
    expect(score.total_score).toBeGreaterThanOrEqual(0);
    expect(score.total_score).toBeLessThanOrEqual(10);
    expect(score.explanation).toContain("sin clasificar");
  });

  it("usa el tema dominante en la explicación cuando hay temas", () => {
    const themes: PaperTheme[] = [
      {
        id: "t1",
        paper_id: "paper-1",
        theme: "agentes",
        confidence: 0.9,
      },
    ];
    const score = calculatePaperScore(basePaper(), themes, emptyWatch, equalWeights);
    expect(score.explanation).toContain("agentes");
  });

  it("pondera dimensiones según pesos que suman 1", () => {
    const paper = basePaper();
    const themes: PaperTheme[] = [{ id: "t1", paper_id: paper.id, theme: "x", confidence: 0.8 }];
    const weights: RadarScoringWeights = {
      novelty_score: 1,
      authority_score: 0,
      relevance_score: 0,
      concept_score: 0,
      personal_score: 0,
    };
    const score = calculatePaperScore(paper, themes, emptyWatch, weights);
    expect(score.total_score).toBeCloseTo(score.novelty_score, 5);
  });
});
