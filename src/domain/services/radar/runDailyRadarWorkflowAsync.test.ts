import { describe, it, expect, vi } from "vitest";
import type { Source } from "../../models";
import type { IngestedPaperPayload } from "./types";
import { runDailyRadarWorkflowAsync, buildDefaultConfig } from "./runDailyRadarWorkflowAsync";

function makePayload(n: number): IngestedPaperPayload {
  return {
    source_id: "src-ai",
    external_id: `arxiv:2401.0000${n}`,
    title: `Paper ${n}`,
    abstract: `Abstract for paper ${n}. Discusses large language models and neural networks.`,
    authors: [`Author ${n}`],
    published_at: "2024-01-15T12:00:00Z",
    updated_at: "2024-01-15T12:00:00Z",
    categories: ["cs.AI"],
    url: `https://arxiv.org/abs/2401.0000${n}`,
    raw_payload: { provider: "arxiv-api" },
  };
}

describe("runDailyRadarWorkflowAsync", () => {
  it("ejecuta el pipeline completo con payloads inyectados y retorna resultado válido", async () => {
    const payloads = [makePayload(1), makePayload(2), makePayload(3)];
    const ingest = vi.fn().mockResolvedValue(payloads);
    const config = buildDefaultConfig();

    const result = await runDailyRadarWorkflowAsync("2024-01-15", config, ingest);

    expect(ingest).toHaveBeenCalledOnce();
    // ingest recibe solo las fuentes activas del config
    const calledWith = ingest.mock.calls[0][0] as Source[];
    expect(calledWith.every((s) => s.active)).toBe(true);

    expect(result.papers.length).toBeGreaterThan(0);
    expect(result.briefing.id).toBeTruthy();
    expect(result.trendSnapshot.id).toBeTruthy();
    expect(result.logs.some((l) => l.includes("ingestSources: 3 payloads"))).toBe(true);
  });

  it("maneja ingesta vacía sin lanzar — pipeline produce briefing con fallback a seeds", async () => {
    const ingest = vi.fn().mockResolvedValue([]);
    const config = buildDefaultConfig();

    const result = await runDailyRadarWorkflowAsync("2024-01-15", config, ingest);

    expect(result.papers).toHaveLength(0);
    // trendSnapshot usa papersSeed como fallback cuando no hay papers reales
    expect(result.trendSnapshot.id).toBeTruthy();
    expect(result.briefing.id).toBeTruthy();
    expect(result.logs.some((l) => l.includes("ingestSources: 0 payloads"))).toBe(true);
  });

  it("propaga el error si ingest lanza", async () => {
    const ingest = vi.fn().mockRejectedValue(new Error("arxiv HTTP 503"));
    const config = buildDefaultConfig();

    await expect(runDailyRadarWorkflowAsync("2024-01-15", config, ingest)).rejects.toThrow(
      "arxiv HTTP 503",
    );
  });
});
