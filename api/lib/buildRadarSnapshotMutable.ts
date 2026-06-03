import { and, eq } from "drizzle-orm";
import type { RadarAppData } from "../../src/data/radarSnapshot.js";
import { toRadarAppData } from "../../src/data/radarSnapshot.js";
import {
  runDailyRadarWorkflow,
  buildDefaultConfig,
} from "../../src/domain/services/radar/runDailyRadarWorkflow.js";
import { runDailyRadarWorkflowAsync } from "../../src/domain/services/radar/runDailyRadarWorkflowAsync.js";
import { getDb } from "../../src/db/index.js";
import { radarSnapshots } from "../../src/db/schema.js";
import { ingestArxivForSources } from "../../src/server/arxiv/ingestArxiv.js";
import { enrichPapers } from "../../src/server/llm/enrichPapers.js";

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
