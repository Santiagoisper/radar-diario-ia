import { beforeEach, describe, expect, it } from "vitest";
import { buildBriefingTodayViewModel } from "../ui/pages/briefing/briefingViewModel";
import { buildHomeViewModel } from "../ui/pages/home/homeMetrics";
import {
  clearRadarAppDataCache,
  DEFAULT_RADAR_DATE,
  getLatestRadarState,
  getRadarAppData,
  mergeBriefingsAndItems,
} from "./radarSnapshot";

beforeEach(() => {
  clearRadarAppDataCache();
});

describe("radarSnapshot / mergeBriefingsAndItems", () => {
  it("reemplaza el briefing de seed del mismo día por el generado en el workflow", () => {
    const workflow = getLatestRadarState(DEFAULT_RADAR_DATE);
    const { briefings } = mergeBriefingsAndItems(workflow);
    const forDay = briefings.find((b) => b.briefing_date === DEFAULT_RADAR_DATE);
    expect(forDay).toBeDefined();
    expect(forDay?.id).toBe(workflow.briefing.id);
    expect(forDay?.executive_summary).toBe(workflow.briefing.executive_summary);
  });

  it("los items del briefing del workflow referencian papers del pipeline", () => {
    const data = getRadarAppData(DEFAULT_RADAR_DATE);
    const paperIds = new Set(data.workflow.papers.map((p) => p.id));

    for (const item of data.briefingItems) {
      if (item.briefing_id === data.workflow.briefing.id) {
        expect(paperIds.has(item.paper_id)).toBe(true);
      }
    }
  });
});

describe("view models desde fachada", () => {
  it("home: top papers pertenecen al set de papers del workflow", () => {
    const data = getRadarAppData(DEFAULT_RADAR_DATE);
    const vm = buildHomeViewModel();
    const ids = new Set(data.workflow.papers.map((p) => p.id));

    expect(vm.topPapers.length).toBeGreaterThan(0);
    vm.topPapers.forEach((p) => expect(ids.has(p.id)).toBe(true));
  });

  it("briefing de hoy: papers destacados coherentes con el workflow", () => {
    const data = getRadarAppData(DEFAULT_RADAR_DATE);
    const vm = buildBriefingTodayViewModel();
    const ids = new Set(data.workflow.papers.map((p) => p.id));

    expect(vm.highlightedPapers.length).toBeGreaterThan(0);
    vm.highlightedPapers.forEach((p) => expect(ids.has(p.id)).toBe(true));
  });
});
