import type { TrendSnapshot } from "../../domain/models";

export const trendSnapshotsSeed: TrendSnapshot[] = [
  {
    id: "trend-week-2026-18",
    period_type: "weekly",
    period_start: "2026-05-01",
    period_end: "2026-05-07",
    top_themes: ["agentes", "memoria", "evaluación"],
    recurring_authors: ["Yoshua Bengio", "Fei-Fei Li", "Stuart Russell"],
    trend_summary: "Semana marcada por sistemas agentes con trazabilidad y evaluación de robustez.",
  },
  {
    id: "trend-month-2026-05",
    period_type: "monthly",
    period_start: "2026-05-01",
    period_end: "2026-05-31",
    top_themes: ["agentes", "seguridad/alineación", "eficiencia"],
    recurring_authors: ["Yann LeCun", "Yoshua Bengio"],
    trend_summary: "Crecen líneas de agentic tooling con énfasis en riesgo operacional.",
  },
];
