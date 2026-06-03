import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { RadarAppData } from "../../src/data/radarSnapshot";

const mockGetDb = vi.hoisted(() => vi.fn());

vi.mock("../../src/db", () => ({
  getDb: mockGetDb,
}));

vi.mock("../../src/domain/services/radar/runDailyRadarWorkflow", () => ({
  runDailyRadarWorkflow: vi.fn(() => {
    throw new Error("runDailyRadarWorkflow must not be called from read-only path");
  }),
  buildDefaultConfig: vi.fn(),
}));

vi.mock("../../src/domain/services/radar/runDailyRadarWorkflowAsync", () => ({
  runDailyRadarWorkflowAsync: vi.fn(() => {
    throw new Error("runDailyRadarWorkflowAsync must not be called from read-only path");
  }),
}));

vi.mock("../../src/server/arxiv/ingestArxiv", () => ({
  ingestArxivForSources: vi.fn(() => {
    throw new Error("ingestArxivForSources must not be called from read-only path");
  }),
}));

vi.mock("../../src/server/llm/enrichPapers", () => ({
  enrichPapers: vi.fn(() => {
    throw new Error("enrichPapers must not be called from read-only path");
  }),
}));

import { loadRadarSnapshotReadOnly, loadRadarSnapshotReadOnlyWithMeta } from "./buildRadarSnapshot";
import { ingestArxivForSources } from "../../src/server/arxiv/ingestArxiv";
import { enrichPapers } from "../../src/server/llm/enrichPapers";
import { runDailyRadarWorkflow } from "../../src/domain/services/radar/runDailyRadarWorkflow";
import { runDailyRadarWorkflowAsync } from "../../src/domain/services/radar/runDailyRadarWorkflowAsync";

function minimalRadarPayload(radarDate: string): RadarAppData {
  return {
    radarDate,
    workflow: {} as RadarAppData["workflow"],
    briefings: [],
    briefingItems: [],
  };
}

/** Encadena select → from → where como en Drizzle; 1ª where usa .limit, 2ª usa .orderBy().limit */
function createSelectMock(scenarios: { exactResult: unknown[]; fallbackResult: unknown[] }) {
  let whereCall = 0;
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => {
          whereCall++;
          if (whereCall === 1) {
            return {
              limit: vi.fn(() => Promise.resolve(scenarios.exactResult)),
            };
          }
          return {
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve(scenarios.fallbackResult)),
            })),
          };
        }),
      })),
    })),
    insert: vi.fn(() => {
      throw new Error("insert must not be called in read-only snapshot path");
    }),
  };
}

