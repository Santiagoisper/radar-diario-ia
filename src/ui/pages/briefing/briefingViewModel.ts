import { getRadarAppData } from "../../../data/radarSnapshot";
import type { DailyBriefing } from "../../../domain/models";

interface BriefingThemeItem {
  theme: string;
  paperCount: number;
  explanation: string;
  signalLevel: "alta" | "media" | "baja";
}

interface BriefingHighlightedPaper {
  id: string;
  title: string;
  authors: string[];
  theme: string;
  totalScore: number;
  whyItMatters: string;
}

export interface BriefingTodayViewModel {
  title: string;
  date: string;
  executiveSummary: string;
  relevantThemes: BriefingThemeItem[];
  directionalView: string;
  conceptualConnections: string;
  highlightedPapers: BriefingHighlightedPaper[];
  practicalValue: string;
  markdown: string;
}

function getLatestBriefing(briefings: DailyBriefing[]): DailyBriefing | undefined {
  return [...briefings].sort((a, b) => b.briefing_date.localeCompare(a.briefing_date))[0];
}

function scoreToSignal(score: number): "alta" | "media" | "baja" {
  if (score >= 8.5) return "alta";
  if (score >= 7.5) return "media";
  return "baja";
}

function buildHighlightedPapers(
  briefingId: string,
  briefingItems: { briefing_id: string; paper_id: string; rank: number; inclusion_reason: string }[],
  papers: { id: string; title: string; authors: string[] }[],
  scores: { paper_id: string; total_score: number }[],
  themes: { paper_id: string; theme: string; confidence: number }[],
): BriefingHighlightedPaper[] {
  const rankedItems = briefingItems
    .filter((item) => item.briefing_id === briefingId)
    .sort((a, b) => a.rank - b.rank);

  const fromBriefing = rankedItems
    .map((item) => {
      const paper = papers.find((p) => p.id === item.paper_id);
      const score = scores.find((s) => s.paper_id === item.paper_id);
      const topTheme = themes
        .filter((theme) => theme.paper_id === item.paper_id)
        .sort((a, b) => b.confidence - a.confidence)[0]?.theme;

      if (!paper || !score) return null;

      return {
        id: paper.id,
        title: paper.title,
        authors: paper.authors,
        theme: topTheme ?? "sin clasificar",
        totalScore: score.total_score,
        whyItMatters: item.inclusion_reason,
      };
    })
    .filter((item): item is BriefingHighlightedPaper => Boolean(item));

  return fromBriefing.sort((a, b) => b.totalScore - a.totalScore);
}

