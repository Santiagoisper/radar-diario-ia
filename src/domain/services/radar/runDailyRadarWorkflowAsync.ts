import type { Source } from "../../models";
import { buildDefaultConfig } from "./runDailyRadarWorkflow";
import { executeRadarPipelineFromPayloads } from "./executeRadarPipeline";
import type { IngestedPaperPayload, RadarWorkflowConfig, RadarWorkflowResult } from "./types";

function validateWeightsSum(config: RadarWorkflowConfig): string[] {
  const logs: string[] = [];
  const w = config.scoringWeights;
  const sum = w.novelty_score + w.authority_score + w.relevance_score + w.concept_score + w.personal_score;
  const ok = Math.abs(sum - 1) < 0.0001;
  logs.push(
    ok
      ? `weights ok: ${Number(sum.toFixed(2))}`
      : `weights warning: suma=${Number(sum.toFixed(4))} (esperado 1.00)`,
  );
  return logs;
}

/**
 * Workflow con ingestión async (p. ej. arXiv en servidor).
 */
export async function runDailyRadarWorkflowAsync(
  date: string,
  config: RadarWorkflowConfig = buildDefaultConfig(),
  ingest: (activeSources: Source[]) => Promise<IngestedPaperPayload[]>,
): Promise<RadarWorkflowResult> {
  const logs = validateWeightsSum(config);
  const active = config.sources.filter((source) => source.active);
  const ingestedPayloads = await ingest(active);
  logs.push(`ingestSources: ${ingestedPayloads.length} payloads`);
  const result = executeRadarPipelineFromPayloads(ingestedPayloads, date, config);
  return {
    ...result,
    logs: [...logs, ...result.logs],
  };
}

export { buildDefaultConfig };
