import { runDailyRadarWorkflow } from "./runDailyRadarWorkflow";

/** Validación rápida para desarrollo local. */
export function validateDailyWorkflow() {
  const result = runDailyRadarWorkflow();

  return {
    papers: result.papers.length,
    themes: result.themes.length,
    scores: result.scores.length,
    briefingId: result.briefing.id,
    briefingItems: result.briefingItems.length,
    trendId: result.trendSnapshot.id,
    logs: result.logs,
  };
}
