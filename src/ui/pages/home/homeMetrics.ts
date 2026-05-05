import {
  authorWatchSeed,
  dailyBriefingsSeed,
  dailyBriefingItemsSeed,
  paperScoresSeed,
  papersSeed,
  paperThemesSeed,
  trendSnapshotsSeed,
} from "../../../data/seeds";

function getTopPaperIdsForToday(): string[] {
  const todayBriefing = dailyBriefingsSeed.find(
    (briefing) => briefing.briefing_date === "2026-05-05",
  );

  if (!todayBriefing) return [];

  return dailyBriefingItemsSeed
    .filter((item) => item.briefing_id === todayBriefing.id)
    .sort((a, b) => a.rank - b.rank)
    .map((item) => item.paper_id);
}

export function buildHomeViewModel() {
  const todayPapers = papersSeed.filter((paper) => paper.is_new_today);
  const activeAuthorNames = new Set<string>();

  todayPapers.forEach((paper) => {
    paper.authors.forEach((author) => activeAuthorNames.add(author));
  });

  const activeTrackedAuthors = authorWatchSeed.filter((watch) => {
    if (activeAuthorNames.has(watch.display_name)) return true;
    return watch.aliases.some((alias) => activeAuthorNames.has(alias));
  });

  const themeCounts = new Map<string, number>();
  paperThemesSeed
    .filter((theme) => todayPapers.some((paper) => paper.id === theme.paper_id))
    .forEach((theme) => {
      themeCounts.set(theme.theme, (themeCounts.get(theme.theme) ?? 0) + 1);
    });

  const dominantTheme = [...themeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "sin señal";

  const todayBriefing = dailyBriefingsSeed.find(
    (briefing) => briefing.briefing_date === "2026-05-05",
  );

  const weeklyTrend = trendSnapshotsSeed.find((trend) => trend.period_type === "weekly");

  const topPaperIds = getTopPaperIdsForToday();
  const topPapers = topPaperIds
    .map((paperId) => {
      const paper = papersSeed.find((item) => item.id === paperId);
      const score = paperScoresSeed.find((item) => item.paper_id === paperId);
      const topTheme = paperThemesSeed
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

  const activeAuthorBlock = topPapers.map((paper) => ({
    author: paper.authors[0],
    paperTitle: paper.title,
    theme: paper.theme,
  }));

  return {
    metrics: {
      newPapersToday: todayPapers.length,
      activeAuthorsToday: activeTrackedAuthors.length,
      dominantTheme,
      mainSignal: todayBriefing?.executive_summary ?? "Sin briefing disponible.",
      weeklyTrend: weeklyTrend?.trend_summary ?? "Sin tendencia semanal registrada.",
    },
    todayBriefing,
    topPapers,
    activeAuthorBlock,
    conceptualSignal:
      todayBriefing?.directional_view ??
      "Se observa convergencia entre ejecución de agentes, memoria y evaluación de control.",
  };
}
