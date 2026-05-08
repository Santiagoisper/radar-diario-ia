import { authorWatchSeed, scoringWeightsSeed, sourcesSeed, themeKeywordsSeed } from "../../../data/seeds";
import { executeRadarPipelineFromPayloads } from "./executeRadarPipeline";
import { ingestSources } from "./ingestSources";
import type { RadarScoringWeights, RadarWorkflowConfig, RadarWorkflowResult } from "./types";

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

export function buildDefaultConfig(): RadarWorkflowConfig {
  return {
    sources: sourcesSeed,
    authors: authorWatchSeed,
    keywordsByTheme: themeKeywordsSeed,
    scoringWeights: mapWeightsToScoreSchema(),
    topN: 5,
  };
}

/**
 * Orquestador del workflow diario (ingesta mock síncrona).
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

  const result = executeRadarPipelineFromPayloads(ingestedPayloads, date, config);
  return {
    ...result,
    logs: [...logs, ...result.logs],
  };
}
