import type { RadarAppData } from "../../../data/radarSnapshot";
import { authorWatchSeed } from "../../../data/seeds";
import type { DailyBriefing } from "../../../domain/models";

function getTopPaperIds(
  briefingId: string,
  briefingItems: { briefing_id: string; paper_id: string; rank: number }[],
): string[] {
  return briefingItems
    .filter((item) => item.briefing_id === briefingId)
    .sort((a, b) => a.rank - b.rank)
    .map((item) => item.paper_id);
}

function resolveAuthorMatch(authorName: string, displayName: string, aliases: string[]) {
  if (authorName === displayName) return true;
  return aliases.includes(authorName);
}

function getLatestBriefing(briefings: DailyBriefing[]): DailyBriefing | undefined {
  return [...briefings].sort((a, b) => b.briefing_date.localeCompare(a.briefing_date))[0];
}

export function buildHomeViewModel(data: RadarAppData) {
  const { workflow, briefings, briefingItems } = data;
  const { papers, themes, scores } = workflow;
  const watchAuthors = authorWatchSeed;

  const latestBriefing = getLatestBriefing(briefings);
  const todayPapers = papers.filter((paper) => paper.is_new_today);
  const activeAuthorNames = new Set<string>();

  todayPapers.forEach((paper) => {
    paper.authors.forEach((author) => activeAuthorNames.add(author));
  });

  const activeTrackedAuthors = watchAuthors.filter((watch) => {
    if (activeAuthorNames.has(watch.display_name)) return true;
    return watch.aliases.some((alias) => activeAuthorNames.has(alias));
  });

  const themeCounts = new Map<string, number>();
  themes
    .filter((theme) => todayPapers.some((paper) => paper.id === theme.paper_id))
    .forEach((theme) => {
      themeCounts.set(theme.theme, (themeCounts.get(theme.theme) ?? 0) + 1);
    });

  const dominantTheme = [...themeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "sin señal";

  const weeklyTrend = workflow.trendSnapshot.trend_summary;

  const topPaperIds = latestBriefing ? getTopPaperIds(latestBriefing.id, briefingItems) : [];
  const topPapers = topPaperIds
    .map((paperId) => {
      const paper = papers.find((item) => item.id === paperId);
      const score = scores.find((item) => item.paper_id === paperId);
      const topTheme = themes
        .filter((item) => item.paper_id === paperId)
        .sort((a, b) => b.confidence - a.confidence)[0]?.theme;

      if (!paper || !score) return null;

      return {
        id: paper.id,
        title: paper.title,
        authors: paper.authors,
        theme: topTheme ?? "sin clasificar",
        totalScore: score.total_score,
        reason: score.explanation,
      };
    })
    .filter((paper): paper is NonNullable<typeof paper> => Boolean(paper));

  const activeAuthorBlock = activeTrackedAuthors
    .map((author) => {
      const relatedPaper = topPapers.find((paper) =>
        paper.authors.some((paperAuthor) =>
          resolveAuthorMatch(paperAuthor, author.display_name, author.aliases),
        ),
      );

      return {
        author: author.display_name,
        paperTitle: relatedPaper?.title ?? "Sin paper top asociado hoy",
        theme: relatedPaper?.theme ?? "sin señal dominante",
      };
    })
    .slice(0, 5);

  return {
    metrics: {
      newPapersToday: todayPapers.length,
      activeAuthorsToday: activeTrackedAuthors.length,
      dominantTheme,
      mainSignal: latestBriefing?.executive_summary ?? "Sin briefing disponible.",
      weeklyTrend,
    },
    todayBriefing: latestBriefing,
    topPapers,
    activeAuthorBlock,
    conceptualSignal:
      latestBriefing?.directional_view ??
      "Se observa convergencia entre ejecución de agentes, memoria y evaluación de control.",
  };
}
