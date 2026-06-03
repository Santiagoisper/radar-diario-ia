/**
 * POST /api/radar/ingest
 *
 * Recibe papers ya ingresados (IngestedPaperPayload[]) desde GitHub Actions
 * y corre el pipeline completo (scoring, briefing, persist) en Vercel.
 *
 * Separación de responsabilidades:
 * - GitHub Actions: fetch a arXiv (IP no bloqueada) → envía payloads aquí
 * - Vercel: pipeline determinístico + LLM + persist en Neon
 *
 * Auth: mismo CRON_SECRET que /api/radar/run
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { getDb } from "../../src/db/index.js";
import { radarSnapshots } from "../../src/db/schema.js";
import {
  buildDefaultConfig,
  runDailyRadarWorkflow,
} from "../../src/domain/services/radar/runDailyRadarWorkflow.js";
import { executeRadarPipelineFromPayloads } from "../../src/domain/services/radar/executeRadarPipeline.js";
import { toRadarAppData } from "../../src/data/radarSnapshot.js";
import type { RadarAppData } from "../../src/data/radarSnapshot.js";
import { enrichPapers } from "../../src/server/llm/enrichPapers.js";
import { logApi } from "../lib/logger.js";

const PaperPayloadSchema = z.object({
  source_id: z.string(),
  external_id: z.string(),
  title: z.string(),
  abstract: z.string(),
  authors: z.array(z.string()),
  published_at: z.string(),
  updated_at: z.string(),
  categories: z.array(z.string()),
  url: z.string(),
  raw_payload: z.record(z.string(), z.unknown()),
});

const BodySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  source: z.enum(["mock", "live"]).optional().default("live"),
  payloads: z.array(PaperPayloadSchema).max(500).default([]),
});

function authorizeCron(req: VercelRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.authorization ?? "";
  return auth === `Bearer ${secret}`;
}

async function persistSnapshot(date: string, mode: "mock" | "live", data: RadarAppData): Promise<void> {
  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL no está configurado");
  }
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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  if (!authorizeCron(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  let raw: unknown = req.body;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      res.status(400).json({ error: "invalid_json" });
      return;
    }
  }

  const parsed = BodySchema.safeParse(raw ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }

  const { date: rawDate, source: mode, payloads } = parsed.data;
  const date = rawDate ?? new Date().toISOString().slice(0, 10);

  if (!process.env.DATABASE_URL?.trim()) {
    res.status(500).json({
      error: "database_not_configured",
      message: "DATABASE_URL no está configurado",
    });
    return;
  }

  logApi("info", "ingest_start", { date, mode, payloads_count: payloads.length });

  // Build deterministic base workflow synchronously before returning 202.
  // executeRadarPipelineFromPayloads is CPU-only — no I/O, no network.
  const config = buildDefaultConfig();
  let baseData: RadarAppData;
  if (mode === "mock") {
    const workflow = runDailyRadarWorkflow(date);
    baseData = toRadarAppData(workflow, date);
  } else {
    const workflow = executeRadarPipelineFromPayloads(payloads, date, config);
    baseData = toRadarAppData(workflow, date);
  }

  // Return 202 immediately — persistence and enrichment run in background.
  res.status(202).json({
    ok: true,
    status: "accepted",
    date,
    mode,
    payloads_received: payloads.length,
  });

  const t0 = Date.now();
  waitUntil(
    (async () => {
      try {
        // Phase 1: Persist base snapshot (no enrichment). Fast and safe.
        await persistSnapshot(date, mode, baseData);
        logApi("info", "ingest_base_persisted", {
          date,
          mode,
          papers: baseData.workflow?.papers?.length ?? 0,
          ms: Date.now() - t0,
        });

        // Phase 2: Enrich (live mode, best-effort). Base snapshot already safe.
        if (mode === "live" && (baseData.workflow?.papers?.length ?? 0) > 0) {
          logApi("info", "ingest_enrich_start", {
            date,
            papers: baseData.workflow.papers.length,
          });

          try {
            const enrichments = await enrichPapers(baseData.workflow.papers);

            // Create enriched copy — do not mutate baseData.
            const enrichedData: RadarAppData = {
              ...baseData,
              workflow: {
                ...baseData.workflow,
                enrichments,
                logs: [
                  ...baseData.workflow.logs,
                  `enrichPapers: ${enrichments.length}/${baseData.workflow.papers.length} papers enriched`,
                ],
              },
            };

            await persistSnapshot(date, mode, enrichedData);
            logApi("info", "ingest_enrich_ok", {
              date,
              enrichments: enrichments.length,
              papers: baseData.workflow.papers.length,
              ms: Date.now() - t0,
            });
          } catch (enrichErr) {
            // Base snapshot already persisted — enrichment is best-effort.
            logApi("warn", "ingest_enrich_fail", {
              date,
              message: enrichErr instanceof Error ? enrichErr.message : String(enrichErr),
              ms: Date.now() - t0,
            });
          }
        } else {
          logApi("info", "ingest_enrich_skipped", {
            date,
            reason: mode === "mock" ? "mock_mode" : "no_papers",
          });
        }
      } catch (e) {
        logApi("error", "ingest_fail", {
          date,
          mode,
          ms: Date.now() - t0,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    })(),
  );
}
