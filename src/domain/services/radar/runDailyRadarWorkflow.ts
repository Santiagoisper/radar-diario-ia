import {
  authorWatchSeed,
  dailyBriefingsSeed,
  papersSeed,
  scoringWeightsSeed,
  sourcesSeed,
  themeKeywordsSeed,
} from "../../../data/seeds";
import type { PaperScore, PaperTheme } from "../../models";
import { calculatePaperScore } from "./calculatePaperScore";
import { classifyThemes } from "./classifyThemes";
import { deduplicatePapers } from "./deduplicatePapers";
import { generateDailyBriefing } from "./generateDailyBriefing";
import { generateTrendSnapshot } from "./generateTrendSnapshot";
import { ingestSources } from "./ingestSources";
import { normalizePaper } from "./normalizePaper";
import type {
  RadarScoringWeights,
  RadarWorkflowConfig,
  RadarWorkflowResult,
} from "./types";

function mapWeightsToScoreSchema(): RadarScoringWeights {
  return {
    novelty_score: scoringWeightsSeed.novelty_weight,
    authority_score: scoringWeightsSeed.authority_weight,
    relevance_score: scoringWeightsSeed.relevance_weight,
    concept_score: scoringWeightsSeed.concept_weight,
    personal_score: scoringWeightsSeed.personal_weight,
  };
}

function validateWeights(weights: RadarScoringWeights): { ok: boolean; sum: number } {
  const sum =
    weights.novelty_score +
    weights.authority_score +
    weights.relevance_score +
    weights.concept_score +
    weights.personal_score;

  return {
    ok: Math.abs(sum - 1) < 0.0001,
    sum: Number(sum.toFixed(4)),
  };
}

function buildDefaultConfig(): RadarWorkflowConfig {
  return {
    sources: sourcesSeed,
    authors: authorWatchSeed,
    keywordsByTheme: themeKeywordsSeed,
    scoringWeights: mapWeightsToScoreSchema(),
    topN: 5,
  };
}

function scoreAllPapers(
  papers: ReturnType<typeof deduplicatePapers>,
  themes: PaperTheme[],
  config: RadarWorkflowConfig,
): PaperScore[] {
  return papers.map((paper) => {
    const currentThemes = themes.filter((theme) => theme.paper_id === paper.id);
    return calculatePaperScore(paper, currentThemes, config.authors, config.scoringWeights);
  });
}

/**
 * Orquestador del workflow diario.
 * Mantiene orden fijo de ejecución y deja logs simples para trazabilidad.
 */
export function runDailyRadarWorkflow(
  date = "2026-05-05",
  config: RadarWorkflowConfig = buildDefaultConfig(),
): RadarWorkflowResult {
  const logs: string[] = [];

  const weightValidation = validateWeights(config.scoringWeights);
  logs.push(
    weightValidation.ok
      ? `weights ok: ${weightValidation.sum.toFixed(2)}`
      : `weights warning: suma=${weightValidation.sum.toFixed(2)} (esperado 1.00)`,
  );

  const ingestedPayloads = ingestSources(config.sources.filter((source) => source.active));
  logs.push(`ingestSources: ${ingestedPayloads.length} payloads`);

  const normalizedPapers = ingestedPayloads.map((payload) => normalizePaper(payload, date));
  logs.push(`normalizePaper: ${normalizedPapers.length} papers normalizados`);

  const dedupedPapers = deduplicatePapers(normalizedPapers);
  logs.push(`deduplicatePapers: ${dedupedPapers.length} papers deduplicados`);

  const themes = dedupedPapers.flatMap((paper) =>
    classifyThemes(paper, config.keywordsByTheme),
  );
  logs.push(`classifyThemes: ${themes.length} asignaciones de tema`);

  const scores = scoreAllPapers(dedupedPapers, themes, config);
  logs.push(`calculatePaperScore: ${scores.length} scores calculados`);

  const { briefing, briefingItems } = generateDailyBriefing({
    date,
    papers: dedupedPapers,
    themes,
    scores,
    watchAuthors: config.authors,
    topN: config.topN,
  });
  logs.push(`generateDailyBriefing: briefing ${briefing.id} con ${briefingItems.length} items`);

  const trendSnapshot = generateTrendSnapshot({
    papers: dedupedPapers.length > 0 ? dedupedPapers : papersSeed,
    themes,
    scores,
    briefings: [...dailyBriefingsSeed, briefing],
    periodType: "weekly",
  });
  logs.push(`generateTrendSnapshot: ${trendSnapshot.id}`);

  return {
    papers: dedupedPapers,
    themes,
    scores,
    briefing,
    briefingItems,
    trendSnapshot,
    logs,
  };
}
