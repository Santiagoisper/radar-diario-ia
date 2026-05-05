import type { PaperTheme } from "../../domain/models";

export const paperThemesSeed: PaperTheme[] = [
  { id: "pt-1", paper_id: "paper-1", theme: "agentes", confidence: 0.95 },
  { id: "pt-2", paper_id: "paper-1", theme: "tooling", confidence: 0.86 },
  { id: "pt-3", paper_id: "paper-2", theme: "memoria", confidence: 0.93 },
  { id: "pt-4", paper_id: "paper-2", theme: "arquitectura", confidence: 0.72 },
  { id: "pt-5", paper_id: "paper-3", theme: "seguridad/alineación", confidence: 0.94 },
  { id: "pt-6", paper_id: "paper-3", theme: "evaluación", confidence: 0.88 },
  { id: "pt-7", paper_id: "paper-4", theme: "eficiencia", confidence: 0.84 },
];
