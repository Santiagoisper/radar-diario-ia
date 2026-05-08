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

import { loadRadarSnapshotReadOnly } from "./buildRadarSnapshot";
import { ingestArxivForSources } from "../../src/server/arxiv/ingestArxiv";
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
