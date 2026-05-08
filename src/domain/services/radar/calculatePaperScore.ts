import type { AuthorWatch, Paper, PaperScore, PaperTheme } from "../../models";
import type { RadarScoringWeights } from "./types";

function clampScore(value: number): number {
  return Math.max(0, Math.min(10, Number(value.toFixed(2))));
}

function averageConfidence(themes: PaperTheme[]): number {
  if (themes.length === 0) return 0.3;
  const sum = themes.reduce((acc, item) => acc + item.confidence, 0);
  return sum / themes.length;
}

function computeAuthorityScore(paper: Paper, watchAuthors: AuthorWatch[]): number {
  const matched = watchAuthors.filter((watch) => {
    if (paper.authors.includes(watch.display_name)) return true;
    return watch.aliases.some((alias) => paper.authors.includes(alias));
  });

  if (matched.length === 0) return 5;

  const priorityAvg = matched.reduce((acc, author) => acc + author.priority, 0) / matched.length;
  return clampScore(5 + priorityAvg * 0.45);
}

function computeNoveltyScore(paper: Paper): number {
  const freshnessBoost = paper.is_new_today ? 2.2 : 1.2;
  const categoryBreadth = paper.categories.length > 1 ? 0.8 : 0.3;
  return clampScore(6 + freshnessBoost + categoryBreadth);
}

function computeRelevanceScore(themes: PaperTheme[]): number {
  const highSignalThemes = themes.filter((theme) => theme.confidence >= 0.75).length;
  return clampScore(6.2 + highSignalThemes * 1.1);
}

function computeConceptScore(paper: Paper, themes: PaperTheme[]): number {
  const confidenceFactor = averageConfidence(themes) * 3.5;
  const abstractDepth = Math.min(2, paper.abstract.length / 120);
  return clampScore(5 + confidenceFactor + abstractDepth);
}

function computePersonalScore(paper: Paper, watchAuthors: AuthorWatch[]): number {
  const matchedPriority = watchAuthors
    .filter(
      (watch) =>
        paper.authors.includes(watch.display_name) ||
        watch.aliases.some((alias) => paper.authors.includes(alias)),
    )
    .reduce((acc, author) => acc + author.priority, 0);

  if (matchedPriority === 0) return 6;
  return clampScore(5.8 + matchedPriority / 7);
}

/**
 * Calcula score compuesto por paper con explicación interpretable.
 */
export function calculatePaperScore(
  paper: Paper,
  themes: PaperTheme[],
  watchAuthors: AuthorWatch[],
  weights: RadarScoringWeights,
): PaperScore {
  const novelty_score = computeNoveltyScore(paper);
  const authority_score = computeAuthorityScore(paper, watchAuthors);
  const relevance_score = computeRelevanceScore(themes);
  const concept_score = computeConceptScore(paper, themes);
  const personal_score = computePersonalScore(paper, watchAuthors);

  const total_score = clampScore(
    novelty_score * weights.novelty_score +
      authority_score * weights.authority_score +
      relevance_score * weights.relevance_score +
      concept_score * weights.concept_score +
      personal_score * weights.personal_score,
  );

  const primaryTheme = themes[0]?.theme ?? "sin clasificar";
  const explanation =
    `Score compuesto por novedad (${novelty_score.toFixed(2)}), autoridad (${authority_score.toFixed(2)}), ` +
    `relevancia (${relevance_score.toFixed(2)}), densidad conceptual (${concept_score.toFixed(2)}) ` +
    `y ajuste personal (${personal_score.toFixed(2)}). Tema dominante: ${primaryTheme}.`;

  return {
    id: `score-${paper.id}`,
    paper_id: paper.id,
    novelty_score,
    authority_score,
    relevance_score,
    concept_score,
    personal_score,
    total_score,
    explanation,
  };
}