describe("loadRadarSnapshotReadOnly", () => {
  beforeEach(() => {
    mockGetDb.mockReset();
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.reject(new Error("fetch must not be called")),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when getDb is unavailable", async () => {
    mockGetDb.mockReturnValue(null);
    const result = await loadRadarSnapshotReadOnly("2026-05-05", "mock");
    expect(result).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(runDailyRadarWorkflow).not.toHaveBeenCalled();
    expect(runDailyRadarWorkflowAsync).not.toHaveBeenCalled();
    expect(ingestArxivForSources).not.toHaveBeenCalled();
  });

  it("returns exact row payload with a single select when run_date and mode match", async () => {
    const payload = minimalRadarPayload("2026-05-05");
    const row = {
      runDate: "2026-05-05",
      mode: "mock",
      payload,
      createdAt: new Date("2026-05-05T12:00:00Z"),
    };
    const db = createSelectMock({
      exactResult: [row],
      fallbackResult: [],
    });
    mockGetDb.mockReturnValue(db);

    const result = await loadRadarSnapshotReadOnly("2026-05-05", "mock");
    expect(result).toEqual(payload);
    expect(db.select).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(runDailyRadarWorkflow).not.toHaveBeenCalled();
    expect(runDailyRadarWorkflowAsync).not.toHaveBeenCalled();
    expect(ingestArxivForSources).not.toHaveBeenCalled();
  });

  it("uses fallback latest row for mode when exact date has no row", async () => {
    const payload = minimalRadarPayload("2026-05-01");
    const fallbackRow = {
      runDate: "2026-05-01",
      mode: "live",
      payload,
      createdAt: new Date("2026-05-01T08:00:00Z"),
    };
    const db = createSelectMock({
      exactResult: [],
      fallbackResult: [fallbackRow],
    });
    mockGetDb.mockReturnValue(db);

    const result = await loadRadarSnapshotReadOnly("2026-05-10", "live");
    expect(result).toEqual(payload);
    expect(db.select).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(runDailyRadarWorkflow).not.toHaveBeenCalled();
    expect(runDailyRadarWorkflowAsync).not.toHaveBeenCalled();
    expect(ingestArxivForSources).not.toHaveBeenCalled();
  });

  it("returns null when no rows exist for mode", async () => {
    const db = createSelectMock({
      exactResult: [],
      fallbackResult: [],
    });
    mockGetDb.mockReturnValue(db);

    const result = await loadRadarSnapshotReadOnly("2026-05-05", "mock");
    expect(result).toBeNull();
    expect(db.select).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("returns null when rows exist but payload is empty", async () => {
    const db = createSelectMock({
      exactResult: [{ runDate: "2026-05-05", mode: "mock", payload: null }],
      fallbackResult: [],
    });
    mockGetDb.mockReturnValue(db);

    const result = await loadRadarSnapshotReadOnly("2026-05-05", "mock");
    expect(result).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("loadRadarSnapshotReadOnlyWithMeta", () => {
  beforeEach(() => {
    mockGetDb.mockReset();
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.reject(new Error("fetch must not be called")),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("never calls enrichPapers when fetching exact match", async () => {
    const payload = minimalRadarPayload("2026-06-03");
    const row = { runDate: "2026-06-03", mode: "live", payload, createdAt: new Date("2026-06-03T06:00:00Z") };
    const db = createSelectMock({ exactResult: [row], fallbackResult: [] });
    mockGetDb.mockReturnValue(db);

    await loadRadarSnapshotReadOnlyWithMeta("2026-06-03", "live");
    expect(enrichPapers).not.toHaveBeenCalled();
  });

  it("returns fallback: false and stale: false for an exact date match", async () => {
    const payload = minimalRadarPayload("2026-06-03");
    const row = { runDate: "2026-06-03", mode: "live", payload, createdAt: new Date("2026-06-03T06:00:00Z") };
    const db = createSelectMock({ exactResult: [row], fallbackResult: [] });
    mockGetDb.mockReturnValue(db);

    const { data, meta } = await loadRadarSnapshotReadOnlyWithMeta("2026-06-03", "live");
    expect(data).toEqual(payload);
    expect(meta.fallback).toBe(false);
    expect(meta.stale).toBe(false);
    expect(meta.servedDate).toBe("2026-06-03");
    expect(meta.requestedDate).toBe("2026-06-03");
    expect(meta.generatedAt).toBe("2026-06-03T06:00:00.000Z");
  });

  it("returns fallback: true and stale: true when serving an old snapshot", async () => {
    const payload = minimalRadarPayload("2026-05-01");
    // 3 days old — well beyond the 25-hour stale threshold
    const oldDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const fallbackRow = { runDate: "2026-05-01", mode: "live", payload, createdAt: oldDate };
    const db = createSelectMock({ exactResult: [], fallbackResult: [fallbackRow] });
    mockGetDb.mockReturnValue(db);

    const { data, meta } = await loadRadarSnapshotReadOnlyWithMeta("2026-06-03", "live");
    expect(data).toEqual(payload);
    expect(meta.fallback).toBe(true);
    expect(meta.stale).toBe(true);
    expect(meta.servedDate).toBe("2026-05-01");
    expect(meta.requestedDate).toBe("2026-06-03");
  });

  it("returns fallback: true and stale: false when fallback is recent (< 25 hours)", async () => {
    const payload = minimalRadarPayload("2026-06-02");
    const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const fallbackRow = { runDate: "2026-06-02", mode: "live", payload, createdAt: recentDate };
    const db = createSelectMock({ exactResult: [], fallbackResult: [fallbackRow] });
    mockGetDb.mockReturnValue(db);

    const { data, meta } = await loadRadarSnapshotReadOnlyWithMeta("2026-06-03", "live");
    expect(data).toEqual(payload);
    expect(meta.fallback).toBe(true);
    expect(meta.stale).toBe(false);
  });

  it("returns null data when no rows exist", async () => {
    const db = createSelectMock({ exactResult: [], fallbackResult: [] });
    mockGetDb.mockReturnValue(db);

    const { data, meta } = await loadRadarSnapshotReadOnlyWithMeta("2026-06-03", "live");
    expect(data).toBeNull();
    expect(meta.fallback).toBe(false);
    expect(meta.servedDate).toBe("");
  });

  it("returns stale: true when fallback row has null createdAt", async () => {
    const payload = minimalRadarPayload("2026-05-01");
    const fallbackRow = { runDate: "2026-05-01", mode: "live", payload, createdAt: null };
    const db = createSelectMock({ exactResult: [], fallbackResult: [fallbackRow] });
    mockGetDb.mockReturnValue(db);

    const { data, meta } = await loadRadarSnapshotReadOnlyWithMeta("2026-06-03", "live");
    expect(data).toEqual(payload);
    expect(meta.fallback).toBe(true);
    expect(meta.stale).toBe(true);
    expect(meta.generatedAt).toBeNull();
  });
});
