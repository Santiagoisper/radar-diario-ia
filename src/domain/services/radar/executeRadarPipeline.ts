import { dailyBriefingsSeed, papersSeed } from "../../../data/seeds";
import type { PaperScore, PaperTheme } from "../../models";
import { calculatePaperScore } from "./calculatePaperScore";
import { classifyThemes } from "./classifyThemes";
import { deduplicatePapers } from "./deduplicatePapers";
import { generateDailyBriefing } from "./generateDailyBriefing";
import { generateTrendSnapshot } from "./generateTrendSnapshot";
import { normalizePaper } from "./normalizePaper";
import type { IngestedPaperPayload, RadarWorkflowConfig, RadarWorkflowResult } from "./types";

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
 * Ejecuta el pipeline a partir de payloads ya ingeridos (sync).
 * Usado por runDailyRadarWorkflow y por la API tras ingestión arXiv async.
 */
export function executeRadarPipelineFromPayloads(
  ingestedPayloads: IngestedPaperPayload[],
  date: string,
  config: RadarWorkflowConfig,
): RadarWorkflowResult {
  const logs: string[] = [];
  logs.push(`ingest: ${ingestedPayloads.length} payloads`);

  const normalizedPapers = ingestedPayloads.map((payload) => normalizePaper(payload, date));
  logs.push(`normalizePaper: ${normalizedPapers.length} papers normalizados`);

  const dedupedPapers = deduplicatePapers(normalizedPapers);
  logs.push(`deduplicatePapers: ${dedupedPapers.length} papers deduplicados`);

  const themes = dedupedPapers.flatMap((paper) => classifyThemes(paper, config.keywordsByTheme));
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
    enrichments: [],
    logs,
  };
}
