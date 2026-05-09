/**
 * Punto de entrada único para el estado del radar en la app.
 * La UI debe basarse en getRadarAppData() / getLatestRadarState(), no en seeds sueltos,
 * para papers, scores, temas y briefings del pipeline (salvo configuración en Settings).
 */
import type { DailyBriefing, DailyBriefingItem, Paper } from "../domain/models";
import { runDailyRadarWorkflow } from "../domain/services/radar/runDailyRadarWorkflow";
import type { RadarWorkflowResult } from "../domain/services/radar/types";
import { dailyBriefingItemsSeed, dailyBriefingsSeed, papersSeed } from "./seeds";

/** Fecha "hoy" en UTC — se recalcula en cada módulo load, nunca hardcodeada. */
export const DEFAULT_RADAR_DATE = new Date().toISOString().slice(0, 10);

export interface RadarAppData {
  workflow: RadarWorkflowResult;
  /** Briefings históricos de seed reemplazados por el generado del workflow cuando coincide la fecha. */
  briefings: DailyBriefing[];
  briefingItems: DailyBriefingItem[];
  radarDate: string;
}

let cache: { date: string; data: RadarAppData } | null = null;

/** Limpia la caché en memoria (útil en tests). */
export function clearRadarAppDataCache(): void {
  cache = null;
}

export function getLatestRadarState(date: string = DEFAULT_RADAR_DATE): RadarWorkflowResult {
  return runDailyRadarWorkflow(date);
}

/** Construye RadarAppData desde un resultado de workflow (sin caché). Útil en API. */
export function toRadarAppData(workflow: RadarWorkflowResult, date: string): RadarAppData {
  const { briefings, briefingItems } = mergeBriefingsAndItems(workflow);
  return { workflow, briefings, briefingItems, radarDate: date };
}

export function mergeBriefingsAndItems(result: RadarWorkflowResult): {
  briefings: DailyBriefing[];
  briefingItems: DailyBriefingItem[];
} {
  const briefings = [
    ...dailyBriefingsSeed.filter((b) => b.briefing_date !== result.briefing.briefing_date),
    result.briefing,
  ].sort((a, b) => b.briefing_date.localeCompare(a.briefing_date));

  const briefingItems = [
    ...dailyBriefingItemsSeed.filter((i) => i.briefing_id !== result.briefing.id),
    ...result.briefingItems,
  ];

  return { briefings, briefingItems };
}

export function getRadarAppData(date: string = DEFAULT_RADAR_DATE): RadarAppData {
  if (cache?.date === date) {
    return cache.data;
  }

  const workflow = runDailyRadarWorkflow(date);
  const data = toRadarAppData(workflow, date);
  cache = { date, data };
  return data;
}

export function resolvePaper(paperId: string, workflow: RadarWorkflowResult): Paper | undefined {
  return workflow.papers.find((p) => p.id === paperId) ?? papersSeed.find((p) => p.id === paperId);
}
