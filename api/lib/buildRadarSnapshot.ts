import { and, desc, eq } from "drizzle-orm";
import type { RadarAppData } from "../../src/data/radarSnapshot.js";
import { getDb } from "../../src/db/index.js";
import { radarSnapshots } from "../../src/db/schema.js";

export interface SnapshotMeta {
  requestedDate: string;
  servedDate: string;
  fallback: boolean;
  stale: boolean;
  source: string;
  generatedAt: string | null;
}

export function makeEmptyMeta(requestedDate: string, source: string): SnapshotMeta {
  return { requestedDate, servedDate: "", fallback: false, stale: false, source, generatedAt: null };
}

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

const STALE_THRESHOLD_MS = 25 * 60 * 60 * 1000; // 25 hours

/**
 * Solo lectura con metadatos de frescura. Nunca llama a OpenAI ni corre pipeline.
 * Retorna { data, meta } donde meta indica si el snapshot es exacto, fallback, o stale.
 */
export async function loadRadarSnapshotReadOnlyWithMeta(
  date: string,
  mode: "mock" | "live",
): Promise<{ data: RadarAppData | null; meta: SnapshotMeta }> {
  const db = getDb();
  if (!db) return { data: null, meta: makeEmptyMeta(date, mode) };

  const exactRows = await db
    .select()
    .from(radarSnapshots)
    .where(and(eq(radarSnapshots.runDate, date), eq(radarSnapshots.mode, mode)))
    .limit(1);

  const exact = exactRows[0];
  if (exact?.payload) {
    return {
      data: exact.payload as RadarAppData,
      meta: {
        requestedDate: date,
        servedDate: exact.runDate,
        fallback: false,
        stale: false,
        source: mode,
        generatedAt: exact.createdAt ? exact.createdAt.toISOString() : null,
      },
    };
  }

  const fallbackRows = await db
    .select()
    .from(radarSnapshots)
    .where(eq(radarSnapshots.mode, mode))
    .orderBy(desc(radarSnapshots.createdAt), desc(radarSnapshots.runDate))
    .limit(1);

  const fallback = fallbackRows[0];
  if (fallback?.payload) {
    const ageMs = fallback.createdAt ? Date.now() - fallback.createdAt.getTime() : Infinity;
    return {
      data: fallback.payload as RadarAppData,
      meta: {
        requestedDate: date,
        servedDate: fallback.runDate,
        fallback: true,
        stale: ageMs > STALE_THRESHOLD_MS,
        source: mode,
        generatedAt: fallback.createdAt ? fallback.createdAt.toISOString() : null,
      },
    };
  }

  return { data: null, meta: makeEmptyMeta(date, mode) };
}
