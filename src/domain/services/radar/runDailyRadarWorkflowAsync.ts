import type { Source } from "../../models";
import { buildDefaultConfig } from "./runDailyRadarWorkflow";
import { executeRadarPipelineFromPayloads } from "./executeRadarPipeline";
import type {
  IngestedPaperPayload,
  PaperEnrichmentResult,
  RadarWorkflowConfig,
  RadarWorkflowResult,
} from "./types";

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
 * Workflow con ingestión async (p. ej. arXiv en servidor) y enriquecimiento LLM opcional.
 *
 * @param ingest   - Función de ingesta (p. ej. ingestArxivForSources)
 * @param enrich   - Función de enriquecimiento LLM (p. ej. enrichPapers). Opcional.
 *                   Si no se pasa, o si retorna [], el resultado incluye enrichments: [].
 */
export async function runDailyRadarWorkflowAsync(
  date: string,
  config: RadarWorkflowConfig = buildDefaultConfig(),
  ingest: (activeSources: Source[]) => Promise<IngestedPaperPayload[]>,
  enrich?: (papers: import("../../models").Paper[]) => Promise<PaperEnrichmentResult[]>,
): Promise<RadarWorkflowResult> {
  const logs = validateWeightsSum(config);

  // 1. Ingesta
  const active = config.sources.filter((source) => source.active);
  const ingestedPayloads = await ingest(active);
  logs.push(`ingestSources: ${ingestedPayloads.length} payloads`);

  // 2. Pipeline determinístico (normalización, scoring, briefing, tendencias)
  const result = executeRadarPipelineFromPayloads(ingestedPayloads, date, config);

  // 3. Enriquecimiento LLM (opcional, no bloquea si falla o no está configurado)
  let enrichments: PaperEnrichmentResult[] = [];
  if (enrich && result.papers.length > 0) {
    try {
      enrichments = await enrich(result.papers);
      logs.push(`enrichPapers: ${enrichments.length}/${result.papers.length} papers enriquecidos`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logs.push(`enrichPapers: error — ${msg} (enriquecimiento omitido)`);
    }
  } else {
    logs.push("enrichPapers: omitido (sin función de enriquecimiento o sin papers)");
  }

  return {
    ...result,
    enrichments,
    logs: [...logs, ...result.logs],
  };
}

export { buildDefaultConfig };
