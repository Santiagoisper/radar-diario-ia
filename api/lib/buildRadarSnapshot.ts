import { and, desc, eq } from "drizzle-orm";
import type { RadarAppData } from "../../src/data/radarSnapshot";
import { toRadarAppData } from "../../src/data/radarSnapshot";
import {
  runDailyRadarWorkflow,
  buildDefaultConfig,
} from "../../src/domain/services/radar/runDailyRadarWorkflow";
import { runDailyRadarWorkflowAsync } from "../../src/domain/services/radar/runDailyRadarWorkflowAsync";
import { getDb } from "../../src/db";
import { radarSnapshots } from "../../src/db/schema";
import { ingestArxivForSources } from "../../src/server/arxiv/ingestArxiv";
import { enrichPapers } from "../../src/server/llm/enrichPapers";

/**
 * Solo lectura: SELECT en radar_snapshots. Sin workflow, sin red, sin INSERT/UPDATE.
 * 1) Fila exacta (run_date + mode). 2) Si no hay, última fila del mismo mode por created_at, luego run_date.
 */
export async function loadRadarSnapshotReadOnly(
  date: string,
  mode: "mock" | "live",
): Promise<RadarAppData | null> {
  const db = getDb();
  if (!db) return null;

  const exactRows = await db
    .select()
    .from(radarSnapshots)
    .where(and(eq(radarSnapshots.runDate, date), eq(radarSnapshots.mode, mode)))
    .limit(1);

  const exact = exactRows[0];
  if (exact?.payload) {
    return exact.payload as RadarAppData;
  }

  const fallbackRows = await db
    .select()
    .from(radarSnapshots)
    .where(eq(radarSnapshots.mode, mode))
    .orderBy(desc(radarSnapshots.createdAt), desc(radarSnapshots.runDate))
    .limit(1);

  const fallback = fallbackRows[0];
  if (fallback?.payload) {
    return fallback.payload as RadarAppData;
  }

  return null;
}

export async function loadOrBuildRadarAppData(
  date: string,
  mode: "mock" | "live",
  opts: { persist: boolean; useCache: boolean },
): Promise<RadarAppData> {
  const db = getDb();

  if (db && opts.useCache) {
    const rows = await db
      .select()
      .from(radarSnapshots)
      .where(and(eq(radarSnapshots.runDate, date), eq(radarSnapshots.mode, mode)))
      .limit(1);
    const row = rows[0];
    if (row?.payload) {
      return row.payload as RadarAppData;
    }
  }

  let data: RadarAppData;
  if (mode === "mock") {
    const workflow = runDailyRadarWorkflow(date);
    data = toRadarAppData(workflow, date);
  } else {
    const config = buildDefaultConfig();
    const workflow = await runDailyRadarWorkflowAsync(date, config, ingestArxivForSources, enrichPapers);
    data = toRadarAppData(workflow, date);
  }

  if (db && opts.persist) {
    await db
      .insert(radarSnapshots)
      .values({
        runDate: date,
        mode,
        payload: data as unknown as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: [radarSnapshots.runDate, radarSnapshots.mode],
        set: {
          payload: data as unknown as Record<string, unknown>,
          createdAt: new Date(),
        },
      });
  }

  return data;
}
