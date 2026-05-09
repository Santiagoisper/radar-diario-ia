/**
 * POST /api/radar/ingest
 *
 * Recibe papers ya ingresados (IngestedPaperPayload[]) desde GitHub Actions
 * y corre el pipeline completo (scoring, briefing, LLM, persist) en Vercel.
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
import { buildDefaultConfig, runDailyRadarWorkflow } from "../../src/domain/services/radar/runDailyRadarWorkflow.js";
import { runDailyRadarWorkflowAsync } from "../../src/domain/services/radar/runDailyRadarWorkflowAsync.js";
import { enrichPapers } from "../../src/server/llm/enrichPapers.js";
import { toRadarAppData } from "../../src/data/radarSnapshot.js";
import type { RadarAppData } from "../../src/data/radarSnapshot.js";
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
  if (!db) return;
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

  logApi("info", "ingest_start", { date, mode, payloads_count: payloads.length });

  // Responder 202 inmediatamente — el pipeline corre en background con waitUntil
  res.status(202).json({
    ok: true,
    status: "accepted",
    date,
    mode,
    payloads_received: payloads.length,
  });

  waitUntil(
    (async () => {
      const t0 = Date.now();
      try {
        let data: RadarAppData;

        if (mode === "mock") {
          // Modo mock: pipeline determinístico sin red
          const workflow = runDailyRadarWorkflow(date);
          data = toRadarAppData(workflow, date);
        } else {
          // Modo live: pipeline con payloads pre-ingresados (sin llamar a arXiv)
          const config = buildDefaultConfig();
          // Inyectamos una función de ingesta que devuelve los payloads recibidos directamente
          const ingestFromPayloads = async () => payloads;
          const workflow = await runDailyRadarWorkflowAsync(date, config, ingestFromPayloads, enrichPapers);
          data = toRadarAppData(workflow, date);
        }

        await persistSnapshot(date, mode, data);

        logApi("info", "ingest_ok", {
          date,
          mode,
          ms: Date.now() - t0,
          papers_count: data.workflow?.papers?.length ?? 0,
        });
      } catch (e) {
        logApi("error", "ingest_fail", {
          date,
          mode,
          ms: Date.now() - t0,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    })()
  );
}
