import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { loadRadarSnapshotReadOnlyWithMeta, makeEmptyMeta } from "../lib/buildRadarSnapshot.js";
import { logApi } from "../lib/logger.js";

const QuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  source: z.enum(["mock", "live"]).optional().default("mock"),
  /** Ignorado: el snapshot es solo lectura; forzar recomputo vía POST/GET /api/radar/run autenticado. */
  refresh: z.enum(["1", "0"]).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const parsed = QuerySchema.safeParse({
    date: req.query.date,
    source: req.query.source,
    refresh: req.query.refresh,
  });

  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", details: parsed.error.flatten() });
    return;
  }

  const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);
  const mode = parsed.data.source;
  const t0 = Date.now();

  try {
    logApi("info", "snapshot_start", { date, mode, readOnly: true });
    const { data, meta } = await loadRadarSnapshotReadOnlyWithMeta(date, mode);
    if (!data) {
      logApi("info", "snapshot_not_found", { date, mode, ms: Date.now() - t0 });
      res.status(404).json({
        error: "not_found",
        message: "No hay snapshot persistido para la fecha y modo pedidos (ni fallback reciente).",
        _meta: makeEmptyMeta(date, mode),
      });
      return;
    }
    logApi("info", "snapshot_ok", {
      date,
      mode,
      fallback: meta.fallback,
      stale: meta.stale,
      ms: Date.now() - t0,
    });
    res.status(200).json({ ...data, _meta: meta });
  } catch (e) {
    logApi("error", "snapshot_fail", { message: e instanceof Error ? e.message : String(e) });
    res.status(500).json({
      error: "snapshot_failed",
      message: e instanceof Error ? e.message : String(e),
      _meta: makeEmptyMeta(date, mode),
    });
  }
}
