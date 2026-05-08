import { and, eq } from "drizzle-orm";
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
    const workflow = await runDailyRadarWorkflowAsync(date, config, ingestArxivForSources);
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
