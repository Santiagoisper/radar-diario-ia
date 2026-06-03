import type { VercelRequest, VercelResponse } from "@vercel/node";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { loadOrBuildRadarAppData } from "../lib/buildRadarSnapshotMutable.js";
import { logApi } from "../lib/logger.js";

const BodySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  source: z.enum(["mock", "live"]).optional().default("live"),
});

const CronQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  source: z.enum(["mock", "live"]).optional().default("live"),
});

function authorizeCron(req: VercelRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.authorization ?? "";
  return auth === `Bearer ${secret}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  if (!authorizeCron(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  let date: string;
  let mode: "mock" | "live";

  if (req.method === "GET") {
    const parsed = CronQuerySchema.safeParse({
      date: req.query.date,
      source: req.query.source,
    });
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_query", details: parsed.error.flatten() });
      return;
    }
    date = parsed.data.date ?? new Date().toISOString().slice(0, 10);
    mode = parsed.data.source;
  } else {
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

    date = parsed.data.date ?? new Date().toISOString().slice(0, 10);
    mode = parsed.data.source;
  }

  logApi("info", "cron_run_start", { date, mode });

  // Responder 202 inmediatamente para no superar el límite de 10s de Vercel Hobby.
  // waitUntil extiende la ejecución hasta 15 minutos en background.
  res.status(202).json({ ok: true, status: "accepted", date, mode });

  waitUntil(
    (async () => {
      const t0 = Date.now();
      try {
        const data = await loadOrBuildRadarAppData(date, mode, { persist: true, useCache: false });
        logApi("info", "cron_run_ok", { date, mode, ms: Date.now() - t0, radarDate: data.radarDate });
      } catch (e) {
        logApi("error", "cron_run_fail", {
          date,
          mode,
          ms: Date.now() - t0,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    })(),
  );
}
