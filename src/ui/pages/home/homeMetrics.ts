import {
  authorWatchSeed,
  dailyBriefingsSeed,
  dailyBriefingItemsSeed,
  paperScoresSeed,
  papersSeed,
  paperThemesSeed,
  trendSnapshotsSeed,
} from "../../../data/seeds";

function getLatestBriefing() {
  return [...dailyBriefingsSeed].sort((a, b) =>
    b.briefing_date.localeCompare(a.briefing_date),
  )[0];
}

function getTopPaperIds(briefingId: string): string[] {
  return dailyBriefingItemsSeed
    .filter((item) => item.briefing_id === briefingId)
    .sort((a, b) => a.rank - b.rank)
    .map((item) => item.paper_id);
}

function resolveAuthorMatch(authorName: string, displayName: string, aliases: string[]) {
  if (authorName === displayName) return true;
  return aliases.includes(authorName);
}

export function buildHomeViewModel() {
  const latestBriefing = getLatestBriefing();
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

  const dominantTheme =
    [...themeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "sin señal";

  const weeklyTrend = [...trendSnapshotsSeed]
    .filter((trend) => trend.period_type === "weekly")
    .sort((a, b) => b.period_end.localeCompare(a.period_end))[0];

  const topPaperIds = latestBriefing ? getTopPaperIds(latestBriefing.id) : [];
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
      weeklyTrend: weeklyTrend?.trend_summary ?? "Sin tendencia semanal registrada.",
    },
    todayBriefing: latestBriefing,
    topPapers,
    activeAuthorBlock,
    conceptualSignal:
      latestBriefing?.directional_view ??
      "Se observa convergencia entre ejecución de agentes, memoria y evaluación de control.",
  };
}
