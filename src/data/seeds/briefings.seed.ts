import type { DailyBriefing, DailyBriefingItem } from "../../domain/models";

export const dailyBriefingsSeed: DailyBriefing[] = [
  {
    id: "brief-2026-05-05",
    briefing_date: "2026-05-05",
    title: "Radar Diario de IA — 2026-05-05",
    executive_summary:
      "La señal central del día es la convergencia entre agentes con tool use verificable, memoria evolutiva y evaluación de oversight.",
    relevant_topics: ["agentes", "memoria", "seguridad/alineación", "evaluación"],
    directional_view:
      "El campo se mueve hacia sistemas más ejecutables y auditables, con foco en confiabilidad operacional.",
    conceptual_connections:
      "Los trabajos de agentes y memoria se conectan por la necesidad de estado persistente verificable; los benchmarks de oversight aportan el marco de control.",
    practical_value:
      "Esto sirve para priorizar arquitectura de agentes con memoria robusta y evaluaciones explícitas de riesgo.",
    generated_markdown: `# Radar Diario de IA — 2026-05-05\n\n## Temas relevantes\n- agentes\n- memoria\n- seguridad/alineación\n- evaluación\n\n## Hacia dónde apunta la idea\nConvergencia entre ejecución, memoria y control verificable.\n\n## Utilidad práctica\nPriorizar arquitecturas de agentes auditables con memoria de largo plazo.`,
  },
  {
    id: "brief-2026-05-04",
    briefing_date: "2026-05-04",
    title: "Radar Diario de IA — 2026-05-04",
    executive_summary: "Predominó eficiencia de inferencia con señales moderadas en world models.",
    relevant_topics: ["eficiencia", "reasoning"],
    directional_view: "Optimización de costo por inferencia con degradación controlada.",
    conceptual_connections: "Eficiencia aparece como capa habilitante para despliegue agentic a escala.",
    practical_value: "Aporta criterios para budgeting de cómputo y latency targets.",
    generated_markdown: "# Radar Diario de IA — 2026-05-04",
  },
];

export const dailyBriefingItemsSeed: DailyBriefingItem[] = [
  {
    id: "bi-1",
    briefing_id: "brief-2026-05-05",
    paper_id: "paper-1",
    rank: 1,
    inclusion_reason: "Alta señal en agentes verificables.",
  },
  {
    id: "bi-2",
    briefing_id: "brief-2026-05-05",
    paper_id: "paper-2",
    rank: 2,
    inclusion_reason: "Memoria estratégica para continuidad de tareas.",
  },
  {
    id: "bi-3",
    briefing_id: "brief-2026-05-05",
    paper_id: "paper-3",
    rank: 3,
    inclusion_reason: "Marco de evaluación para control y gobernanza.",
  },
];