function buildHighlightedPapersFallback(
  papers: { id: string; title: string; authors: string[]; is_new_today: boolean }[],
  scores: { paper_id: string; total_score: number; explanation: string }[],
  themes: { paper_id: string; theme: string; confidence: number }[],
): BriefingHighlightedPaper[] {
  return papers
    .filter((paper) => paper.is_new_today)
    .map((paper) => {
      const score = scores.find((s) => s.paper_id === paper.id);
      const topTheme = themes
        .filter((theme) => theme.paper_id === paper.id)
        .sort((a, b) => b.confidence - a.confidence)[0]?.theme;

      return {
        id: paper.id,
        title: paper.title,
        authors: paper.authors,
        theme: topTheme ?? "sin clasificar",
        totalScore: score?.total_score ?? 0,
        whyItMatters: score?.explanation ?? "Paper seleccionado por señal del día.",
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5);
}

type BriefingHighlightedPapersInput = Array<{
  theme: string;
  totalScore: number;
}>;

function buildRelevantThemes(papers: BriefingHighlightedPapersInput): BriefingThemeItem[] {
  const grouped = new Map<string, { count: number; scoreSum: number }>();

  papers.forEach((paper) => {
    const score = paper.totalScore;
    const current = grouped.get(paper.theme) ?? { count: 0, scoreSum: 0 };
    grouped.set(paper.theme, {
      count: current.count + 1,
      scoreSum: current.scoreSum + score,
    });
  });

  return [...grouped.entries()]
    .map(([theme, data]) => {
      const avgScore = data.scoreSum / data.count;

      return {
        theme,
        paperCount: data.count,
        explanation: `Tema detectado por recurrencia y score promedio ${avgScore.toFixed(2)} en el set destacado.`,
        signalLevel: scoreToSignal(avgScore),
      } satisfies BriefingThemeItem;
    })
    .sort((a, b) => b.paperCount - a.paperCount)
    .slice(0, 7);
}

function ensureThemeCoverage(
  themes: BriefingThemeItem[],
  fallbackThemes: string[],
): BriefingThemeItem[] {
  const merged = [...themes];

  for (const fallbackTheme of fallbackThemes) {
    if (merged.length >= 7) break;
    if (merged.some((item) => item.theme === fallbackTheme)) continue;

    merged.push({
      theme: fallbackTheme,
      paperCount: 0,
      explanation:
        "Tema estratégico relevante en el briefing, con señal indirecta en el set del día.",
      signalLevel: "baja",
    });
  }

  return merged.slice(0, 7);
}

function buildMarkdown(view: Omit<BriefingTodayViewModel, "markdown">): string {
  const themesSection = view.relevantThemes
    .map(
      (theme) =>
        `- **${theme.theme}** (${theme.paperCount} papers, señal ${theme.signalLevel}) — ${theme.explanation}`,
    )
    .join("\n");

  const papersTableHeader = "| Paper | Autor(es) | Tema | Score | Por qué importa |";
  const papersTableDivider = "|---|---|---|---:|---|";
  const papersRows = view.highlightedPapers
    .map(
      (paper) =>
        `| ${paper.title} | ${paper.authors.join(", ")} | ${paper.theme} | ${paper.totalScore.toFixed(2)} | ${paper.whyItMatters} |`,
    )
    .join("\n");

  return `# ${view.title}\n\n` +
    `## Bloque 1 — Temas relevantes\n${themesSection}\n\n` +
    `## Bloque 2 — Hacia dónde apunta la idea\n${view.directionalView}\n\n` +
    `## Bloque 3 — Cómo se conectan las ideas\n${view.conceptualConnections}\n\n` +
    `## Bloque 4 — Papers destacados\n${papersTableHeader}\n${papersTableDivider}\n${papersRows}\n\n` +
    `## Bloque 5 — Utilidad práctica\n${view.practicalValue}`;
}

export function buildBriefingTodayViewModel(): BriefingTodayViewModel {
  const { workflow, briefings, briefingItems } = getRadarAppData();
  const { papers, themes, scores } = workflow;
  const latestBriefing = getLatestBriefing(briefings);

  if (!latestBriefing) {
    const fallback: Omit<BriefingTodayViewModel, "markdown"> = {
      title: "Radar Diario de IA — sin fecha",
      date: "sin fecha",
      executiveSummary: "No hay briefing cargado.",
      relevantThemes: [],
      directionalView: "No hay dirección conceptual disponible.",
      conceptualConnections: "No hay conexiones registradas.",
      highlightedPapers: [],
      practicalValue: "No hay utilidad práctica disponible.",
    };

    return { ...fallback, markdown: buildMarkdown(fallback) };
  }

  let highlightedPapers = buildHighlightedPapers(
    latestBriefing.id,
    briefingItems,
    papers,
    scores,
    themes,
  );
  if (highlightedPapers.length === 0) {
    highlightedPapers = buildHighlightedPapersFallback(papers, scores, themes);
  }

  const computedThemes = buildRelevantThemes(highlightedPapers);
  const relevantThemes = ensureThemeCoverage(computedThemes, latestBriefing.relevant_topics);

  const view: Omit<BriefingTodayViewModel, "markdown"> = {
    title: latestBriefing.title,
    date: latestBriefing.briefing_date,
    executiveSummary: latestBriefing.executive_summary,
    relevantThemes,
    directionalView: latestBriefing.directional_view,
    conceptualConnections: latestBriefing.conceptual_connections,
    highlightedPapers,
    practicalValue: latestBriefing.practical_value,
  };

  return {
    ...view,
    markdown: buildMarkdown(view),
  };
}
