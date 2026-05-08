import type { PaperTheme, TrendSnapshot } from "../../models";
import type { TrendSnapshotInput } from "./types";

function dateWindowForPeriod(periodType: TrendSnapshot["period_type"], referenceDate: Date) {
  const end = new Date(referenceDate);
  const start = new Date(referenceDate);

  if (periodType === "daily") {
    start.setUTCDate(end.getUTCDate());
  } else if (periodType === "weekly") {
    start.setUTCDate(end.getUTCDate() - 6);
  } else {
    start.setUTCDate(end.getUTCDate() - 29);
  }

  return { start, end };
}

function getPaperMainTheme(paperId: string, themes: PaperTheme[]): string {
  return (
    themes.filter((theme) => theme.paper_id === paperId).sort((a, b) => b.confidence - a.confidence)[0]
      ?.theme ?? "sin clasificar"
  );
}

function countTopThemes(paperIds: string[], themes: PaperTheme[]): string[] {
  const byTheme = new Map<string, number>();

  paperIds.forEach((paperId) => {
    const theme = getPaperMainTheme(paperId, themes);
    byTheme.set(theme, (byTheme.get(theme) ?? 0) + 1);
  });

  return [...byTheme.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme)
    .slice(0, 5);
}

function countRecurringAuthors(papers: TrendSnapshotInput["papers"]): string[] {
  const byAuthor = new Map<string, number>();

  papers.forEach((paper) => {
    paper.authors.forEach((author) => {
      byAuthor.set(author, (byAuthor.get(author) ?? 0) + 1);
    });
  });

  return [...byAuthor.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([author]) => author)
    .slice(0, 5);
}

function buildTrendSummary(
  topThemes: string[],
  recurringAuthors: string[],
  periodType: TrendSnapshot["period_type"],
  avgScore: number,
  briefingsCount: number,
): string {
  const periodLabel = periodType === "daily" ? "día" : periodType === "weekly" ? "semana" : "mes";
  const themesText = topThemes.slice(0, 3).join(", ") || "sin señal";
  const authorsText = recurringAuthors.slice(0, 2).join(" y ") || "sin recurrencias";

  return (
    `En este ${periodLabel}, predominan ${themesText}, con recurrencia de ${authorsText} ` +
    `como nodos de continuidad. Score promedio del período: ${avgScore.toFixed(2)}. ` +
    `Briefings considerados: ${briefingsCount}.`
  );
}

/** Genera snapshot de tendencias para un período sin depender de LLM. */
export function generateTrendSnapshot(input: TrendSnapshotInput): TrendSnapshot {
  const latestDateMs =
    input.papers.map((paper) => new Date(paper.published_at).getTime()).sort((a, b) => b - a)[0] ??
    Date.now();

  const { start, end } = dateWindowForPeriod(input.periodType, new Date(latestDateMs));

  const filteredPapers = input.papers.filter((paper) => {
    const date = new Date(paper.published_at);
    return date >= start && date <= end;
  });

  const paperIds = filteredPapers.map((paper) => paper.id);
  const topThemes = countTopThemes(paperIds, input.themes);
  const recurringAuthors = countRecurringAuthors(filteredPapers);
  const avgScore =
    filteredPapers.reduce((acc, paper) => {
      const score = input.scores.find((item) => item.paper_id === paper.id)?.total_score ?? 0;
      return acc + score;
    }, 0) / Math.max(filteredPapers.length, 1);

  const briefingsCount = input.briefings.filter((briefing) => {
    const date = new Date(`${briefing.briefing_date}T00:00:00Z`);
    return date >= start && date <= end;
  }).length;

  const trend_summary = buildTrendSummary(
    topThemes,
    recurringAuthors,
    input.periodType,
    avgScore,
    briefingsCount,
  );

  return {
    id: `trend-${input.periodType}-${start.toISOString().slice(0, 10)}`,
    period_type: input.periodType,
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
    top_themes: topThemes,
    recurring_authors: recurringAuthors,
    trend_summary,
  };
}
