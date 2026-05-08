import { describe, expect, it } from "vitest";
import { runDailyRadarWorkflow } from "./runDailyRadarWorkflow";

describe("runDailyRadarWorkflow", () => {
  it("smoke: con seeds por defecto produce artefactos no vacíos", () => {
    const result = runDailyRadarWorkflow();

    expect(result.papers.length).toBeGreaterThan(0);
    expect(result.themes.length).toBeGreaterThan(0);
    expect(result.scores.length).toBeGreaterThan(0);
    expect(result.briefingItems.length).toBeGreaterThan(0);
    expect(result.briefing.id).toBeTruthy();
    expect(result.trendSnapshot.id).toBeTruthy();
    expect(result.logs.some((line) => line.includes("ingestSources"))).toBe(true);
  });
});
